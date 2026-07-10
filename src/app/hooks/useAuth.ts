"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicUser, SiteSummary } from "@/shared/types";
import { api, clearToken, getToken, setToken } from "../lib/api-client";

export type AuthState = PublicUser & { sites: SiteSummary[] };

interface AuthResponse { user: PublicUser; token: string; }

export function useAuth() {
  const [user, setUser] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const [me, sitesRes] = await Promise.all([
        api<{ user: PublicUser }>("/api/auth/me"),
        api<{ sites: SiteSummary[] }>("/api/sites"),
      ]);
      setUser({ ...me.user, sites: sitesRes.sites });
    } catch (err) {
      if ((err as Error & { status?: number }).status === 401) clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      await refresh();
      return { ok: true as const };
    } catch (err) {
      const message = (err as Error).message || "Login failed";
      setError(message);
      return { ok: false as const, error: message };
    }
  }, [refresh]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const res = await api<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(res.token);
      await refresh();
      return { ok: true as const };
    } catch (err) {
      const message = (err as Error).message || "Signup failed";
      setError(message);
      return { ok: false as const, error: message };
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  }, []);

  const addSite = useCallback(async (name: string, domain: string) => {
    const res = await api<{ site: SiteSummary }>("/api/sites", {
      method: "POST",
      body: JSON.stringify({ name, domain: domain || undefined }),
    });
    setUser((prev) => prev ? { ...prev, sites: [res.site, ...prev.sites] } : prev);
    return res.site;
  }, []);

  const deleteSite = useCallback(async (id: string) => {
    await api(`/api/sites/${id}`, { method: "DELETE" });
    setUser((prev) => prev ? { ...prev, sites: prev.sites.filter((s) => s.id !== id) } : prev);
  }, []);

  const updateSite = useCallback(async (id: string, name: string, domain: string, ipPrivacyMode?: "strict_hash" | "store_raw") => {
    const res = await api<{ site: SiteSummary }>(`/api/sites/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, domain: domain || undefined, ipPrivacyMode }),
    });
    setUser((prev) => prev ? {
      ...prev,
      sites: prev.sites.map((s) => s.id === id ? res.site : s)
    } : prev);
    return res.site;
  }, []);

  const deleteAccount = useCallback(async () => {
    await api("/api/account", { method: "DELETE" });
    clearToken();
    setUser(null);
  }, []);

  return { user, loading, error, login, signup, logout, addSite, updateSite, deleteSite, deleteAccount, refresh };
}
