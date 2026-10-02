/**
 * Read or change the site settings kept in the database (the same ones as admin → Sozlamalar).
 *   pnpm settings                                   show them (local dev database)
 *   pnpm settings cardNumber=8600123456789012 "cardHolder=ALI VALIYEV" contact=@ali iqPriceUzs=13000 iqOldPriceUzs=25000
 *   pnpm settings iqOldPriceUzs=                    empty value = not set (no discount)
 *   pnpm settings proPriceUzs=39000 diamondPriceUzs=79000 annualDiscount=25     plan prices (per month) and the yearly discount, %
 *   pnpm settings --prod …                          the same against production
 *
 * Values are validated exactly like the admin form. The running app picks a change up within a minute
 * (its settings cache); saving in the admin panel is instant.
 */
import { DEFAULT_IQ_PRICE_UZS, SETTING_KEYS, settingsInput, toRows, type SettingKey } from "../src/features/settings/rules";
import { connect } from "./lib/content-db";

const FIELDS = {
  cardNumber: "payment.cardNumber",
  cardHolder: "payment.cardHolder",
  contact: "payment.contact",
  iqPriceUzs: "iq.priceUzs",
  iqOldPriceUzs: "iq.oldPriceUzs",
  proPriceUzs: "plan.proPriceUzs",
  diamondPriceUzs: "plan.diamondPriceUzs",
  annualDiscount: "plan.annualDiscount",
} as const satisfies Record<string, SettingKey>;
type Field = keyof typeof FIELDS;

async function main() {
  const args = process.argv.slice(2);
  const { db, target } = connect(args.includes("--prod"));
  try {
    const stored = new Map((await db.setting.findMany()).map((r) => [r.key, r.value]));
    const current = Object.fromEntries((Object.keys(FIELDS) as Field[]).map((f) => [f, stored.get(FIELDS[f]) ?? ""])) as Record<Field, string>;

    const changes = args.filter((a) => a.includes("=") && !a.startsWith("--")).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] as const);
    for (const [name] of changes) if (!(name in FIELDS)) throw new Error(`Unknown setting "${name}". Known: ${Object.keys(FIELDS).join(", ")}`);
    const next = { ...current, ...Object.fromEntries(changes) } as Record<Field, string>;

    if (changes.length) {
      const parsed = settingsInput.safeParse({
        cardNumber: next.cardNumber,
        cardHolder: next.cardHolder,
        contact: next.contact,
        iqPriceUzs: Number(next.iqPriceUzs || DEFAULT_IQ_PRICE_UZS),
        iqOldPriceUzs: next.iqOldPriceUzs ? Number(next.iqOldPriceUzs) : null,
        // Empty = the default.
        proPriceUzs: next.proPriceUzs ? Number(next.proPriceUzs) : undefined,
        diamondPriceUzs: next.diamondPriceUzs ? Number(next.diamondPriceUzs) : undefined,
        annualDiscount: next.annualDiscount ? Number(next.annualDiscount) : undefined,
      });
      if (!parsed.success) throw new Error(`Invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")} (${i.message})`).join(", ")}`);
      const rows = toRows(parsed.data);
      for (const key of SETTING_KEYS) {
        if (rows[key] === "") await db.setting.deleteMany({ where: { key } });
        else await db.setting.upsert({ where: { key }, create: { key, value: rows[key] }, update: { value: rows[key] } });
      }
      console.log(`✔ Saved to the ${target}`);
    }

    console.log(`Settings in the ${target}:`);
    const after = new Map((await db.setting.findMany()).map((r) => [r.key, r.value]));
    for (const [field, key] of Object.entries(FIELDS)) console.log(`  ${field.padEnd(16)} ${after.get(key) ?? "(not set)"}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(`✘ ${e.message}`);
  process.exit(1);
});
