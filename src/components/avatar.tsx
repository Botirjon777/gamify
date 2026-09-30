import { avatarDataUri } from "@/lib/avatar";
import type { Gender } from "@/generated/prisma/enums";

export function Avatar({
  user,
  className = "size-10",
}: {
  user: { avatarSeed: string; avatarStyle?: string | null; gender?: Gender | null };
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI
    <img
      src={avatarDataUri(user.avatarSeed, user.avatarStyle ?? undefined, user.gender)}
      alt=""
      className={`shrink-0 rounded-full bg-background ${className}`}
    />
  );
}
