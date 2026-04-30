import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

export default function NotFound() {
  return (
    <PageShell className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Not Found</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">The page you requested is not available.</h1>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          The Manyumba page you tried to open is missing or no longer available. Head back to the catalog to keep browsing.
        </p>
      </div>
      <Link href="/houses" className={buttonVariants({ size: "lg" })}>
        Back to houses
      </Link>
    </PageShell>
  );
}
