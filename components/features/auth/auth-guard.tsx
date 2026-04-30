"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { buildLoginRedirect } from "@/lib/auth";
import { useAuthStore } from "@/store";
import { type AuthenticatedUser, UserRole } from "@/types";

type AuthGuardProps = {
  allowedRoles?: Exclude<UserRole, UserRole.GUEST>[];
  children: ReactNode;
};

function isAuthorized(
  user: AuthenticatedUser | null,
  allowedRoles?: Exclude<UserRole, UserRole.GUEST>[]
) {
  if (!user) {
    return false;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(user.role);
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status, user } = useAuthStore();
  const authorized = isAuthorized(user, allowedRoles);
  const isRestoringSession = Boolean(session?.user) && !user;

  useEffect(() => {
    if (status === "loading" || isRestoringSession) {
      return;
    }

    if (!authorized) {
      router.replace(buildLoginRedirect(pathname));
    }
  }, [authorized, isRestoringSession, pathname, router, status]);

  if (status === "loading" || isRestoringSession || !authorized) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">Checking your access...</CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
