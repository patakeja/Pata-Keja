"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { houseTypeLabels, primaryHouseTypeFilters } from "@/config/listingPresentation";
import { cn } from "@/lib/utils";
import { HouseType } from "@/types";

type HouseTypeChipsProps = {
  selectedHouseType?: HouseType;
  hrefBase?: string;
};

export function HouseTypeChips({ selectedHouseType, hrefBase = "/houses" }: HouseTypeChipsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname === hrefBase ? pathname : hrefBase;

  return (
    <div className="flex flex-wrap gap-2">
      {primaryHouseTypeFilters.map((houseType) => {
        const isActive = selectedHouseType === houseType;
        const params = new URLSearchParams(pathname === hrefBase ? searchParams.toString() : "");

        if (isActive) {
          params.delete("category");
          params.delete("houseType");
        } else {
          params.set("category", houseType);
          params.delete("houseType");
        }

        return (
          <Link
            key={houseType}
            href={params.toString() ? `${basePath}?${params.toString()}` : basePath}
            className={cn(
              "min-w-[132px] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            {houseTypeLabels[houseType]}
          </Link>
        );
      })}
    </div>
  );
}
