"use client";

import { useEffect, useState } from "react";

type CountdownChipProps = {
  expiresAt: string;
};

function getRemainingLabel(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m left`;
}

export function CountdownChip({ expiresAt }: CountdownChipProps) {
  const [label, setLabel] = useState(() => getRemainingLabel(expiresAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLabel(getRemainingLabel(expiresAt));
    }, 60000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">{label}</span>;
}
