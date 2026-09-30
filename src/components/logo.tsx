import { Link } from "@/i18n/navigation";

/** Text-only wordmark with the brand gradient. */
export function Logo({ name = "Zukkolar", href = "/" }: { name?: string; href?: string }) {
  return (
    <Link href={href} className="font-display text-xl font-bold tracking-tight">
      <span className="text-grad-brand">{name}</span>
    </Link>
  );
}
