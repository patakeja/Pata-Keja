import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BookingPolicy } from "@/types";

type ReserveCtaProps = {
  href: string;
  policy: BookingPolicy;
};

export function ReserveCta({ href, policy }: ReserveCtaProps) {
  return (
    <Card className="bg-white/90">
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Booking Foundation</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Reservation flow is policy-driven</h3>
        </div>
        <div className="space-y-2 text-sm leading-6 text-muted-foreground">
          <p>Queue mode: {policy.queueStrategy.replaceAll("_", " ")}</p>
          <p>Reservation window: {policy.reservationWindowHours} hours</p>
          <p>Payment-linked reservation: {policy.requiresPaymentForReservation ? "enabled in foundation" : "disabled"}</p>
        </div>
        <Link href={href} className={buttonVariants({ size: "lg" })}>
          Log in to start booking
        </Link>
      </CardContent>
    </Card>
  );
}
