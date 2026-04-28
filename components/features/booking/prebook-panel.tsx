import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { ReservationQuote } from "@/types";

type PrebookPanelProps = {
  title: string;
  priceLabel: string;
  areaLabel: string;
  quote: ReservationQuote;
  refundPercentage: number;
  action: ReactNode;
  helperText?: string;
};

export function PrebookPanel({
  title,
  priceLabel,
  areaLabel,
  quote,
  refundPercentage,
  action,
  helperText = "Payment confirmation will plug into Daraja next. The current flow uses a safe mock response."
}: PrebookPanelProps) {
  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  });
  const refundLabel = `${Math.round(refundPercentage * 100)}%`;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Reserve {title}</h1>
            <p className="text-xs text-muted-foreground">{areaLabel}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Listing price</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{priceLabel}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit amount</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatter.format(quote.depositAmount)}</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Hold duration</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{quote.holdDurationHours} hours</p>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Refund rate</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{refundLabel}</p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
            {quote.refundExplanation}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Payment step</h2>
            <p className="text-xs text-muted-foreground">
              Paying the deposit creates a live reservation hold for this house.
            </p>
          </div>
          {action}
          <p className="text-[11px] text-muted-foreground">{helperText}</p>
        </CardContent>
      </Card>
    </div>
  );
}
