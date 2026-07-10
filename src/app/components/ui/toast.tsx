"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContext {
  show: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastContext | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const api: ToastContext = {
    show,
    success: (title, description) => show({ type: "success", title, description }),
    error: (title, description) => show({ type: "error", title, description }),
    info: (title, description) => show({ type: "info", title, description }),
    warning: (title, description) => show({ type: "warning", title, description }),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />)}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 size={18} className="text-[color:var(--color-success)]" />,
    error: <XCircle size={18} className="text-[color:var(--color-danger)]" />,
    info: <Info size={18} className="text-[color:var(--color-brand)]" />,
    warning: <AlertCircle size={18} className="text-[color:var(--color-warn)]" />,
  };
  const borders = {
    success: "border-l-[color:var(--color-success)]",
    error: "border-l-[color:var(--color-danger)]",
    info: "border-l-[color:var(--color-brand)]",
    warning: "border-l-[color:var(--color-warn)]",
  };
  return (
    <div className={cn(
      "toast-in glass pointer-events-auto flex items-start gap-3 rounded-xl border border-[color:var(--color-border-strong)] border-l-4 p-4 shadow-2xl",
      borders[toast.type],
    )}>
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[color:var(--color-text)]">{toast.title}</div>
        {toast.description && <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">{toast.description}</div>}
      </div>
      <button onClick={onClose} className="text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]" aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function useSafeToast(): ToastContext {
  const ctx = useContext(Ctx);
  return ctx ?? {
    show: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {},
  };
}

// Auto-mount on the client so pages without provider still work gracefully
export function ToastRoot({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <ToastProvider>{children}</ToastProvider> : <>{children}</>;
}
