// Use a non-breaking space as thousand separator (cleaner than regular space)
const NBSP = "\u00A0";

/**
 * Format an ISO date as "DD/MM/YYYY".
 * Used everywhere a short human-readable date is needed.
 */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Format today's date as "DD/MM/YYYY" (for PDF letterheads etc.).
 */
export function todayFr(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export function formatMAD(n: number, opts?: { showCurrency?: boolean }): string {
  const showCurrency = opts?.showCurrency ?? true;
  const rounded = Math.round(n);
  const withSep = rounded.toLocaleString("fr-FR").replace(/\s/g, NBSP);
  return showCurrency ? `${withSep}${NBSP}MAD` : withSep;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateFR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Map an app language code to a BCP-47 locale for date/number formatting. */
export function langToLocale(lang: string): string {
  if (lang === "ar") return "ar-MA";
  if (lang === "en") return "en-US";
  return "fr-FR";
}