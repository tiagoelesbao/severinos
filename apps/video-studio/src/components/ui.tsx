"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

/**
 * Kit de componentes do design system (VEX-07). Tokens em globals.css
 * (@theme); accent dinâmico por cliente via --accent. Documentação viva no
 * Storybook (`npm run storybook`).
 */

const cx = (...cls: Array<string | false | undefined>) => cls.filter(Boolean).join(" ");

// ── Button ────────────────────────────────────────────────────────────────────
export type ButtonVariant = "default" | "accent" | "ok" | "danger" | "ghost";

const VARIANT: Record<ButtonVariant, string> = {
  default:
    "bg-surface-4 text-fg border border-line-strong hover:border-line-strong hover:brightness-125",
  accent: "bg-accent text-black font-bold border border-transparent hover:brightness-110",
  ok: "bg-ok text-[#06121a] font-bold border border-transparent hover:brightness-110",
  danger: "bg-danger text-white font-bold border border-transparent hover:brightness-110",
  ghost: "bg-transparent text-fg-muted border border-transparent hover:bg-surface-4 hover:text-fg",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }
>(function Button({ variant = "default", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-(--radius-control) cursor-pointer",
        "transition-[filter,background-color,border-color] duration-150 select-none",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
});

/** Botão de ícone quadrado (transporte, ações de linha). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; active?: boolean }
>(function IconButton({ variant = "default", active, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center size-8 rounded-(--radius-control) cursor-pointer",
        "transition-[filter,background-color] duration-150",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        active ? "bg-accent text-black" : VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
});

// ── Section (card de painel) ──────────────────────────────────────────────────
export function Section({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "bg-surface-2 border border-line rounded-(--radius-panel) p-3",
        className,
      )}
    >
      {title != null && (
        <div className="text-[11px] font-bold uppercase tracking-wide text-fg-muted mb-2">
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "ok" | "warn" | "danger" | "accent";
  children: ReactNode;
}) {
  const tones = {
    muted: "bg-surface-4 text-fg-muted",
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
    accent: "bg-accent/15 text-accent",
  } as const;
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={350}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 rounded-md bg-surface-3 border border-line-strong px-2 py-1 text-[11px] text-fg shadow-(--shadow-pop)"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── ConfirmDialog (substitui window.confirm) ─────────────────────────────────
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cx(
            "fixed left-1/2 top-1/2 z-50 w-[380px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-(--radius-panel) bg-surface-2 border border-line-strong p-4 shadow-(--shadow-pop)",
          )}
        >
          <DialogPrimitive.Title className="text-[14px] font-bold text-fg m-0">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-2 text-[12px] leading-relaxed text-fg-muted">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogPrimitive.Close>
            <Button
              variant={danger ? "danger" : "accent"}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
