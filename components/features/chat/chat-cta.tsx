import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ChatCtaProps = {
  href: string;
};

export function ChatCta({ href }: ChatCtaProps) {
  return (
    <Card className="bg-white/90">
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Messaging</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Message the host after you sign in</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep your questions, booking context, and follow-ups in one place once you unlock the chat thread for this
          house.
        </p>
        <Link href={href} className={buttonVariants({ variant: "secondary" })}>
          Sign in to contact host
        </Link>
      </CardContent>
    </Card>
  );
}
