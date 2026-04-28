"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CountdownChip } from "@/components/features/booking/countdown-chip";
import { PaymentStatusBadge } from "@/components/features/booking/payment-status-badge";
import { ChatThreadPanel } from "@/components/features/chat/chat-thread-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bookingService } from "@/lib/bookingService";
import { chatService } from "@/lib/chatService";
import { cn } from "@/lib/utils";
import type { BookingDetail, ConversationThread } from "@/types";

type BookingChatPanelProps = {
  bookingId: string;
};

function formatCoordinate(label: string, value: number | null) {
  if (value === null) {
    return null;
  }

  return `${label}: ${value}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading this booking.";
}

export function BookingChatPanel({ bookingId }: BookingChatPanelProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBookingConversation() {
      try {
        const [nextBooking, nextThread] = await Promise.all([
          bookingService.getBookingById(bookingId),
          chatService.getBookingConversation(bookingId)
        ]);

        if (isMounted) {
          setBooking(nextBooking);
          setThread(nextThread);
          setError(null);
        }
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

    void loadBookingConversation();
    const intervalId = window.setInterval(() => {
      void loadBookingConversation();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [bookingId]);

  async function handleSend(messageText: string) {
    setIsSending(true);
    setSendError(null);

    try {
      await chatService.sendBookingMessage(bookingId, messageText);
      const nextThread = await chatService.getBookingConversation(bookingId);
      setThread(nextThread);
    } catch (sendMessageError) {
      setSendError(getErrorMessage(sendMessageError));
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading booking...</CardContent>
      </Card>
    );
  }

  if (!booking || !thread) {
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

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">{booking.listing.title}</h1>
              <p className="text-xs text-muted-foreground">
                {[booking.listing.areaName, booking.listing.townName, booking.listing.countyName].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <PaymentStatusBadge status={booking.status} />
              {booking.status === "active" && booking.expiresAt ? <CountdownChip expiresAt={booking.expiresAt} /> : null}
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">{booking.listing.description}</p>

          <div className="flex flex-wrap gap-2">
            {booking.paymentSummary.canPayRent ? (
              <Link href={`/bookings/${booking.id}/rent`} className={buttonVariants({ size: "md" })}>
                Pay Rent
              </Link>
            ) : null}
            <Link href={`/listing/${booking.listing.id}`} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              View Public Listing
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

      <ChatThreadPanel thread={thread} onSend={handleSend} isSending={isSending} error={sendError} />
    </div>
  );
}
