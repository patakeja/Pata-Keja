import type { BookingStatus } from "./booking";
import type { UserRole } from "./auth";

export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read"
}

export type ChatParticipant = {
  id: string;
  fullName: string;
  role: Exclude<UserRole, UserRole.GUEST>;
  phone: string | null;
};

export type ChatMessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderRole: Exclude<UserRole, UserRole.GUEST>;
  content: string;
  originalContent: string;
  displayContent: string;
  clientMessageId: string | null;
  status: MessageStatus;
  isDeleted: boolean;
  isDeletedBySender: boolean;
  isDeletedByReceiver: boolean;
  deletedByUserId: string | null;
  deletedByRole: Exclude<UserRole, UserRole.GUEST> | null;
  deletedLabel: string | null;
  createdAt: string;
  updatedAt: string;
  isOwnMessage: boolean;
  isOptimistic?: boolean;
};

export type ConversationListItem = {
  id: string;
  bookingId: string;
  listingId: string;
  listingTitle: string;
  tenant: ChatParticipant;
  landlord: ChatParticipant;
  otherParticipant: ChatParticipant;
  otherParticipantIsOnline: boolean;
  otherParticipantLastSeen: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  unreadCount: number;
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
  hasOlderMessages: boolean;
  oldestMessageCursor: string | null;
  typingUserId: string | null;
};

export type ChatMessagePage = {
  messages: ChatMessageRecord[];
  hasOlderMessages: boolean;
  oldestMessageCursor: string | null;
};

export type MessageReadRecord = {
  id: string;
  messageId: string;
  readByUserId: string;
  readAt: string;
};

export type UserPresenceRecord = {
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
  updatedAt: string | null;
};

export type SendMessageInput = {
  content: string;
  clientMessageId: string;
};

export type TypingState = {
  userId: string | null;
  isTyping: boolean;
  startedAt: string | null;
};
