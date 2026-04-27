import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type LocationPreviewProps = {
  areaLabel: string;
  exactLocationHint: string;
  unlockHref: string;
};

export function LocationPreview({ areaLabel, exactLocationHint, unlockHref }: LocationPreviewProps) {
  return (
    <Card className="bg-white/90">
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Location Access</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Approximate area only</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{areaLabel}</p>
        <p className="text-sm leading-6 text-muted-foreground">{exactLocationHint}</p>
        <Link href={unlockHref} className={buttonVariants({ variant: "outline" })}>
          Log in to unlock exact location
        </Link>
      </CardContent>
    </Card>
  );
}
