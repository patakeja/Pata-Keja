"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { updateEmail, updatePassword, updateProfile } from "@/lib/auth";
import { useAuthStore } from "@/store";

import { LogoutButton } from "./logout-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";
import { LocationPreferenceFields } from "@/components/features/location/location-preference-fields";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while updating your profile.";
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileSummaryPanel() {
  const { session, status, user, refreshAuthState } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [countyId, setCountyId] = useState("");
  const [townId, setTownId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setEmail(user.email);
    setCountyId(user.countyId ? String(user.countyId) : "");
    setTownId(user.townId ? String(user.townId) : "");
  }, [user]);

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Loading profile...</CardContent>
      </Card>
    );
  }

  if (session?.user && !user) {
    return (
      <Card>
        <CardContent className="space-y-3 py-5">
          <h1 className="text-sm font-semibold text-foreground">Profile</h1>
          <p className="text-xs text-muted-foreground">Restoring your account details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="space-y-3 py-5">
          <h1 className="text-sm font-semibold text-foreground">Profile</h1>
          <p className="text-xs text-muted-foreground">Sign in to manage your account.</p>
          <Link href="/login?redirectTo=/profile" className={buttonVariants({ size: "md" })}>
            Login
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setToast(null);

    try {
      await updateProfile({
        fullName,
        phone: phone.trim() || null,
        countyId: countyId ? Number.parseInt(countyId, 10) : null,
        townId: townId ? Number.parseInt(townId, 10) : null
      });
      await refreshAuthState();
      setToast({ tone: "success", message: "Profile updated successfully." });
      setIsEditing(false);
    } catch (error) {
      setToast({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingEmail(true);
    setToast(null);

    try {
      await updateEmail({ email });
      await refreshAuthState();
      setToast({
        tone: "success",
        message: "Email updated. Check your inbox if confirmation is enabled."
      });
    } catch (error) {
      setToast({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    setToast(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("The new password and confirmation do not match.");
      }

      await updatePassword({ password });
      setPassword("");
      setConfirmPassword("");
      setToast({ tone: "success", message: "Password updated successfully." });
    } catch (error) {
      setToast({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="space-y-3">
      {toast ? <ToastMessage tone={toast.tone} message={toast.message} /> : null}

      <Card className="overflow-hidden border-none bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user.fullName}</p>
            <p className="truncate text-sm text-primary-foreground/85">{user.email}</p>
            {user.countyName ? (
              <p className="truncate text-xs text-primary-foreground/75">
                {user.townName ? `${user.townName}, ` : ""}
                {user.countyName}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={isEditing ? "primary" : "outline"} size="lg" onClick={() => setIsEditing((current) => !current)}>
              {isEditing ? "Close Edit Profile" : "Edit Profile"}
            </Button>
            <LogoutButton variant="ghost" size="lg">
              Log out
            </LogoutButton>
          </div>

          {isEditing ? (
            <form className="space-y-3" onSubmit={handleProfileSubmit}>
              <div className="space-y-1">
                <label htmlFor="profile-full-name" className="text-[11px] font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="profile-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={isSavingProfile}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-phone" className="text-[11px] font-medium text-foreground">
                  Phone
                </label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSavingProfile}
                  placeholder="+2547..."
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
                disabled={isSavingProfile}
              />
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            <div className="space-y-1">
              <label htmlFor="settings-email" className="text-[11px] font-medium text-foreground">
                Email
              </label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSavingEmail}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={isSavingEmail}>
              {isSavingEmail ? "Updating..." : "Update Email"}
            </Button>
          </form>

          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            <div className="space-y-1">
              <label htmlFor="settings-password" className="text-[11px] font-medium text-foreground">
                New password
              </label>
              <Input
                id="settings-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSavingPassword}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-confirm-password" className="text-[11px] font-medium text-foreground">
                Confirm password
              </label>
              <Input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSavingPassword}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={isSavingPassword}>
              {isSavingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
