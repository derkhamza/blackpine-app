// Use a non-breaking space as thousand separator (cleaner than regular space)
const NBSP = "\u00A0";

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