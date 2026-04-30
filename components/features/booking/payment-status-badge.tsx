"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookingStatus, PaymentStatus } from "@/types";

type PaymentStatusBadgeProps = {
  status: PaymentStatus | BookingStatus;
};

const statusClasses: Record<string, string> = {
  [PaymentStatus.PENDING]: "border-accent/40 bg-accent/18 text-accent-foreground",
  [PaymentStatus.CONFIRMED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [PaymentStatus.COMPLETED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [PaymentStatus.FAILED]: "border-rose-200 bg-rose-50 text-rose-800",
  [PaymentStatus.PARTIALLY_REFUNDED]: "border-border bg-muted text-foreground",
  [BookingStatus.ACTIVE]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [BookingStatus.EXPIRED]: "bg-rose-100 text-rose-800"
};

function formatStatusLabel(status: PaymentStatus | BookingStatus) {
  return status.replaceAll("_", " ");
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return <Badge className={cn("capitalize", statusClasses[status])}>{formatStatusLabel(status)}</Badge>;
}
