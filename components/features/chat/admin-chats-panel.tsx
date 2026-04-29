"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { chatService } from "@/lib/chatService";
import type { ConversationListItem, ConversationThread } from "@/types";

import { ChatThreadPanel } from "./chat-thread-panel";
import { ConversationListPanel } from "./conversation-list-panel";
import {
  getErrorMessage,
  mergeConversationThread,
  prependMessagePage
} from "./message-utils";

function getFirstName(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

function getTypingLabel(thread: ConversationThread | null) {
  if (!thread?.typingUserId) {
    return null;
  }

  if (thread.typingUserId === thread.tenant.id) {
    return `${getFirstName(thread.tenant.fullName)} typing...`;
  }

  if (thread.typingUserId === thread.landlord.id) {
    return `${getFirstName(thread.landlord.fullName)} typing...`;
  }

  return null;
}

export function AdminChatsPanel() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const selectedThreadId = selectedThread?.id ?? null;
  const selectedTenantId = selectedThread?.tenant.id ?? null;
  const selectedLandlordId = selectedThread?.landlord.id ?? null;

  const loadConversations = useCallback(async () => {
    const nextConversations = await chatService.getAdminConversations();
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
    if (!selectedThreadId || !selectedTenantId || !selectedLandlordId) {
      return undefined;
    }

    const controller = chatService.subscribeToConversationRealtime({
      conversationId: selectedThreadId,
      presenceUserIds: [selectedTenantId, selectedLandlordId],
      onMessageChange: () => {
        void Promise.all([
          loadConversationThread(selectedThreadId, true),
          loadConversations()
        ]).catch((messageError) => {
          setChatError(getErrorMessage(messageError, "Something went wrong while refreshing chat."));
        });
      },
      onTypingChange: (typingState) => {
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

    return () => {
      void controller.unsubscribe();
    };
  }, [loadConversationThread, loadConversations, selectedLandlordId, selectedTenantId, selectedThreadId]);

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
      setChatError(getErrorMessage(loadOlderError, "Unable to load earlier messages."));
    } finally {
      setIsLoadingOlder(false);
    }
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

  return (
    <div className="grid gap-3 lg:grid-cols-[290px_minmax(0,1fr)]">
      <ConversationListPanel
        items={conversations}
        selectedConversationId={selectedConversationId}
        onSelect={setSelectedConversationId}
        viewer="admin"
      />

      {selectedThread ? (
        <ChatThreadPanel
          thread={selectedThread}
          viewer="admin"
          title={`${selectedThread.tenant.fullName} / ${selectedThread.landlord.fullName}`}
          subtitle={selectedThread.listingTitle}
          statusLine="Admin read-only review"
          typingLabel={getTypingLabel(selectedThread)}
          error={chatError}
          footerNote="Admin can review conversation history but cannot send messages."
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={handleLoadOlderMessages}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">
            {isThreadLoading ? "Opening conversation..." : "Select a conversation to review."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
