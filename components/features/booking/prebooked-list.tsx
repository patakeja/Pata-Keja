import Link from "next/link";

import { CountdownChip } from "@/components/features/booking/countdown-chip";
import { PaymentStatusBadge } from "@/components/features/booking/payment-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UserBooking } from "@/types";

type PreBookedListProps = {
  items: UserBooking[];
};

export function PreBookedList({ items }: PreBookedListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-1 py-5">
          <h1 className="text-sm font-semibold text-foreground">Bookings</h1>
          <p className="text-xs text-muted-foreground">Your booked houses will appear here once you reserve one.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.listing.title}</p>
                <PaymentStatusBadge status={item.status} />
              </div>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                {[item.listing.areaName, item.listing.townName, item.listing.countyName].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {item.status === "active" && item.expiresAt ? (
                <CountdownChip expiresAt={item.expiresAt} />
              ) : null}
              <Link href={`/bookings/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Open
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
