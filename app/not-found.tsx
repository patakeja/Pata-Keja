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
          This scaffold already supports dynamic listing routes, but the requested record does not exist in the placeholder
          data source.
        </p>
      </div>
      <Link href="/listings" className={buttonVariants({ size: "lg" })}>
        Back to listings
      </Link>
    </PageShell>
  );
}
