"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ADMIN_WHITELIST_EMAILS, isWhitelistedAdminEmail } from "@/config/admin";
import { sendAdminMagicLink } from "@/lib/auth";
import { useAuthStore } from "@/store";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not send the admin magic link.";
}

export function AdminVerifyPanel() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Enter the admin email you want to verify.");
      }

      if (!isWhitelistedAdminEmail(normalizedEmail)) {
        throw new Error("That email is not on the admin whitelist.");
      }

      await sendAdminMagicLink(normalizedEmail);
      setMessage("Magic link sent. Open the email on this device to finish admin verification.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <ToastMessage message={error} /> : null}
      {message ? <ToastMessage message={message} tone="success" /> : null}

      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Admin verification</h1>
            <p className="text-xs text-muted-foreground">
              Confirm your admin email with a magic link before continuing into the operations workspace.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-[11px] font-medium text-foreground">
                Admin email
              </label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              {ADMIN_WHITELIST_EMAILS.length > 0
                ? `Only whitelisted admin emails can receive the verification link.`
                : "Admin whitelist is not configured yet. Add NEXT_PUBLIC_ADMIN_WHITELIST_EMAILS to enable this flow."}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isSubmitting || ADMIN_WHITELIST_EMAILS.length === 0}>
                {isSubmitting ? "Sending..." : "Send Magic Link"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
