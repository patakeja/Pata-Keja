import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthFormShell({ eyebrow, title, description, children }: AuthFormShellProps) {
  return (
    <Card className="w-full max-w-md border-white/80 bg-white/95">
      <CardContent className="space-y-6 p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
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
