"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CountdownChip } from "@/components/features/booking/countdown-chip";
import { PaymentStatusBadge } from "@/components/features/booking/payment-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToastMessage } from "@/components/ui/toast-message";
import { bookingService } from "@/lib/bookingService";
import { chatService } from "@/lib/chatService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { MessageStatus, type BookingDetail, type ChatMessageRecord, type ConversationThread } from "@/types";

import { CallLandlordButton } from "./call-landlord-button";
import { ChatThreadPanel } from "./chat-thread-panel";
import {
  buildClientMessageId,
  formatPresenceLabel,
  getErrorMessage,
  mergeChatMessages,
  mergeConversationThread,
  prependMessagePage
} from "./message-utils";

type BookingChatPanelProps = {
  bookingId: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatCoordinate(label: string, value: number | null) {
  if (value === null) {
    return null;
  }

  return `${label}: ${value}`;
}

function getFirstName(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

export function BookingChatPanel({ bookingId }: BookingChatPanelProps) {
  const { user } = useAuthStore();
  const realtimeControllerRef = useRef<ReturnType<typeof chatService.subscribeToConversationRealtime> | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const conversationId = thread?.id ?? null;
  const otherParticipantId = thread?.otherParticipant.id ?? null;
  const currentUserId = user?.id ?? null;

  const refreshThread = useCallback(
    async (preserveMessages = true) => {
      const nextThread = await chatService.getBookingConversation(bookingId);
      setThread((currentThread) => {
        const mergedThread = preserveMessages ? mergeConversationThread(currentThread, nextThread) : nextThread;
        return {
          ...mergedThread,
          typingUserId: null
        };
      });
      setChatError(null);
      await chatService.markConversationAsRead(nextThread.id).catch(() => undefined);
      return nextThread;
    },
    [bookingId]
  );

  const loadBookingDetails = useCallback(async () => {
    const nextBooking = await bookingService.getBookingById(bookingId);
    setBooking(nextBooking);
    setError(null);
  }, [bookingId]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        await loadBookingDetails();
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Something went wrong while loading this booking."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadBookingDetails]);

  useEffect(() => {
    if (!isChatModalOpen || !conversationId || !otherParticipantId || !currentUserId) {
      return undefined;
    }

    const controller = chatService.subscribeToConversationRealtime({
      conversationId,
      presenceUserIds: [otherParticipantId],
      onMessageChange: () => {
        void refreshThread(true).catch((messageError) => {
          setChatError(getErrorMessage(messageError, "Something went wrong while refreshing chat."));
        });
      },
      onPresenceChange: (presence) => {
        setThread((currentThread) =>
          currentThread && currentThread.id === conversationId
            ? {
                ...currentThread,
                otherParticipantIsOnline: presence.isOnline,
                otherParticipantLastSeen: presence.lastSeen
              }
            : currentThread
        );
      },
      onTypingChange: (typingState) => {
        if (typingState.userId !== otherParticipantId) {
          return;
        }

        setThread((currentThread) =>
          currentThread && currentThread.id === conversationId
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
  }, [conversationId, currentUserId, isChatModalOpen, otherParticipantId, refreshThread]);

  useEffect(() => {
    if (!isChatModalOpen || !conversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void refreshThread(true).catch((messageError) => {
        setChatError(getErrorMessage(messageError, "Something went wrong while refreshing chat."));
      });
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [conversationId, isChatModalOpen, refreshThread]);

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
    if (!thread || !user) {
      return;
    }

    const clientMessageId = buildClientMessageId();
    const optimisticMessage: ChatMessageRecord = {
      id: `optimistic:${clientMessageId}`,
      conversationId: thread.id,
      senderId: user.id,
      receiverId: thread.otherParticipant.id,
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

    setThread((currentThread) =>
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
      const savedMessage = await chatService.sendBookingMessage(bookingId, {
        content,
        clientMessageId
      });

      setThread((currentThread) =>
        currentThread
          ? {
              ...currentThread,
              messages: mergeChatMessages(currentThread.messages, [savedMessage])
            }
          : currentThread
      );
    } catch (sendError) {
      setThread((currentThread) =>
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
      setThread((currentThread) =>
        currentThread
          ? {
              ...currentThread,
              messages: mergeChatMessages(currentThread.messages, [deletedMessage])
            }
          : currentThread
      );
    } catch (deleteError) {
      setToast({
        tone: "error",
        message: getErrorMessage(deleteError, "Unable to delete this message.")
      });
    }
  }

  async function handleLoadOlderMessages() {
    if (!thread?.oldestMessageCursor) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const messagePage = await chatService.getConversationMessages(thread.id, {
        before: thread.oldestMessageCursor
      });
      setThread((currentThread) => (currentThread ? prependMessagePage(currentThread, messagePage) : currentThread));
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

  async function handleOpenChatModal() {
    setIsChatModalOpen(true);
    setIsChatLoading(true);
    setChatError(null);

    try {
      await refreshThread(Boolean(thread));
    } catch (loadError) {
      setChatError(getErrorMessage(loadError, "Unable to load the chat right now."));
    } finally {
      setIsChatLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading booking...</CardContent>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-sm font-semibold text-foreground">Booking unavailable</h1>
          <p className="text-xs text-rose-700">{error ?? "We could not load this booking."}</p>
          <Link href="/bookings" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to bookings
          </Link>
        </CardContent>
      </Card>
    );
  }

  const typingLabel =
    thread && thread.typingUserId === thread.otherParticipant.id
      ? `${getFirstName(thread.otherParticipant.fullName)} typing...`
      : null;

  return (
    <div className="space-y-3">
      {toast ? <ToastMessage tone={toast.tone} message={toast.message} /> : null}

      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">{booking.listing.title}</h1>
              <p className="text-xs text-muted-foreground">
                {[booking.listing.areaName, booking.listing.townName, booking.listing.countyName].filter(Boolean).join(", ")}
              </p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(booking.listing.price)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <PaymentStatusBadge status={booking.status} />
              {booking.status === "active" && booking.expiresAt ? <CountdownChip expiresAt={booking.expiresAt} /> : null}
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">{booking.listing.description}</p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => void handleOpenChatModal()}>
              Chat with landlord
            </Button>
            <CallLandlordButton phone={booking.listing.landlordPhone} />
            {booking.paymentSummary.canPayRent ? (
              <Link href={`/bookings/${booking.id}/rent`} className={buttonVariants({ size: "md" })}>
                Pay Rent
              </Link>
            ) : null}
            <Link href={`/listing/${booking.listing.id}`} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              View Listing
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Exact location</h2>
          {booking.listing.mapsLink ? (
            <Link href={booking.listing.mapsLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary">
              Open in Maps
            </Link>
          ) : (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{formatCoordinate("Latitude", booking.listing.latitude) ?? "Latitude not available"}</p>
              <p>{formatCoordinate("Longitude", booking.listing.longitude) ?? "Longitude not available"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isChatModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 md:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Chat with {booking.listing.landlordName ?? "landlord"}
                </p>
                <p className="text-[11px] text-muted-foreground">{booking.listing.title}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsChatModalOpen(false)}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isChatLoading && !thread ? (
                <Card>
                  <CardContent className="py-6 text-xs text-muted-foreground">Loading chat...</CardContent>
                </Card>
              ) : thread ? (
                <ChatThreadPanel
                  thread={thread}
                  viewer="tenant"
                  title={booking.listing.landlordName ?? "Landlord"}
                  subtitle={booking.listing.title}
                  statusLine={formatPresenceLabel(thread.otherParticipantIsOnline, thread.otherParticipantLastSeen)}
                  typingLabel={typingLabel}
                  headerAction={<CallLandlordButton phone={booking.listing.landlordPhone} variant="icon" />}
                  isSending={isSending}
                  isLoadingOlder={isLoadingOlder}
                  error={chatError}
                  onSend={handleSend}
                  onDeleteMessage={handleDeleteMessage}
                  onLoadOlder={handleLoadOlderMessages}
                  onTypingChange={handleTypingChange}
                />
              ) : (
                <Card>
                  <CardContent className="space-y-2 py-6">
                    <p className="text-xs text-rose-700">{chatError ?? "We could not load this chat."}</p>
                    <Button type="button" variant="outline" onClick={() => void handleOpenChatModal()}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
