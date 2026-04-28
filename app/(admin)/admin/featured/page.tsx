import { Card, CardContent } from "@/components/ui/card";

export default function AdminFeaturedPage() {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-1">
          <h1 className="text-base font-semibold text-foreground">Featured houses</h1>
          <p className="text-xs text-muted-foreground">
            Curate homepage visibility and future editorial rails from this admin-only workspace.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Homepage curation</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Keep this area reserved for admin-managed featured inventory and seasonal campaigns.
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Quality review</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Featured placements should later rely on verification, image freshness, and conversion signals.
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-white px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Ad-ready foundation</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The route is in place so future sponsored rails do not require admin shell refactors.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
