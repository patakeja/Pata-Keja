"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { getCurrentUserWithProfile, getSession, onAuthStateChange } from "@/lib/auth";
import { chatService } from "@/lib/chatService";
import type { AuthenticatedUser } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthStoreValue = {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  session: Session | null;
  lastEvent: AuthChangeEvent | null;
  isGoogleUser: boolean;
  refreshAuthState: () => Promise<void>;
};

const AuthStoreContext = createContext<AuthStoreValue | undefined>(undefined);

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lastEvent, setLastEvent] = useState<AuthChangeEvent | null>(null);
  const currentUserId = user?.id ?? null;

  const applySnapshot = useCallback(
    (nextSession: Session | null, nextUser: AuthenticatedUser | null, nextEvent: AuthChangeEvent | null) => {
      startTransition(() => {
        setSession(nextSession);
        setUser(nextUser);
        setLastEvent(nextEvent);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      });
    },
    []
  );

  const refreshAuthState = useCallback(async () => {
    try {
      const [nextSession, nextUser] = await Promise.all([getSession(), getCurrentUserWithProfile()]);
      applySnapshot(nextSession, nextUser, null);
    } catch {
      applySnapshot(null, null, null);
    }
  }, [applySnapshot]);

  useEffect(() => {
    let isMounted = true;

    void refreshAuthState();

    const subscription = onAuthStateChange(({ event, session: nextSession, user: nextUser }) => {
      if (!isMounted) {
        return;
      }

      applySnapshot(nextSession, nextUser, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySnapshot, refreshAuthState]);

  useEffect(() => {
    if (status !== "authenticated" || !currentUserId) {
      return undefined;
    }

    let isMounted = true;

    const syncPresence = async (isOnline: boolean) => {
      if (!isMounted) {
        return;
      }

      await chatService.setUserPresence(isOnline).catch(() => undefined);
    };

    void syncPresence(!document.hidden);

    const handleVisibilityChange = () => {
      void syncPresence(!document.hidden);
    };

    const handlePageHide = () => {
      void syncPresence(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void chatService.setUserPresence(false).catch(() => undefined);
    };
  }, [currentUserId, status]);

  return (
    <AuthStoreContext.Provider
      value={{
        status,
        user,
        session,
        lastEvent,
        isGoogleUser: user?.provider === "google",
        refreshAuthState
      }}
    >
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuthStore() {
  const value = useContext(AuthStoreContext);

  if (!value) {
    throw new Error("useAuthStore must be used within AuthStoreProvider.");
  }

  return value;
}
