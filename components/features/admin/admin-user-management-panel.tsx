"use client";

import { useEffect, useState, type FormEvent } from "react";

import { adminService } from "@/lib/adminService";
import type { AdminUserRoleEntry } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while loading user administration.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function AdminUserManagementPanel() {
  const [users, setUsers] = useState<AdminUserRoleEntry[]>([]);
  const [email, setEmail] = useState("");
  const [commissionPercentage, setCommissionPercentage] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const directory = await adminService.getUserRoleDirectory();

        if (isMounted) {
          setUsers(directory);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const nextCommission = Number(commissionPercentage);

      if (!Number.isFinite(nextCommission)) {
        throw new Error("Commission percentage must be a valid number.");
      }

      const updatedUser = await adminService.assignLandlordRoleByEmail({
        email,
        commissionPercentage: nextCommission
      });

      setUsers((currentUsers) => {
        const hasExistingEntry = currentUsers.some((user) => user.id === updatedUser.id);
        const nextUsers = hasExistingEntry
          ? currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
          : [updatedUser, ...currentUsers];

        return nextUsers.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      });
      setMessage(`Landlord access enabled for ${updatedUser.email}.`);
      setEmail("");
      setCommissionPercentage(String(updatedUser.commissionPercentage));
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Landlord access</h1>
            <p className="text-xs text-muted-foreground">
              Promote existing users by email and assign the commission percentage that will apply on confirmed rent.
            </p>
          </div>

          <form className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_auto]" onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionPercentage}
              onChange={(event) => setCommissionPercentage(event.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <Button type="submit" disabled={isLoading || isSaving}>
              {isSaving ? "Assigning..." : "Assign landlord"}
            </Button>
          </form>

          {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">User directory</h2>
              <p className="text-xs text-muted-foreground">
                Review account roles and existing commission settings in a compact list.
              </p>
            </div>
            <Badge>{users.length} users</Badge>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading directory...</p>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="rounded-md border border-border/70 bg-white px-2 py-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{user.fullName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{user.role}</Badge>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                        {user.commissionPercentage}% commission
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Phone: {user.phone ?? "Not set"}</span>
                    <span>Joined: {formatDate(user.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No user profiles are available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
