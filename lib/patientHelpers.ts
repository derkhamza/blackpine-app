import { Patient } from "./cabinetTypes";
import { colors } from "./theme";

const AVATAR_PALETTE = [
  colors.brand,
  colors.success,
  colors.gold,
  "#9B72D0",
  "#E85B5B",
  "#2BA3B6",
];

/** Compute age from a date-of-birth ISO string. Returns null when unknown. */
export function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

/** Return "FL" initials from a patient object. */
export function initials(p: Pick<Patient, "firstName" | "lastName">): string {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
}

/** Deterministic avatar colour based on the patient's full name. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
