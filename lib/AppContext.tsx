import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  computeTaxFromTransactions,
  DoctorProfile,
  FullTaxComputation,
  Transaction,
} from "blackpine-engine";
import { loadState, saveState, clearState, setOnboarded } from "./storage";
import { isLoggedIn } from "./api";
import { syncPush, syncPull, SyncStatus } from "./syncService";

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
  onboarded: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  isAuthenticated: boolean;

  profile: DoctorProfile;
  transactions: Transaction[];
  result: FullTaxComputation;

  setProfile: (p: DoctorProfile) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  reset: () => Promise<void>;
  completeOnboarding: (profile: DoctorProfile, withDemoData: boolean) => Promise<void>;
  onAuthChange: () => Promise<void>;
  forcePull: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const newId = () => Math.random().toString(36).slice(2, 9);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [profile, setProfileState] = useState<DoctorProfile>(defaultProfile);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Track whether initial load is done (prevents save/sync during load)
  const initialized = useRef(false);

  // Load on mount + auto-pull if logged in
  useEffect(() => {
    (async () => {
      const persisted = await loadState();
      if (persisted.profile) setProfileState(persisted.profile);
      if (persisted.transactions.length > 0) setTransactions(persisted.transactions);
      setLastSavedAt(persisted.lastSavedAt);
      setOnboardedState(persisted.onboarded);

      // Check auth and pull from cloud
      const loggedIn = await isLoggedIn();
      setIsAuthenticated(loggedIn);

      // Show app immediately with local data
      setLoading(false);
      initialized.current = true;

      // Pull from cloud in background (non-blocking)
      if (loggedIn && persisted.onboarded) {
        setSyncStatus("syncing");
        syncPull().then((cloudData) => {
          if (cloudData && cloudData.profile) {
            setProfileState(cloudData.profile);
            if (cloudData.transactions.length > 0) {
              setTransactions(cloudData.transactions);
            }
            setSyncStatus("synced");
            setLastSyncedAt(new Date().toISOString());
          } else {
            setSyncStatus("idle");
          }
        });
      }
    })();
  }, []);

  // Save locally on change (debounced 600ms)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized.current) return;
    if (!onboarded) return;
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
  }, [profile, transactions, onboarded]);

  // Auto-sync to cloud on change (debounced 2 seconds, only when authenticated)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized.current) return;
    if (!onboarded) return;
    if (!isAuthenticated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const result = await syncPush(profile, transactions);
      if (result.success) {
        setSyncStatus("synced");
        if (result.timestamp) setLastSyncedAt(result.timestamp);
      } else {
        setSyncStatus("error");
      }
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [profile, transactions, onboarded, isAuthenticated]);

  const result = useMemo(
    () => computeTaxFromTransactions(profile, transactions, 2026, "2026-12-31"),
    [profile, transactions]
  );

  const onAuthChange = useCallback(async () => {
    const loggedIn = await isLoggedIn();
    setIsAuthenticated(loggedIn);

    if (loggedIn && onboarded) {
      // Push current data to cloud immediately after login/signup
      setSyncStatus("syncing");
      const pushResult = await syncPush(profile, transactions);
      if (pushResult.success) {
        setSyncStatus("synced");
        if (pushResult.timestamp) setLastSyncedAt(pushResult.timestamp);
      } else {
        setSyncStatus("error");
      }
    } else {
      setSyncStatus("idle");
      setLastSyncedAt(null);
    }
  }, [profile, transactions, onboarded]);

  const forcePull = useCallback(async () => {
    setSyncStatus("syncing");
    const cloudData = await syncPull();
    if (cloudData && cloudData.profile) {
      setProfileState(cloudData.profile);
      if (cloudData.transactions.length > 0) {
        setTransactions(cloudData.transactions);
      }
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
    } else {
      setSyncStatus("error");
    }
  }, []);

  const value: AppState = {
    loading,
    saving,
    lastSavedAt,
    onboarded,
    syncStatus,
    lastSyncedAt,
    isAuthenticated,
    profile,
    transactions,
    result,

    setProfile: setProfileState,
    addTransaction: (tx) =>
      setTransactions((prev) => [...prev, { ...tx, id: newId() }]),
    updateTransaction: (id, patch) =>
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTransaction: (id) =>
      setTransactions((prev) => prev.filter((t) => t.id !== id)),

    reset: async () => {
      await clearState();
      setProfileState(defaultProfile);
      setTransactions(defaultTransactions);
      setLastSavedAt(null);
      setOnboardedState(false);
      setIsAuthenticated(false);
      setSyncStatus("idle");
      setLastSyncedAt(null);
    },

    completeOnboarding: async (newProfile, withDemoData) => {
      const txs = withDemoData ? defaultTransactions : [];
      setProfileState(newProfile);
      setTransactions(txs);
      await setOnboarded(true);
      await saveState(newProfile, txs);
      setOnboardedState(true);
    },

    onAuthChange,
    forcePull,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}