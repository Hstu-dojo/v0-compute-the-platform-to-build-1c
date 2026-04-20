"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from "./firebase";
import { createSession, terminateSession, storeTokens, clearTokens, getAccessToken, type AuthSessionResponse } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  sessionData: AuthSessionResponse | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<AuthSessionResponse | null>(null);

  // Prevent duplicate /auth/session bootstraps.
  // This happens because Firebase triggers onAuthStateChanged during sign-in,
  // while our manual sign-in flow also calls createSession().
  const manualAuthInProgressRef = useRef(false);
  const sessionBootstrapPromiseRef = useRef<Promise<AuthSessionResponse> | null>(null);

  const handleSessionResponse = (data: AuthSessionResponse) => {
    storeTokens(data.auth);
    if (data.session?.session_id && typeof window !== "undefined") {
      localStorage.setItem("pilotai_session_id", data.session.session_id);
    }
    setSessionData(data);
    if (auth.currentUser) setUser(auth.currentUser);
    setLoading(false);
  };

  const handleSignOut = () => {
    clearTokens();
    setSessionData(null);
    setIdToken(null);
  };

  const refreshIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }, []);

  const bootstrapSession = useCallback(async (firebaseIdToken: string): Promise<AuthSessionResponse> => {
    if (sessionBootstrapPromiseRef.current) return sessionBootstrapPromiseRef.current;

    const p = createSession(firebaseIdToken).finally(() => {
      sessionBootstrapPromiseRef.current = null;
    });
    sessionBootstrapPromiseRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);

        // If we already have an app token, treat this as authenticated.
        if (getAccessToken()) {
          setUser(firebaseUser);
          setLoading(false);
          return;
        }

        // If a manual sign-in flow is already bootstrapping a session, don't do it again.
        if (manualAuthInProgressRef.current) {
          setUser(firebaseUser);
          return;
        }

        try {
          const data = await bootstrapSession(token);
          handleSessionResponse(data);
        } catch (e) {
          console.error("Failed to restore session", e);
          setUser(null);
          handleSignOut();
          setLoading(false);
        }
      } else {
        setUser(null);
        handleSignOut();
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [bootstrapSession]);

  const signIn = async (email: string, password: string) => {
    manualAuthInProgressRef.current = true;
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      if (process.env.NODE_ENV === "development") {
        console.log("[PilotAI] signIn credential:", cred);
        console.log("[PilotAI] Firebase ID Token:", token);
      }
      const data = await bootstrapSession(token);
      handleSessionResponse(data);
    } catch (error) {
      console.error("[PilotAI] Sign-in failed:", error);
      setLoading(false);
      throw error;
    } finally {
      manualAuthInProgressRef.current = false;
    }
  };

  const signUp = async (email: string, password: string, _displayName: string) => {
    manualAuthInProgressRef.current = true;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      if (process.env.NODE_ENV === "development") {
        console.log("[PilotAI] signUp credential:", cred);
        console.log("[PilotAI] Firebase ID Token:", token);
      }
      const data = await bootstrapSession(token);
      handleSessionResponse(data);
    } catch (error) {
      console.error("[PilotAI] Sign-up failed:", error);
      setLoading(false);
      throw error;
    } finally {
      manualAuthInProgressRef.current = false;
    }
  };

  const signInWithGoogle = async () => {
    manualAuthInProgressRef.current = true;
    setLoading(true);
    try {
      const cred: UserCredential = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);

      console.log("[PilotAI] Google sign-in credential:", cred);
      console.log("[PilotAI] Google user:", cred.user);
      console.log("[PilotAI] Firebase ID Token:", token);

      const data = await bootstrapSession(token);
      handleSessionResponse(data);

      if (process.env.NODE_ENV === "development") {
        console.log("[PilotAI] Session response:", data);
      }
    } catch (error) {
      console.error("[PilotAI] Google sign-in failed:", error);
      setLoading(false);
      throw error;
    } finally {
      manualAuthInProgressRef.current = false;
    }
  };

  const signOut = async () => {
    await terminateSession();
    await firebaseSignOut(auth);
    handleSignOut();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, idToken, sessionData, signIn, signUp, signInWithGoogle, signOut, refreshIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
