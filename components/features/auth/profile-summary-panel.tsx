"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { updateEmail, updatePassword, updateProfile } from "@/lib/auth";
import { bookingService } from "@/lib/bookingService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import type { UserBooking } from "@/types";

import { LogoutButton } from "./logout-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastMessage } from "@/components/ui/toast-message";

type ProfileSection = "edit" | "help" | "transactions" | "saved" | "settings";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

function SectionButton({
  active,
  title,
  subtitle,
  onClick
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/30"
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className={cn("text-base", active ? "text-primary" : "text-muted-foreground")}>+</span>
    </button>
  );
}

export function ProfileSummaryPanel() {
  const { status, user, refreshAuthState } = useAuthStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>("edit");
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setEmail(user.email);
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setBookings([]);
      setIsBookingsLoading(false);
      return;
    }

    setIsBookingsLoading(true);

    void (async () => {
      try {
        const nextBookings = await bookingService.getUserBookings();

        if (isMounted) {
          setBookings(nextBookings);
          setBookingsError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setBookingsError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsBookingsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const recentTransactions = useMemo(() => bookings.slice(0, 5), [bookings]);

  if (status === "loading" || !user) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <p className="text-xs text-muted-foreground">Loading your profile details...</p>
        </CardContent>
      </Card>
    );
  }

  async function handleEditProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setToast(null);

    try {
      await updateProfile({
        fullName,
        phone: phone.trim() || null
      });
      await refreshAuthState();
      setToast({
        tone: "success",
        message: "Profile updated successfully."
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingEmail(true);
    setToast(null);

    try {
      await updateEmail({
        email
      });
      await refreshAuthState();
      setToast({
        tone: "success",
        message: "Email updated. If confirmation is enabled, check your inbox to confirm the change."
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    setToast(null);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error("The new password and confirmation do not match.");
      }

      await updatePassword({
        password: newPassword
      });
      setNewPassword("");
      setConfirmPassword("");
      setToast({
        tone: "success",
        message: "Password updated successfully."
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="space-y-4">
      {toast ? <ToastMessage tone={toast.tone} message={toast.message} /> : null}

      <Card className="overflow-hidden border-none bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
              {getInitials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{user.fullName}</p>
              <p className="truncate text-sm text-primary-foreground/85">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-white/20 text-primary-foreground">{user.role}</Badge>
                <span className="text-[11px] text-primary-foreground/80">{user.provider}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-white/10 px-3 py-3">
              <p className="text-primary-foreground/80">Bookings</p>
              <p className="mt-1 text-base font-semibold text-white">{bookings.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-3">
              <p className="text-primary-foreground/80">Phone</p>
              <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{user.phone ?? "Add now"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <SectionButton
          active={activeSection === "edit"}
          title="Edit profile"
          subtitle="Update your name and phone number"
          onClick={() => setActiveSection("edit")}
        />
        <SectionButton
          active={activeSection === "help"}
          title="Help center"
          subtitle="Booking help, support, and common answers"
          onClick={() => setActiveSection("help")}
        />
        <SectionButton
          active={activeSection === "transactions"}
          title="Transactions"
          subtitle="See deposits, rent balance, and booking history"
          onClick={() => setActiveSection("transactions")}
        />
        <SectionButton
          active={activeSection === "saved"}
          title="Wishlist / Saved houses"
          subtitle="Quick access to homes you want to revisit"
          onClick={() => setActiveSection("saved")}
        />
        <SectionButton
          active={activeSection === "settings"}
          title="Settings"
          subtitle="Change email, password, and account details"
          onClick={() => setActiveSection("settings")}
        />
      </div>

      {activeSection === "edit" ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Edit profile</h2>
              <p className="text-xs text-muted-foreground">Keep your contact details current for bookings and support.</p>
            </div>

            <form className="space-y-3" onSubmit={handleEditProfileSubmit}>
              <div className="space-y-1">
                <label htmlFor="profile-full-name" className="text-[11px] font-medium text-foreground">
                  Full name
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
                  Phone number
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
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "help" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Help center</h2>
              <p className="text-xs text-muted-foreground">Quick answers for the actions you’ll use most.</p>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl border border-border bg-white px-3 py-3">
                <p className="text-sm font-semibold text-foreground">How reservation holds work</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A deposit reserves your slot until the hold expires or the rent is completed.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white px-3 py-3">
                <p className="text-sm font-semibold text-foreground">Need help with a payment?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use your bookings page to review deposit and rent status before contacting support.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/user/bookings" className={buttonVariants({ variant: "outline", size: "md" })}>
                Open bookings
              </Link>
              <Link href="/houses" className={buttonVariants({ size: "md" })}>
                Browse houses
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "transactions" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Transactions</h2>
              <p className="text-xs text-muted-foreground">Your latest booking payments and remaining balances.</p>
            </div>

            {isBookingsLoading ? (
              <p className="text-xs text-muted-foreground">Loading transactions...</p>
            ) : bookingsError ? (
              <p className="text-xs text-rose-700">{bookingsError}</p>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-border bg-white px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{booking.listing.title}</p>
                        <p className="text-[11px] text-muted-foreground">{booking.listing.areaName}, {booking.listing.townName}</p>
                      </div>
                      <Badge>{booking.status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-muted px-2 py-2">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deposit</p>
                        <p className="mt-1 font-semibold text-foreground">{booking.paymentSummary.depositPaymentStatus ?? "Not started"}</p>
                      </div>
                      <div className="rounded-xl bg-muted px-2 py-2">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Remaining rent</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {formatCurrency(booking.paymentSummary.remainingRentAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No booking transactions yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "saved" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Wishlist / Saved houses</h2>
              <p className="text-xs text-muted-foreground">
                This area is ready for your saved homes flow. For now, keep exploring and come back to compare listings.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">No saved houses yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your shortlisted houses will show up here once the save flow is enabled.
              </p>
              <Link href="/houses" className={cn(buttonVariants({ size: "md" }), "mt-3")}>
                Browse houses
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "settings" ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Change email</h2>
                <p className="text-xs text-muted-foreground">Use the email you want attached to future sign-ins and notifications.</p>
              </div>

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
                <Button type="submit" disabled={isSavingEmail}>
                  {isSavingEmail ? "Updating..." : "Update email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Change password</h2>
                <p className="text-xs text-muted-foreground">Set a new password for your account.</p>
              </div>

              <form className="space-y-3" onSubmit={handlePasswordSubmit}>
                <div className="space-y-1">
                  <label htmlFor="settings-password" className="text-[11px] font-medium text-foreground">
                    New password
                  </label>
                  <Input
                    id="settings-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
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
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Session</h2>
                <p className="text-xs text-muted-foreground">Sign out if you are done using this device.</p>
              </div>
              <LogoutButton variant="outline">Log out</LogoutButton>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
