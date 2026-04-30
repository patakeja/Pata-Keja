"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPreferenceFields } from "@/components/features/location/location-preference-fields";
import { authService, getRoleHomePath, updateProfile } from "@/lib/auth";
import { useAuthStore } from "@/store";
import { IdentityProvider } from "@/types";

import { AuthFormShell } from "./auth-form-shell";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while saving your profile.";
}

export function OnboardingForm() {
  const router = useRouter();
  const { status, user, refreshAuthState } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [countyId, setCountyId] = useState("");
  const [townId, setTownId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
      setCountyId(user.countyId ? String(user.countyId) : "");
      setTownId(user.townId ? String(user.townId) : "");
    }
  }, [user]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(authService.buildLoginRedirect("/user/onboarding"));
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await updateProfile({
        fullName,
        phone,
        countyId: countyId ? Number.parseInt(countyId, 10) : null,
        townId: townId ? Number.parseInt(townId, 10) : null
      });

      await refreshAuthState();
      router.replace(getRoleHomePath(updatedUser.role));
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || !user) {
    return (
      <AuthFormShell
        eyebrow="Onboarding"
        title="Setting up your account"
        description="We are loading your Manyumba profile so we can finish account setup."
      >
        <p className="text-sm text-muted-foreground">Loading your account...</p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      eyebrow="Onboarding"
      title="Finish your profile"
      description="Manyumba uses your profile details to personalize bookings, alerts, landlord workflows, and support."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{user.role}</Badge>
        {user.provider === IdentityProvider.GOOGLE ? <Badge>Google sign-in</Badge> : <Badge>Email account</Badge>}
      </div>

      {user.provider === IdentityProvider.GOOGLE ? (
        <p className="text-xs text-muted-foreground">
          You signed in with Google, so no password setup is needed here.
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="onboarding-full-name" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <Input
            id="onboarding-full-name"
            placeholder="Your full name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="onboarding-phone" className="text-sm font-medium text-foreground">
            Phone number
          </label>
          <Input
            id="onboarding-phone"
            type="tel"
            placeholder="+2547..."
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <LocationPreferenceFields
          countyId={countyId}
          townId={townId}
          onCountyChange={(value) => {
            setCountyId(value);
            setTownId("");
          }}
          onTownChange={setTownId}
          disabled={isSubmitting}
        />
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save & Continue"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
