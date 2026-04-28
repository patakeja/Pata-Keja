"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

import { LogoutButton } from "./logout-button";

export function ProfileSummaryPanel() {
  const { status, user } = useAuthStore();

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

  return (
    <div className="grid gap-3 md:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Identity</p>
            <h2 className="text-sm font-semibold text-foreground">Your account details</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Full name</p>
              <p className="text-sm text-foreground">{user.fullName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Phone</p>
              <p className="text-sm text-foreground">{user.phone ?? "Not added yet"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Provider</p>
              <p className="text-sm capitalize text-foreground">{user.provider}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Access</p>
              <h2 className="text-sm font-semibold text-foreground">Session and role</h2>
            </div>
            <Badge>{user.role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep your details current so booking, landlord communication, and support workflows stay accurate.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/user/onboarding"
              className={cn(buttonVariants({ variant: "outline" }), "text-center")}
            >
              Edit profile
            </Link>
            <LogoutButton>Log out</LogoutButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
