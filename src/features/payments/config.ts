import "server-only";

/**
 * Where users send card transfers until Click / Payme are integrated.
 * Set on the server in /srv/zukkolar/shared/.env: PAYMENT_CARD_NUMBER, PAYMENT_CARD_HOLDER, PAYMENT_CONTACT.
 */
export function paymentDetails() {
  return {
    cardNumber: process.env.PAYMENT_CARD_NUMBER ?? null,
    cardHolder: process.env.PAYMENT_CARD_HOLDER ?? null,
    /** e.g. a Telegram username for questions: "@zukkolar_admin" */
    contact: process.env.PAYMENT_CONTACT ?? null,
  };
}
