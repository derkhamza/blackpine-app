export type AppointmentType = "consultation" | "controle" | "suivi" | "procedure" | "urgence" | "autre";
export type AppointmentStatus = "scheduled" | "arrived" | "in_consultation" | "completed" | "cancelled" | "no_show";

export interface ConsultationNote {
  motif?: string;
  examination?: string;
  diagnosis?: string;
  treatment?: string;
}

/**
 * Vital signs captured at each consultation.
 * All fields are optional — record only what was measured.
 */
export interface VitalSigns {
  bpSys?: number;    // Systolic blood pressure (mmHg)
  bpDia?: number;    // Diastolic blood pressure (mmHg)
  hr?: number;       // Heart rate (bpm)
  temp?: number;     // Temperature (°C)
  spo2?: number;     // Peripheral O2 saturation (%)
  weight?: number;   // Weight (kg)
  height?: number;   // Height (cm)
}

export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
  type: AppointmentType;
  bookingSource?: "online";
  bookingPhone?:  string;
  notes?: string;
  status: AppointmentStatus;
  consultationNote?: ConsultationNote;
  vitalSigns?: VitalSigns;
  followUpDate?: string;   // "YYYY-MM-DD" — scheduled follow-up reminder
  locationId?: string;     // refers to DoctorProfile.locations[].id
  recurringRuleId?: string; // shared ID for all appointments in the same recurring series
  billedAt?: string;        // ISO — set when consultation fee is added to finances
  billedAmount?: number;    // MAD — net amount charged (base + acts − reduction)
  // Itemized billing: consultation base + each act performed (own price).
  billedItems?:     BillingLine[];
  billedReduction?: number;   // MAD discount applied to the subtotal
  // Payment tracking — patient may pay full, part, or defer entirely.
  // paidAmount = cumulative cash collected (0 = fully deferred). Undefined on a
  // billed appointment means a legacy record paid in full.
  paidAmount?: number;
  payments?:   PaymentRecord[];
  // AMO / CNOPS reimbursement tracking
  reimbursementStatus?: "pending" | "received" | "rejected";
  reimbursementAmount?: number;  // MAD — amount expected or actually received
  reimbursementDate?: string;    // "YYYY-MM-DD" — date payment was received
  // Mutuelle paperwork (feuille de soins) — whether the form was filled for the patient
  mutuellePapersFilled?: boolean;
  mutuellePapersDate?:   string;  // "YYYY-MM-DD"
}

export type PatientGender = "M" | "F";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

// ── Billing ──────────────────────────────────────────────────────────────────
export interface BillingLine {
  label:     string;   // "Consultation", "Petite chirurgie"…
  qty:       number;   // usually 1
  unitPrice: number;   // MAD per unit
}

export type PaymentMethod = "cash" | "card" | "cheque" | "transfer";

export interface PaymentRecord {
  amount: number;          // MAD collected
  date:   string;          // ISO timestamp
  method?: PaymentMethod;
}

// ── Clinical records ─────────────────────────────────────────────────────────

export interface PatientTimelineEvent {
  id:     string;
  date:   string;   // YYYY-MM-DD
  title:  string;
  notes?: string;
}

export type ExamType = "biologie" | "imagerie" | "ecg" | "autre";

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  biologie: "Biologie",
  imagerie: "Imagerie",
  ecg:      "ECG / Cardiologie",
  autre:    "Autre",
};

export const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  biologie: "#1890C5",
  imagerie: "#9B72D0",
  ecg:      "#E85B5B",
  autre:    "#888888",
};

export interface ExamValue {
  label:       string;   // "Hémoglobine", "Glucose"
  value:       string;   // "12.5" or free text ("Normal")
  unit?:       string;   // "g/dL", "mmol/L"
  refMin?:     number;
  refMax?:     number;
  isAbnormal?: boolean;
}

// ── Exam request (demande d'examens) ──────────────────────────────────────────
export type ExamRequestCategory =
  | "biologie" | "radiologie" | "echographie" | "scanner" | "irm" | "autre";

export interface ExamRequestLine {
  category: ExamRequestCategory;
  label:    string;    // "NFS", "IRM cérébrale"…
  detail?:  string;    // parameters: "à jeun", "face + profil"…
}

export interface ExamRequest {
  id:            string;
  patientId?:    string;
  patientName:   string;
  date:          string;          // YYYY-MM-DD
  lines:         ExamRequestLine[];
  indication?:   string;          // renseignements cliniques
  source:        "standalone" | "appointment";
  appointmentId?: string;
  createdAt:     string;          // ISO
}

export interface ExamResult {
  id:           string;
  type:         ExamType;
  date:         string;   // YYYY-MM-DD
  title:        string;   // "NFS", "Glycémie à jeun", "Échographie abdominale"
  labName?:     string;
  values:       ExamValue[];
  notes?:       string;
  createdAt:    string;   // ISO
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string; // "YYYY-MM-DD"
  gender?: PatientGender;
  notes?: string;
  bloodType?: BloodType;
  allergies?: string;
  antecedents?: string;
  currentMedications?: string;
  createdAt: string;
  // Insurance / reimbursement
  cin?: string;          // Carte nationale d'identité
  cnopsNumber?: string;  // N° CNOPS / AMO / RAMED immatriculation
  // Clinical records (sync with the patient record)
  timelineEvents?: PatientTimelineEvent[];
  examResults?:    ExamResult[];
}

export interface OrdonnanceLine {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Ordonnance {
  id: string;
  patientId?: string;
  /** Appointment this prescription was written at, if created from AppointmentDetailScreen. */
  appointmentId?: string;
  patientName: string;
  date: string;
  lines: OrdonnanceLine[];
  notes?: string;
}

// ── Invoice history ──────────────────────────────────────────────────────────

/** Lightweight record stored each time a PDF "Note d'honoraires" is generated. */
export interface InvoiceRecord {
  id: string;
  appointmentId: string;
  patientId?: string;
  patientName: string;
  amount: number;
  actLabel: string;
  invoiceNumber: string;
  issuedAt: string;       // ISO timestamp
  cnopsNumber?: string;
  taux?: number;          // reimbursement rate (0–100), e.g. 70
}

export type CertificatType = "arret_travail" | "aptitude" | "presence" | "autre";

export interface CertificatMedical {
  id: string;
  patientId?: string;
  /** Appointment this certificate was written at, if created from AppointmentDetailScreen. */
  appointmentId?: string;
  patientName: string;
  date: string;
  type: CertificatType;
  durationDays?: number;
  fromDate?: string;
  notes?: string;
}

// ── Secretary permissions ───────────────────────────────────────────────────
// In Morocco the secretary commonly takes vital-sign measurements and handles
// billing/facturation at the front desk, so those two default to ON; clinical
// records and full accounting stay OFF unless the doctor enables them.
export interface SecretaryPermissions {
  recordVitals?:  boolean; // take measurements (TA, poids, taille, T°, SpO₂…)
  handleBilling?: boolean; // facturation: encaisser, marquer le RDV facturé
  viewFinances?:  boolean; // full accounting: comptabilité, transactions
  viewClinical?:  boolean; // medical notes / ordonnances / certificats
  editPatients?:  boolean;
  managePayroll?: boolean;
}

export const DEFAULT_SECRETARY_PERMISSIONS: SecretaryPermissions = {
  recordVitals:  true,
  handleBilling: true,
  viewFinances:  false,
  viewClinical:  false,
  editPatients:  true,
  managePayroll: false,
};

// Doctor-maintained list of medical act codes (CCAM/ANAM-style) used for billing.
export interface ActeCode {
  id:     string;
  code:   string;   // "C", "CS", "K50"…
  label:  string;   // "Consultation spécialisée", "Petite chirurgie"…
  price?: number;   // default fee in MAD
}

// Customisation for generated documents (facture, ordonnance, certificat).
export interface DocumentSettings {
  showInpe?:   boolean;  // show the "N° INPE" line in document headers
  headerNote?: string;   // extra line under the doctor's identity
  footerNote?: string;   // custom footer text
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = { showInpe: true };

export interface DoctorProfile {
  fullName: string;
  specialtyLabel?: string;
  inpe?: string;
  address?: string;
  phone?: string;
  accountantPhone?: string;  // WhatsApp number of their expert-comptable
  locations?: CabinetLocation[];
  secretaryPermissions?: SecretaryPermissions; // synced to the secretary via /cabinet/pull
  acteCodes?: ActeCode[];    // medical act codes for billing
  documentSettings?: DocumentSettings; // facture/ordonnance/certificat customisation
}

// ── Multi-location ──────────────────────────────────────────────────────────

export interface CabinetLocation {
  id: string;
  name: string;
  address?: string;
  color?: string;  // hex, for agenda dot
}

// ── Employee / Payroll ──────────────────────────────────────────────────────

export type EmployeeRole = "secretaire" | "infirmier" | "aide_soignant" | "technicien" | "autre";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  baseSalary: number;          // MAD/month gross
  cnssNumber?: string;
  hireDate?: string;           // "YYYY-MM-DD"
  dependents?: number;         // for IR monthly deduction (30 MAD × dependents)
  notes?: string;
}

// ── Stock / inventory & suppliers ────────────────────────────────────────────

export type StockCategory = "medicament" | "consommable" | "equipement" | "autre";

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  medicament:  "Médicament",
  consommable: "Consommable",
  equipement:  "Équipement",
  autre:       "Autre",
};

export const STOCK_CATEGORY_COLORS: Record<StockCategory, string> = {
  medicament:  "#1890C5",
  consommable: "#15A876",
  equipement:  "#9B72D0",
  autre:       "#D4962A",
};

export interface StockItem {
  id:           string;
  name:         string;
  category:     StockCategory;
  quantity:     number;       // current count
  unit:         string;       // "boîtes", "ml", "pièces", "flacons"…
  minThreshold: number;       // alert when quantity ≤ this
  supplier?:    string;
  notes?:       string;
  expiryDate?:  string;       // YYYY-MM-DD — péremption (alert when approaching)
  updatedAt:    string;       // ISO — last adjustment
}

// Days before an expiry date at which to start warning the doctor.
export const EXPIRY_WARN_DAYS = 60;

// "expired" | "soon" | "ok" | null(no date) for a stock item's péremption.
export function expiryStatus(expiryDate: string | undefined, today: Date): "expired" | "soon" | "ok" | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate + "T00:00:00");
  if (Number.isNaN(exp.getTime())) return null;
  const days = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARN_DAYS) return "soon";
  return "ok";
}

export interface Supplier {
  id:        string;
  name:      string;
  phone?:    string;
  email?:    string;
  address?:  string;
  products?: string;   // free-text: what they supply
  notes?:    string;
  createdAt: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "partial" | "received" | "cancelled";

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:     "Brouillon",
  ordered:   "Commandé",
  partial:   "Partiellement reçu",
  received:  "Reçu",
  cancelled: "Annulé",
};

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft:     "#888888",
  ordered:   "#1890C5",
  partial:   "#D4962A",
  received:  "#15A876",
  cancelled: "#E85B5B",
};

export interface PurchaseOrderLine {
  stockItemId?: string;   // links to StockItem.id (optional)
  itemName:     string;
  quantity:     number;
  unitPrice?:   number;   // MAD
  receivedQty?: number;
}

export interface PurchaseOrder {
  id:            string;
  supplierId?:   string;
  supplierName?: string;
  lines:         PurchaseOrderLine[];
  status:        PurchaseOrderStatus;
  orderedAt?:    string;  // YYYY-MM-DD
  expectedAt?:   string;  // YYYY-MM-DD
  receivedAt?:   string;  // YYYY-MM-DD
  notes?:        string;
  createdAt:     string;
}

// ── Teleconsultation ─────────────────────────────────────────────────────────

export type TelePlatform = "googlemeet" | "zoom" | "teams" | "jitsi" | "autre";

export const TELE_PLATFORM_LABELS: Record<TelePlatform, string> = {
  googlemeet: "Google Meet",
  zoom:       "Zoom",
  teams:      "Microsoft Teams",
  jitsi:      "Jitsi",
  autre:      "Autre lien",
};

export const TELE_PLATFORM_COLORS: Record<TelePlatform, string> = {
  googlemeet: "#1A73E8",
  zoom:       "#2D8CFF",
  teams:      "#6264A7",
  jitsi:      "#15A876",
  autre:      "#888888",
};

export type TeleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export const TELE_STATUS_LABELS: Record<TeleStatus, string> = {
  scheduled:   "Planifiée",
  in_progress: "En cours",
  completed:   "Terminée",
  cancelled:   "Annulée",
};

export const TELE_STATUS_COLORS: Record<TeleStatus, string> = {
  scheduled:   "#1890C5",
  in_progress: "#15A876",
  completed:   "#888888",
  cancelled:   "#E85B5B",
};

export interface TeleSession {
  id:            string;
  patientName:   string;
  patientId?:    string;
  patientPhone?: string;
  platform:      TelePlatform;
  link?:         string;
  scheduledDate: string;   // YYYY-MM-DD
  scheduledTime: string;   // HH:MM
  status:        TeleStatus;
  notes?:        string;
  duration?:     number;   // minutes
  createdAt:     string;   // ISO
}

// ── WhatsApp message templates ───────────────────────────────────────────────

export type WaTemplateCategory = "rappel" | "confirmation" | "suivi" | "resultats" | "autre";

export const WA_TEMPLATE_CATEGORY_LABELS: Record<WaTemplateCategory, string> = {
  rappel:       "Rappel de RDV",
  confirmation: "Confirmation",
  suivi:        "Suivi",
  resultats:    "Résultats",
  autre:        "Autre",
};

export interface WaTemplate {
  id:       string;
  name:     string;
  category: WaTemplateCategory;
  body:     string;
}

export const DEFAULT_WA_TEMPLATES: WaTemplate[] = [
  { id: "wa-rappel", name: "Rappel de rendez-vous", category: "rappel",
    body: "Bonjour {patient}, nous vous rappelons votre rendez-vous le {date} à {heure} chez {docteur}. En cas d'empêchement, merci de nous contacter." },
  { id: "wa-confirmation", name: "Confirmation de rendez-vous", category: "confirmation",
    body: "Bonjour {patient}, votre rendez-vous du {date} à {heure} est confirmé au {cabinet}. Merci de vous présenter 5 minutes avant." },
  { id: "wa-resultats", name: "Résultats disponibles", category: "resultats",
    body: "Bonjour {patient}, vos résultats sont disponibles. Merci de prendre rendez-vous pour en discuter avec {docteur}." },
];

// ── Internal notes / tasks board ─────────────────────────────────────────────

export type NoteColor = "yellow" | "blue" | "green" | "pink";

export const NOTE_COLOR_VALUES: Record<NoteColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: "#FFFDE7", border: "#FFE082", text: "#6B4F00" },
  blue:   { bg: "#E3F2FD", border: "#90CAF9", text: "#0D47A1" },
  green:  { bg: "#E8F5E9", border: "#A5D6A7", text: "#1B5E20" },
  pink:   { bg: "#FCE4EC", border: "#F48FB1", text: "#880E4F" },
};

export interface InternalNote {
  id:        string;
  type:      "note" | "task";
  title:     string;
  body?:     string;          // free text (notes)
  color:     NoteColor;
  isPinned:  boolean;
  isDone:    boolean;         // tasks only
  dueDate?:  string;          // YYYY-MM-DD, tasks only
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
