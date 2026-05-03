"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  useCallback,
  createContext,
  useRef,
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
  const userRef = useRef<AuthenticatedUser | null>(null);
  const sessionRef = useRef<Session | null>(null);
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

  const applySessionRestoreSnapshot = useCallback((nextSession: Session, nextEvent: AuthChangeEvent | null) => {
    const preservedUser = userRef.current?.id === nextSession.user.id ? userRef.current : null;

    startTransition(() => {
      setSession(nextSession);
      setUser(preservedUser);
      setLastEvent(nextEvent);
      setStatus(preservedUser ? "authenticated" : "loading");
    });
  }, []);

  const refreshAuthState = useCallback(async () => {
    try {
      const nextSession = await getSession();

      if (!nextSession?.user) {
        applySnapshot(null, null, null);
        return;
      }

      try {
        const nextUser = await getCurrentUserWithProfile();
        applySnapshot(nextSession, nextUser, null);
      } catch {
        applySnapshot(null, null, null);
      }
    } catch {
      if (sessionRef.current?.user) {
        applySessionRestoreSnapshot(sessionRef.current, null);
        return;
      }

      applySnapshot(null, null, null);
    }
  }, [applySessionRestoreSnapshot, applySnapshot]);

  useEffect(() => {
    userRef.current = user;
    sessionRef.current = session;
  }, [session, user]);

  useEffect(() => {
    let isMounted = true;

    void refreshAuthState();

    const subscription = onAuthStateChange(({ event, session: nextSession, user: nextUser }) => {
      if (!isMounted) {
        return;
      }

      if (nextSession?.user && !nextUser) {
        applySessionRestoreSnapshot(nextSession, event);
        void refreshAuthState();
        return;
      }

      applySnapshot(nextSession, nextUser, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySessionRestoreSnapshot, applySnapshot, refreshAuthState]);

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
