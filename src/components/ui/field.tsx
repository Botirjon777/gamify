import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function Field({ label, name, hint, error, ...input }: FieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="h-11 rounded-xl border border-border bg-surface px-3.5 text-base outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 aria-invalid:border-danger"
        {...input}
      />
      {error ? (
        <span id={`${name}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
