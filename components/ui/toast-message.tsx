"use client";

import { cn } from "@/lib/utils";

type ToastMessageProps = {
  message: string;
  tone?: "error" | "success";
};

export function ToastMessage({ message, tone = "error" }: ToastMessageProps) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-xl border px-3 py-2 text-xs shadow-lg md:left-auto md:right-4 md:top-4 md:w-full md:translate-x-0",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
}
