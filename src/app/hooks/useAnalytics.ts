"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsResponse } from "@/shared/types";
import { api } from "../lib/api-client";

interface ExtendedAnalytics extends AnalyticsResponse {
  browsers?: Array<{ label: string; views: number; percentage?: number }>;
  os?: Array<{ label: string; views: number; percentage?: number }>;
}

interface LiveData {
  liveVisitors: number;
  liveViews: number;
  activePages: Array<{ pathname: string; count: number }>;
  timestamp: number;
}

const EMPTY: ExtendedAnalytics = {
  totalViews: 0, uniqueVisitors: 0, liveVisitors: 0, bounceRate: 0,
  avgSessionDuration: "—", viewsChange: 0, visitorsChange: 0,
  timeline: [], topPages: [], referrers: [], countries: [], devices: [],
  browsers: [], os: [], hourlyTraffic: [], recentLogs: [], period: 30,
};

export function useAnalytics() {
  const [data, setData] = useState<ExtendedAnalytics>(EMPTY);
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeSiteRef = useRef<string | null>(null);

  const fetchAnalytics = useCallback(async (siteId: string, days: number) => {
    if (!siteId) return;
    activeSiteRef.current = siteId;
    setLoading(true);
    setError(null);
    try {
      const result = await api<ExtendedAnalytics>(`/api/analytics?siteId=${encodeURIComponent(siteId)}&days=${days}`);
      if (activeSiteRef.current === siteId) setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLive = useCallback(async (siteId: string) => {
    if (!siteId) return;
    try {
      const result = await api<LiveData>(`/api/analytics/live?siteId=${encodeURIComponent(siteId)}`);
      setLive(result);
    } catch { /* silent */ }
  }, []);

  // Live polling every 10s
  useEffect(() => {
    const siteId = activeSiteRef.current;
    if (!siteId) return;
    void fetchLive(siteId);
    const timer = setInterval(() => {
      const current = activeSiteRef.current;
      if (current) void fetchLive(current);
    }, 10_000);
    return () => clearInterval(timer);
  }, [fetchLive, data.period]);

  const exportData = useCallback(async (siteId: string, format: "csv" | "json") => {
    const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
    const res = await fetch(`/api/analytics/export?siteId=${encodeURIComponent(siteId)}&format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  return { data, live, loading, error, fetchAnalytics, fetchLive, exportData };
}
