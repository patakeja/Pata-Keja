"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToastMessage } from "@/components/ui/toast-message";
import { cn } from "@/lib/utils";

type CallLandlordButtonProps = {
  phone: string | null;
  label?: string;
  variant?: "full" | "icon";
  className?: string;
};

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-5.9-5.9A19.7 19.7 0 0 1 2.2 4.3 2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7l.4 2.9a2 2 0 0 1-.6 1.7l-1.3 1.3a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 1.7-.6l2.9.4A2 2 0 0 1 22 16.9Z" />
    </svg>
  );
}

function canUseDialer() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

export function CallLandlordButton({
  phone,
  label = "Call",
  variant = "full",
  className
}: CallLandlordButtonProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  if (!phone) {
    return null;
  }

  function handleCall() {
    if (!canUseDialer()) {
      setToastMessage("Calling not supported on this device");
      return;
    }

    window.location.href = `tel:${phone}`;
  }

  return (
    <>
      {toastMessage ? <ToastMessage message={toastMessage} /> : null}
      <Button
        type="button"
        variant={variant === "icon" ? "outline" : "secondary"}
        size={variant === "icon" ? "sm" : "md"}
        className={cn(variant === "icon" ? "h-8 w-8 px-0" : "gap-1.5", className)}
        onClick={handleCall}
        aria-label={variant === "icon" ? `Call ${phone}` : undefined}
      >
        <PhoneIcon className="h-3.5 w-3.5" />
        {variant === "full" ? <span>{label}</span> : null}
      </Button>
    </>
  );
}
