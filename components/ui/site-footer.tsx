import Link from "next/link";

import { PageShell } from "@/components/ui/page-shell";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-white/70 py-10">
      <PageShell className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Pata Keja</p>
          <p>Production-ready scaffold for rentals, short stays, and reservations.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="hover:text-foreground">
            Admin
          </Link>
          <Link href="/user/dashboard" className="hover:text-foreground">
            User
          </Link>
          <Link href="/landlord/dashboard" className="hover:text-foreground">
            Landlord
          </Link>
        </div>
      </PageShell>
    </footer>
  );
}
