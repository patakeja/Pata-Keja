"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";
import { getSession, resolveSafeAppPath, signInWithGoogle, signUp } from "@/lib/auth";
import { useAuthStore } from "@/store";

import { AuthFormShell } from "./auth-form-shell";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not create your account right now.";
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refreshAuthState } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const redirectToParam = searchParams.get("redirectTo") ?? searchParams.get("next");
  const safeRedirectTo = resolveSafeAppPath(redirectToParam, "/");

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(user.role === "admin" ? "/admin/verify" : safeRedirectTo);
    }
  }, [router, safeRedirectTo, status, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await signUp({
        email,
        password,
        fullName,
        phone: phone.trim() || null
      }, safeRedirectTo);

      await refreshAuthState();
      const session = await getSession();

      if (session?.user) {
        router.push(authenticatedUser.role === "admin" ? "/admin/verify" : safeRedirectTo);
        return;
      }

      setSuccessMessage("Account created. Check your email to continue to the next step.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setSuccessMessage(null);
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
      eyebrow="Join Manyumba"
      title="Create your account"
      description="Set up your Manyumba account once, then return straight to the booking, listing, or chat flow you came from."
    >
      {error ? <ToastMessage message={error} /> : null}
      {successMessage ? <ToastMessage message={successMessage} tone="success" /> : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <Input
            id="fullName"
            placeholder="Your name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSubmitting || isGoogleLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+2547..."
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isSubmitting || isGoogleLoading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="signup-email"
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
          <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting || isGoogleLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Button className="w-full" type="submit" disabled={isSubmitting || isGoogleLoading}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting || isGoogleLoading}
          >
            {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login?redirectTo=${encodeURIComponent(safeRedirectTo)}`} className="font-medium text-primary hover:text-primary/80">
          Sign in
        </Link>
      </p>
    </AuthFormShell>
  );
}
