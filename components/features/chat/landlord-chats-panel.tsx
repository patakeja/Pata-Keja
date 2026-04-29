"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { ToastMessage } from "@/components/ui/toast-message";
import { chatService } from "@/lib/chatService";
import { useAuthStore } from "@/store";
import { MessageStatus, type ChatMessageRecord, type ConversationListItem, type ConversationThread } from "@/types";

import { ChatThreadPanel } from "./chat-thread-panel";
import { ConversationListPanel } from "./conversation-list-panel";
import {
  buildClientMessageId,
  formatPresenceLabel,
  getErrorMessage,
  mergeChatMessages,
  mergeConversationThread,
  prependMessagePage
} from "./message-utils";

function getFirstName(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

export function LandlordChatsPanel() {
  const { user } = useAuthStore();
  const realtimeControllerRef = useRef<ReturnType<typeof chatService.subscribeToConversationRealtime> | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const selectedThreadId = selectedThread?.id ?? null;
  const selectedOtherParticipantId = selectedThread?.otherParticipant.id ?? null;
  const currentUserId = user?.id ?? null;

  const loadConversations = useCallback(async () => {
    const nextConversations = await chatService.getLandlordConversations();
    setConversations(nextConversations);
    setSelectedConversationId((currentConversationId) => {
      if (currentConversationId && nextConversations.some((conversation) => conversation.id === currentConversationId)) {
        return currentConversationId;
      }

      return nextConversations[0]?.id ?? null;
    });
    setError(null);
    return nextConversations;
  }, []);

  const loadConversationThread = useCallback(async (conversationId: string, preserveMessages = true) => {
    const nextThread = await chatService.getConversationThread(conversationId);
    setSelectedThread((currentThread) => {
      const mergedThread = preserveMessages ? mergeConversationThread(currentThread, nextThread) : nextThread;
      return {
        ...mergedThread,
        typingUserId: null
      };
    });
    setChatError(null);
    await chatService.markConversationAsRead(conversationId).catch(() => undefined);
    return nextThread;
  }, []);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        await loadConversations();
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Something went wrong while loading chats."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    const subscription = chatService.subscribeToMessageFeed(() => {
      void loadConversations().catch(() => undefined);
    });

    return () => {
      isMounted = false;
      void subscription.unsubscribe();
    };
  }, [loadConversations]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedConversationId) {
      setSelectedThread(null);
      return undefined;
    }

    setIsThreadLoading(true);

    void (async () => {
      try {
        await loadConversationThread(selectedConversationId, false);
      } catch (loadError) {
        if (isMounted) {
          setChatError(getErrorMessage(loadError, "Unable to open this conversation."));
        }
      } finally {
        if (isMounted) {
          setIsThreadLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadConversationThread, selectedConversationId]);

  useEffect(() => {
    if (!selectedThreadId || !selectedOtherParticipantId || !currentUserId) {
      return undefined;
    }

    const controller = chatService.subscribeToConversationRealtime({
      conversationId: selectedThreadId,
      presenceUserIds: [selectedOtherParticipantId],
      onMessageChange: () => {
        void Promise.all([
          loadConversationThread(selectedThreadId, true),
          loadConversations()
        ]).catch((messageError) => {
          setChatError(getErrorMessage(messageError, "Something went wrong while refreshing chat."));
        });
      },
      onPresenceChange: (presence) => {
        setSelectedThread((currentThread) =>
          currentThread && currentThread.id === selectedThreadId
            ? {
                ...currentThread,
                otherParticipantIsOnline: presence.isOnline,
                otherParticipantLastSeen: presence.lastSeen
              }
            : currentThread
        );
        setConversations((currentItems) =>
          currentItems.map((item) =>
            item.id === selectedThreadId
              ? {
                  ...item,
                  otherParticipantIsOnline: presence.isOnline,
                  otherParticipantLastSeen: presence.lastSeen
                }
              : item
          )
        );
      },
      onTypingChange: (typingState) => {
        if (typingState.userId !== selectedOtherParticipantId) {
          return;
        }

        setSelectedThread((currentThread) =>
          currentThread && currentThread.id === selectedThreadId
            ? {
                ...currentThread,
                typingUserId: typingState.isTyping ? typingState.userId : null
              }
            : currentThread
        );
      }
    });

    realtimeControllerRef.current = controller;

    return () => {
      void controller.sendTyping({
        userId: currentUserId,
        isTyping: false
      }).catch(() => undefined);
      void controller.unsubscribe();

      if (realtimeControllerRef.current === controller) {
        realtimeControllerRef.current = null;
      }
    };
  }, [currentUserId, loadConversationThread, loadConversations, selectedOtherParticipantId, selectedThreadId]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function handleSend(content: string) {
    if (!selectedThread || !user) {
      return;
    }

    const clientMessageId = buildClientMessageId();
    const optimisticMessage: ChatMessageRecord = {
      id: `optimistic:${clientMessageId}`,
      conversationId: selectedThread.id,
      senderId: user.id,
      receiverId: selectedThread.otherParticipant.id,
      senderName: user.fullName,
      senderRole: user.role,
      content,
      originalContent: content,
      displayContent: content,
      clientMessageId,
      status: MessageStatus.SENDING,
      isDeleted: false,
      isDeletedBySender: false,
      isDeletedByReceiver: false,
      deletedByUserId: null,
      deletedByRole: null,
      deletedLabel: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOwnMessage: true,
      isOptimistic: true
    };

    setSelectedThread((currentThread) =>
      currentThread
        ? {
            ...currentThread,
            messages: mergeChatMessages(currentThread.messages, [optimisticMessage]),
            typingUserId: null
          }
        : currentThread
    );
    setIsSending(true);
    setChatError(null);

    try {
      const savedMessage = await chatService.sendMessage(selectedThread.id, {
        content,
        clientMessageId
      });
      setSelectedThread((currentThread) =>
        currentThread
          ? {
              ...currentThread,
              messages: mergeChatMessages(currentThread.messages, [savedMessage])
            }
          : currentThread
      );
      void loadConversations().catch(() => undefined);
    } catch (sendError) {
      setSelectedThread((currentThread) =>
        currentThread
          ? {
              ...currentThread,
              messages: currentThread.messages.filter((message) => message.id !== optimisticMessage.id)
            }
          : currentThread
      );
      setChatError(getErrorMessage(sendError, "Unable to send the message."));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      const deletedMessage = await chatService.deleteMessage(messageId);
      setSelectedThread((currentThread) =>
        currentThread
          ? {
              ...currentThread,
              messages: mergeChatMessages(currentThread.messages, [deletedMessage])
            }
          : currentThread
      );
      void loadConversations().catch(() => undefined);
    } catch (deleteError) {
      setToast({
        tone: "error",
        message: getErrorMessage(deleteError, "Unable to delete this message.")
      });
    }
  }

  async function handleLoadOlderMessages() {
    if (!selectedThread?.oldestMessageCursor) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const messagePage = await chatService.getConversationMessages(selectedThread.id, {
        before: selectedThread.oldestMessageCursor
      });
      setSelectedThread((currentThread) => (currentThread ? prependMessagePage(currentThread, messagePage) : currentThread));
    } catch (loadOlderError) {
      setToast({
        tone: "error",
        message: getErrorMessage(loadOlderError, "Unable to load earlier messages.")
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function handleTypingChange(isTyping: boolean) {
    if (!user || !realtimeControllerRef.current) {
      return;
    }

    await realtimeControllerRef.current.sendTyping({
      userId: user.id,
      isTyping
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading chats...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-rose-700">{error}</CardContent>
      </Card>
    );
  }

  const typingLabel =
    selectedThread && selectedThread.typingUserId === selectedThread.otherParticipant.id
      ? `${getFirstName(selectedThread.otherParticipant.fullName)} typing...`
      : null;
  const statusLine = selectedThread
    ? formatPresenceLabel(selectedThread.otherParticipantIsOnline, selectedThread.otherParticipantLastSeen)
    : null;

  return (
    <div className="space-y-3">
      {toast ? <ToastMessage tone={toast.tone} message={toast.message} /> : null}

      <div className="grid gap-3 lg:grid-cols-[290px_minmax(0,1fr)]">
        <ConversationListPanel
          items={conversations}
          selectedConversationId={selectedConversationId}
          onSelect={setSelectedConversationId}
          viewer="landlord"
        />

        {selectedThread ? (
          <ChatThreadPanel
            thread={selectedThread}
            viewer="landlord"
            title={selectedThread.otherParticipant.fullName}
            subtitle={selectedThread.listingTitle}
            statusLine={statusLine}
            typingLabel={typingLabel}
            error={chatError}
            isSending={isSending}
            isLoadingOlder={isLoadingOlder}
            onSend={handleSend}
            onDeleteMessage={handleDeleteMessage}
            onLoadOlder={handleLoadOlderMessages}
            onTypingChange={handleTypingChange}
          />
        ) : (
          <Card>
            <CardContent className="py-6 text-xs text-muted-foreground">
              {isThreadLoading ? "Opening conversation..." : "Select a conversation to reply."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
