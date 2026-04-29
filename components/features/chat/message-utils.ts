import type { ChatMessagePage, ChatMessageRecord, ConversationThread } from "@/types";

export function mergeChatMessages(existing: ChatMessageRecord[], incoming: ChatMessageRecord[]) {
  const messageMap = new Map<string, ChatMessageRecord>();

  [...existing, ...incoming].forEach((message) => {
    const optimisticKey = message.clientMessageId ? `client:${message.clientMessageId}` : null;
    const existingById = messageMap.get(message.id);
    const existingByClientId = optimisticKey ? messageMap.get(optimisticKey) : null;

    if (!existingById || !existingById.isOptimistic || !message.isOptimistic) {
      messageMap.set(message.id, message);
    }

    if (optimisticKey) {
      messageMap.set(optimisticKey, message);
    }

    if (existingByClientId && existingByClientId.id !== message.id) {
      messageMap.delete(existingByClientId.id);
    }
  });

  return [...new Map(
    [...messageMap.values()].map((message) => [message.id, message])
  ).values()].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function buildClientMessageId() {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatConversationTimestamp(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPresenceLabel(isOnline: boolean, lastSeen: string | null) {
  if (isOnline) {
    return "Online";
  }

  if (!lastSeen) {
    return "Offline";
  }

  const lastSeenDate = new Date(lastSeen);
  const diffMs = Date.now() - lastSeenDate.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Last seen ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Last seen ${diffHours}h ago`;
  }

  return `Last seen ${new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(lastSeenDate)}`;
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function mergeConversationThread(
  existingThread: ConversationThread | null,
  incomingThread: ConversationThread
): ConversationThread {
  if (!existingThread || existingThread.id !== incomingThread.id) {
    return incomingThread;
  }

  return {
    ...incomingThread,
    messages: mergeChatMessages(existingThread.messages, incomingThread.messages),
    hasOlderMessages: existingThread.hasOlderMessages || incomingThread.hasOlderMessages,
    oldestMessageCursor: existingThread.oldestMessageCursor ?? incomingThread.oldestMessageCursor,
    typingUserId: existingThread.typingUserId
  };
}

export function prependMessagePage(thread: ConversationThread, page: ChatMessagePage): ConversationThread {
  return {
    ...thread,
    messages: mergeChatMessages(page.messages, thread.messages),
    hasOlderMessages: page.hasOlderMessages,
    oldestMessageCursor: page.oldestMessageCursor ?? thread.oldestMessageCursor
  };
}
