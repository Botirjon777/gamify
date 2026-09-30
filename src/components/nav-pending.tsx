"use client";

import { useLinkStatus } from "next/link";

/**
 * Put inside a <Link>: while that navigation is pending, a thin animated bar runs along the top of the
 * screen — instant feedback on every click, even before the next page's skeleton shows.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden">
      <span className="nav-progress block h-full w-full bg-grad-brand" />
    </span>
  );
}
