import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type PlaceholderPanelProps = {
  title: string;
  description: string;
  hint: string;
  children?: ReactNode;
};

export function PlaceholderPanel({ title, description, hint, children }: PlaceholderPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
