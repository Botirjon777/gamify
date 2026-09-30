import { requireOnboardedSession } from "@/lib/auth/gates";

/** Distraction-free layout (no sidebar / tab bar) for drill sessions. */
export default async function FocusLayout({ children }: LayoutProps<"/[locale]">) {
  await requireOnboardedSession();
  return <div className="flex flex-1 flex-col">{children}</div>;
}
