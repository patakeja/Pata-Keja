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
