import { Card, CardContent } from "@/components/ui/card";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-1">
          <h1 className="text-base font-semibold text-foreground">Marketplace analytics</h1>
          <p className="text-xs text-muted-foreground">
            Area trends, listing density, and demand signals will surface here inside the protected admin workspace.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Area stats</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Foundation ready</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Pricing trends</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Schema prepared</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Supply signals</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Admin-only route live</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
