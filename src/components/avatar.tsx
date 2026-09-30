import { avatarDataUri } from "@/lib/avatar";

export function Avatar({
  user,
  className = "size-10",
}: {
  user: { avatarSeed: string; avatarStyle?: string | null };
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI
    <img src={avatarDataUri(user.avatarSeed, user.avatarStyle ?? undefined)} alt="" className={`shrink-0 rounded-full bg-background ${className}`} />
  );
}
