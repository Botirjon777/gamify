import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { JetBrains_Mono, Onest, Unbounded } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getCurrentTenant } from "@/lib/tenant";
import "../globals.css";

// All three cover Uzbek Latin (oʻ gʻ) and Cyrillic (for Russian later).
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext", "cyrillic"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext", "cyrillic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext", "cyrillic"] });

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

type TenantTheme = { brand?: string; brand2?: string; brandForeground?: string };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tenant = await getCurrentTenant();
  const theme = (tenant.theme ?? {}) as TenantTheme;
  const style = {
    ...(theme.brand && { "--brand": theme.brand }),
    ...(theme.brand2 && { "--brand-2": theme.brand2 }),
    ...(theme.brandForeground && { "--brand-foreground": theme.brandForeground }),
  } as CSSProperties;

  return (
    <html lang={locale} className={`${onest.variable} ${unbounded.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans" style={style}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
