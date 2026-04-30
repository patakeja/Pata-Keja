"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function BrandLogo({ className, imageClassName, fallbackClassName }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {!hasError ? (
        <img
          src="/logo.png"
          alt={APP_NAME}
          className={cn(
            "h-11 w-auto object-contain transition-opacity",
            isLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      ) : null}

      {hasError ? (
        <span
          className={cn(
            "font-[family:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground",
            fallbackClassName
          )}
        >
          {APP_NAME}
        </span>
      ) : null}
    </div>
  );
}
