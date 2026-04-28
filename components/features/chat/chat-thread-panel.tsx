"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversationThread } from "@/types";

type ChatThreadPanelProps = {
  thread: ConversationThread;
  onSend?: (messageText: string) => Promise<void>;
  isSending?: boolean;
  error?: string | null;
  headerSlot?: ReactNode;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ChatThreadPanel({ thread, onSend, isSending = false, error, headerSlot }: ChatThreadPanelProps) {
  const [messageText, setMessageText] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSend || !messageText.trim()) {
      return;
    }

    await onSend(messageText);
    setMessageText("");
  }

  return (
    <div className="space-y-3">
      {headerSlot}

      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{thread.listingTitle}</h2>
            <p className="text-xs text-muted-foreground">{thread.areaLabel || "Exact location unlocked after booking."}</p>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md bg-muted/30 p-2">
            {thread.messages.length > 0 ? (
              thread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[88%] rounded-xl px-3 py-2 ${message.isOwnMessage ? "ml-auto bg-primary text-primary-foreground" : "bg-white text-foreground"}`}
                >
                  <p className="text-[11px] font-semibold">{message.senderName}</p>
                  <p className="mt-1 text-xs leading-5">{message.messageText}</p>
                  <p className={`mt-1 text-[10px] ${message.isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No messages yet. Start the conversation here.</p>
            )}
          </div>

          {error ? <p className="text-xs text-rose-700">{error}</p> : null}

          {thread.canSend && onSend ? (
            <form className="space-y-2" onSubmit={handleSubmit}>
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                className="min-h-[96px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-primary"
                placeholder="Type your message"
                disabled={isSending}
              />
              <Button type="submit" size="lg" disabled={isSending || !messageText.trim()}>
                {isSending ? "Sending..." : "Send"}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">This chat is read-only for your account.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
