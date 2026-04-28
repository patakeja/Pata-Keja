import type { ReactNode } from "react";

import { AuthGuard } from "@/components/features/auth/auth-guard";
import { UserRole } from "@/types";

export default function UserRouteLayout({ children }: { children: ReactNode }) {
  return <AuthGuard allowedRoles={[UserRole.TENANT, UserRole.LANDLORD, UserRole.ADMIN]}>{children}</AuthGuard>;
}
