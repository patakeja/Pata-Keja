import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.18),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(247,243,236,0.96))] px-4 py-10">
      {children}
    </div>
  );
}
