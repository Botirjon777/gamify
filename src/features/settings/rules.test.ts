import { describe, expect, it } from "vitest";
import { discountPercent, formatCardNumber, settingsInput, toRows } from "./rules";

const valid = { cardNumber: "8600 1234 5678 9012", cardHolder: "ALI VALIYEV", contact: "@ali_v", iqPriceUzs: 13_000, iqOldPriceUzs: 25_000 };

describe("site settings", () => {
  it("groups a card number by four", () => {
    expect(formatCardNumber("8600123456789012")).toBe("8600 1234 5678 9012");
    expect(formatCardNumber("8600-1234")).toBe("8600 1234");
  });

  it("discount percent needs an old price above the price", () => {
    expect(discountPercent(13_000, 25_000)).toBe(48);
    expect(discountPercent(13_000, 13_000)).toBeNull();
    expect(discountPercent(13_000, null)).toBeNull();
  });

  it("stores the card as digits and an absent old price as an empty row", () => {
    expect(toRows(settingsInput.parse(valid))).toEqual({
      "payment.cardNumber": "8600123456789012",
      "payment.cardHolder": "ALI VALIYEV",
      "payment.contact": "@ali_v",
      "iq.priceUzs": "13000",
      "iq.oldPriceUzs": "25000",
      // Not given → the default plan prices.
      "plan.proPriceUzs": "39000",
      "plan.diamondPriceUzs": "79000",
      "plan.annualDiscount": "25",
    });
    expect(toRows(settingsInput.parse({ ...valid, proPriceUzs: 45_000, diamondPriceUzs: 90_000, annualDiscount: 0 }))).toMatchObject({
      "plan.proPriceUzs": "45000",
      "plan.diamondPriceUzs": "90000",
      "plan.annualDiscount": "0",
    });
    expect(toRows(settingsInput.parse({ ...valid, iqOldPriceUzs: null }))["iq.oldPriceUzs"]).toBe("");
  });

  it("rejects a short card, a contact that is not Telegram, and an old price that is not higher", () => {
    expect(settingsInput.safeParse({ ...valid, cardNumber: "8600 1234" }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, contact: "+998901234567" }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, contact: "https://t.me/ali_v" }).success).toBe(true);
    expect(settingsInput.safeParse({ ...valid, iqOldPriceUzs: 13_000 }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, cardNumber: "", cardHolder: "", contact: "" }).success).toBe(true);
    expect(settingsInput.safeParse({ ...valid, proPriceUzs: 500 }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, annualDiscount: 95 }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, annualDiscount: 12.5 }).success).toBe(false);
  });
});
