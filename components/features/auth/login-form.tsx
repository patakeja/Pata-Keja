"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRoleHomePath, resolveSafeAppPath, signIn, signInWithGoogle } from "@/lib/auth";
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

  const nextParam = searchParams.get("next");
  const intent = searchParams.get("intent");
  const intentCopy = getIntentCopy(intent);
  const intentLabel = intent ? intent.replaceAll("_", " ") : null;
  const safeNextPath = resolveSafeAppPath(
    nextParam,
    user ? getRoleHomePath(user.role) : "/user/dashboard"
  );

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(resolveSafeAppPath(nextParam, getRoleHomePath(user.role)));
    }
  }, [nextParam, router, status, user]);

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
      router.replace(resolveSafeAppPath(nextParam, getRoleHomePath(authenticatedUser.role)));
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
      await signInWithGoogle(safeNextPath);
    } catch (googleError) {
      setError(getErrorMessage(googleError));
      setIsGoogleLoading(false);
    }
  }

  return (
    <AuthFormShell
      eyebrow="Authentication"
      title="Welcome back"
      description="Use email or Google sign-in to continue into your protected tenant, landlord, or admin workspace."
    >
      {intentCopy && intentLabel ? <Badge>{intentLabel}</Badge> : null}
      {intentCopy ? <p className="text-xs text-muted-foreground">{intentCopy}</p> : null}

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
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        <div className="space-y-2">
          <Button className="w-full" type="submit" disabled={isSubmitting || isGoogleLoading}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleLoading}
          >
            {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
          Create an account
        </Link>
      </p>
    </AuthFormShell>
  );
}
