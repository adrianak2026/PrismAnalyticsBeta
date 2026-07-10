"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays,
  ChevronDown, Clock3, Download, Gauge, Globe2, LayoutDashboard, Link2, LogOut,
  MapPin, Menu, MonitorSmartphone, MousePointer2, Plus, Radio, Settings,
  ShieldCheck, Smartphone, Trash2, Users, X, Chrome, AlertTriangle,
  RefreshCw, ExternalLink, Search, Database, FileText, Hash, ShieldAlert,
} from "lucide-react";
import { Area, AreaChart, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../hooks/useAuth";
import { Login } from "./Login";
import { SiteSettings } from "./SiteSettings";
import { WorldMap } from "./WorldMap";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Modal } from "./ui/modal";
import { ToastProvider, useToast } from "./ui/toast";

type NavId = "overview" | "live" | "pages" | "referrers" | "locations" | "devices" | "inspector" | "sites" | "settings" | "docs";

const primaryNav: Array<{ id: NavId; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "live", label: "Live", icon: Radio },
  { id: "pages", label: "Pages", icon: MousePointer2 },
  { id: "referrers", label: "Referrers", icon: Link2 },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "devices", label: "Devices", icon: MonitorSmartphone },
  { id: "inspector", label: "Raw Inspector", icon: Database },
];

const manageNav: Array<{ id: NavId; label: string; icon: typeof Activity }> = [
  { id: "sites", label: "Sites", icon: Globe2 },
  { id: "settings", label: "Settings", icon: Settings },
];

function formatNumber(n: number) { return new Intl.NumberFormat("en-US").format(n); }
function chartDate(d: string) { return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function initials(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface SidebarProps {
  active: NavId;
  setActive: (v: NavId) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  name: string;
  email: string;
  liveCount: number;
  onLogout: () => void;
}

function Sidebar({ active, setActive, open, setOpen, name, email, liveCount, onLogout }: SidebarProps) {
  const button = ({ id, label, icon: Icon, badge }: { id: NavId; label: string; icon: typeof Activity; badge?: string }) => (
    <button
      key={id}
      onClick={() => { setActive(id); setOpen(false); }}
      aria-current={active === id ? "page" : undefined}
      className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition ${
        active === id
          ? "bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]"
          : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-hover)] hover:text-[color:var(--color-text)]"
      }`}
    >
      <Icon size={17} strokeWidth={active === id ? 2.2 : 1.8} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="flex items-center gap-1 rounded-full bg-[color:var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-text)]">
          <i className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)] pulse-dot" />{badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {open && <button onClick={() => setOpen(false)} aria-label="Close menu" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-11 items-center gap-2.5 px-2">
          <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#8b6cf5] to-[#ec7d75]">
            <BarChart3 size={16} className="text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-.02em]">
            Prism<span className="text-[color:var(--color-brand)]">Analytics</span>
          </span>
          <button className="ml-auto text-[color:var(--color-text-muted)] lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-7 space-y-1">
          {primaryNav.map((n) => button({ ...n, badge: n.id === "live" && liveCount > 0 ? String(liveCount) : undefined }))}
        </nav>

        <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[color:var(--color-text-dim)]">Manage</p>
        <nav className="space-y-1">
          {manageNav.map((n) => button(n))}
          <a
            href="https://github.com/yourusername/prism-analytics#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg-hover)] hover:text-[color:var(--color-text)]"
          >
            <BookOpen size={17} />
            <span className="flex-1 text-left">Documentation</span>
            <ExternalLink size={11} />
          </a>
        </nav>

        <div className="mt-auto">
          <div className="mb-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[color:var(--color-success)]">
              <ShieldCheck size={13} />Privacy protected
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[color:var(--color-text-muted)]">
              No cookies, no IPs stored, no tracking beyond your data.
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[color:var(--color-bg-hover)]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8b6cf5] to-[#ec7d75] text-[11px] font-semibold text-white">
              {initials(name, email)}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold">{name}</strong>
              <small className="block truncate text-[10px] text-[color:var(--color-text-muted)]">{email}</small>
            </span>
            <button onClick={onLogout} title="Sign out" aria-label="Sign out" className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatCard({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: number; icon: typeof Activity; tone: string }) {
  const colors: Record<string, string> = {
    violet: "bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]",
    coral: "bg-[#3a1e1c] text-[color:var(--color-accent)]",
    blue: "bg-[#1a2a3a] text-[#5eaaf0]",
    green: "bg-[#1a2f22] text-[color:var(--color-success)]",
  };
  const positive = change >= 0;
  return (
    <Card className="relative overflow-hidden transition hover:border-[color:var(--color-brand)]/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span>
          {change !== 0 && (
            <span className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-semibold ${positive ? "bg-[#1a2f22] text-[color:var(--color-success)]" : "bg-[#3a1e1e] text-[color:var(--color-danger)]"}`}>
              {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="mt-4 text-[11px] font-medium text-[color:var(--color-text-muted)]">{label}</p>
        <p className="mt-1 text-[24px] font-semibold tracking-[-.03em]">{value}</p>
      </CardContent>
    </Card>
  );
}

function RankedList({ title, items, type }: { title: string; items: Array<{ label: string; views: number; percentage?: number }>; type: "page" | "source" | "device" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length ? (
          <div className="space-y-3.5">
            {items.map((item, index) => (
              <div key={item.label + index}>
                <div className="mb-1.5 flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold ${
                    type === "page" ? "bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]" :
                    type === "device" ? "bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)]" :
                    "bg-[#3a1e1c] text-[color:var(--color-accent)]"
                  }`}>
                    {type === "page" ? index + 1 :
                     type === "device" ? (item.label === "Mobile" ? <Smartphone size={13} /> : item.label === "Desktop" ? <MonitorSmartphone size={13} /> : <Chrome size={13} />) :
                     item.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
                  <strong className="text-xs">{formatNumber(item.views)}</strong>
                </div>
                <div className="ml-10 h-1 overflow-hidden rounded-full bg-[color:var(--color-bg-elevated)]">
                  <div className={`h-full rounded-full ${type === "page" ? "bg-[color:var(--color-brand)]" : type === "device" ? "bg-[color:var(--color-text-muted)]" : "bg-[color:var(--color-accent)]"}`} style={{ width: `${item.percentage || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-[color:var(--color-text-muted)]">No data yet — install the tracking snippet to start collecting.</p>
        )}
      </CardContent>
    </Card>
  );
}

function EventInspector({ logs }: { logs: Array<import("@/shared/types").InspectorLog> }) {
  const [search, setSearch] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return logs || [];
    const query = search.toLowerCase();
    return (logs || []).filter(
      (l) =>
        l.pathname.toLowerCase().includes(query) ||
        (l.referrer && l.referrer.toLowerCase().includes(query)) ||
        (l.country && l.country.toLowerCase().includes(query)) ||
        (l.deviceType && l.deviceType.toLowerCase().includes(query)) ||
        l.userHash.toLowerCase().includes(query) ||
        (l.rawIp && l.rawIp.toLowerCase().includes(query))
    );
  }, [logs, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentLogs = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database size={17} className="text-[color:var(--color-brand)]" />
            Live Event Inspector
          </CardTitle>
          <p className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">
            Inspect raw event streams, PII hashes, and IP storage states.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-dim)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter path, referrers, IP, devices…"
              className="h-9 rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] pl-9 pr-3 text-xs outline-none focus:border-[color:var(--color-brand)]"
            />
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
              showRaw
                ? "bg-[color:var(--color-danger)]/15 border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]"
                : "bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border-strong)] text-[color:var(--color-text-muted)]"
            }`}
          >
            <ShieldAlert size={14} />
            {showRaw ? "Raw IPs Shown" : "Reveal Raw Mode"}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-dim)]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Visitor Info (Hash / Raw IP)</th>
                <th className="px-4 py-3">Geo</th>
                <th className="px-4 py-3">Device & Env</th>
                <th className="px-4 py-3">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {currentLogs.map((l) => (
                <tr key={l.id} className="transition hover:bg-[color:var(--color-bg-hover)]/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[color:var(--color-text-muted)]">
                    {new Date(l.occurredAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-[color:var(--color-text)]">
                    <span className="inline-block max-w-[180px] truncate align-bottom" title={l.pathname}>
                      {l.pathname}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-muted)]">
                    {l.referrer ? (
                      <span className="inline-block max-w-[140px] truncate align-bottom" title={l.referrer}>
                        {l.referrer}
                      </span>
                    ) : (
                      <span className="italic text-[color:var(--color-text-dim)]">Direct</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {showRaw && l.rawIp ? (
                      <span className="rounded bg-[color:var(--color-danger)]/20 px-2 py-0.5 font-semibold text-[color:var(--color-danger)]">
                        {l.rawIp}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[color:var(--color-text-dim)]" title={l.userHash}>
                        <Hash size={11} className="text-[color:var(--color-brand)]" />
                        <span>{l.userHash.slice(0, 10)}…</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">
                    {l.country || "—"}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded bg-[color:var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px]">
                        {l.deviceType || "Desktop"}
                      </span>
                      <span>{l.browser || "Chrome"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[color:var(--color-brand)]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[color:var(--color-brand)]">
                      {l.eventName}
                    </span>
                  </td>
                </tr>
              ))}
              {currentLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[color:var(--color-text-muted)]">
                    No matching event records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-3 text-xs text-[color:var(--color-text-muted)]">
          <span>
            Showing <strong>{(page - 1) * pageSize + 1}</strong> to <strong>{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> events
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span className="px-2 font-semibold text-[color:var(--color-text)]">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LivePanel({ live }: { live: { liveVisitors: number; activePages: Array<{ pathname: string; count: number }> } | null }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)] pulse-dot" />
            Live right now
          </CardTitle>
          <p className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">Visitors active in the last 5 minutes</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-[color:var(--color-success)]">{live?.liveVisitors ?? 0}</div>
          <div className="text-[10px] text-[color:var(--color-text-muted)]">online</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">Active pages</p>
        {live?.activePages?.length ? (
          <ul className="space-y-2">
            {live.activePages.map((p) => (
              <li key={p.pathname} className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] px-3 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)] pulse-dot" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{p.pathname}</span>
                <span className="text-xs font-semibold">{p.count}</span>
                <span className="text-[10px] text-[color:var(--color-text-muted)]">visitor{p.count !== 1 && "s"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-xs text-[color:var(--color-text-muted)]">No active visitors — install the tracking snippet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PrivacySettings({ onDeleteAccount }: { onDeleteAccount: () => Promise<void> }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dnt, setDnt] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await onDeleteAccount();
      toast.success("Account deleted", "All your data has been permanently removed.");
    } catch (err) {
      toast.error("Delete failed", (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[color:var(--color-text-dim)]">Account</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-.03em]">Privacy & data</h1>
      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Control every anonymized data point.</p>

      <div className="mt-7 space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1a2f22] text-[color:var(--color-success)]">
              <ShieldCheck size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Respect Do Not Track</h3>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Skip analytics when a visitor enables DNT in their browser.</p>
            </div>
            <button onClick={() => setDnt(!dnt)} role="switch" aria-checked={dnt} className={`relative h-6 w-11 rounded-full transition ${dnt ? "bg-[color:var(--color-brand)]" : "bg-[color:var(--color-border-strong)]"}`}>
              <i className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${dnt ? "left-6" : "left-1"}`} />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]">
              <CalendarDays size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Data retention</h3>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Raw pageviews are kept for 90 days by default.</p>
            </div>
            <select className="h-9 rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 text-xs">
              {["30 days", "90 days", "1 year", "Forever"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card className="border-[#5a2a2a]">
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#3a1e1e] text-[color:var(--color-danger)]">
              <Trash2 size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[color:var(--color-danger)]">Delete account</h3>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Permanently remove all sites, analytics, and this account.</p>
            </div>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete account</Button>
          </CardContent>
        </Card>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" description="This action cannot be undone.">
        <div className="flex gap-3 rounded-xl border border-[#5a2a2a] bg-[#2a1414] p-4 text-sm text-[color:var(--color-danger)]">
          <AlertTriangle size={18} className="mt-px shrink-0" />
          <div>
            <p className="font-semibold">This will permanently:</p>
            <ul className="mt-2 space-y-1 text-xs text-[color:var(--color-danger)]/85">
              <li>• Delete every site you own</li>
              <li>• Delete every pageview, event, and aggregation</li>
              <li>• Revoke every active session</li>
              <li>• Remove all archived exports</li>
            </ul>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={handleDelete}>Yes, delete my account</Button>
        </div>
      </Modal>
    </div>
  );
}

function DashboardInner() {
  const auth = useAuth();
  const { data, live, loading, error, fetchAnalytics, fetchLive, exportData } = useAnalytics();
  const toast = useToast();
  const [active, setActive] = useState<NavId>("overview");
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [siteId, setSiteId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sites = useMemo(() => auth.user?.sites || [], [auth.user]);
  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId) || sites[0], [sites, siteId]);

  useEffect(() => { if (sites[0] && !siteId) setSiteId(sites[0].id); }, [sites, siteId]);
  useEffect(() => { if (selectedSite) { fetchAnalytics(selectedSite.id, days); fetchLive(selectedSite.id); } }, [selectedSite, days, fetchAnalytics, fetchLive]);
  useEffect(() => { if (error) toast.error("Failed to load analytics", error); }, [error, toast]);

  async function handleExport(format: "csv" | "json") {
    if (!selectedSite) return;
    setExporting(true);
    try {
      await exportData(selectedSite.id, format);
      toast.success(`Downloaded ${format.toUpperCase()}`, `Analytics for ${selectedSite.name}`);
    } catch (err) {
      toast.error("Export failed", (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (auth.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--color-brand)] border-t-transparent" />
          <p className="text-xs text-[color:var(--color-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!auth.user) return <Login onLogin={auth.login} onSignup={auth.signup} />;

  if (sites.length === 0 && active !== "settings" && active !== "sites") {
    setActive("sites");
  }

  const statValues = {
    totalViews: formatNumber(data.totalViews),
    uniqueVisitors: formatNumber(data.uniqueVisitors),
    bounceRate: `${data.bounceRate}%`,
    avgSessionDuration: data.avgSessionDuration,
  };

  const topPages = data.topPages.map((p) => ({ label: p.pathname, views: p.views, percentage: p.percentage }));
  const sources = data.referrers.map((r) => ({ label: r.referrer || "Direct / None", views: r.views, percentage: r.percentage }));

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <Sidebar
        active={active}
        setActive={setActive}
        open={mobileOpen}
        setOpen={setMobileOpen}
        name={auth.user.name || "Prism user"}
        email={auth.user.email}
        liveCount={live?.liveVisitors ?? 0}
        onLogout={() => { void auth.logout(); toast.info("Signed out"); }}
      />

      <main className="min-h-screen lg:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-[color:var(--color-text-muted)]" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold">PrismAnalytics</span>
        </header>

        {active === "sites" ? (
          <SiteSettings sites={sites} onAdd={auth.addSite} onUpdate={auth.updateSite} onDelete={auth.deleteSite} />
        ) : active === "settings" ? (
          <PrivacySettings onDeleteAccount={auth.deleteAccount} />
        ) : (
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {/* Header row */}
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-[11px] font-medium text-[color:var(--color-text-muted)]">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-.03em] sm:text-[26px]">
                  {active === "overview" ? "Overview" :
                   active === "live" ? "Real-time" :
                   active === "pages" ? "Top pages" :
                   active === "referrers" ? "Referrers" :
                   active === "locations" ? "Visitor locations" :
                   "Devices & browsers"}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sites.length > 0 && (
                  <>
                    <label className="relative">
                      <Globe2 size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                      <select value={selectedSite?.id || ""} onChange={(e) => setSiteId(e.target.value)} className="h-10 appearance-none rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-card)] pl-9 pr-9 text-xs font-medium outline-none hover:border-[color:var(--color-brand)]/40" aria-label="Select site">
                        {sites.map((s) => <option value={s.id} key={s.id}>{s.domain || s.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                    </label>
                    <label className="relative">
                      <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                      <select value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)} className="h-10 appearance-none rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-card)] pl-9 pr-8 text-xs font-medium outline-none">
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => selectedSite && fetchAnalytics(selectedSite.id, days)} loading={loading} aria-label="Refresh">
                      <RefreshCw size={13} />
                    </Button>
                    <div className="relative">
                      <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport("csv")}>
                        <Download size={13} />CSV
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport("json")}>
                      <Download size={13} />JSON
                    </Button>
                  </>
                )}
              </div>
            </div>

            {sites.length === 0 ? (
              <Card className="mt-8 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]">
                    <Plus size={22} />
                  </div>
                  <h2 className="text-xl font-semibold">Add your first site</h2>
                  <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">Create a site to get your tracking snippet.</p>
                  <Button className="mt-6" onClick={() => setActive("sites")}>
                    <Plus size={15} />Create a site
                  </Button>
                </CardContent>
              </Card>
            ) : active === "inspector" ? (
              <EventInspector logs={data?.recentLogs || []} />
            ) : active === "live" ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-[.65fr_.35fr]">
                <LivePanel live={live} />
                <Card>
                  <CardHeader><CardTitle>Live snapshot</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                        <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-dim)]">Views (5 min)</p>
                        <p className="mt-2 text-3xl font-semibold">{live?.liveViews ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--color-border)] p-4">
                        <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-dim)]">Unique</p>
                        <p className="mt-2 text-3xl font-semibold text-[color:var(--color-success)]">{live?.liveVisitors ?? 0}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[10px] text-[color:var(--color-text-muted)]">
                      Auto-refresh every 10 seconds. Last update: {live ? new Date(live.timestamp).toLocaleTimeString() : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : active === "locations" ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Visitor map</CardTitle>
                    <p className="text-[11px] text-[color:var(--color-text-muted)]">Hover a country to see traffic</p>
                  </CardHeader>
                  <CardContent className="p-2">
                    <WorldMap data={data.countries} className="aspect-[16/9] w-full rounded-xl bg-[#0f0f18]" />
                  </CardContent>
                </Card>
                <RankedList title="Top countries" items={data.countries} type="source" />
              </div>
            ) : active === "pages" ? (
              <div className="mt-6"><RankedList title="Top pages" items={topPages} type="page" /></div>
            ) : active === "referrers" ? (
              <div className="mt-6"><RankedList title="Top referrers" items={sources} type="source" /></div>
            ) : active === "devices" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <RankedList title="Devices" items={data.devices} type="device" />
                <RankedList title="Browsers" items={data.browsers || []} type="device" />
                <RankedList title="Operating systems" items={data.os || []} type="device" />
              </div>
            ) : (
              // Overview
              <>
                <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <StatCard label="Total pageviews" value={statValues.totalViews} change={data.viewsChange} icon={MousePointer2} tone="violet" />
                  <StatCard label="Unique visitors" value={statValues.uniqueVisitors} change={data.visitorsChange} icon={Users} tone="coral" />
                  <StatCard label="Bounce rate" value={statValues.bounceRate} change={0} icon={Gauge} tone="blue" />
                  <StatCard label="Live now" value={String(live?.liveVisitors ?? 0)} change={0} icon={Radio} tone="green" />
                </section>

                <Card className="mt-4">
                  <CardHeader className="flex-wrap gap-3">
                    <div>
                      <CardTitle>Traffic overview</CardTitle>
                      <p className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">Pageviews and unique visitors over time</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-[color:var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[color:var(--color-brand)]" />Pageviews</span>
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[color:var(--color-accent)]" />Visitors</span>
                      <span className="flex items-center gap-1.5 rounded-full bg-[#1a2f22] px-2.5 py-1 text-[color:var(--color-success)]">
                        <i className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)] pulse-dot" />{live?.liveVisitors ?? 0} live
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className={`h-[310px] pt-4 transition-opacity ${loading ? "opacity-45" : "opacity-100"}`}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={data.timeline} margin={{ left: -16, right: 5, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b6cf5" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#8b6cf5" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec7d75" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#ec7d75" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#24242f" strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={chartDate} tick={{ fill: "#6a6a7a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={42} dy={8} />
                        <YAxis tick={{ fill: "#6a6a7a", fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                        <Tooltip labelFormatter={(l) => chartDate(String(l))} />
                        <Area type="monotone" dataKey="views" name="Pageviews" stroke="#8b6cf5" strokeWidth={2.2} fill="url(#viewsFill)" activeDot={{ r: 4, fill: "#8b6cf5", stroke: "#0a0a0f", strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="unique" name="Visitors" stroke="#ec7d75" strokeWidth={2} fill="url(#visitorFill)" activeDot={{ r: 4, fill: "#ec7d75", stroke: "#0a0a0f", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <section className="mt-4 grid gap-4 xl:grid-cols-2">
                  <RankedList title="Top pages" items={topPages.slice(0, 5)} type="page" />
                  <RankedList title="Top sources" items={sources.slice(0, 5)} type="source" />
                </section>

                <section className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><MapPin size={14} />Visitor locations</CardTitle>
                      <button onClick={() => setActive("locations")} className="text-[11px] font-semibold text-[color:var(--color-brand)] hover:underline">View full map →</button>
                    </CardHeader>
                    <CardContent className="p-2">
                      <WorldMap data={data.countries} className="aspect-[16/9] w-full rounded-xl bg-[#0f0f18]" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Clock3 size={14} />24h Activity Heatmap</CardTitle>
                      <p className="text-[11px] text-[color:var(--color-text-muted)]">Pageviews over last 24 hours</p>
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={data?.hourlyTraffic || []}>
                          <CartesianGrid vertical={false} stroke="#24242f" />
                          <XAxis dataKey="hour" tick={{ fill: "#6a6a7a", fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
                          <YAxis tick={{ fill: "#6a6a7a", fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
                          <Tooltip contentStyle={{ background: "#16161f", borderColor: "#32323f", borderRadius: 10, fontSize: 11 }} />
                          <Bar dataKey="views" fill="#ec7d75" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </section>
              </>
            )}

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] py-6 text-[10px] text-[color:var(--color-text-dim)]">
              <span className="flex items-center gap-2">
                © 2026 PrismAnalytics · Your data, your rules.
                <span className="rounded bg-[color:var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[9px] text-[color:var(--color-text-muted)]">
                  v1.0.0 First Light
                </span>
                <a href="/api/version" target="_blank" className="hover:text-[color:var(--color-brand)] hover:underline">
                  /api/version
                </a>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-[color:var(--color-success)]" />
                Encrypted · MX-verified · Rate-limited · Audit-logged · PWA Ready
              </span>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
