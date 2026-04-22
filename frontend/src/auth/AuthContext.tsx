import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import type { AccountType, RegisterPayload } from "./authTypes";

export type AuthUser = {
  userId: number;
  email: string;
  displayName: string;
  role: string;
  accountType: AccountType;
  avatarUrl: string | null;
  profileCity: string | null;
  profileRegion: string | null;
  profileBio: string | null;
  emailVerified: boolean;
};

type RegisterResult =
  | { kind: "needsVerification"; message: string; email: string }
  | { kind: "ready" };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload, avatarFile?: File | null) => Promise<RegisterResult>;
  updateProfile: (patch: {
    displayName?: string;
    profileCity?: string | null;
    profileRegion?: string | null;
    profileBio?: string | null;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthResponse = {
  token: string;
  userId: number;
  email: string;
  displayName: string;
  role: string;
  accountType: AccountType;
  avatarUrl: string | null;
  profileCity: string | null;
  profileRegion: string | null;
  profileBio: string | null;
  emailVerified?: boolean;
};

function mapUser(r: AuthResponse): AuthUser {
  return {
    userId: r.userId,
    email: r.email,
    displayName: r.displayName,
    role: r.role,
    accountType: r.accountType,
    avatarUrl: r.avatarUrl,
    profileCity: r.profileCity,
    profileRegion: r.profileRegion,
    profileBio: r.profileBio,
    emailVerified: r.emailVerified ?? true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((r: AuthResponse) => {
    setToken(r.token);
    setTok(r.token);
    setUser(mapUser(r));
  }, []);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api<AuthResponse>("/api/auth/me");
      applyAuth(r);
    } catch {
      setToken(null);
      setTok(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      applyAuth(r);
    },
    [applyAuth],
  );

  const register = useCallback(async (payload: RegisterPayload, avatarFile?: File | null): Promise<RegisterResult> => {
    if (avatarFile) {
      const fd = new FormData();
      fd.append("profile", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      fd.append("avatar", avatarFile);
      const res = await fetch("/api/auth/register", { method: "POST", body: fd });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : res.statusText;
        throw new Error(msg);
      }
      if (data.verificationRequired === true) {
        return {
          kind: "needsVerification",
          message: typeof data.message === "string" ? data.message : "Check your email.",
          email: typeof data.email === "string" ? data.email : payload.email,
        };
      }
      return { kind: "ready" };
    }
    const data = (await api<Record<string, unknown>>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    })) as { verificationRequired?: boolean; message?: string; email?: string };
    if (data.verificationRequired === true) {
      return {
        kind: "needsVerification",
        message: typeof data.message === "string" ? data.message : "Check your email.",
        email: typeof data.email === "string" ? data.email : payload.email,
      };
    }
    return { kind: "ready" };
  }, []);

  const updateProfile = useCallback(
    async (patch: { displayName?: string; profileCity?: string | null; profileRegion?: string | null; profileBio?: string | null }) => {
      const r = await api<AuthResponse>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      applyAuth(r);
    },
    [applyAuth],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<AuthResponse>("/api/users/me/avatar", { method: "POST", body: fd });
      applyAuth(r);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, updateProfile, uploadAvatar, logout, refreshMe }),
    [user, token, loading, login, register, updateProfile, uploadAvatar, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
