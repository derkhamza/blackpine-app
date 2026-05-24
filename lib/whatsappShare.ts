import { Alert, Linking } from "react-native";
import { FullTaxComputation } from "blackpine-engine";
import { DoctorProfile } from "./cabinetTypes";
import { todayFr } from "./format";

// ─── Phone normalisation ──────────────────────────────────────────────────────

/**
 * Strip formatting characters and convert to E.164 without the leading +.
 * Moroccan local numbers starting with 0 are prefixed with 212.
 * E.g. "06 12 34 56 78" → "212612345678"
 *      "+212 6 12 34 56 78" → "212612345678"
 *      "0612345678" → "212612345678"
 */
function cleanPhone(raw: string): string {
  // Remove spaces, dashes, dots, parentheses
  let digits = raw.replace(/[\s\-.()+]/g, "");
  // Drop leading + (already removed above, but just in case)
  digits = digits.replace(/^\+/, "");
  // Local Moroccan number: starts with 0
  if (digits.startsWith("0")) {
    digits = "212" + digits.slice(1);
  }
  return digits;
}

// ─── Message builder ──────────────────────────────────────────────────────────

const SEP = "─────────────────────";

function mad(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} MAD`;
}

/**
 * Build a concise French text summary suitable for an expert-comptable.
 */
export function buildAccountantMessage(
  result: FullTaxComputation,
  doctorProfile: DoctorProfile,
): string {
  const { breakdown, tax, fiscalYear } = result;
  const name = doctorProfile.fullName || "Dr.";
  const today = todayFr();

  const lines: string[] = [
    `📊 *Bilan fiscal ${fiscalYear}*`,
    `${name} · ${today}`,
    SEP,
    `💰 *Recettes*         ${mad(breakdown.totalRecettes)}`,
    `💸 *Charges totales*  ${mad(breakdown.totalCharges)}`,
    `✅ *Charges déduct.*  ${mad(breakdown.totalChargesDeductibles)}`,
    `📋 *Résultat fiscal*  ${mad(breakdown.resultatFiscal)}`,
    SEP,
    `🏦 *IR brut*          ${mad(tax.ir.grossIR)}`,
    `👨‍👩‍👧 *Déd. familiale*   ${mad(tax.familyDeduction)}`,
    `📌 *Impôt dû (${tax.payableRule})*  ${mad(tax.taxDue)}`,
    SEP,
    `_Généré par Blackpine Cabinet_`,
  ];

  return lines.join("\n");
}

// ─── Share helper ─────────────────────────────────────────────────────────────

/**
 * Open WhatsApp with a pre-filled message to the accountant's number.
 * Falls back to the native share sheet if WhatsApp is not installed or no
 * phone number is configured.
 *
 * @param phone  Raw phone string from DoctorProfile.accountantPhone (optional)
 * @param message  The text to pre-fill
 * @param i18n  Translated alert strings passed in to keep this file i18n-agnostic
 */
export async function shareToAccountantWhatsApp(
  phone: string | undefined,
  message: string,
  i18n: {
    noPhone: string;
    notInstalled: string;
    error: string;
  },
): Promise<void> {
  if (!phone?.trim()) {
    Alert.alert("", i18n.noPhone);
    return;
  }

  const cleaned = cleanPhone(phone.trim());
  const url = `whatsapp://send?phone=${cleaned}&text=${encodeURIComponent(message)}`;

  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (!supported) {
    Alert.alert("", i18n.notInstalled);
    return;
  }

  await Linking.openURL(url).catch((err) => {
    if (__DEV__) console.warn("WhatsApp open failed:", err);
    Alert.alert(i18n.error, i18n.notInstalled);
  });
}
