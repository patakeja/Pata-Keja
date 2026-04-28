"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookingStatus, PaymentStatus } from "@/types";

type PaymentStatusBadgeProps = {
  status: PaymentStatus | BookingStatus;
};

const statusClasses: Record<PaymentStatus | BookingStatus, string> = {
  [PaymentStatus.PENDING]: "bg-amber-100 text-amber-800",
  [PaymentStatus.CONFIRMED]: "bg-emerald-100 text-emerald-800",
  [PaymentStatus.PARTIALLY_REFUNDED]: "bg-slate-200 text-slate-800",
  [BookingStatus.ACTIVE]: "bg-blue-100 text-blue-800",
  [BookingStatus.EXPIRED]: "bg-rose-100 text-rose-800",
  [BookingStatus.COMPLETED]: "bg-emerald-100 text-emerald-800"
};

function formatStatusLabel(status: PaymentStatus | BookingStatus) {
  return status.replaceAll("_", " ");
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return <Badge className={cn("capitalize", statusClasses[status])}>{formatStatusLabel(status)}</Badge>;
}
