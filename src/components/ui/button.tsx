import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground shadow-[0_4px_0_0_rgb(0_0_0/0.18)] hover:brightness-110 active:translate-y-0.5 active:shadow-none",
  secondary: "border border-border bg-surface text-foreground hover:bg-background",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  danger: "border border-danger/30 text-danger hover:bg-danger/10",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
