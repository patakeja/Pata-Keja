"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/types";

import { formatConversationTimestamp, formatPresenceLabel } from "./message-utils";

type ConversationListPanelProps = {
  items: ConversationListItem[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
  viewer: "landlord" | "admin";
};

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                    {getInitials(viewer === "admin" ? item.tenant.fullName : item.otherParticipant.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {viewer === "landlord" ? (
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                item.otherParticipantIsOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                              )}
                            />
                          ) : null}
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {viewer === "admin" ? item.tenant.fullName : item.otherParticipant.fullName}
                          </p>
                        </div>
                        {viewer === "admin" ? (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            Landlord: {item.landlord.fullName}
                          </p>
                        ) : (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {formatPresenceLabel(item.otherParticipantIsOnline, item.otherParticipantLastSeen)}
                          </p>
                        )}
                      </div>
                      {item.unreadCount > 0 ? (
                        <span className="min-w-[18px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-semibold text-primary-foreground">
                          {item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{item.listingTitle}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.lastMessagePreview ?? "No messages yet"}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {formatConversationTimestamp(item.lastMessageAt)}
                    </p>
                  </div>
                </div>
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
