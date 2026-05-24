import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode,
} from "react";
import { Alert, AppState as RNAppState } from "react-native";
import {
  computeTaxFromTransactions, DoctorProfile, FullTaxComputation, Transaction,
} from "blackpine-engine";
import { loadState, saveState, clearState, setOnboarded, loadBiometricEnabled, saveBiometricEnabled, loadEodNotifEnabled, saveEodNotifEnabled, saveDemoMode, loadDemoMode } from "./storage";
import { isLoggedIn, logout as apiLogout, getStoredUser } from "./api";
import { clearCabinetData } from "./cabinetStorage";
import { syncPush, syncPull, SyncStatus } from "./syncService";
import { markPendingSync, clearPendingSync, hasPendingSync } from "./syncQueue";
import { FixedAsset, calculateTotalDotation } from "blackpine-engine";
import { RecurringRule, generateRecurringTransactions } from "./recurringTransactions";
import { saveRecurringRules, loadRecurringRules } from "./storage";
import { updateWidgetFinances } from "./widgetBridge";
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
import { loadSecretarySession, clearSecretarySession, SecretarySession } from "./inviteApi";
export type AppScreen = "loading" | "auth" | "onboarding" | "app" | "secretary";

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
  onLogin: (serverTrialStart?: string) => Promise<void>;
  onOnboardingComplete: (profile: DoctorProfile, withDemo: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
  retrySync: () => Promise<void>;
  // Demo mode
  isDemoMode: boolean;
  clearDemoData: () => Promise<void>;
  // Secretary mode
  secretarySession: SecretarySession | null;
  onSecretaryLogin: (session: SecretarySession) => void;
  onSecretaryLogout: () => Promise<void>;
  // Biometric lock
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  // End-of-day notification
  eodNotifEnabled: boolean;
  setEodNotifEnabled: (enabled: boolean) => Promise<void>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [secretarySession, setSecretarySession] = useState<SecretarySession | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [eodNotifEnabled, setEodNotifEnabledState] = useState(true);
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
      // Secretary mode takes priority — if a secretary session exists, skip doctor auth
      const secretarySessionStored = await loadSecretarySession();
      if (secretarySessionStored) {
        setSecretarySession(secretarySessionStored);
        setScreen("secretary");
        return;
      }

      const savedBiometric = await loadBiometricEnabled();
      setBiometricEnabledState(savedBiometric);
      const savedEodNotif = await loadEodNotifEnabled();
      setEodNotifEnabledState(savedEodNotif);
      const savedDemoMode = await loadDemoMode();
      setIsDemoMode(savedDemoMode);

      const loggedIn = await isLoggedIn();
      const savedSub = await loadSubscription();
const savedRules = await loadRecurringRules();
if (savedRules.length > 0) setRecurringRules(savedRules);
      if (!loggedIn) {
        if (savedSub) {
          setSubscription(savedSub);
        } else {
          const newSub = getDefaultSubscription();
          setSubscription(newSub);
          await saveSubscription(newSub);
        }
        setScreen("auth");
        return;
      }

      // Logged in — pull data from cloud
      setIsAuthenticated(true);
      setSyncStatus("syncing");
      let hasRealProfile = false;
      const cloudData = await syncPull();
      if (cloudData && cloudData.profile) {
        setProfileState(cloudData.profile);
        setTransactions(cloudData.transactions || []);
        if (cloudData.assets && cloudData.assets.length > 0) setAssets(cloudData.assets);
        if (cloudData.recurringRules && cloudData.recurringRules.length > 0) setRecurringRules(cloudData.recurringRules);
        hasRealProfile = true;
      } else {
        // Logged in but no cloud data — load local
        const local = await loadState();
        if (local.profile) { setProfileState(local.profile); hasRealProfile = true; }
        if (local.transactions.length > 0) setTransactions(local.transactions);
      }

      // Restore subscription — prefer the server's authoritative trial start so
      // the UI always matches what the backend enforces.
      const serverSub = cloudData?.serverSubscription;
      const serverTrialStart = serverSub?.trialStart ?? cloudData?.serverTrialStart ?? null;

      if (cloudData?.subscriptionExpired && serverTrialStart) {
        // Server confirmed expiry — correct the local date so UI shows "0 days left"
        const expiredSub: SubscriptionState = {
          trialStartDate: serverTrialStart.split("T")[0],
          plan: "free_trial",
          expiresAt: null,
        };
        setSubscription(expiredSub);
        await saveSubscription(expiredSub);
      } else if (savedSub && savedSub.plan !== "free_trial") {
        // Paid plan — trust local saved state
        setSubscription(savedSub);
      } else if (serverTrialStart) {
        // Free trial — always use server's authoritative start date
        const sub: SubscriptionState = {
          trialStartDate: serverTrialStart.split("T")[0],
          plan: savedSub?.plan ?? "free_trial",
          expiresAt: savedSub?.expiresAt ?? null,
        };
        setSubscription(sub);
        await saveSubscription(sub);
      } else if (savedSub) {
        setSubscription(savedSub);
      } else {
        const newSub = getDefaultSubscription();
        setSubscription(newSub);
        await saveSubscription(newSub);
      }

      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
      initialized.current = true;
      // If no real profile found anywhere, the user quit mid-onboarding — send them back
      setScreen(hasRealProfile ? "app" : "onboarding");
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
  // Persist recurring rules whenever they change (only while app is active)
  useEffect(() => {
    if (screen !== "app") return;
    saveRecurringRules(recurringRules).catch(err => { if (__DEV__) console.warn("[AppContext] save recurring failed:", err); });
  }, [recurringRules, screen]);

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
      } catch (err) { if (__DEV__) console.warn("[AppContext] save failed:", err); }
      finally { setSaving(false); }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [profile, transactions, screen]);

  // ── Foreground queue drain ────────────────────────────────────────────────
  // When the app returns to the foreground, silently retry any queued push.
  // Uses a ref so the listener always sees current state without re-subscribing.
  const pendingDrainRef = useRef({ profile, transactions, assets, recurringRules, isAuthenticated });
  useEffect(() => {
    pendingDrainRef.current = { profile, transactions, assets, recurringRules, isAuthenticated };
  }, [profile, transactions, assets, recurringRules, isAuthenticated]);

  useEffect(() => {
    const sub = RNAppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active") return;
      const { profile: p, transactions: t, assets: a, recurringRules: r, isAuthenticated: auth } = pendingDrainRef.current;
      if (!auth) return;
      const pending = await hasPendingSync();
      if (!pending) return;
      if (__DEV__) console.log("[SYNC] Foreground — draining queued push");
      setSyncStatus("syncing");
      const res = await syncPush(p, t, a, r);
      if (res.success) {
        setSyncStatus("synced");
        if (res.timestamp) setLastSyncedAt(res.timestamp);
        await clearPendingSync();
      } else if (res.offline) {
        setSyncStatus("offline"); // still no network — stay queued
      } else {
        setSyncStatus("error");
      }
    });
    return () => sub.remove();
  }, []); // intentionally empty — drain logic reads from ref

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
        await clearPendingSync();
      } else if (result.offline) {
        // Network unavailable — queue the push, don't surface an error
        setSyncStatus("offline");
        await markPendingSync();
        if (__DEV__) console.log("[SYNC] Offline — changes queued for retry");
      } else {
        setSyncStatus("error");
        // Backend confirmed trial expired — correct local subscription so UI matches
        if (result.subscriptionExpired && result.serverTrialStart) {
          const expiredSub: SubscriptionState = {
            trialStartDate: result.serverTrialStart.split("T")[0],
            plan: "free_trial",
            expiresAt: null,
          };
          setSubscription(expiredSub);
          await saveSubscription(expiredSub);
        }
      }
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
    // Re-attempt with the same fiscal year — the first failure may be a
    // transient issue (e.g. a malformed transaction). We never swap the year
    // because doing so would apply the wrong tax brackets.
    return computeTaxFromTransactions(profile, [], fiscalYear, `${fiscalYear}-12-31`);
  }
}, [profile, transactions, assets, recurringRules, fiscalYear]);

  // ── Push financial data to the home-screen widget ────────────────────────────
  useEffect(() => {
    if (screen !== "app") return;

    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTx = transactions.filter((tx) => tx.date.startsWith(monthPrefix));
    const monthRecettes = monthTx
      .filter((tx) => tx.type === "RECETTE")
      .reduce((s, tx) => s + tx.amount, 0);
    const monthCharges = monthTx
      .filter((tx) => tx.type === "CHARGE")
      .reduce((s, tx) => s + tx.amount, 0);
    const monthNet = monthRecettes - monthCharges;

    // Next upcoming tax deadline: March 31 (IR declaration) or April 30 (first payment)
    const candidates = [
      { month: 3, day: 31, label: "IR 31/03" },
      { month: 4, day: 30, label: "Acompte 30/04" },
    ].map(({ month, day, label }) => {
      const thisYear = new Date(now.getFullYear(), month - 1, day);
      const target = thisYear > now
        ? thisYear
        : new Date(now.getFullYear() + 1, month - 1, day);
      const daysLeft = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
      return { daysLeft, label };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    updateWidgetFinances({
      monthRecettes,
      monthNet,
      taxDaysLeft: candidates[0]?.daysLeft ?? null,
      taxLabel: candidates[0]?.label ?? null,
    });
  }, [transactions, screen]);

  // After signup → reset subscription to a fresh trial (prevents stale savedSub
  // from a previous install bleeding into the new account) then go to onboarding
  const onSignup = useCallback(async () => {
    const freshSub = getDefaultSubscription();
    setSubscription(freshSub);
    await saveSubscription(freshSub);
    setIsAuthenticated(true);
    setScreen("onboarding");
  }, []);

  // After login → pull data → go to app
const onLogin = useCallback(async (serverTrialStart?: string) => {
  setIsAuthenticated(true);
  setSyncStatus("syncing");
  let hasRealProfile = false;
  const cloudData = await syncPull();
  if (cloudData && cloudData.profile) {
    setProfileState(cloudData.profile);
    setTransactions(cloudData.transactions || []);
    if (cloudData.assets && cloudData.assets.length > 0) setAssets(cloudData.assets);
    if (cloudData.recurringRules && cloudData.recurringRules.length > 0) setRecurringRules(cloudData.recurringRules);
    hasRealProfile = true;
  } else {
    // Cloud unavailable or empty — fall back to local storage (e.g. offline re-login)
    const local = await loadState();
    if (local.profile) { setProfileState(local.profile); hasRealProfile = true; }
    if (local.transactions.length > 0) setTransactions(local.transactions);
  }


  // Always prefer the server's authoritative trial start so reinstalls / stale
  // local dates can't show a wrong day count.
  const savedSub = await loadSubscription();
  if (savedSub && savedSub.plan !== "free_trial") {
    // Paid plan — trust local state
    setSubscription(savedSub);
  } else if (serverTrialStart) {
    // Free trial — sync to server's real start date every login
    const sub: SubscriptionState = {
      trialStartDate: serverTrialStart.split("T")[0],
      plan: "free_trial",
      expiresAt: null,
    };
    setSubscription(sub);
    await saveSubscription(sub);
  } else {
    // No server date (very old account) — keep local or create fresh
    if (savedSub) setSubscription(savedSub);
    else {
      const fresh = getDefaultSubscription();
      setSubscription(fresh);
      await saveSubscription(fresh);
    }
  }

  setSyncStatus("synced");
  setLastSyncedAt(new Date().toISOString());
  initialized.current = true;
  setScreen(hasRealProfile ? "app" : "onboarding");
}, []);

  // After onboarding → save + push + go to app
  const onOnboardingComplete = useCallback(async (newProfile: DoctorProfile, withDemo: boolean) => {
    const txs = withDemo ? defaultTransactions : [];
    setProfileState(newProfile);
    setTransactions(txs);
    // Track demo mode explicitly so a banner can warn the user
    setIsDemoMode(withDemo);
    await saveDemoMode(withDemo);
    await syncPush(newProfile, txs, []);
    await saveState(newProfile, txs);
    await setOnboarded(true);
    await syncPush(newProfile, txs, [], []);
    initialized.current = true;
    setScreen("app");
  }, []);

  // Logout → clear + go to auth
  const onLogout = useCallback(async () => {
    // Grab userId before wiping the auth token so cabinet keys can be cleared
    const user = await getStoredUser();
    await apiLogout();
    await clearState();
    if (user?.id) await clearCabinetData(user.id);
    setRecurringRules([]);
    setProfileState(defaultProfile);
    setTransactions([]);
    setIsDemoMode(false);
    await saveDemoMode(false);
    setIsAuthenticated(false);
    setSyncStatus("idle");
    setLastSyncedAt(null);
    setLastSavedAt(null);
    await saveRecurringRules([]);
    initialized.current = false;
    setScreen("auth");
  }, []);

  /** Remove all demo transactions and dismiss the demo banner. */
  const clearDemoData = useCallback(async () => {
    const DEMO_IDS = new Set(defaultTransactions.map((t) => t.id));
    setTransactions((prev) => prev.filter((t) => !DEMO_IDS.has(t.id)));
    setIsDemoMode(false);
    await saveDemoMode(false);
  }, []);

  const retrySync = useCallback(async () => {
    if (!isAuthenticated) return;
    setSyncStatus("syncing");
    const res = await syncPush(profile, transactions, assets, recurringRules);
    if (res.success) {
      setSyncStatus("synced");
      if (res.timestamp) setLastSyncedAt(res.timestamp);
      await clearPendingSync();
    } else if (res.offline) {
      setSyncStatus("offline");
      await markPendingSync();
    } else {
      setSyncStatus("error");
      Alert.alert(
        "Sync failed",
        res.error || "Could not sync your data. Check your connection and try again.",
      );
    }
  }, [isAuthenticated, profile, transactions, assets, recurringRules]);

  const onSecretaryLogin = useCallback((session: SecretarySession) => {
    setSecretarySession(session);
    setScreen("secretary");
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    await saveBiometricEnabled(enabled);
  }, []);

  const setEodNotifEnabled = useCallback(async (enabled: boolean) => {
    setEodNotifEnabledState(enabled);
    await saveEodNotifEnabled(enabled);
  }, []);

  const onSecretaryLogout = useCallback(async () => {
    // Read the ownerUserId before wiping the session so we can clear local cabinet data
    const session = await loadSecretarySession();
    await clearSecretarySession();
    if (session?.ownerUserId) await clearCabinetData(session.ownerUserId);
    setSecretarySession(null);
    setScreen("auth");
  }, []);

  const value: AppState = {
    screen, saving, lastSavedAt, syncStatus, lastSyncedAt, isAuthenticated,subscription, trialDaysLeft, isActive, activateCode,
    profile, transactions, result,fiscalYear, setFiscalYear,assets, addAsset, updateAsset, deleteAsset,
    setProfile: setProfileState,transactionFilter, setTransactionFilter,recurringRules, addRecurringRule, deleteRecurringRule,
    addTransaction: (tx) => setTransactions((prev) => [...prev, { ...tx, id: newId() }]),
    updateTransaction: (id, patch) => setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTransaction: (id) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
    onSignup, onLogin, onOnboardingComplete, onLogout, retrySync,
    isDemoMode, clearDemoData,
    secretarySession, onSecretaryLogin, onSecretaryLogout,
    biometricEnabled, setBiometricEnabled,
    eodNotifEnabled, setEodNotifEnabled,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}