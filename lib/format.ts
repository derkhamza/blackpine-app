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

// ── IMC / BMI WHO classification incl. obesity stages I/II/III ────────────────
export interface BmiClass {
  label: string;   // French label
  stage: string;   // short chip code
  color: string;   // hex
}
export function bmiClassify(bmi: number): BmiClass {
  if (bmi < 16.5) return { label: "Dénutrition",            stage: "—",            color: "#8E44AD" };
  if (bmi < 18.5) return { label: "Insuffisance pondérale", stage: "Maigreur",     color: "#2980B9" };
  if (bmi < 25)   return { label: "Corpulence normale",     stage: "Normal",       color: "#15A876" };
  if (bmi < 30)   return { label: "Surpoids",               stage: "Surpoids",     color: "#D4962A" };
  if (bmi < 35)   return { label: "Obésité modérée",        stage: "Obésité I",    color: "#E67E22" };
  if (bmi < 40)   return { label: "Obésité sévère",         stage: "Obésité II",   color: "#E85B5B" };
  return                 { label: "Obésité morbide",        stage: "Obésité III",  color: "#C0392B" };
}