"use client";

import { useState } from "react";
import { ExternalLink, Globe2, MoreHorizontal, Plus, Trash2, AlertTriangle, Pencil } from "lucide-react";
import type { SiteSummary } from "@/shared/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";
import { TrackingScript } from "./TrackingScript";
import { useSafeToast } from "./ui/toast";

interface Props {
  sites: SiteSummary[];
  onAdd: (name: string, domain: string) => Promise<SiteSummary | void>;
  onUpdate: (id: string, name: string, domain: string, ipPrivacyMode?: "strict_hash" | "store_raw") => Promise<SiteSummary | void>;
  onDelete: (id: string) => Promise<void>;
}

export function SiteSettings({ sites, onAdd, onUpdate, onDelete }: Props) {
  const toast = useSafeToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SiteSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteSummary | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [ipPrivacyMode, setIpPrivacyMode] = useState<"strict_hash" | "store_raw">("strict_hash");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(sites[0]?.id || "");
  const activeSite = sites.find((s) => s.id === selected) || sites[0];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onAdd(name.trim(), domain.trim());
      toast.success("Site created", `${name} is ready to track.`);
      setName(""); setDomain(""); setAddOpen(false);
    } catch (err) {
      toast.error("Could not create site", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await onDelete(deleteTarget.id);
      toast.success("Site deleted", `${deleteTarget.name} and all its data have been removed.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Delete failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmUpdate(e: React.FormEvent) {
    if (!editTarget) return;
    e.preventDefault();
    setBusy(true);
    try {
      await onUpdate(editTarget.id, name.trim(), domain.trim(), ipPrivacyMode);
      toast.success("Site updated", `${name} has been updated.`);
      setEditTarget(null);
      setName("");
      setDomain("");
    } catch (err) {
      toast.error("Update failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(site: SiteSummary) {
    setEditTarget(site);
    setName(site.name);
    setDomain(site.domain || "");
    setIpPrivacyMode(site.ipPrivacyMode || "strict_hash");
  }

  return (
    <div className="mx-auto max-w-[1160px] space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[color:var(--color-text-dim)]">Manage</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-.03em]">Sites & tracking</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Add a site and copy the snippet into any framework or platform.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} />Add a site</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]">
          <div className="border-b border-[color:var(--color-border)] px-5 py-4">
            <h2 className="text-sm font-semibold">Your sites</h2>
            <p className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">{sites.length} site{sites.length !== 1 && "s"}</p>
          </div>
          <div className="divide-y divide-[color:var(--color-border)]">
            {sites.map((site) => (
              <div key={site.id} className={`group flex w-full items-center gap-3 px-4 py-4 transition ${activeSite?.id === site.id ? "bg-[color:var(--color-bg-hover)]" : "hover:bg-[color:var(--color-bg-hover)]/50"}`}>
                <button onClick={() => setSelected(site.id)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${activeSite?.id === site.id ? "bg-[color:var(--color-brand-glow)] text-[color:var(--color-brand)]" : "bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)]"}`}>
                    <Globe2 size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold">{site.name}</strong>
                    <span className="mt-0.5 block truncate text-xs text-[color:var(--color-text-muted)]">{site.domain || "No domain"}</span>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(site)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[color:var(--color-bg-elevated)]"
                    aria-label="Edit site"
                  >
                    <Pencil size={14} className="text-[color:var(--color-text-muted)]" />
                  </button>
                  {activeSite?.id === site.id ? <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand)]" /> : <MoreHorizontal size={17} className="text-[color:var(--color-text-dim)]" />}
                </div>
              </div>
            ))}
            {!sites.length && (
              <div className="p-8 text-center">
                <p className="text-sm text-[color:var(--color-text-muted)]">No sites yet</p>
                <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}><Plus size={14} />Create your first site</Button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-5">
          {activeSite ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{activeSite.name}</h2>
                  {activeSite.domain && (
                    <a href={`https://${activeSite.domain}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-[color:var(--color-brand)] hover:underline">
                      {activeSite.domain}<ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(activeSite)}>
                    <Pencil size={14} />Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(activeSite)}>
                    <Trash2 size={14} />Delete
                  </Button>
                </div>
              </div>
              <div className="my-5 h-px bg-[color:var(--color-border)]" />
              <TrackingScript trackingCode={activeSite.trackingCode} domain={activeSite.domain} />
            </>
          ) : (
            <div className="grid min-h-64 place-items-center text-sm text-[color:var(--color-text-muted)]">
              Create a site to get your tracking snippet.
            </div>
          )}
        </section>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a new site" description="Give your site a name and optional domain — you can change these anytime.">
        <form onSubmit={create} className="space-y-4">
          <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
            Site name<span className="text-[color:var(--color-danger)]">*</span>
            <Input required minLength={2} maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="My portfolio" className="mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
            Domain <span className="text-[color:var(--color-text-dim)]">(optional)</span>
            <Input maxLength={255} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="mt-1.5" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Create site</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit site" description="Update your site name, domain, or IP Privacy Mode.">
        <form onSubmit={confirmUpdate} className="space-y-4">
          <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
            Site name<span className="text-[color:var(--color-danger)]">*</span>
            <Input required minLength={2} maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="My portfolio" className="mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
            Domain <span className="text-[color:var(--color-text-dim)]">(optional)</span>
            <Input maxLength={255} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
            IP Storage Mode
            <select
              value={ipPrivacyMode}
              onChange={(e) => setIpPrivacyMode(e.target.value as "strict_hash" | "store_raw")}
              className="mt-1.5 h-11 w-full rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3.5 text-sm text-[color:var(--color-text)] outline-none"
            >
              <option value="strict_hash">Strict Mode: Daily Salted Privacy Hash (No Raw IP Saved)</option>
              <option value="store_raw">Advanced Mode: Store Raw IP Address of Visitors</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this site?" description="This cannot be undone.">
        <div className="flex gap-3 rounded-xl border border-[#5a2a2a] bg-[#2a1414] p-4 text-sm text-[color:var(--color-danger)]">
          <AlertTriangle size={18} className="mt-px shrink-0" />
          <div>
            <p className="font-semibold">Permanent deletion</p>
            <p className="mt-1 text-[color:var(--color-danger)]/85">
              All pageviews, events, and aggregations for <strong>{deleteTarget?.name}</strong> will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={confirmDelete}>
            <Trash2 size={14} />Yes, delete forever
          </Button>
        </div>
      </Modal>
    </div>
  );
}
