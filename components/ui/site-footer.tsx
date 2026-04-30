import Link from "next/link";

import { PageShell } from "@/components/ui/page-shell";
import { BrandLogo } from "@/components/ui/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-white/90 py-4">
      <PageShell className="flex flex-col gap-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <BrandLogo
            className="justify-start"
            imageClassName="h-8"
            fallbackClassName="text-lg"
          />
          <span>Find and book houses easily near you.</span>
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
