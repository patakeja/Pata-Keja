import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/ui/bottom-nav";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { AuthStoreProvider } from "@/store";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Scalable Real Estate Platform`,
    template: `%s | ${APP_NAME}`
  },
  description: APP_TAGLINE
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable}`}>
      <body className="min-h-screen pb-16 font-[family:var(--font-sans)] md:pb-0">
        <AuthStoreProvider>
          {children}
          <BottomNav />
        </AuthStoreProvider>
      </body>
    </html>
  );
}
