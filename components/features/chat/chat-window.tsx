"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConversationThread } from "@/types";

import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";

type ChatWindowProps = {
  thread: ConversationThread;
  viewer: "tenant" | "landlord" | "admin";
  title: string;
  subtitle: string;
  statusLine?: string | null;
  typingLabel?: string | null;
  error?: string | null;
  emptyState?: string;
  footerNote?: string | null;
  headerAction?: ReactNode;
  isSending?: boolean;
  isLoadingOlder?: boolean;
  onSend?: (content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onLoadOlder?: () => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
};

export function ChatWindow({
  thread,
  viewer,
  title,
  subtitle,
  statusLine,
  typingLabel,
  error,
  emptyState = "No messages yet. Start the conversation here.",
  footerNote,
  headerAction,
  isSending = false,
  isLoadingOlder = false,
  onSend,
  onDeleteMessage,
  onLoadOlder,
  onTypingChange
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialScrollPendingRef = useRef(true);
  const isNearBottomRef = useRef(true);
  const prependSnapshotRef = useRef<{ height: number; top: number } | null>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    initialScrollPendingRef.current = true;
    previousLastMessageIdRef.current = null;
    previousMessageCountRef.current = 0;
  }, [thread.id]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    if (prependSnapshotRef.current) {
      const snapshot = prependSnapshotRef.current;

      requestAnimationFrame(() => {
        const nextContainer = scrollRef.current;

        if (!nextContainer) {
          return;
        }

        nextContainer.scrollTop = nextContainer.scrollHeight - snapshot.height + snapshot.top;
        prependSnapshotRef.current = null;
      });

      return;
    }

    const nextLastMessageId = thread.messages.at(-1)?.id ?? null;
    const didAppendMessages =
      thread.messages.length > previousMessageCountRef.current &&
      previousLastMessageIdRef.current !== nextLastMessageId;

    if (
      initialScrollPendingRef.current ||
      (didAppendMessages && (isNearBottomRef.current || thread.messages.at(-1)?.isOwnMessage))
    ) {
      requestAnimationFrame(() => {
        const nextContainer = scrollRef.current;

        if (!nextContainer) {
          return;
        }

        nextContainer.scrollTop = nextContainer.scrollHeight;
      });

      initialScrollPendingRef.current = false;
    }

    previousLastMessageIdRef.current = nextLastMessageId;
    previousMessageCountRef.current = thread.messages.length;
  }, [thread.messages]);

  useEffect(() => {
    if (!typingLabel || !isNearBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      const container = scrollRef.current;

      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  }, [typingLabel]);

  function handleScroll() {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 72;

    if (container.scrollTop <= 24 && thread.hasOlderMessages && !isLoadingOlder && onLoadOlder) {
      prependSnapshotRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop
      };
      void onLoadOlder();
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-white px-3 py-2">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
            {statusLine ? <p className="truncate text-[11px] text-muted-foreground">{statusLine}</p> : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-[55vh] min-h-[360px] flex-col gap-2 overflow-y-auto bg-muted/20 px-2 py-2"
        >
          {thread.hasOlderMessages || isLoadingOlder ? (
            <div className="sticky top-0 z-10 flex justify-center">
              <span className="rounded-full border border-border/70 bg-white/95 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
                {isLoadingOlder ? "Loading earlier messages..." : "Scroll up for earlier messages"}
              </span>
            </div>
          ) : null}

          {thread.messages.length > 0 ? (
            thread.messages.map((message) => {
              const isOutgoing = viewer === "admin" ? message.senderId === thread.tenant.id : message.isOwnMessage;
              const canDelete = viewer !== "admin" && !thread.isReadOnly && !message.isDeleted && Boolean(onDeleteMessage);

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOutgoing={isOutgoing}
                  showSenderName={viewer === "admin"}
                  showStatus={viewer === "admin" ? true : isOutgoing}
                  canDelete={canDelete}
                  onDelete={onDeleteMessage}
                />
              );
            })
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-xs text-muted-foreground">
              {emptyState}
            </div>
          )}

          {typingLabel ? (
            <div className="mr-auto max-w-[80%]">
              <div className="rounded-2xl bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
                {typingLabel}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="border-t border-border/70 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        ) : null}

        {thread.canSend && onSend ? (
          <ChatInput
            disabled={thread.isReadOnly}
            isSending={isSending}
            onSend={onSend}
            onTypingChange={onTypingChange}
          />
        ) : (
          <div className={cn("border-t border-border/70 bg-white px-3 py-2 text-xs text-muted-foreground")}>
            {footerNote ?? "This conversation is read-only for your account."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
