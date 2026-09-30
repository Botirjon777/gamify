import { requireSession } from "@/lib/auth/session";

/** Distraction-free layout (no sidebar / tab bar) for drill sessions. */
export default async function FocusLayout({ children }: LayoutProps<"/[locale]">) {
  await requireSession();
  return <div className="flex flex-1 flex-col">{children}</div>;
}
