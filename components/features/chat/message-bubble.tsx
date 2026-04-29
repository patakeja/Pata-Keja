"use client";

import { Button } from "@/components/ui/button";
import type { ChatMessageRecord } from "@/types";

import { formatChatTime } from "./message-utils";

type MessageBubbleProps = {
  message: ChatMessageRecord;
  isOutgoing: boolean;
  showSenderName?: boolean;
  showStatus?: boolean;
  canDelete: boolean;
  onDelete?: (messageId: string) => Promise<void>;
};

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.2v3.1l2 1.2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      <path d="m3.5 8.1 2.2 2.2 5.1-5.4" />
    </svg>
  );
}

function DoubleCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path d="m1.9 8 2.4 2.4L9.2 5" />
      <path d="m8 8 2.4 2.4L15.3 5" />
    </svg>
  );
}

function MessageStatusIcon({ status }: { status: ChatMessageRecord["status"] }) {
  if (status === "sending") {
    return <ClockIcon className="h-3.5 w-3.5" />;
  }

  if (status === "sent") {
    return <CheckIcon className="h-3.5 w-3.5" />;
  }

  return <DoubleCheckIcon className="h-4 w-4" />;
}

export function MessageBubble({
  message,
  isOutgoing,
  showSenderName = false,
  showStatus = false,
  canDelete,
  onDelete
}: MessageBubbleProps) {
  const statusTone = message.status === "read" ? "text-emerald-600" : "text-muted-foreground";

  return (
    <div className={isOutgoing ? "ml-auto max-w-[88%]" : "mr-auto max-w-[88%]"}>
      <div
        className={`rounded-2xl px-3 py-2 shadow-sm transition-opacity duration-150 ${
          isOutgoing ? "bg-primary text-primary-foreground" : "bg-white text-foreground"
        } ${message.isOptimistic ? "opacity-80" : "opacity-100"}`}
      >
        {showSenderName ? (
          <p className={`mb-1 text-[10px] font-semibold ${isOutgoing ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {message.senderName}
          </p>
        ) : null}
        {message.deletedLabel && !isOutgoing ? (
          <p className="mb-1 text-[10px] font-medium opacity-80">{message.deletedLabel}</p>
        ) : null}
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.displayContent}</p>
        {message.deletedLabel && isOutgoing ? (
          <p className="mt-1 text-[10px] opacity-80">{message.deletedLabel}</p>
        ) : null}
      </div>

      <div className={`mt-1 flex items-center gap-1.5 ${isOutgoing ? "justify-end" : "justify-start"}`}>
        <span className="text-[10px] text-muted-foreground">{formatChatTime(message.createdAt)}</span>
        {showStatus ? (
          <span className={`inline-flex items-center ${statusTone}`}>
            <MessageStatusIcon status={message.status} />
          </span>
        ) : null}
        {canDelete && !message.isDeleted && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1.5 py-0 text-[10px] text-muted-foreground"
            onClick={() => void onDelete(message.id)}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
