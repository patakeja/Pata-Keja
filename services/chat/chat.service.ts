import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthService } from "@/services/auth/auth.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import {
  BookingStatus,
  ServiceErrorCode,
  UserRole,
  type ChatMessageRecord,
  type ChatParticipant,
  type ConversationListItem,
  type ConversationThread
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ConversationMessageRow = MessageRow & {
  sender: Pick<UserRow, "id" | "full_name" | "role"> | null;
};
type ConversationQueryRow = ConversationRow & {
  booking: (Pick<BookingRow, "id" | "status" | "expires_at"> & {
    listing: (Pick<ListingRow, "id" | "title" | "maps_link" | "latitude" | "longitude"> & {
      area: { name: string } | null;
      town: { name: string } | null;
      county: { name: string } | null;
    }) | null;
  }) | null;
  tenant: Pick<UserRow, "id" | "full_name" | "role"> | null;
  landlord: Pick<UserRow, "id" | "full_name" | "role"> | null;
  messages: ConversationMessageRow[] | null;
};

export class ChatService {
  private readonly authService: AuthService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
  }

  async ensureConversationForBooking(bookingId: string, client?: ServiceClient) {
    const supabase = this.resolveClient(client);
    const { data: existingConversation, error: existingConversationError } = await supabase
      .from("conversations")
      .select("id, tenant_id, landlord_id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingConversationError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to verify the booking conversation.", existingConversationError);
    }

    if (existingConversation) {
      await this.ensureConversationParticipants(
        supabase,
        existingConversation.id,
        existingConversation.tenant_id,
        existingConversation.landlord_id
      );

      return existingConversation.id;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
          id,
          listing_id,
          user_id,
          listing:listings!bookings_listing_id_fkey(
            id,
            landlord_id
          )
        `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the booking for chat setup.", bookingError);
    }

    if (!booking || !booking.listing) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The booking does not exist for chat setup.");
    }

    const { data: createdConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        booking_id: booking.id,
        listing_id: booking.listing_id,
        tenant_id: booking.user_id,
        landlord_id: booking.listing.landlord_id
      })
      .select("id")
      .single();

    if (createError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the booking conversation.", createError);
    }

    await this.ensureConversationParticipants(
      supabase,
      createdConversation.id,
      booking.user_id,
      booking.listing.landlord_id
    );

    return createdConversation.id;
  }

  async getBookingConversation(bookingId: string): Promise<ConversationThread> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const conversationId = await this.ensureConversationForBooking(bookingId, supabase);
    const row = await this.getConversationRowById(supabase, conversationId);

    this.assertViewerCanAccess(actor.id, actor.role, row);

    return this.mapConversationThread(row, actor.id, actor.role);
  }

  async getConversationThread(conversationId: string): Promise<ConversationThread> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const row = await this.getConversationRowById(supabase, conversationId);

    this.assertViewerCanAccess(actor.id, actor.role, row);

    return this.mapConversationThread(row, actor.id, actor.role);
  }

  async getLandlordConversations(): Promise<ConversationListItem[]> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD], supabase);
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationSelect())
      .eq("landlord_id", actor.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load landlord conversations.", error);
    }

    return (data ?? []).map((row) => this.mapConversationListItem(row as unknown as ConversationQueryRow, actor.id, actor.role));
  }

  async getAdminConversations(): Promise<ConversationListItem[]> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.ADMIN], supabase);
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationSelect())
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load admin conversations.", error);
    }

    return (data ?? []).map((row) => this.mapConversationListItem(row as unknown as ConversationQueryRow, actor.id, actor.role));
  }

  async sendMessage(conversationId: string, messageText: string): Promise<ChatMessageRecord> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const normalizedMessage = messageText.trim();

    if (!normalizedMessage) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Message text cannot be blank.");
    }

    if (actor.role === UserRole.ADMIN) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "Admins can review chats but cannot send messages.");
    }

    const row = await this.getConversationRowById(supabase, conversationId);
    this.assertParticipantCanSend(actor.id, row);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: actor.id,
        message_text: normalizedMessage
      })
      .select(
        `
          id,
          conversation_id,
          sender_id,
          message_text,
          created_at,
          sender:users!messages_sender_id_fkey(
            id,
            full_name,
            role
          )
        `
      )
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to send the message.", error);
    }

    return this.mapMessageRecord(data as ConversationMessageRow, actor.id);
  }

  async sendBookingMessage(bookingId: string, messageText: string): Promise<ChatMessageRecord> {
    const supabase = this.clientFactory();
    const conversationId = await this.ensureConversationForBooking(bookingId, supabase);

    return this.sendMessage(conversationId, messageText);
  }

  private async ensureConversationParticipants(
    supabase: ServiceClient,
    conversationId: string,
    tenantId: string,
    landlordId: string
  ) {
    const { error } = await supabase.from("conversation_participants").upsert(
      [
        { conversation_id: conversationId, user_id: tenantId },
        { conversation_id: conversationId, user_id: landlordId }
      ],
      {
        onConflict: "conversation_id,user_id"
      }
    );

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to register chat participants.", error);
    }
  }

  private async getConversationRowById(supabase: ServiceClient, conversationId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationSelect())
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the conversation.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested conversation does not exist.");
    }

    return data as unknown as ConversationQueryRow;
  }

  private conversationSelect() {
    return `
      id,
      booking_id,
      listing_id,
      tenant_id,
      landlord_id,
      created_at,
      updated_at,
      booking:bookings!conversations_booking_id_fkey(
        id,
        status,
        expires_at,
        listing:listings!bookings_listing_id_fkey(
          id,
          title,
          maps_link,
          latitude,
          longitude,
          area:areas(name),
          town:towns(name),
          county:counties(name)
        )
      ),
      tenant:users!conversations_tenant_id_fkey(
        id,
        full_name,
        role
      ),
      landlord:users!conversations_landlord_id_fkey(
        id,
        full_name,
        role
      ),
      messages:messages(
        id,
        conversation_id,
        sender_id,
        message_text,
        created_at,
        sender:users!messages_sender_id_fkey(
          id,
          full_name,
          role
        )
      )
    `;
  }

  private assertViewerCanAccess(actorId: string, actorRole: UserRole, row: ConversationQueryRow) {
    if (actorRole === UserRole.ADMIN) {
      return;
    }

    if (row.tenant_id !== actorId && row.landlord_id !== actorId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this conversation.");
    }
  }

  private assertParticipantCanSend(actorId: string, row: ConversationQueryRow) {
    if (row.tenant_id !== actorId && row.landlord_id !== actorId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "Only booking participants can send messages.");
    }
  }

  private mapConversationThread(row: ConversationQueryRow, actorId: string, actorRole: UserRole): ConversationThread {
    const base = this.mapConversationListItem(row, actorId, actorRole);
    const listing = row.booking?.listing;

    return {
      ...base,
      bookingStatus: row.booking?.status ?? BookingStatus.ACTIVE,
      bookingExpiresAt: row.booking?.expires_at ?? null,
      areaLabel: this.buildAreaLabel(listing?.area?.name ?? "", listing?.town?.name ?? "", listing?.county?.name ?? ""),
      mapsLink: listing?.maps_link ?? null,
      latitude: listing?.latitude ?? null,
      longitude: listing?.longitude ?? null,
      messages: this.sortMessages(row.messages ?? []).map((message) => this.mapMessageRecord(message, actorId))
    };
  }

  private mapConversationListItem(row: ConversationQueryRow, actorId: string, actorRole: UserRole): ConversationListItem {
    if (!row.booking?.listing || !row.tenant || !row.landlord) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Conversation data is incomplete.");
    }

    const lastMessage = this.sortMessages(row.messages ?? []).at(-1) ?? null;
    const canSend = actorRole !== UserRole.ADMIN && (row.tenant_id === actorId || row.landlord_id === actorId);

    return {
      id: row.id,
      bookingId: row.booking_id,
      listingId: row.listing_id,
      listingTitle: row.booking.listing.title,
      tenant: this.mapParticipant(row.tenant),
      landlord: this.mapParticipant(row.landlord),
      lastMessageText: lastMessage?.message_text ?? null,
      lastMessageAt: lastMessage?.created_at ?? null,
      updatedAt: row.updated_at,
      canSend,
      isReadOnly: !canSend
    };
  }

  private mapParticipant(participant: Pick<UserRow, "id" | "full_name" | "role">): ChatParticipant {
    return {
      id: participant.id,
      fullName: participant.full_name,
      role: participant.role
    };
  }

  private mapMessageRecord(message: ConversationMessageRow, actorId: string): ChatMessageRecord {
    if (!message.sender) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Conversation sender data is missing.");
    }

    return {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderName: message.sender.full_name,
      senderRole: message.sender.role,
      messageText: message.message_text,
      createdAt: message.created_at,
      isOwnMessage: message.sender_id === actorId
    };
  }

  private sortMessages(messages: ConversationMessageRow[]) {
    return messages
      .slice()
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  }

  private buildAreaLabel(areaName: string, townName: string, countyName: string) {
    return [areaName, townName, countyName].filter(Boolean).join(", ");
  }

  private resolveClient(client?: ServiceClient) {
    return client ?? this.clientFactory();
  }
}
