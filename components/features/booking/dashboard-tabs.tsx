"use client";

import { useState } from "react";

import { ListingGrid } from "@/components/features/listings/listing-grid";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ListingPreview, UserBooking } from "@/types";

import { PreBookedList } from "./prebooked-list";

type DashboardTabsProps = {
  savedHouses: ListingPreview[];
  preBookedHouses: UserBooking[];
};

export function DashboardTabs({ savedHouses, preBookedHouses }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"saved" | "prebooked">("saved");

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition",
              activeTab === "saved" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground"
            )}
          >
            Saved Houses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prebooked")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition",
              activeTab === "prebooked" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground"
            )}
          >
            Pre-booked Houses
          </button>
        </div>

        {activeTab === "saved" ? (
          savedHouses.length > 0 ? (
            <ListingGrid listings={savedHouses} />
          ) : (
            <p className="text-xs text-muted-foreground">No saved houses yet.</p>
          )
        ) : preBookedHouses.length > 0 ? (
          <PreBookedList items={preBookedHouses} />
        ) : (
          <p className="text-xs text-muted-foreground">No pre-booked houses yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
