import Link from "next/link";

import { houseTypeLabels, primaryHouseTypeFilters } from "@/config/listingPresentation";
import { cn } from "@/lib/utils";
import { HouseType } from "@/types";

type HouseTypeChipsProps = {
  selectedHouseType?: HouseType;
};

export function HouseTypeChips({ selectedHouseType }: HouseTypeChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {primaryHouseTypeFilters.map((houseType) => {
        const isActive = selectedHouseType === houseType;

        return (
          <Link
            key={houseType}
            href={`/houses?houseType=${houseType}`}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-medium transition",
              isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:border-primary/40"
            )}
          >
            {houseTypeLabels[houseType]}
          </Link>
        );
      })}
    </div>
  );
}
