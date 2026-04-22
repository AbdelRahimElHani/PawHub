import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import type { AccountType, RegisterPayload } from "./authTypes";

export type VetVerificationStatusApi = "PENDING" | "APPROVED" | "REJECTED";

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
  /** Set for veterinarian accounts from the server */
  vetVerificationStatus?: VetVerificationStatusApi | null;
  vetRejectionReason?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload, avatarFile?: File | null, vetDocuments?: File[] | null) => Promise<void>;
  updateProfile: (patch: {
    displayName?: string;
    profileCity?: string | null;
    profileRegion?: string | null;
    profileBio?: string | null;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => void;
  /** Reload `/api/auth/me` (e.g. after vet approval). */
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
  vetVerificationStatus?: string | null;
  vetRejectionReason?: string | null;
};

function normalizeVetVerificationStatus(raw: string | null | undefined): "PENDING" | "APPROVED" | "REJECTED" | null {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED") return s;
  return null;
}

function mapUser(r: AuthResponse): AuthUser {
  const vs = normalizeVetVerificationStatus(r.vetVerificationStatus);
  const vetOk = vs !== null;
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
    vetVerificationStatus: r.accountType === "VET" ? (vetOk ? vs : "PENDING") : null,
    vetRejectionReason:
      r.accountType === "VET" && vetOk && vs === "REJECTED" ? (r.vetRejectionReason ?? null) : null,
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

  const register = useCallback(
    async (payload: RegisterPayload, avatarFile?: File | null, vetDocuments?: File[] | null) => {
      const hasAvatar = Boolean(avatarFile && avatarFile.size > 0);
      const vetDocs = vetDocuments?.filter((f) => f.size > 0) ?? [];
      const useMultipart = payload.accountType === "VET" || hasAvatar;

      if (useMultipart) {
        const fd = new FormData();
        fd.append("profile", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        if (hasAvatar && avatarFile) fd.append("avatar", avatarFile);
        if (payload.accountType === "VET") {
          vetDocs.forEach((f) => fd.append("vetDocuments", f));
        }
        const res = await fetch("/api/auth/register", { method: "POST", body: fd });
        const text = await res.text();
        if (!res.ok) {
          let msg = res.statusText;
          try {
            const j = JSON.parse(text);
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const r = JSON.parse(text) as AuthResponse;
        applyAuth(r);
      } else {
        const r = await api<AuthResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        applyAuth(r);
      }
    },
    [applyAuth],
  );

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
