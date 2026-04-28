"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useAuthStore } from "@/store";

type LogoutButtonProps = Omit<ButtonProps, "onClick">;

export function LogoutButton({ children = "Log out", ...props }: LogoutButtonProps) {
  const router = useRouter();
  const { refreshAuthState } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await signOut();
      await refreshAuthState();
      router.replace("/");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button {...props} onClick={handleLogout} disabled={props.disabled || isLoading}>
      {isLoading ? "Signing out..." : children}
    </Button>
  );
}
