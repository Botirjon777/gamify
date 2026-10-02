/** "@handle" or a t.me link → a Telegram URL; anything else (a phone number, empty) → null. */
export function telegramUrl(contact: string | null | undefined): string | null {
  if (!contact) return null;
  if (contact.startsWith("https://t.me/")) return contact;
  return /^@[\w]{4,}$/.test(contact) ? `https://t.me/${contact.slice(1)}` : null;
}

/** Opens a chat with `contact` with `text` already typed in (the person only has to press send). */
export function telegramMessageUrl(contact: string | null | undefined, text: string): string | null {
  const url = telegramUrl(contact);
  return url ? `${url}?text=${encodeURIComponent(text)}` : null;
}

/** Telegram's share sheet: pick a chat, the message is `text` followed by `url`. */
export const telegramShareUrl = (url: string, text: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
