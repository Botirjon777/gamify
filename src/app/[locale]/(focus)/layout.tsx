import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";

/** Distraction-free layout (no sidebar / tab bar) for drill sessions. */
/** Behind the login: keep it out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FocusLayout({ children }: LayoutProps<"/[locale]">) {
  await requireSession();
  return <div className="flex flex-1 flex-col">{children}</div>;
}
