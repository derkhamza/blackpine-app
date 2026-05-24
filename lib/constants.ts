/**
 * App-wide constants — single source of truth for URLs, contact info, and
 * configuration values that appear in more than one place.
 *
 * To change any of these, edit here only.
 */

/** Base URL for all legal documents (privacy policy, terms of service). */
export const LEGAL_BASE_URL = "https://blackpinecap.com/cabinet";

export const PRIVACY_POLICY_URL = `${LEGAL_BASE_URL}/privacy`;
export const TERMS_URL           = `${LEGAL_BASE_URL}/terms`;

/** WhatsApp deep-link for subscription enquiries. */
export const SUPPORT_WHATSAPP_NUMBER = "212697775201";

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Free-trial length in days (must match backend). */
export const TRIAL_DAYS = 30;
