import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import {
  computeTaxFromTransactions,
  DoctorProfile,
  FullTaxComputation,
  Transaction,
} from "blackpine-engine";
import { loadState, saveState, clearState } from "./storage";

const defaultProfile: DoctorProfile = {
  id: "demo",
  legalForm: "PERSONNE_PHYSIQUE",
  practiceType: "CABINET_ONLY",
  activityStartDate: "2018-03-01",
  commune: "Casablanca",
  communeType: "URBAN",
  maritalStatus: "MARRIED",
  dependentsCount: 2,
  tpRegistered: true,
};

const defaultTransactions: Transaction[] = [
  { id: "r1", type: "RECETTE", amount: 460000, date: "2026-12-31", category: "consultation" },
  { id: "c1", type: "CHARGE", amount: 60000, date: "2026-12-31", category: "loyer_cabinet" },
  { id: "c2", type: "CHARGE", amount: 72000, date: "2026-12-31", category: "salaires_personnel" },
  { id: "c3", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "consommables_medicaux" },
  {
    id: "c4", type: "CHARGE", amount: 12000, date: "2026-12-31", category: "carburant",
    deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6,
  },
  { id: "c5", type: "CHARGE", amount: 8000, date: "2026-12-31", category: "rc_pro" },
  { id: "c6", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "honoraires_comptable" },
];

interface AppState {
  loading: boolean;
  saving: boolean;
  lastSavedAt: string | null;

  profile: DoctorProfile;
  transactions: Transaction[];
  result: FullTaxComputation;

  setProfile: (p: DoctorProfile) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  reset: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [profile, setProfileState] = useState<DoctorProfile>(defaultProfile);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);

  // Load on mount
  useEffect(() => {
    (async () => {
      const persisted = await loadState();
      if (persisted.profile) setProfileState(persisted.profile);
      if (persisted.transactions.length > 0) setTransactions(persisted.transactions);
      setLastSavedAt(persisted.lastSavedAt);
      setLoading(false);
    })();
  }, []);

  // Save on change (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const ts = await saveState(profile, transactions);
        setLastSavedAt(ts);
      } catch (err) {
        console.warn("save failed", err);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profile, transactions, loading]);

  const result = computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31");

  const newId = () => Math.random().toString(36).slice(2, 9);

  const value: AppState = {
    loading,
    saving,
    lastSavedAt,
    profile,
    transactions,
    result,
    setProfile: setProfileState,
    addTransaction: (tx) => setTransactions((prev) => [...prev, { ...tx, id: newId() }]),
    updateTransaction: (id, patch) =>
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTransaction: (id) =>
      setTransactions((prev) => prev.filter((t) => t.id !== id)),
    reset: async () => {
      await clearState();
      setProfileState(defaultProfile);
      setTransactions(defaultTransactions);
      setLastSavedAt(null);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}