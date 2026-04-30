import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/ui/brand-logo";

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthFormShell({ eyebrow, title, description, children }: AuthFormShellProps) {
  return (
    <Card className="w-full max-w-md border-white/80 bg-white/95 shadow-[0_24px_60px_-32px_rgba(17,24,39,0.3)]">
      <CardContent className="space-y-6 p-8 sm:p-9">
        <div className="space-y-4 text-center">
          <BrandLogo className="mx-auto" imageClassName="h-10 sm:h-12" fallbackClassName="text-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
