"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { handleAuthCallback } from "@/lib/auth";
import { useAuthStore } from "@/store";

import { AuthFormShell } from "./auth-form-shell";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not finish signing you in.";
}

export function AuthCallbackHandler() {
  const router = useRouter();
  const { refreshAuthState } = useAuthStore();
  const hasProcessedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    async function processCallback() {
      try {
        const result = await handleAuthCallback(window.location.href);
        await refreshAuthState();
        router.replace(result.nextPath);
      } catch (callbackError) {
        setError(getErrorMessage(callbackError));
      }
    }

    void processCallback();
  }, [refreshAuthState, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.18),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(247,243,236,0.96))] px-4 py-10">
      <AuthFormShell
        eyebrow="Authentication"
        title={error ? "Sign-in could not be completed" : "Finalizing your sign-in"}
        description={
          error
            ? "Your login session was not completed. You can retry sign-in or return to the homepage."
            : "We are securing your session, syncing your profile, and sending you to the right workspace."
        }
      >
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-rose-700">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className={buttonVariants({ size: "md" })}>
                Back to login
              </Link>
              <Link href="/home" className={buttonVariants({ variant: "outline", size: "md" })}>
                Go home
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Completing your sign-in...</p>
        )}
      </AuthFormShell>
    </div>
  );
}
