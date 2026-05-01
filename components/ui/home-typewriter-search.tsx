"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const PHRASES = [
  "Rent a house",
  "Book a house",
  "Book a short stay",
  "House hunting made easy",
  "Find a house in minutes",
  "Browse verified listings",
  "Long-term rent and short stays in one place",
  "Book a stay near you",
  "Compare houses at a glance"
] as const;

const TYPE_MS = 55;
const HOLD_MS = 1300;
const BETWEEN_MS = 450;

function pickNextIndex(current: number, length: number) {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

type HomeTypewriterSearchProps = {
  className?: string;
};

export function HomeTypewriterSearch({ className }: HomeTypewriterSearchProps) {
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * PHRASES.length));
  const [text, setText] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const phrase = PHRASES[phraseIndex];

    const sleep = (ms: number) =>
      new Promise<boolean>((resolve) => {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          resolve(cancelled);
        }, ms);
      });

    (async () => {
      setText("");
      for (let i = 1; i <= phrase.length; i += 1) {
        if (cancelled) return;
        setText(phrase.slice(0, i));
        if (i < phrase.length) {
          const aborted = await sleep(TYPE_MS);
          if (aborted) return;
        }
      }
      if (cancelled) return;
      const holdAborted = await sleep(HOLD_MS);
      if (holdAborted) return;
      for (let len = phrase.length; len > 0; len -= 1) {
        if (cancelled) return;
        setText(phrase.slice(0, len - 1));
        if (len > 1) {
          const aborted = await sleep(TYPE_MS);
          if (aborted) return;
        }
      }
      if (cancelled) return;
      const gapAborted = await sleep(BETWEEN_MS);
      if (gapAborted) return;
      setPhraseIndex((i) => pickNextIndex(i, PHRASES.length));
    })();

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [phraseIndex]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Rotating search suggestions"
      className={cn(
        "flex h-10 w-full max-w-xl items-center gap-1 rounded-xl border border-input bg-white/95 px-3.5 text-sm text-muted-foreground shadow-sm transition",
        className
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{text}</span>
      <span className="shrink-0 select-none font-light text-foreground/35 tabular-nums animate-pulse">|</span>
    </div>
  );
}
