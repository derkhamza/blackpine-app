export type AppointmentType = "consultation" | "suivi" | "procedure" | "urgence" | "autre";
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
  notes?: string;
  status: AppointmentStatus;
  consultationNote?: ConsultationNote;
  vitalSigns?: VitalSigns;
  followUpDate?: string;   // "YYYY-MM-DD" — scheduled follow-up reminder
  locationId?: string;     // refers to DoctorProfile.locations[].id
  recurringRuleId?: string; // shared ID for all appointments in the same recurring series
  billedAt?: string;        // ISO — set when consultation fee is added to finances
  // AMO / CNOPS reimbursement tracking
  reimbursementStatus?: "pending" | "received" | "rejected";
  reimbursementAmount?: number;  // MAD — amount expected or actually received
  reimbursementDate?: string;    // "YYYY-MM-DD" — date payment was received
}

export type PatientGender = "M" | "F";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

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

export interface DoctorProfile {
  fullName: string;
  specialtyLabel?: string;
  inpe?: string;
  address?: string;
  phone?: string;
  accountantPhone?: string;  // WhatsApp number of their expert-comptable
  locations?: CabinetLocation[];
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
