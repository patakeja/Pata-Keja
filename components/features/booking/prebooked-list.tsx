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
  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  });

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{item.listing.title}</p>
                  <PaymentStatusBadge status={item.status} />
                </div>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {[item.listing.areaName, item.listing.townName, item.listing.countyName].filter(Boolean).join(", ")}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-muted px-2 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit paid</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {formatter.format(item.paymentSummary.depositPaidAmount)}
                  </p>
                </div>
                <div className="rounded-md bg-muted px-2 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Remaining rent</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {formatter.format(item.paymentSummary.remainingRentAmount)}
                  </p>
                </div>
                <div className="rounded-md bg-muted px-2 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit status</p>
                  <div className="mt-1">
                    {item.paymentSummary.depositPaymentStatus ? (
                      <PaymentStatusBadge status={item.paymentSummary.depositPaymentStatus} />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Pending setup</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {item.status === "active" && item.expiresAt ? (
                <CountdownChip expiresAt={item.expiresAt} />
              ) : item.paymentSummary.rentPaymentStatus ? (
                <PaymentStatusBadge status={item.paymentSummary.rentPaymentStatus} />
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                {item.paymentSummary.canPayRent ? (
                  <Link href={`/user/bookings/${item.id}/rent`} className={buttonVariants({ size: "sm" })}>
                    Pay Rent
                  </Link>
                ) : null}
                <Link href={`/listing/${item.listing.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  View
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
