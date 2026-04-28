import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode,
} from "react";
import {
  computeTaxFromTransactions, DoctorProfile, FullTaxComputation, Transaction,
} from "blackpine-engine";
import { loadState, saveState, clearState, setOnboarded } from "./storage";
import { isLoggedIn, logout as apiLogout } from "./api";
import { syncPush, syncPull, SyncStatus } from "./syncService";
import { FixedAsset, calculateTotalDotation } from "blackpine-engine";
import { RecurringRule, generateRecurringTransactions } from "./recurringTransactions";
import { saveRecurringRules, loadRecurringRules } from "./storage";
const defaultProfile: DoctorProfile = {
  id: "demo", legalForm: "PERSONNE_PHYSIQUE", practiceType: "CABINET_ONLY",
  activityStartDate: "2018-03-01", commune: "Casablanca", communeType: "URBAN",
  maritalStatus: "MARRIED", dependentsCount: 2, tpRegistered: true,
};
const defaultTransactions: Transaction[] = [
  { id: "r1", type: "RECETTE", amount: 460000, date: "2026-12-31", category: "consultation" },
  { id: "c1", type: "CHARGE", amount: 60000, date: "2026-12-31", category: "loyer_cabinet" },
  { id: "c2", type: "CHARGE", amount: 72000, date: "2026-12-31", category: "salaires_personnel" },
  { id: "c3", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "consommables_medicaux" },
  { id: "c4", type: "CHARGE", amount: 12000, date: "2026-12-31", category: "carburant",
    deductibilityStatus: "PARTIALLY_DEDUCTIBLE", professionalUseRatio: 0.6 },
  { id: "c5", type: "CHARGE", amount: 8000, date: "2026-12-31", category: "rc_pro" },
  { id: "c6", type: "CHARGE", amount: 18000, date: "2026-12-31", category: "honoraires_comptable" },
];
import {
  SubscriptionState, getDefaultSubscription, isSubscriptionActive,
  getTrialDaysLeft, activateSubscription, validateActivationCodeOnline,
} from "./subscription";
import { saveSubscription, loadSubscription } from "./storage";
export type AppScreen = "loading" | "auth" | "onboarding" | "app";

interface AppState {
  screen: AppScreen;
  transactionFilter: "ALL" | "RECETTE" | "CHARGE";
  recurringRules: RecurringRule[];
addRecurringRule: (rule: Omit<RecurringRule, "id">) => void;
deleteRecurringRule: (id: string) => void;
  setTransactionFilter: (f: "ALL" | "RECETTE" | "CHARGE") => void;
  saving: boolean;
  subscription: SubscriptionState;
trialDaysLeft: number;
isActive: boolean;
activateCode: (code: string) => Promise<boolean>;
  lastSavedAt: string | null;
  fiscalYear: number;
  setFiscalYear: (y: number) => void;
  assets: FixedAsset[];
addAsset: (asset: Omit<FixedAsset, "id">) => void;
updateAsset: (id: string, patch: Partial<FixedAsset>) => void;
deleteAsset: (id: string) => void;
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
  onSignup: () => void;
  onLogin: () => Promise<void>;
  onOnboardingComplete: (profile: DoctorProfile, withDemo: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);
const newId = () => Math.random().toString(36).slice(2, 9);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>("loading");
  const [saving, setSaving] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<"ALL" | "RECETTE" | "CHARGE">("ALL");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfileState] = useState<DoctorProfile>(defaultProfile);
  const [subscription, setSubscription] = useState<SubscriptionState>(getDefaultSubscription());
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const initialized = useRef(false);
  
  const addAsset = (a: Omit<FixedAsset, "id">) => setAssets(prev => [...prev, { ...a, id: newId() }]);
  const updateAsset = (id: string, patch: Partial<FixedAsset>) => setAssets(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const deleteAsset = (id: string) => setAssets(prev => prev.filter(a => a.id !== id));
const trialDaysLeft = getTrialDaysLeft(subscription);
const isActive = isSubscriptionActive(subscription);
const addRecurringRule = (r: Omit<RecurringRule, "id">) => setRecurringRules(prev => [...prev, { ...r, id: newId() }]);
const deleteRecurringRule = (id: string) => setRecurringRules(prev => prev.filter(r => r.id !== id));
  // Boot: check auth → decide which screen
  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      const savedSub = await loadSubscription();
const savedRules = await loadRecurringRules();
if (savedRules.length > 0) setRecurringRules(savedRules);
      if (!loggedIn) {
        setScreen("auth");

      if (savedSub) {
        setSubscription(savedSub);
      } else {
        const newSub = getDefaultSubscription();
        setSubscription(newSub);
        await saveSubscription(newSub);
      }
        return;
      }

useEffect(() => {
  if (screen !== "app") return;
  saveRecurringRules(recurringRules).catch(err => console.warn("save recurring failed", err));
}, [recurringRules, screen]);

      // Logged in — pull data from cloud
      setIsAuthenticated(true);
      setSyncStatus("syncing");
      const cloudData = await syncPull();
      if (cloudData && cloudData.profile) {
        setProfileState(cloudData.profile);
        setTransactions(cloudData.transactions || []);
        if (cloudData.assets && cloudData.assets.length > 0) setAssets(cloudData.assets);
        if (cloudData.recurringRules && cloudData.recurringRules.length > 0) setRecurringRules(cloudData.recurringRules);
      } else {
        // Logged in but no cloud data — load local
        const local = await loadState();
        if (local.profile) setProfileState(local.profile);
        if (local.transactions.length > 0) setTransactions(local.transactions);
      }

      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
      initialized.current = true;
      setScreen("app");
    })();
  }, []);
const activateCode = async (code: string): Promise<boolean> => {
  const result = await validateActivationCodeOnline(code);
  if (!result.valid || !result.plan) return false;
  const updated = activateSubscription(subscription, result.plan, result.durationDays ?? null);
  setSubscription(updated);
  await saveSubscription(updated);
  return true;
};
  // Auto-save locally (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (screen !== "app") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const ts = await saveState(profile, transactions,assets);
        setLastSavedAt(ts);
      } catch (err) { console.warn("save failed", err); }
      finally { setSaving(false); }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [profile, transactions, screen]);

  // Auto-sync to cloud (debounced)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (screen !== "app" || !isAuthenticated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);

    
    syncTimer.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const result = await syncPush(profile, transactions, assets, recurringRules);
      if (result.success) {
        setSyncStatus("synced");
        if (result.timestamp) setLastSyncedAt(result.timestamp);
      } else { setSyncStatus("error"); }
    }, 2000);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [profile, transactions, screen,assets, recurringRules, isAuthenticated]);

const result = useMemo(() => {
  const { totalDotation } = calculateTotalDotation(assets, fiscalYear);
  const yearTx = transactions.filter((tx) => tx.date.startsWith(String(fiscalYear)));
  const recurringTx = generateRecurringTransactions(
    recurringRules,
    `${fiscalYear}-01-01`,
    `${fiscalYear}-12-31`
  );
  const allTx = [
    ...yearTx,
    ...recurringTx.map(tx => ({ ...tx, id: "rec_" + Math.random().toString(36).slice(2) })),
  ];
  const txWithAmort = totalDotation > 0
    ? [...allTx, {
        id: "amort_auto", type: "CHARGE" as const, amount: totalDotation,
        date: `${fiscalYear}-12-31`, category: "gros_equipement_medical",
        deductibilityStatus: "FULLY_DEDUCTIBLE" as const, professionalUseRatio: 1,
      }]
    : allTx;
  try {
    return computeTaxFromTransactions(profile, txWithAmort, fiscalYear, `${fiscalYear}-12-31`);
  } catch {
    return computeTaxFromTransactions(profile, txWithAmort, 2026, `${fiscalYear}-12-31`);
  }
}, [profile, transactions, assets, recurringRules, fiscalYear]);

  // After signup → go to onboarding
  const onSignup = useCallback(() => {
    setIsAuthenticated(true);
    setScreen("onboarding");
  }, []);

  // After login → pull data → go to app
const onLogin = useCallback(async (serverTrialStart?: string) => {
  setIsAuthenticated(true);
  setSyncStatus("syncing");
  const cloudData = await syncPull();
  if (cloudData && cloudData.profile) {
    setProfileState(cloudData.profile);
    setTransactions(cloudData.transactions || []);
    if (cloudData.assets && cloudData.assets.length > 0) setAssets(cloudData.assets);
    if (cloudData.recurringRules && cloudData.recurringRules.length > 0) setRecurringRules(cloudData.recurringRules);
  }
  

  // Use server trial date — prevents reinstall bypass
  const savedSub = await loadSubscription();
  if (savedSub && savedSub.plan !== "free_trial") {
    setSubscription(savedSub);
  } else if (serverTrialStart) {
    const sub: SubscriptionState = {
      trialStartDate: serverTrialStart.split("T")[0],
      plan: "free_trial",
      expiresAt: null,
    };
    setSubscription(sub);
    await saveSubscription(sub);
  }

  setSyncStatus("synced");
  setLastSyncedAt(new Date().toISOString());
  initialized.current = true;
  setScreen("app");
}, []);

  // After onboarding → save + push + go to app
  const onOnboardingComplete = useCallback(async (newProfile: DoctorProfile, withDemo: boolean) => {
    const txs = withDemo ? defaultTransactions : [];
    setProfileState(newProfile);
    setTransactions(txs);
    await syncPush(newProfile, txs, []);
    await saveState(newProfile, txs);
    await setOnboarded(true);
    await syncPush(newProfile, txs, [], []);
    initialized.current = true;
    setScreen("app");
  }, []);

  // Logout → clear + go to auth
  const onLogout = useCallback(async () => {
    await apiLogout();
    await clearState();
    setRecurringRules([]);
    setProfileState(defaultProfile);
    setTransactions(defaultTransactions);
    setIsAuthenticated(false);
    setSyncStatus("idle");
    setLastSyncedAt(null);
    setLastSavedAt(null);
    await saveRecurringRules([]);
    initialized.current = false;
    setScreen("auth");
  }, []);

  const value: AppState = {
    screen, saving, lastSavedAt, syncStatus, lastSyncedAt, isAuthenticated,subscription, trialDaysLeft, isActive, activateCode,
    profile, transactions, result,fiscalYear, setFiscalYear,assets, addAsset, updateAsset, deleteAsset,
    setProfile: setProfileState,transactionFilter, setTransactionFilter,recurringRules, addRecurringRule, deleteRecurringRule,
    addTransaction: (tx) => setTransactions((prev) => [...prev, { ...tx, id: newId() }]),
    updateTransaction: (id, patch) => setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTransaction: (id) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
    onSignup, onLogin, onOnboardingComplete, onLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}