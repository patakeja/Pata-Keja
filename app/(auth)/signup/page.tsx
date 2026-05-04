import { Suspense } from "react";

import { AuthFormShell } from "@/components/features/auth/auth-form-shell";
import { SignupForm } from "@/components/features/auth/signup-form";
import { EMAIL_PASSWORD_SIGNUP_ENABLED } from "@/config/auth-ui";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthFormShell
          eyebrow="Sign Up"
          title={EMAIL_PASSWORD_SIGNUP_ENABLED ? "Create your account" : "Continue with Google"}
          description={
            EMAIL_PASSWORD_SIGNUP_ENABLED
              ? "Loading secure sign-up options..."
              : "Loading Google-first sign-up options..."
          }
        >
          <p className="text-sm text-muted-foreground">Preparing sign-up...</p>
        </AuthFormShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
