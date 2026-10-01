import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";

/** Behind the login: keep it out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Distraction-free layout (no sidebar / top bar / tab bar) for drill sessions and duels. */
export default async function FocusLayout({ children }: LayoutProps<"/[locale]">) {
  await requireSession();
  return <div className="flex flex-1 flex-col">{children}</div>;
}
