import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { CHAT_MESSAGE_PAGE_SIZE } from "@/config/chat";
import { AuthService } from "@/services/auth/auth.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import {
  BookingStatus,
  MessageStatus,
  ServiceErrorCode,
  UserRole,
  type ChatMessagePage,
  type ChatMessageRecord,
  type ChatParticipant,
  type ConversationListItem,
  type ConversationThread,
  type SendMessageInput,
  type TypingState,
  type UserPresenceRecord
} from "@/types";

type ServiceClient = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type PresenceRow = Database["public"]["Tables"]["user_presence"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type ConversationMetaRow = ConversationRow & {
  booking: (Pick<BookingRow, "id" | "status" | "expires_at"> & {
    listing: (Pick<
      ListingRow,
      | "id"
      | "title"
      | "price"
      | "maps_link"
      | "latitude"
      | "longitude"
      | "deposit_amount"
      | "available_from"
    > & {
      area: { name: string } | null;
      town: { name: string } | null;
      county: { name: string } | null;
    }) | null;
  }) | null;
  tenant: Pick<UserRow, "id" | "full_name" | "role" | "phone"> | null;
  landlord: Pick<UserRow, "id" | "full_name" | "role" | "phone"> | null;
};

type MessageQueryRow = MessageRow & {
  sender: Pick<UserRow, "id" | "full_name" | "role" | "phone"> | null;
  deletedBy: Pick<UserRow, "id" | "full_name" | "role" | "phone"> | null;
};

type ConversationRealtimeHandlers = {
  conversationId: string;
  presenceUserIds?: string[];
  onMessageChange?: () => void;
  onPresenceChange?: (presence: UserPresenceRecord) => void;
  onTypingChange?: (typingState: TypingState) => void;
};

type ConversationRealtimeController = {
  unsubscribe: () => Promise<void>;
  sendTyping: (payload: { userId: string; isTyping: boolean }) => Promise<void>;
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
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to verify the booking conversation.",
        existingConversationError
      );
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
          status,
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
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to load the booking for chat setup.",
        bookingError
      );
    }

    if (!booking || !booking.listing) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The booking does not exist for chat setup.");
    }

    this.assertBookingChatStatus(booking.status);

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
      throw new ServiceError(
        ServiceErrorCode.DATABASE_ERROR,
        "Unable to create the booking conversation.",
        createError
      );
    }

    await this.ensureConversationParticipants(
      supabase,
      createdConversation.id,
      booking.user_id,
      booking.listing.landlord_id
    );

    return createdConversation.id;
  }

  async getBookingConversation(
    bookingId: string,
    options?: { before?: string | null; limit?: number }
  ): Promise<ConversationThread> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const conversationId = await this.ensureConversationForBooking(bookingId, supabase);

    return this.getConversationThread(conversationId, options, supabase, actor.id, actor.role);
  }

  async getConversationThread(
    conversationId: string,
    options?: { before?: string | null; limit?: number },
    client?: ServiceClient,
    actorIdOverride?: string,
    actorRoleOverride?: UserRole
  ): Promise<ConversationThread> {
    const supabase = this.resolveClient(client);
    const actor =
      actorIdOverride && actorRoleOverride
        ? { id: actorIdOverride, role: actorRoleOverride }
        : await this.authService.requireCurrentUser(supabase);
    const metaRow = await this.getConversationMetaById(supabase, conversationId);

    this.assertViewerCanAccess(actor.id, actor.role, metaRow);

    if (actor.role !== UserRole.ADMIN) {
      this.assertBookingChatStatus(metaRow.booking?.status);
    }

    const messagePage = await this.getConversationMessagesPage(
      supabase,
      conversationId,
      actor.id,
      actor.role,
      options
    );
    const otherParticipant = this.getOtherParticipant(metaRow, actor.id, actor.role);
    const presenceMap = await this.getPresenceMap(supabase, [otherParticipant.id]);
    const otherParticipantPresence =
      presenceMap[otherParticipant.id] ?? this.createOfflinePresence(otherParticipant.id);

    return this.mapConversationThread(metaRow, messagePage, otherParticipantPresence, actor.id, actor.role);
  }

  async getConversationMessages(
    conversationId: string,
    options?: { before?: string | null; limit?: number }
  ): Promise<ChatMessagePage> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const metaRow = await this.getConversationMetaById(supabase, conversationId);

    this.assertViewerCanAccess(actor.id, actor.role, metaRow);

    if (actor.role !== UserRole.ADMIN) {
      this.assertBookingChatStatus(metaRow.booking?.status);
    }

    return this.getConversationMessagesPage(supabase, conversationId, actor.id, actor.role, options);
  }

  async getLandlordConversations(): Promise<ConversationListItem[]> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.LANDLORD], supabase);
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationMetaSelect())
      .eq("landlord_id", actor.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load landlord conversations.", error);
    }

    return this.mapConversationList(
      supabase,
      (data ?? []) as unknown as ConversationMetaRow[],
      actor.id,
      actor.role
    );
  }

  async getAdminConversations(): Promise<ConversationListItem[]> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireRole([UserRole.ADMIN], supabase);
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationMetaSelect())
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load admin conversations.", error);
    }

    return this.mapConversationList(
      supabase,
      (data ?? []) as unknown as ConversationMetaRow[],
      actor.id,
      actor.role
    );
  }

  async sendMessage(conversationId: string, input: SendMessageInput): Promise<ChatMessageRecord> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const normalizedContent = input.content.trim();

    if (!normalizedContent) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Message content cannot be blank.");
    }

    if (!input.clientMessageId.trim()) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "A client message ID is required.");
    }

    if (actor.role === UserRole.ADMIN) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "Admins can review chats but cannot send messages.");
    }

    const metaRow = await this.getConversationMetaById(supabase, conversationId);
    this.assertParticipantCanSend(actor.id, metaRow);
    this.assertBookingChatStatus(metaRow.booking?.status);

    const receiver = actor.id === metaRow.tenant_id ? metaRow.landlord : metaRow.tenant;

    if (!receiver) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Conversation receiver details are missing.");
    }

    const receiverPresence =
      (await this.getPresenceMap(supabase, [receiver.id]))[receiver.id] ?? this.createOfflinePresence(receiver.id);
    const nextStatus = receiverPresence.isOnline ? MessageStatus.DELIVERED : MessageStatus.SENT;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: actor.id,
        receiver_id: receiver.id,
        content: normalizedContent,
        original_content: normalizedContent,
        status: nextStatus,
        client_message_id: input.clientMessageId
      })
      .select(this.messageSelect())
      .single();

    if (error) {
      const duplicateMessage = await this.findExistingMessageByClientMessageId(
        supabase,
        conversationId,
        input.clientMessageId
      );

      if (duplicateMessage) {
        return this.mapMessageRecord(duplicateMessage, actor.id, actor.role);
      }

      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to send the message.", error);
    }

    return this.mapMessageRecord(data as unknown as MessageQueryRow, actor.id, actor.role);
  }

  async sendBookingMessage(bookingId: string, input: SendMessageInput): Promise<ChatMessageRecord> {
    const supabase = this.clientFactory();
    const conversationId = await this.ensureConversationForBooking(bookingId, supabase);

    return this.sendMessage(conversationId, input);
  }

  async deleteMessage(messageId: string): Promise<ChatMessageRecord> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
          ${this.messageSelect()},
          conversation:conversations!messages_conversation_id_fkey(
            id,
            tenant_id,
            landlord_id,
            booking_id
          )
        `
      )
      .eq("id", messageId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the message.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested message does not exist.");
    }

    const row = data as unknown as MessageQueryRow & {
      conversation: Pick<ConversationRow, "id" | "tenant_id" | "landlord_id" | "booking_id"> | null;
    };

    if (!row.conversation) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "The message conversation is missing.");
    }

    if (![row.sender_id, row.receiver_id].includes(actor.id) && actor.role !== UserRole.ADMIN) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to delete this message.");
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("messages")
      .update({
        is_deleted_by_sender: actor.id === row.sender_id ? true : row.is_deleted_by_sender,
        is_deleted_by_receiver: actor.id === row.receiver_id ? true : row.is_deleted_by_receiver,
        deleted_by_user_id: actor.id,
        deleted_at: new Date().toISOString()
      })
      .eq("id", messageId)
      .select(this.messageSelect())
      .single();

    if (updateError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to delete the message.", updateError);
    }

    return this.mapMessageRecord(updatedRow as unknown as MessageQueryRow, actor.id, actor.role);
  }

  async markConversationAsRead(conversationId: string): Promise<number> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const metaRow = await this.getConversationMetaById(supabase, conversationId);

    this.assertViewerCanAccess(actor.id, actor.role, metaRow);

    if (actor.role === UserRole.ADMIN) {
      return 0;
    }

    this.assertBookingChatStatus(metaRow.booking?.status);

    const { data: unreadMessages, error: unreadMessagesError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("receiver_id", actor.id)
      .in("status", [MessageStatus.SENT, MessageStatus.DELIVERED]);

    if (unreadMessagesError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load unread messages.", unreadMessagesError);
    }

    const messageIds = (unreadMessages ?? []).map((message) => message.id);

    if (messageIds.length === 0) {
      return 0;
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        status: MessageStatus.READ
      })
      .in("id", messageIds);

    if (updateError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to mark messages as read.", updateError);
    }

    const { error: readInsertError } = await supabase.from("message_reads").upsert(
      messageIds.map((messageId) => ({
        message_id: messageId,
        read_by_user_id: actor.id,
        read_at: nowIso
      })),
      {
        onConflict: "message_id,read_by_user_id"
      }
    );

    if (readInsertError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to record message reads.", readInsertError);
    }

    return messageIds.length;
  }

  async setUserPresence(isOnline: boolean): Promise<UserPresenceRecord> {
    const supabase = this.clientFactory();
    const actor = await this.authService.requireCurrentUser(supabase);
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("user_presence")
      .upsert(
        {
          user_id: actor.id,
          is_online: isOnline,
          last_seen: nowIso
        },
        {
          onConflict: "user_id"
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update user presence.", error);
    }

    if (isOnline) {
      await this.markIncomingMessagesDelivered(actor.id, supabase);
    }

    return this.mapPresenceRecord(data);
  }

  subscribeToConversationRealtime({
    conversationId,
    presenceUserIds = [],
    onMessageChange,
    onPresenceChange,
    onTypingChange
  }: ConversationRealtimeHandlers): ConversationRealtimeController {
    const supabase = this.clientFactory();
    const channel = supabase.channel(`chat-room:${conversationId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      () => {
        onMessageChange?.();
      }
    );

    if (presenceUserIds.length > 0) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence"
        },
        (payload) => {
          const nextPresence = payload.new as PresenceRow;

          if (nextPresence && presenceUserIds.includes(nextPresence.user_id)) {
            onPresenceChange?.(this.mapPresenceRecord(nextPresence));
          }
        }
      );
    }

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const nextTypingState = payload.payload as TypingState & { conversationId?: string };

      if (nextTypingState?.conversationId !== conversationId) {
        return;
      }

      onTypingChange?.({
        userId: nextTypingState.userId ?? null,
        isTyping: Boolean(nextTypingState.isTyping),
        startedAt: nextTypingState.startedAt ?? new Date().toISOString()
      });
    });

    void channel.subscribe();

    return {
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
      },
      sendTyping: async ({ userId, isTyping }) => {
        await channel.send({
          type: "broadcast",
          event: "typing",
          payload: {
            conversationId,
            userId,
            isTyping,
            startedAt: new Date().toISOString()
          }
        });
      }
    };
  }

  subscribeToMessageFeed(onChange: () => void) {
    const supabase = this.clientFactory();
    const channel: RealtimeChannel = supabase
      .channel(`message-feed:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        () => {
          onChange();
        }
      );

    void channel.subscribe();

    return {
      unsubscribe: async () => {
        await supabase.removeChannel(channel);
      }
    };
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
        onConflict: "conversation_id,user_id",
        ignoreDuplicates: true
      }
    );

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to register chat participants.", error);
    }
  }

  private async getConversationMetaById(supabase: ServiceClient, conversationId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select(this.conversationMetaSelect())
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the conversation.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The requested conversation does not exist.");
    }

    return data as unknown as ConversationMetaRow;
  }

  private async getConversationMessagesPage(
    supabase: ServiceClient,
    conversationId: string,
    actorId: string,
    actorRole: UserRole,
    options?: { before?: string | null; limit?: number }
  ): Promise<ChatMessagePage> {
    const limit = options?.limit && options.limit > 0 ? options.limit : CHAT_MESSAGE_PAGE_SIZE;
    let query = supabase
      .from("messages")
      .select(this.messageSelect())
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load conversation messages.", error);
    }

    const rows = (data ?? []) as unknown as MessageQueryRow[];
    const hasOlderMessages = rows.length > limit;
    const pageRows = rows.slice(0, limit).reverse();
    const messages = pageRows.map((row) => this.mapMessageRecord(row, actorId, actorRole));

    return {
      messages,
      hasOlderMessages,
      oldestMessageCursor: messages[0]?.createdAt ?? null
    };
  }

  private async mapConversationList(
    supabase: ServiceClient,
    rows: ConversationMetaRow[],
    actorId: string,
    actorRole: UserRole
  ): Promise<ConversationListItem[]> {
    const conversationIds = rows.map((row) => row.id);
    const metrics = await this.loadConversationMetrics(supabase, conversationIds, actorId, actorRole);
    const presenceIds = rows.map((row) => this.getOtherParticipant(row, actorId, actorRole).id);
    const presenceMap = await this.getPresenceMap(supabase, presenceIds);

    return rows.map((row) => {
      const otherParticipant = this.getOtherParticipant(row, actorId, actorRole);
      const presence = presenceMap[otherParticipant.id] ?? this.createOfflinePresence(otherParticipant.id);
      const lastMessage = metrics.lastMessageMap[row.id] ?? null;

      return this.mapConversationListItem(row, {
        actorId,
        actorRole,
        otherParticipantPresence: presence,
        lastMessage,
        unreadCount: metrics.unreadCountMap[row.id] ?? 0
      });
    });
  }

  private async loadConversationMetrics(
    supabase: ServiceClient,
    conversationIds: string[],
    actorId: string,
    actorRole: UserRole
  ) {
    if (conversationIds.length === 0) {
      return {
        lastMessageMap: {} as Record<string, ChatMessageRecord | null>,
        unreadCountMap: {} as Record<string, number>
      };
    }

    const { data, error } = await supabase
      .from("messages")
      .select(this.messageSelect())
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load chat metrics.", error);
    }

    const rows = (data ?? []) as unknown as MessageQueryRow[];
    const lastMessageMap: Record<string, ChatMessageRecord | null> = {};
    const unreadCountMap: Record<string, number> = {};

    rows.forEach((row) => {
      if (!(row.conversation_id in lastMessageMap)) {
        lastMessageMap[row.conversation_id] = this.mapMessageRecord(row, actorId, actorRole);
      }

      if (row.receiver_id === actorId && row.status !== MessageStatus.READ) {
        unreadCountMap[row.conversation_id] = (unreadCountMap[row.conversation_id] ?? 0) + 1;
      }
    });

    return {
      lastMessageMap,
      unreadCountMap
    };
  }

  private conversationMetaSelect() {
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
          price,
          maps_link,
          latitude,
          longitude,
          deposit_amount,
          available_from,
          area:areas!listings_area_id_fkey(name),
          town:towns!listings_town_id_fkey(name),
          county:counties!listings_county_id_fkey(name)
        )
      ),
      tenant:users!conversations_tenant_id_fkey(
        id,
        full_name,
        role,
        phone
      ),
      landlord:users!conversations_landlord_id_fkey(
        id,
        full_name,
        role,
        phone
      )
    `;
  }

  private messageSelect() {
    return `
      id,
      conversation_id,
      sender_id,
      receiver_id,
      content,
      original_content,
      status,
      client_message_id,
      is_deleted_by_sender,
      is_deleted_by_receiver,
      deleted_by_user_id,
      deleted_at,
      created_at,
      updated_at,
      sender:users!messages_sender_id_fkey(
        id,
        full_name,
        role,
        phone
      ),
      deletedBy:users!messages_deleted_by_user_id_fkey(
        id,
        full_name,
        role,
        phone
      )
    `;
  }

  private mapConversationThread(
    row: ConversationMetaRow,
    messagePage: ChatMessagePage,
    presence: UserPresenceRecord,
    actorId: string,
    actorRole: UserRole
  ): ConversationThread {
    return {
      ...this.mapConversationListItem(row, {
        actorId,
        actorRole,
        otherParticipantPresence: presence,
        lastMessage: messagePage.messages.at(-1) ?? null,
        unreadCount: messagePage.messages.filter(
          (message) => message.receiverId === actorId && message.status !== MessageStatus.READ
        ).length
      }),
      bookingStatus: row.booking?.status ?? BookingStatus.ACTIVE,
      bookingExpiresAt: row.booking?.expires_at ?? null,
      areaLabel: this.buildAreaLabel(
        row.booking?.listing?.area?.name ?? "",
        row.booking?.listing?.town?.name ?? "",
        row.booking?.listing?.county?.name ?? ""
      ),
      mapsLink: row.booking?.listing?.maps_link ?? null,
      latitude: row.booking?.listing?.latitude ?? null,
      longitude: row.booking?.listing?.longitude ?? null,
      messages: messagePage.messages,
      hasOlderMessages: messagePage.hasOlderMessages,
      oldestMessageCursor: messagePage.oldestMessageCursor,
      typingUserId: null
    };
  }

  private mapConversationListItem(
    row: ConversationMetaRow,
    input: {
      actorId: string;
      actorRole: UserRole;
      otherParticipantPresence: UserPresenceRecord;
      lastMessage: ChatMessageRecord | null;
      unreadCount: number;
    }
  ): ConversationListItem {
    if (!row.booking?.listing || !row.tenant || !row.landlord) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Conversation data is incomplete.");
    }

    const otherParticipant = this.getOtherParticipant(row, input.actorId, input.actorRole);
    const canSend =
      input.actorRole !== UserRole.ADMIN &&
      [row.tenant_id, row.landlord_id].includes(input.actorId) &&
      [BookingStatus.ACTIVE, BookingStatus.COMPLETED].includes(row.booking.status);

    return {
      id: row.id,
      bookingId: row.booking_id,
      listingId: row.listing_id,
      listingTitle: row.booking.listing.title,
      tenant: this.mapParticipant(row.tenant),
      landlord: this.mapParticipant(row.landlord),
      otherParticipant,
      otherParticipantIsOnline: input.otherParticipantPresence.isOnline,
      otherParticipantLastSeen: input.otherParticipantPresence.lastSeen,
      lastMessagePreview: input.lastMessage?.displayContent ?? null,
      lastMessageAt: input.lastMessage?.createdAt ?? null,
      updatedAt: row.updated_at,
      unreadCount: input.unreadCount,
      canSend,
      isReadOnly: !canSend
    };
  }

  private mapMessageRecord(row: MessageQueryRow, actorId: string, actorRole: UserRole): ChatMessageRecord {
    if (!row.sender) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Message sender data is missing.");
    }

    const isDeleted = row.is_deleted_by_sender || row.is_deleted_by_receiver;
    const deletedByRole = row.deletedBy?.role ?? null;
    const deletedLabel = deletedByRole ? `Deleted by ${deletedByRole}` : isDeleted ? "Message deleted" : null;
    const displayContent =
      isDeleted && actorRole !== UserRole.ADMIN ? "This message was deleted" : row.original_content;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      senderName: row.sender.full_name,
      senderRole: row.sender.role,
      content: row.content,
      originalContent: row.original_content,
      displayContent,
      clientMessageId: row.client_message_id,
      status: row.status,
      isDeleted,
      isDeletedBySender: row.is_deleted_by_sender,
      isDeletedByReceiver: row.is_deleted_by_receiver,
      deletedByUserId: row.deleted_by_user_id,
      deletedByRole,
      deletedLabel,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isOwnMessage: row.sender_id === actorId
    };
  }

  private mapParticipant(participant: Pick<UserRow, "id" | "full_name" | "role" | "phone">): ChatParticipant {
    return {
      id: participant.id,
      fullName: participant.full_name,
      role: participant.role,
      phone: this.normalizePhone(participant.phone)
    };
  }

  private mapPresenceRecord(row: PresenceRow): UserPresenceRecord {
    return {
      userId: row.user_id,
      isOnline: row.is_online,
      lastSeen: row.last_seen ?? null,
      updatedAt: row.updated_at ?? null
    };
  }

  private async getPresenceMap(supabase: ServiceClient, userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

    if (uniqueUserIds.length === 0) {
      return {} as Record<string, UserPresenceRecord>;
    }

    const { data, error } = await supabase.from("user_presence").select("*").in("user_id", uniqueUserIds);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load user presence.", error);
    }

    return (data ?? []).reduce<Record<string, UserPresenceRecord>>((accumulator, row) => {
      accumulator[row.user_id] = this.mapPresenceRecord(row);
      return accumulator;
    }, {});
  }

  private createOfflinePresence(userId: string): UserPresenceRecord {
    return {
      userId,
      isOnline: false,
      lastSeen: null,
      updatedAt: null
    };
  }

  private getOtherParticipant(row: ConversationMetaRow, actorId: string, actorRole: UserRole) {
    if (!row.tenant || !row.landlord) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Conversation participant data is missing.");
    }

    if (actorRole === UserRole.ADMIN) {
      return this.mapParticipant(row.tenant);
    }

    return row.tenant_id === actorId ? this.mapParticipant(row.landlord) : this.mapParticipant(row.tenant);
  }

  private async findExistingMessageByClientMessageId(
    supabase: ServiceClient,
    conversationId: string,
    clientMessageId: string
  ) {
    const { data, error } = await supabase
      .from("messages")
      .select(this.messageSelect())
      .eq("conversation_id", conversationId)
      .eq("client_message_id", clientMessageId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data as unknown as MessageQueryRow | null;
  }

  private async markIncomingMessagesDelivered(userId: string, supabase: ServiceClient) {
    const { error } = await supabase
      .from("messages")
      .update({
        status: MessageStatus.DELIVERED
      })
      .eq("receiver_id", userId)
      .eq("status", MessageStatus.SENT);

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to update delivered message states.", error);
    }
  }

  private assertViewerCanAccess(actorId: string, actorRole: UserRole, row: ConversationMetaRow) {
    if (actorRole === UserRole.ADMIN) {
      return;
    }

    if (row.tenant_id !== actorId && row.landlord_id !== actorId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "You do not have access to this conversation.");
    }
  }

  private assertParticipantCanSend(actorId: string, row: ConversationMetaRow) {
    if (row.tenant_id !== actorId && row.landlord_id !== actorId) {
      throw new ServiceError(ServiceErrorCode.FORBIDDEN, "Only booking participants can send messages.");
    }
  }

  private assertBookingChatStatus(status: BookingStatus | null | undefined) {
    if (status !== BookingStatus.ACTIVE && status !== BookingStatus.COMPLETED) {
      throw new ServiceError(
        ServiceErrorCode.FORBIDDEN,
        "Chat is only available for active or completed bookings."
      );
    }
  }

  private buildAreaLabel(areaName: string, townName: string, countyName: string) {
    return [areaName, townName, countyName].filter(Boolean).join(", ");
  }

  private normalizePhone(phone: string | null) {
    if (!phone) {
      return null;
    }

    const normalizedPhone = phone.trim();

    if (!/^\+\d{8,15}$/.test(normalizedPhone)) {
      return null;
    }

    return normalizedPhone;
  }

  private resolveClient(client?: ServiceClient) {
    return client ?? this.clientFactory();
  }
}
