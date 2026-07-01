import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appointment, CertificatMedical, DoctorProfile, Employee, InvoiceRecord, Ordonnance, Patient, StockItem, Supplier, TeleSession, InternalNote, PurchaseOrder, WaTemplate, ExamRequest } from "./cabinetTypes";
import {
  loadAppointments, saveAppointments,
  loadPatients, savePatients,
  loadOrdonnances, saveOrdonnances,
  loadExamRequests, saveExamRequests,
  loadCertificats, saveCertificats,
  loadDoctorProfile, saveDoctorProfile,
  loadEmployees, saveEmployees,
  loadApptPhotos, saveApptPhotos,
  loadApptPhotoLabels, saveApptPhotoLabels,
  loadInvoices, saveInvoices,
  loadStockItems, saveStockItems,
  loadSuppliers, saveSuppliers,
  loadTeleSessions, saveTeleSessions,
  loadNotes, saveNotes,
  loadPurchaseOrders, savePurchaseOrders,
  loadWaTemplates, saveWaTemplates,
} from "./cabinetStorage";
import { getStoredUser } from "./api";
import { useApp } from "./AppContext";
import { updateWidget, clearWidget } from "./widgetBridge";

const DEFAULT_DOCTOR: DoctorProfile = { fullName: "" };

// ─── Widget data helper ───────────────────────────────────────────────────────

function buildWidgetPayload(appts: Appointment[]) {
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayAppts = appts
    .filter((a) => a.date === todayStr && a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const now = new Date();
  const nowTime =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nextAppt = todayAppts.find((a) => a.startTime >= nowTime);

  return {
    todayCount: todayAppts.length,
    nextApptTime: nextAppt?.startTime ?? null,
    updatedAt: now.toISOString(),
  };
}

interface CabinetContextValue {
  appointments: Appointment[];
  patients: Patient[];
  ordonnances: Ordonnance[];
  examRequests: ExamRequest[];
  certificats: CertificatMedical[];
  doctorProfile: DoctorProfile;
  employees: Employee[];

  addAppointment: (a: Appointment) => void;
  updateAppointment: (a: Appointment) => void;
  deleteAppointment: (id: string) => void;
  /** Delete all appointments in the same recurring series from `fromDate` onwards (inclusive). */
  deleteAppointmentSeries: (ruleId: string, fromDate: string) => void;

  addPatient: (p: Patient) => void;
  updatePatient: (p: Patient) => void;
  deletePatient: (id: string) => void;

  addOrdonnance: (o: Ordonnance) => void;
  deleteOrdonnance: (id: string) => void;
  addExamRequest: (e: ExamRequest) => void;
  updateExamRequest: (e: ExamRequest) => void;
  deleteExamRequest: (id: string) => void;

  addCertificat: (c: CertificatMedical) => void;
  deleteCertificat: (id: string) => void;

  updateDoctorProfile: (d: DoctorProfile) => void;

  addEmployee: (e: Employee) => void;
  updateEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;

  apptPhotos: Record<string, string[]>;
  addApptPhoto: (appointmentId: string, uri: string) => void;
  removeApptPhoto: (appointmentId: string, uri: string) => void;

  // uri → human label (e.g. "NFS", "Radio") — keyed by appointmentId then uri
  apptPhotoLabels: Record<string, Record<string, string>>;
  setApptPhotoLabel: (appointmentId: string, uri: string, label: string) => void;

  invoices: InvoiceRecord[];
  addInvoice: (inv: InvoiceRecord) => void;

  stockItems: StockItem[];
  addStockItem: (s: StockItem) => void;
  updateStockItem: (s: StockItem) => void;
  deleteStockItem: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;

  teleSessions: TeleSession[];
  addTeleSession: (s: TeleSession) => void;
  updateTeleSession: (s: TeleSession) => void;
  deleteTeleSession: (id: string) => void;

  notes: InternalNote[];
  addNote: (n: InternalNote) => void;
  updateNote: (n: InternalNote) => void;
  deleteNote: (id: string) => void;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (p: PurchaseOrder) => void;
  updatePurchaseOrder: (p: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;

  waTemplates: WaTemplate[];
  addWaTemplate: (w: WaTemplate) => void;
  updateWaTemplate: (w: WaTemplate) => void;
  deleteWaTemplate: (id: string) => void;

  /** The resolved user id for the current session (scopes per-user storage). */
  userId: string | null;

  reload: () => Promise<void>;
}

const CabinetContext = createContext<CabinetContextValue | null>(null);

export function CabinetProvider({ children }: { children: React.ReactNode }) {
  const { screen } = useApp();

  const [userId, setUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [certificats, setCertificats] = useState<CertificatMedical[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(DEFAULT_DOCTOR);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [apptPhotos, setApptPhotos] = useState<Record<string, string[]>>({});
  const [apptPhotoLabels, setApptPhotoLabels] = useState<Record<string, Record<string, string>>>({});
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [teleSessions, setTeleSessions] = useState<TeleSession[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [waTemplates, setWaTemplates] = useState<WaTemplate[]>([]);

  // ── Resolve user ID when the app screen becomes active ──────────────────────
  // When the user logs out (screen → "auth"), clear all in-memory cabinet data
  // so a second account signing in on the same device sees a clean state.
  useEffect(() => {
    if (screen === "app") {
      getStoredUser().then((user) => {
        setUserId(user?.id ?? "local");
      });
    } else {
      // Logged out / loading — wipe in-memory data
      setUserId(null);
      setAppointments([]);
      setPatients([]);
      setOrdonnances([]);
      setExamRequests([]);
      setCertificats([]);
      setDoctorProfile(DEFAULT_DOCTOR);
      setEmployees([]);
      setApptPhotos({});
      setStockItems([]);
      setSuppliers([]);
      setTeleSessions([]);
      setNotes([]);
      setPurchaseOrders([]);
      setWaTemplates([]);
      clearWidget();
    }
  }, [screen]);

  // ── Load data for the resolved user ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    loadAppointments(userId).then((appts) => {
      setAppointments(appts);
      updateWidget(buildWidgetPayload(appts));
    });
    loadPatients(userId).then(setPatients);
    loadOrdonnances(userId).then(setOrdonnances);
    loadExamRequests(userId).then(setExamRequests);
    loadCertificats(userId).then(setCertificats);
    loadDoctorProfile(userId).then((d) => { if (d) setDoctorProfile(d); });
    loadEmployees(userId).then(setEmployees);
    loadApptPhotos(userId).then(setApptPhotos);
    loadApptPhotoLabels(userId).then(setApptPhotoLabels);
    loadInvoices(userId).then(setInvoices);
    loadStockItems(userId).then(setStockItems);
    loadSuppliers(userId).then(setSuppliers);
    loadTeleSessions(userId).then(setTeleSessions);
    loadNotes(userId).then(setNotes);
    loadPurchaseOrders(userId).then(setPurchaseOrders);
    loadWaTemplates(userId).then(setWaTemplates);
  }, [userId]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const addAppointment = useCallback((a: Appointment) => {
    if (!userId) return;
    setAppointments(prev => {
      const next = [...prev, a];
      saveAppointments(next, userId);
      updateWidget(buildWidgetPayload(next));
      return next;
    });
  }, [userId]);

  const updateAppointment = useCallback((a: Appointment) => {
    if (!userId) return;
    setAppointments(prev => {
      const next = prev.map(x => (x.id === a.id ? a : x));
      saveAppointments(next, userId);
      updateWidget(buildWidgetPayload(next));
      return next;
    });
  }, [userId]);

  const deleteAppointment = useCallback((id: string) => {
    if (!userId) return;
    setAppointments(prev => {
      const next = prev.filter(x => x.id !== id);
      saveAppointments(next, userId);
      updateWidget(buildWidgetPayload(next));
      return next;
    });
  }, [userId]);

  const deleteAppointmentSeries = useCallback((ruleId: string, fromDate: string) => {
    if (!userId) return;
    setAppointments(prev => {
      const next = prev.filter(
        x => !(x.recurringRuleId === ruleId && x.date >= fromDate)
      );
      saveAppointments(next, userId);
      updateWidget(buildWidgetPayload(next));
      return next;
    });
  }, [userId]);

  const addPatient = useCallback((p: Patient) => {
    if (!userId) return;
    setPatients(prev => {
      const next = [...prev, p];
      savePatients(next, userId);
      return next;
    });
  }, [userId]);

  const updatePatient = useCallback((p: Patient) => {
    if (!userId) return;
    setPatients(prev => {
      const next = prev.map(x => (x.id === p.id ? p : x));
      savePatients(next, userId);
      return next;
    });
  }, [userId]);

  const deletePatient = useCallback((id: string) => {
    if (!userId) return;
    setPatients(prev => {
      const next = prev.filter(x => x.id !== id);
      savePatients(next, userId);
      return next;
    });
    // Remove patientId reference from linked appointments
    setAppointments(prev => {
      const updated = prev.map(a =>
        a.patientId === id ? { ...a, patientId: undefined } : a
      );
      if (userId) saveAppointments(updated, userId);
      return updated;
    });
  }, [userId]);

  const addOrdonnance = useCallback((o: Ordonnance) => {
    if (!userId) return;
    setOrdonnances(prev => {
      const next = [...prev, o];
      saveOrdonnances(next, userId);
      return next;
    });
  }, [userId]);

  const deleteOrdonnance = useCallback((id: string) => {
    if (!userId) return;
    setOrdonnances(prev => {
      const next = prev.filter(x => x.id !== id);
      saveOrdonnances(next, userId);
      return next;
    });
  }, [userId]);

  const addExamRequest = useCallback((e: ExamRequest) => {
    if (!userId) return;
    setExamRequests(prev => { const next = [...prev, e]; saveExamRequests(next, userId); return next; });
  }, [userId]);
  const updateExamRequest = useCallback((e: ExamRequest) => {
    if (!userId) return;
    setExamRequests(prev => { const next = prev.map(x => x.id === e.id ? e : x); saveExamRequests(next, userId); return next; });
  }, [userId]);
  const deleteExamRequest = useCallback((id: string) => {
    if (!userId) return;
    setExamRequests(prev => { const next = prev.filter(x => x.id !== id); saveExamRequests(next, userId); return next; });
  }, [userId]);

  const addCertificat = useCallback((c: CertificatMedical) => {
    if (!userId) return;
    setCertificats(prev => {
      const next = [...prev, c];
      saveCertificats(next, userId);
      return next;
    });
  }, [userId]);

  const deleteCertificat = useCallback((id: string) => {
    if (!userId) return;
    setCertificats(prev => {
      const next = prev.filter(x => x.id !== id);
      saveCertificats(next, userId);
      return next;
    });
  }, [userId]);

  const updateDoctorProfile = useCallback((d: DoctorProfile) => {
    if (!userId) return;
    setDoctorProfile(d);
    saveDoctorProfile(d, userId);
  }, [userId]);

  const addStockItem = useCallback((s: StockItem) => {
    if (!userId) return;
    setStockItems(prev => { const next = [...prev, s]; saveStockItems(next, userId); return next; });
  }, [userId]);
  const updateStockItem = useCallback((s: StockItem) => {
    if (!userId) return;
    setStockItems(prev => { const next = prev.map(x => x.id === s.id ? s : x); saveStockItems(next, userId); return next; });
  }, [userId]);
  const deleteStockItem = useCallback((id: string) => {
    if (!userId) return;
    setStockItems(prev => { const next = prev.filter(x => x.id !== id); saveStockItems(next, userId); return next; });
  }, [userId]);

  const addSupplier = useCallback((s: Supplier) => {
    if (!userId) return;
    setSuppliers(prev => { const next = [...prev, s]; saveSuppliers(next, userId); return next; });
  }, [userId]);
  const updateSupplier = useCallback((s: Supplier) => {
    if (!userId) return;
    setSuppliers(prev => { const next = prev.map(x => x.id === s.id ? s : x); saveSuppliers(next, userId); return next; });
  }, [userId]);
  const deleteSupplier = useCallback((id: string) => {
    if (!userId) return;
    setSuppliers(prev => { const next = prev.filter(x => x.id !== id); saveSuppliers(next, userId); return next; });
  }, [userId]);

  const addTeleSession = useCallback((s: TeleSession) => {
    if (!userId) return;
    setTeleSessions(prev => { const next = [...prev, s]; saveTeleSessions(next, userId); return next; });
  }, [userId]);
  const updateTeleSession = useCallback((s: TeleSession) => {
    if (!userId) return;
    setTeleSessions(prev => { const next = prev.map(x => x.id === s.id ? s : x); saveTeleSessions(next, userId); return next; });
  }, [userId]);
  const deleteTeleSession = useCallback((id: string) => {
    if (!userId) return;
    setTeleSessions(prev => { const next = prev.filter(x => x.id !== id); saveTeleSessions(next, userId); return next; });
  }, [userId]);

  const addNote = useCallback((n: InternalNote) => {
    if (!userId) return;
    setNotes(prev => { const next = [...prev, n]; saveNotes(next, userId); return next; });
  }, [userId]);
  const updateNote = useCallback((n: InternalNote) => {
    if (!userId) return;
    setNotes(prev => { const next = prev.map(x => x.id === n.id ? n : x); saveNotes(next, userId); return next; });
  }, [userId]);
  const deleteNote = useCallback((id: string) => {
    if (!userId) return;
    setNotes(prev => { const next = prev.filter(x => x.id !== id); saveNotes(next, userId); return next; });
  }, [userId]);

  const addPurchaseOrder = useCallback((p: PurchaseOrder) => {
    if (!userId) return;
    setPurchaseOrders(prev => { const next = [...prev, p]; savePurchaseOrders(next, userId); return next; });
  }, [userId]);
  const updatePurchaseOrder = useCallback((p: PurchaseOrder) => {
    if (!userId) return;
    setPurchaseOrders(prev => { const next = prev.map(x => x.id === p.id ? p : x); savePurchaseOrders(next, userId); return next; });
  }, [userId]);
  const deletePurchaseOrder = useCallback((id: string) => {
    if (!userId) return;
    setPurchaseOrders(prev => { const next = prev.filter(x => x.id !== id); savePurchaseOrders(next, userId); return next; });
  }, [userId]);

  const addWaTemplate = useCallback((w: WaTemplate) => {
    if (!userId) return;
    setWaTemplates(prev => { const next = [...prev, w]; saveWaTemplates(next, userId); return next; });
  }, [userId]);
  const updateWaTemplate = useCallback((w: WaTemplate) => {
    if (!userId) return;
    setWaTemplates(prev => { const next = prev.map(x => x.id === w.id ? w : x); saveWaTemplates(next, userId); return next; });
  }, [userId]);
  const deleteWaTemplate = useCallback((id: string) => {
    if (!userId) return;
    setWaTemplates(prev => { const next = prev.filter(x => x.id !== id); saveWaTemplates(next, userId); return next; });
  }, [userId]);

  const addEmployee = useCallback((e: Employee) => {
    if (!userId) return;
    setEmployees(prev => {
      const next = [...prev, e];
      saveEmployees(next, userId);
      return next;
    });
  }, [userId]);

  const updateEmployee = useCallback((e: Employee) => {
    if (!userId) return;
    setEmployees(prev => {
      const next = prev.map(x => (x.id === e.id ? e : x));
      saveEmployees(next, userId);
      return next;
    });
  }, [userId]);

  const deleteEmployee = useCallback((id: string) => {
    if (!userId) return;
    setEmployees(prev => {
      const next = prev.filter(x => x.id !== id);
      saveEmployees(next, userId);
      return next;
    });
  }, [userId]);

  const addApptPhoto = useCallback((appointmentId: string, uri: string) => {
    if (!userId) return;
    setApptPhotos(prev => {
      const next = { ...prev, [appointmentId]: [...(prev[appointmentId] ?? []), uri] };
      saveApptPhotos(next, userId);
      return next;
    });
  }, [userId]);

  const removeApptPhoto = useCallback((appointmentId: string, uri: string) => {
    if (!userId) return;
    setApptPhotos(prev => {
      const next = { ...prev, [appointmentId]: (prev[appointmentId] ?? []).filter(u => u !== uri) };
      saveApptPhotos(next, userId);
      return next;
    });
    // Also remove the label for this URI
    setApptPhotoLabels(prev => {
      const apptLabels = { ...(prev[appointmentId] ?? {}) };
      delete apptLabels[uri];
      const next = { ...prev, [appointmentId]: apptLabels };
      saveApptPhotoLabels(next, userId);
      return next;
    });
  }, [userId]);

  const setApptPhotoLabel = useCallback((appointmentId: string, uri: string, label: string) => {
    if (!userId) return;
    setApptPhotoLabels(prev => {
      const next = { ...prev, [appointmentId]: { ...(prev[appointmentId] ?? {}), [uri]: label } };
      saveApptPhotoLabels(next, userId);
      return next;
    });
  }, [userId]);

  const addInvoice = useCallback((inv: InvoiceRecord) => {
    if (!userId) return;
    setInvoices(prev => {
      const next = [...prev, inv];
      saveInvoices(next, userId);
      return next;
    });
  }, [userId]);

  // ── Reload all data from storage (for pull-to-refresh) ──────────────────────
  const reload = useCallback(async () => {
    if (!userId) return;
    const [appts, pats, ords, exreqs, certs, prof, emps, photos, photoLabels, invs, stock, sups, tele, notesL, poL, wtplsL] = await Promise.all([
      loadAppointments(userId),
      loadPatients(userId),
      loadOrdonnances(userId),
      loadExamRequests(userId),
      loadCertificats(userId),
      loadDoctorProfile(userId),
      loadEmployees(userId),
      loadApptPhotos(userId),
      loadApptPhotoLabels(userId),
      loadInvoices(userId),
      loadStockItems(userId),
      loadSuppliers(userId),
      loadTeleSessions(userId),
      loadNotes(userId),
      loadPurchaseOrders(userId),
      loadWaTemplates(userId),
    ]);
    setAppointments(appts);
    updateWidget(buildWidgetPayload(appts));
    setPatients(pats);
    setOrdonnances(ords);
    setExamRequests(exreqs);
    setCertificats(certs);
    if (prof) setDoctorProfile(prof);
    setEmployees(emps);
    setApptPhotos(photos);
    setApptPhotoLabels(photoLabels);
    setInvoices(invs);
    setStockItems(stock);
    setSuppliers(sups);
    setTeleSessions(tele);
    setNotes(notesL);
    setPurchaseOrders(poL);
    setWaTemplates(wtplsL);
  }, [userId]);

  return (
    <CabinetContext.Provider value={{
      appointments, patients, ordonnances, examRequests, certificats, doctorProfile, employees,
      addAppointment, updateAppointment, deleteAppointment, deleteAppointmentSeries,
      addPatient, updatePatient, deletePatient,
      addOrdonnance, deleteOrdonnance,
      addExamRequest, updateExamRequest, deleteExamRequest,
      addCertificat, deleteCertificat,
      updateDoctorProfile,
      addEmployee, updateEmployee, deleteEmployee,
      apptPhotos, addApptPhoto, removeApptPhoto,
      apptPhotoLabels, setApptPhotoLabel,
      invoices, addInvoice,
      stockItems, addStockItem, updateStockItem, deleteStockItem,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      teleSessions, addTeleSession, updateTeleSession, deleteTeleSession,
      notes, addNote, updateNote, deleteNote,
      purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
      waTemplates, addWaTemplate, updateWaTemplate, deleteWaTemplate,
      userId,
      reload,
    }}>
      {children}
    </CabinetContext.Provider>
  );
}

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("useCabinet must be used within CabinetProvider");
  return ctx;
}
