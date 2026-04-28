import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function PageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-5", className)} {...props} />;
}
