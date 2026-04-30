import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(212,163,115,0.22),_transparent_22%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.96))] px-4 py-10">
      {children}
    </div>
  );
}
