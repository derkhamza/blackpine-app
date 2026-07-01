import { DoctorProfile, ExamRequestLine, ExamRequestCategory } from "./cabinetTypes";
import { EXAM_REQ_CATEGORY_LABELS, EXAM_REQ_CATEGORIES } from "./examCatalog";

function getPrint(): any { try { return require("expo-print"); } catch { return null; } }
function getSharing(): any { try { return require("expo-sharing"); } catch { return null; } }

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtDateFr(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

export function buildExamRequestHTML(
  patientName: string,
  lines: ExamRequestLine[],
  indication: string | undefined,
  date: string,
  doctorProfile: DoctorProfile,
): string {
  const dr = doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "Docteur";
  const ds = doctorProfile.documentSettings ?? {};
  const inpe = (ds.showInpe !== false && doctorProfile.inpe) ? `N° INPE : ${esc(doctorProfile.inpe)}` : "";
  const meta = [doctorProfile.specialtyLabel, doctorProfile.address, doctorProfile.phone ? `Tél : ${doctorProfile.phone}` : "", inpe]
    .filter(Boolean).map((x) => esc(String(x))).join("<br/>");

  const byCat = new Map<ExamRequestCategory, ExamRequestLine[]>();
  for (const l of lines) {
    if (!l.label.trim()) continue;
    if (!byCat.has(l.category)) byCat.set(l.category, []);
    byCat.get(l.category)!.push(l);
  }
  const groups = EXAM_REQ_CATEGORIES.filter((c) => byCat.has(c)).map((c) => {
    const items = byCat.get(c)!.map((l) =>
      `<li><span class="lbl">${esc(l.label)}</span>${l.detail ? `<span class="det"> — ${esc(l.detail)}</span>` : ""}</li>`).join("");
    return `<div class="group"><div class="cat">${esc(EXAM_REQ_CATEGORY_LABELS[c])}</div><ul>${items}</ul></div>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; }
  .page { padding: 18mm 16mm 14mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2.5px solid #1B4F72; margin-bottom: 16px; }
  .dr { font-size: 18pt; font-weight: 800; color: #1B4F72; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #555; line-height: 1.6; }
  .date { text-align: right; font-size: 9pt; color: #555; }
  .title { text-align: center; font-size: 13pt; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #1B4F72; margin: 6px 0 14px; }
  .patient { background: #f0f6fb; border-left: 4px solid #1B4F72; padding: 9px 13px; margin-bottom: 14px; border-radius: 0 6px 6px 0; font-size: 11pt; }
  .indication { font-size: 9.5pt; color: #333; background: #f6f9fc; border-radius: 5px; padding: 8px 11px; margin-bottom: 14px; }
  .indication b { color: #1B4F72; }
  .group { margin-bottom: 12px; }
  .cat { font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #1B4F72; border-bottom: 1px solid #cfe0ef; padding-bottom: 3px; margin-bottom: 5px; }
  ul { list-style: none; }
  li { font-size: 10.5pt; padding: 3px 0 3px 16px; position: relative; }
  li::before { content: "▪"; position: absolute; left: 2px; color: #1B4F72; font-size: 8pt; top: 4px; }
  .lbl { font-weight: 700; }
  .det { color: #555; font-style: italic; }
  .sig { margin-top: 26px; text-align: right; font-size: 9pt; color: #555; }
  .sig .line { border-top: 1px solid #999; width: 150px; margin-left: auto; margin-top: 34px; padding-top: 3px; font-size: 8pt; color: #888; }
  </style></head><body><div class="page">
  <div class="header">
    <div><div class="dr">${esc(dr)}</div><div class="meta">${meta}</div></div>
    <div class="date">Le ${fmtDateFr(date)}</div>
  </div>
  <div class="title">Demande d'examens</div>
  <div class="patient">Patient(e) : <b>${esc(patientName)}</b></div>
  ${indication ? `<div class="indication"><b>Renseignements cliniques :</b> ${esc(indication)}</div>` : ""}
  ${groups || '<div style="color:#aaa;font-style:italic">(aucun examen demandé)</div>'}
  <div class="sig">Signature et cachet du médecin<div class="line">${esc(doctorProfile.fullName || "")}</div></div>
  </div></body></html>`;
}

export async function shareExamRequest(
  patientName: string,
  lines: ExamRequestLine[],
  indication: string | undefined,
  date: string,
  doctorProfile: DoctorProfile,
): Promise<boolean> {
  const Print = getPrint();
  const Sharing = getSharing();
  if (!Print || !Sharing) return false;
  const html = buildExamRequestHTML(patientName, lines, indication, date, doctorProfile);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Demande d'examens — ${patientName}`, UTI: "com.adobe.pdf" });
  }
  return true;
}
