import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AuthFormShell } from "./auth-form-shell";

export function SignupForm() {
  return (
    <AuthFormShell
      eyebrow="Sign Up"
      title="Create your account"
      description="This scaffold separates auth UI from Supabase auth flows so role onboarding can expand cleanly later."
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <Input id="fullName" placeholder="Your name" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input id="signup-email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input id="signup-password" type="password" placeholder="Create a password" autoComplete="new-password" />
        </div>
        <Button className="w-full">Create Account</Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Sign in
        </Link>
      </p>
    </AuthFormShell>
  );
}
