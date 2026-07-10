"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3.5 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] transition focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/15",
        className,
      )}
      {...props}
    />
  );
});
