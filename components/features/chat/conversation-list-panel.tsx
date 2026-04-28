"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/types";

type ConversationListPanelProps = {
  items: ConversationListItem[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
  viewer: "landlord" | "admin";
};

function formatRelativeTimestamp(value: string | null) {
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

export function ConversationListPanel({
  items,
  selectedConversationId,
  onSelect,
  viewer
}: ConversationListPanelProps) {
  const title = viewer === "landlord" ? "Chats" : "Conversation Viewer";

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {viewer === "landlord" ? "Booking conversations with your tenants." : "Read-only booking conversations across the platform."}
          </p>
        </div>

        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-3 text-left transition",
                  selectedConversationId === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-primary/30"
                )}
              >
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.tenant.fullName}</p>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{item.listingTitle}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.lastMessageText ?? "No messages yet"}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{formatRelativeTimestamp(item.lastMessageAt)}</p>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
