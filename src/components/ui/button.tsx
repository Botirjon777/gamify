import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const variants: Record<Variant, string> = {
  primary:
    "bg-grad-brand text-brand-foreground shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 hover:brightness-110 active:translate-y-px",
  secondary: "border border-border bg-surface text-foreground hover:border-brand/40 hover:bg-background",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  danger: "border border-danger/30 text-danger hover:bg-danger/10",
  success: "bg-grad-success text-white shadow-lg shadow-success/25 hover:brightness-110 active:translate-y-px",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
