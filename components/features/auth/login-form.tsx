"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";
import { EMAIL_PASSWORD_SIGNUP_ENABLED, GOOGLE_AUTH_IS_PRIMARY } from "@/config/auth-ui";
import { resolveSafeAppPath, signIn, signInWithGoogle } from "@/lib/auth";
import { useAuthStore } from "@/store";
import { RestrictedAction } from "@/types";

import { AuthFormShell } from "./auth-form-shell";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not sign you in right now.";
}

function getIntentCopy(intent: string | null) {
  if (intent === RestrictedAction.BOOK) {
    return "Sign in to reserve this house and hold your booking slot.";
  }

  if (intent === RestrictedAction.CHAT) {
    return "Sign in to start a landlord conversation.";
  }

  if (intent === RestrictedAction.VIEW_EXACT_LOCATION) {
    return "Sign in to unlock the exact property location.";
  }

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refreshAuthState } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const redirectToParam = searchParams.get("redirectTo") ?? searchParams.get("next");
  const intent = searchParams.get("intent");
  const intentCopy = getIntentCopy(intent);
  const intentLabel = intent ? intent.replaceAll("_", " ") : null;
  const safeRedirectTo = resolveSafeAppPath(redirectToParam, "/");

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(user.role === "admin" ? "/admin/verify" : safeRedirectTo);
    }
  }, [router, safeRedirectTo, status, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await signIn({
        email,
        password
      });

      await refreshAuthState();
      router.push(authenticatedUser.role === "admin" ? "/admin/verify" : safeRedirectTo);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle(safeRedirectTo);
    } catch (googleError) {
      setError(getErrorMessage(googleError));
      setIsGoogleLoading(false);
    }
  }

  return (
    <AuthFormShell
      eyebrow="Manyumba Access"
      title="Welcome back"
      description={
        GOOGLE_AUTH_IS_PRIMARY
          ? "Continue with Google first, or use email if you already have an account."
          : "Sign in with email or Google to pick up your bookings, messages, saved preferences, and landlord tools."
      }
    >
      {error ? <ToastMessage message={error} /> : null}
      {intentCopy && intentLabel ? <Badge>{intentLabel}</Badge> : null}
      {intentCopy ? <p className="text-xs text-muted-foreground">{intentCopy}</p> : null}

      <div className="space-y-4">
        <Button className="w-full" type="button" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleLoading}>
          {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>Existing email account</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting || isGoogleLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting || isGoogleLoading}
              required
            />
          </div>
          <Button className="w-full" variant="outline" type="submit" disabled={isSubmitting || isGoogleLoading}>
            {isSubmitting ? "Signing in..." : "Sign in with email"}
          </Button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/signup?redirectTo=${encodeURIComponent(safeRedirectTo)}`} className="font-medium text-primary hover:text-primary/80">
          {EMAIL_PASSWORD_SIGNUP_ENABLED ? "Create a Manyumba account" : "Create an account with Google"}
        </Link>
      </p>
    </AuthFormShell>
  );
}
