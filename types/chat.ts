import type { BookingStatus } from "./booking";
import type { UserRole } from "./auth";

export type ChatParticipant = {
  id: string;
  fullName: string;
  role: Exclude<UserRole, UserRole.GUEST>;
};

export type ChatMessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: Exclude<UserRole, UserRole.GUEST>;
  messageText: string;
  createdAt: string;
  isOwnMessage: boolean;
};

export type ConversationListItem = {
  id: string;
  bookingId: string;
  listingId: string;
  listingTitle: string;
  tenant: ChatParticipant;
  landlord: ChatParticipant;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  canSend: boolean;
  isReadOnly: boolean;
};

export type ConversationThread = ConversationListItem & {
  bookingStatus: BookingStatus;
  bookingExpiresAt: string | null;
  areaLabel: string;
  mapsLink: string | null;
  latitude: number | null;
  longitude: number | null;
  messages: ChatMessageRecord[];
};
