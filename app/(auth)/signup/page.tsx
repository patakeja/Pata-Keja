import { Suspense } from "react";

import { AuthFormShell } from "@/components/features/auth/auth-form-shell";
import { SignupForm } from "@/components/features/auth/signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthFormShell
          eyebrow="Sign Up"
          title="Create your account"
          description="Loading secure sign-up options..."
        >
          <p className="text-sm text-muted-foreground">Preparing sign-up...</p>
        </AuthFormShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
