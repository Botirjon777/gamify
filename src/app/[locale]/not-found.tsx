import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { NotFoundView } from "@/components/not-found-view";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl px-5 py-5">
        <Logo />
      </header>
      <NotFoundView
        title={t("title")}
        text={t("text")}
        back={t("back")}
        learn={t("learn")}
        renderLink={(href, className, children) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />
    </>
  );
}
