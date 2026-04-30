import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-accent/35 bg-accent/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground",
        className
      )}
      {...props}
    />
  );
}
