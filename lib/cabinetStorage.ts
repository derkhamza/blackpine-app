import { Appointment, CertificatMedical, DoctorProfile, Employee, InvoiceRecord, Ordonnance, Patient, StockItem, Supplier, TeleSession, InternalNote, PurchaseOrder, WaTemplate, ExamRequest, DEFAULT_WA_TEMPLATES } from "./cabinetTypes";

function getAS() {
  return require("@react-native-async-storage/async-storage").default;
}

// All keys are scoped to a userId so each account's cabinet data is isolated.
const K = {
  appointments: (uid: string) => `blackpine.cab.appts.v1.${uid}`,
  patients:     (uid: string) => `blackpine.cab.patients.v1.${uid}`,
  ordonnances:  (uid: string) => `blackpine.cab.ordo.v1.${uid}`,
  certificats:  (uid: string) => `blackpine.cab.certs.v1.${uid}`,
  doctorProfile:(uid: string) => `blackpine.cab.doctor.v1.${uid}`,
  employees:    (uid: string) => `blackpine.cab.employees.v1.${uid}`,
  apptPhotos:   (uid: string) => `blackpine.cab.appt-photos.v1.${uid}`,
  invoices:     (uid: string) => `blackpine.cab.invoices.v1.${uid}`,
  stockItems:   (uid: string) => `blackpine.cab.stock.v1.${uid}`,
  suppliers:    (uid: string) => `blackpine.cab.suppliers.v1.${uid}`,
  teleSessions: (uid: string) => `blackpine.cab.tele.v1.${uid}`,
  notes:        (uid: string) => `blackpine.cab.notes.v1.${uid}`,
  purchaseOrders: (uid: string) => `blackpine.cab.po.v1.${uid}`,
  waTemplates:  (uid: string) => `blackpine.cab.watpl.v1.${uid}`,
  examRequests: (uid: string) => `blackpine.cab.examreq.v1.${uid}`,
};

export async function loadAppointments(userId: string): Promise<Appointment[]> {
  try {
    const raw = await getAS().getItem(K.appointments(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveAppointments(data: Appointment[], userId: string): Promise<void> {
  await getAS().setItem(K.appointments(userId), JSON.stringify(data));
}

export async function loadPatients(userId: string): Promise<Patient[]> {
  try {
    const raw = await getAS().getItem(K.patients(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function savePatients(data: Patient[], userId: string): Promise<void> {
  await getAS().setItem(K.patients(userId), JSON.stringify(data));
}

export async function loadOrdonnances(userId: string): Promise<Ordonnance[]> {
  try {
    const raw = await getAS().getItem(K.ordonnances(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveOrdonnances(data: Ordonnance[], userId: string): Promise<void> {
  await getAS().setItem(K.ordonnances(userId), JSON.stringify(data));
}

export async function loadExamRequests(userId: string): Promise<ExamRequest[]> {
  try {
    const raw = await getAS().getItem(K.examRequests(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveExamRequests(data: ExamRequest[], userId: string): Promise<void> {
  await getAS().setItem(K.examRequests(userId), JSON.stringify(data));
}

export async function loadCertificats(userId: string): Promise<CertificatMedical[]> {
  try {
    const raw = await getAS().getItem(K.certificats(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveCertificats(data: CertificatMedical[], userId: string): Promise<void> {
  await getAS().setItem(K.certificats(userId), JSON.stringify(data));
}

export async function loadDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  try {
    const raw = await getAS().getItem(K.doctorProfile(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export async function saveDoctorProfile(data: DoctorProfile, userId: string): Promise<void> {
  await getAS().setItem(K.doctorProfile(userId), JSON.stringify(data));
}

export async function loadEmployees(userId: string): Promise<Employee[]> {
  try {
    const raw = await getAS().getItem(K.employees(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveEmployees(data: Employee[], userId: string): Promise<void> {
  await getAS().setItem(K.employees(userId), JSON.stringify(data));
}

export async function loadStockItems(userId: string): Promise<StockItem[]> {
  try {
    const raw = await getAS().getItem(K.stockItems(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveStockItems(data: StockItem[], userId: string): Promise<void> {
  await getAS().setItem(K.stockItems(userId), JSON.stringify(data));
}

export async function loadSuppliers(userId: string): Promise<Supplier[]> {
  try {
    const raw = await getAS().getItem(K.suppliers(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveSuppliers(data: Supplier[], userId: string): Promise<void> {
  await getAS().setItem(K.suppliers(userId), JSON.stringify(data));
}

export async function loadTeleSessions(userId: string): Promise<TeleSession[]> {
  try {
    const raw = await getAS().getItem(K.teleSessions(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveTeleSessions(data: TeleSession[], userId: string): Promise<void> {
  await getAS().setItem(K.teleSessions(userId), JSON.stringify(data));
}

export async function loadNotes(userId: string): Promise<InternalNote[]> {
  try {
    const raw = await getAS().getItem(K.notes(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveNotes(data: InternalNote[], userId: string): Promise<void> {
  await getAS().setItem(K.notes(userId), JSON.stringify(data));
}

export async function loadPurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
  try {
    const raw = await getAS().getItem(K.purchaseOrders(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function savePurchaseOrders(data: PurchaseOrder[], userId: string): Promise<void> {
  await getAS().setItem(K.purchaseOrders(userId), JSON.stringify(data));
}

export async function loadWaTemplates(userId: string): Promise<WaTemplate[]> {
  try {
    const raw = await getAS().getItem(K.waTemplates(userId));
    return raw ? JSON.parse(raw) : DEFAULT_WA_TEMPLATES;
  } catch { return DEFAULT_WA_TEMPLATES; }
}
export async function saveWaTemplates(data: WaTemplate[], userId: string): Promise<void> {
  await getAS().setItem(K.waTemplates(userId), JSON.stringify(data));
}

// ── Full cabinet wipe ─────────────────────────────────────────────────────────

/**
 * Remove every cabinet key for the given userId from AsyncStorage.
 * Call this on logout so patient / appointment data doesn't linger on the device
 * after the user signs out (especially important on shared devices).
 */
export async function clearCabinetData(userId: string): Promise<void> {
  try {
    await getAS().multiRemove([
      K.appointments(userId),
      K.patients(userId),
      K.ordonnances(userId),
      K.certificats(userId),
      K.doctorProfile(userId),
      K.employees(userId),
      K.apptPhotos(userId),
      K.invoices(userId),
      K.stockItems(userId),
      K.suppliers(userId),
      K.teleSessions(userId),
      K.notes(userId),
      K.purchaseOrders(userId),
      K.waTemplates(userId),
      K.examRequests(userId),
    ]);
  } catch {
    // Best-effort: storage errors should not block the logout flow
  }
}

// ── Appointment photos ───────────────────────────────────────────────────────
// Stored as { [appointmentId]: string[] } — each string is a file:// URI

export async function loadApptPhotos(userId: string): Promise<Record<string, string[]>> {
  try {
    const raw = await getAS().getItem(K.apptPhotos(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export async function saveApptPhotos(data: Record<string, string[]>, userId: string): Promise<void> {
  await getAS().setItem(K.apptPhotos(userId), JSON.stringify(data));
}

// ── Appointment photo labels ──────────────────────────────────────────────────
// Stored as { [appointmentId]: { [uri]: label } }

export async function loadApptPhotoLabels(userId: string): Promise<Record<string, Record<string, string>>> {
  try {
    const raw = await getAS().getItem(`blackpine.cab.appt-photo-labels.v1.${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export async function saveApptPhotoLabels(data: Record<string, Record<string, string>>, userId: string): Promise<void> {
  await getAS().setItem(`blackpine.cab.appt-photo-labels.v1.${userId}`, JSON.stringify(data));
}

// ── Invoice history ───────────────────────────────────────────────────────────

export async function loadInvoices(userId: string): Promise<InvoiceRecord[]> {
  try {
    const raw = await getAS().getItem(K.invoices(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export async function saveInvoices(data: InvoiceRecord[], userId: string): Promise<void> {
  await getAS().setItem(K.invoices(userId), JSON.stringify(data));
}
