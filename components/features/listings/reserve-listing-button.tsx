"use client";

import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/store";

type ReserveListingButtonProps = {
  listingId: string;
  canReserve: boolean;
};

export function ReserveListingButton({ listingId, canReserve }: ReserveListingButtonProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const buttonClassName = buttonVariants({
    size: "lg",
    className: canReserve ? "w-full" : "pointer-events-none w-full bg-muted text-muted-foreground"
  });

  function handleReserve() {
    if (!canReserve) {
      return;
    }

    const reservePath = `/deposit/${listingId}`;

    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(reservePath)}`);
      return;
    }

    router.push(reservePath);
  }

  if (!canReserve) {
    return <span className={buttonClassName}>Unavailable right now</span>;
  }

  return (
    <button type="button" className={buttonClassName} onClick={handleReserve}>
      Reserve this house
    </button>
  );
}
