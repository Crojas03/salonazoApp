/**
 * Formats a phone number as 04XX-XXXXXXX.
 * Strips non-digits, inserts hyphen after 4th digit, caps at 11 digits.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Returns true if the phone is a complete 04XX-XXXXXXX (12 chars). */
export function isPhoneComplete(formatted: string): boolean {
  return /^\d{4}-\d{7}$/.test(formatted);
}

/** Strips formatting to get raw digits. */
export function phoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

/** Validates a 4-digit PIN. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Validates an email address with a basic RFC-ish pattern. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
