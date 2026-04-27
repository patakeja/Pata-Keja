import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AuthFormShell } from "./auth-form-shell";

export function LoginForm() {
  return (
    <AuthFormShell
      eyebrow="Authentication"
      title="Welcome back"
      description="Supabase auth is initialized and ready for form actions in the next implementation step."
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input id="password" type="password" placeholder="Enter your password" autoComplete="current-password" />
        </div>
        <Button className="w-full">Sign In</Button>
      </form>

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
          Create an account
        </Link>
      </p>
    </AuthFormShell>
  );
}
