import { Link } from "@/i18n/navigation";

export function Logo({ name = "Gamify" }: { name?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground">G</span>
      {name}
    </Link>
  );
}
