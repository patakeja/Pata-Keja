import Link from "next/link";

import { PageShell } from "@/components/ui/page-shell";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-white py-3">
      <PageShell className="flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">Pata Keja</p>
          <span>Browse rentals and short stays fast.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/houses" className="hover:text-foreground">
            Houses
          </Link>
          <Link href="/bookings" className="hover:text-foreground">
            Bookings
          </Link>
          <Link href="/profile" className="hover:text-foreground">
            Profile
          </Link>
          <Link href="/admin/dashboard" className="hover:text-foreground">
            Admin
          </Link>
          <Link href="/landlord/dashboard" className="hover:text-foreground">
            Landlord
          </Link>
        </div>
      </PageShell>
    </footer>
  );
}
