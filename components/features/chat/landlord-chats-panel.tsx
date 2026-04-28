"use client";

import { useEffect, useState } from "react";

import { ChatThreadPanel } from "@/components/features/chat/chat-thread-panel";
import { ConversationListPanel } from "@/components/features/chat/conversation-list-panel";
import { Card, CardContent } from "@/components/ui/card";
import { chatService } from "@/lib/chatService";
import type { ConversationListItem, ConversationThread } from "@/types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading chats.";
}

export function LandlordChatsPanel() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        const nextConversations = await chatService.getLandlordConversations();

        if (!isMounted) {
          return;
        }

        setConversations(nextConversations);
        setSelectedConversationId((current) =>
          current && nextConversations.some((conversation) => conversation.id === current)
            ? current
            : nextConversations[0]?.id ?? null
        );
        setError(null);
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadConversations();
    const intervalId = window.setInterval(() => {
      void loadConversations();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!selectedConversationId) {
      setSelectedThread(null);
      return;
    }

    void (async () => {
      try {
        const nextThread = await chatService.getConversationThread(selectedConversationId);

        if (isMounted) {
          setSelectedThread(nextThread);
          setSendError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setSendError(getErrorMessage(loadError));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  async function handleSend(messageText: string) {
    if (!selectedConversationId) {
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await chatService.sendMessage(selectedConversationId, messageText);
      const [nextConversations, nextThread] = await Promise.all([
        chatService.getLandlordConversations(),
        chatService.getConversationThread(selectedConversationId)
      ]);
      setConversations(nextConversations);
      setSelectedThread(nextThread);
    } catch (sendMessageError) {
      setSendError(getErrorMessage(sendMessageError));
    } finally {
      setIsSending(false);
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
    <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ConversationListPanel
        items={conversations}
        selectedConversationId={selectedConversationId}
        onSelect={setSelectedConversationId}
        viewer="landlord"
      />

      {selectedThread ? (
        <ChatThreadPanel thread={selectedThread} onSend={handleSend} isSending={isSending} error={sendError} />
      ) : (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">Select a conversation to open the thread.</CardContent>
        </Card>
      )}
    </div>
  );
}
