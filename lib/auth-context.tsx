"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  getIdToken as firebaseGetIdToken,
  type User,
  type UserCredential,
} from "./firebase";
import { createSession, registerUser, terminateSession } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  sessionData: Record<string, unknown> | null;
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
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);

  const storeSession = (data: Record<string, unknown>) => {
    const sessionId = (data?.session as { session_id?: string })?.session_id;
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem("pilotai_session_id", sessionId);
    }
    setSessionData(data);
  };

  const clearSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pilotai_session_id");
    }
    setSessionData(null);
    setIdToken(null);
  };

  const refreshIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    return token;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
      } else {
        clearSession();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    setIdToken(token);
    if (process.env.NODE_ENV === "development") {
      console.log("[PilotAI] signIn credential:", cred);
      console.log("[PilotAI] Firebase ID Token:", token);
    }
    const data = await createSession(token);
    storeSession(data);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    setIdToken(token);
    if (process.env.NODE_ENV === "development") {
      console.log("[PilotAI] signUp credential:", cred);
      console.log("[PilotAI] Firebase ID Token:", token);
    }
    await registerUser(token, displayName || email.split("@")[0]);
    const data = await createSession(token);
    storeSession(data);
  };

  const signInWithGoogle = async () => {
    const cred: UserCredential = await signInWithPopup(auth, googleProvider);
    const token = await cred.user.getIdToken();
    setIdToken(token);

    console.log("[PilotAI] Google sign-in credential:", cred);
    console.log("[PilotAI] Google user:", cred.user);
    console.log("[PilotAI] Firebase ID Token:", token);

    const displayName = cred.user.displayName ?? cred.user.email?.split("@")[0] ?? "User";
    await registerUser(token, displayName);
    const data = await createSession(token);
    storeSession(data);

    if (process.env.NODE_ENV === "development") {
      console.log("[PilotAI] Session response:", data);
    }
  };

  const signOut = async () => {
    await terminateSession();
    await firebaseSignOut(auth);
    clearSession();
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
