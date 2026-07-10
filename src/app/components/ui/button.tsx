"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "default", size = "default", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[.98] select-none",
        variant === "default" && "bg-gradient-to-b from-[#8b6cf5] to-[#7a5be0] text-white shadow-[0_4px_14px_rgba(139,108,245,0.32),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#9d82f7] hover:to-[#8b6cf5] hover:shadow-[0_6px_20px_rgba(139,108,245,0.4)]",
        variant === "outline" && "border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-card)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-hover)] hover:border-[color:var(--color-brand)]/40",
        variant === "ghost" && "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-hover)] hover:text-[color:var(--color-text)]",
        variant === "danger" && "bg-[#3a1a1a] text-[#f87171] hover:bg-[#4a2020] border border-[#5a2a2a]",
        variant === "success" && "bg-gradient-to-b from-[#4ade80] to-[#3fbf6c] text-white shadow-[0_4px_14px_rgba(74,222,128,0.28)]",
        size === "default" && "h-10 px-4 text-sm",
        size === "sm" && "h-8 rounded-lg px-3 text-xs",
        size === "lg" && "h-12 px-6 text-[15px]",
        size === "icon" && "h-9 w-9 p-0",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});
