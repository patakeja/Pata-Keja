import { Suspense } from "react";

import { AuthFormShell } from "@/components/features/auth/auth-form-shell";
import { LoginForm } from "@/components/features/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthFormShell
          eyebrow="Authentication"
          title="Welcome back"
          description="Loading secure sign-in options..."
        >
          <p className="text-sm text-muted-foreground">Preparing sign-in...</p>
        </AuthFormShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
