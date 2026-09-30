import { notFound } from "next/navigation";

/** Any unknown URL → our branded 404 (app/[locale]/not-found.tsx) instead of Next.js's default page. */
export default function CatchAll() {
  notFound();
}
