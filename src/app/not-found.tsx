import { Onest, Unbounded } from "next/font/google";
import { NotFoundView } from "@/components/not-found-view";
import messages from "../../messages/uz.json";
import "./globals.css";

const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext", "cyrillic"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext", "cyrillic"] });

/**
 * Fallback 404 for URLs outside the [locale] layout (e.g. an invalid locale segment).
 * There is no root layout, so this renders its own <html>. Uses the default-language texts.
 */
export default function RootNotFound() {
  const t = messages.notFound;
  return (
    <html lang="uz" className={`${onest.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NotFoundView
          title={t.title}
          text={t.text}
          back={t.back}
          learn={t.learn}
          renderLink={(href, className, children) => (
            <a href={href} className={className}>
              {children}
            </a>
          )}
        />
      </body>
    </html>
  );
}
