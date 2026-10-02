import { useTranslations } from "next-intl";

/** A price; with a discount: the old price crossed out, the new one, and "−48%". Works in server and client components. */
export function PriceTag({ price }: { price: { price: string; oldPrice: string | null; discount: number | null } }) {
  const t = useTranslations("common");
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {price.oldPrice && <s className="font-normal text-muted">{price.oldPrice}</s>}
      <b>{t("priceSom", { price: price.price })}</b>
      {price.discount !== null && <span className="rounded-full bg-grad-streak px-2 py-0.5 text-xs font-bold text-white">−{price.discount}%</span>}
    </span>
  );
}
