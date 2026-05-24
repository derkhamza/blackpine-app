import { DoctorProfile, Transaction, FixedAsset } from "blackpine-engine";
import { RecurringRule } from "./recurringTransactions";
import { getDoctorToken, setDoctorToken, deleteDoctorToken } from "./tokenStorage";
function getAS() { return require("@react-native-async-storage/async-storage").default; }
const API_BASE = "https://blackpine-backend.vercel.app";

const USER_KEY = "blackpine.auth.user.v1";

export interface AuthUser {
  id: string;
  email: string;
}

async function getToken(): Promise<string | null> {
  return getDoctorToken();
}

const REQUEST_TIMEOUT_MS = 15_000;

async function request(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, { ...opts, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function signup(email: string, password: string): Promise<AuthUser> {
  const res = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");

  await setDoctorToken(data.token);
  await getAS().setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export async function login(email: string, password: string): Promise<AuthUser & { trialStart?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  await setDoctorToken(data.token);
  await getAS().setItem(USER_KEY, JSON.stringify(data.user));
  return { ...data.user, trialStart: data.user?.trialStart };
}

export async function logout(): Promise<void> {
  await deleteDoctorToken();
  await getAS().removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await getAS().getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function pushData(
  profile: DoctorProfile,
  transactions: Transaction[],
  assets?: FixedAsset[],
  recurringRules?: RecurringRule[]
): Promise<void> {
  const res = await request("/sync/push", {
    method: "POST",
    body: JSON.stringify({ profile, transactions, assets: assets || [], recurringRules: recurringRules || [] }),
  });
  if (!res.ok) {
    if (res.status === 401) {
      await deleteDoctorToken(); await getAS().removeItem(USER_KEY);
      throw new Error("TOKEN_EXPIRED");
    }
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.error || "Sync failed");
    if (res.status === 403 && data.error === "subscription_expired") {
      err.code = "subscription_expired";
      err.trialStart = data.trialStart ?? null;
    }
    throw err;
  }
}

export async function pullData(): Promise<{
  profile: DoctorProfile | null;
  transactions: Transaction[];
  assets: FixedAsset[];
  recurringRules: RecurringRule[];
  serverSubscription: { trialStart: string | null; plan: string; expiresAt: string | null } | null;
}> {
  const res = await request("/sync/pull");
  if (!res.ok) {
    if (res.status === 401) {
      await deleteDoctorToken(); await getAS().removeItem(USER_KEY);
      throw new Error("TOKEN_EXPIRED");
    }
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.error || "Sync failed");
    if (res.status === 403 && data.error === "subscription_expired") {
      err.code = "subscription_expired";
      err.trialStart = data.trialStart ?? null;
    }
    throw err;
  }
  const data = await res.json();
  return {
    profile: data.profile || null,
    transactions: data.transactions || [],
    assets: data.assets || [],
    recurringRules: data.recurringRules || [],
    serverSubscription: data.subscription ?? null,
  };
}

export interface OcrExtraction {
  success: boolean;
  amounts: number[];
  dates: string[];
  bestAmount: number | null;
  bestDate: string | null;
  confidence: number;
  rawTextPreview: string;
}

export async function extractReceipt(imageUri: string): Promise<OcrExtraction> {
  const FileSystem = require("expo-file-system/legacy");

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (__DEV__) console.log("[api] OCR image size:", Math.round(base64.length / 1024), "KB");

  const res = await request("/ocr-proxy/extract", {
    method: "POST",
    body: JSON.stringify({ base64Image: `data:image/jpeg;base64,${base64}` }),
  });

  const data = await res.json();

  if (data.error) throw new Error(data.error);
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.[0] || "OCR failed");

  if (!data.ParsedResults || data.ParsedResults.length === 0) {
    return { success: false, amounts: [], dates: [], bestAmount: null, bestDate: null, confidence: 0, rawTextPreview: "" };
  }

  const text = data.ParsedResults[0].ParsedText || "";
  const amounts = extractAmountsFromText(text);
  const dates = extractDatesFromText(text);

  return {
    success: true,
    amounts,
    dates,
    bestAmount: amounts.length > 0 ? amounts[0] : null,
    bestDate: dates.length > 0 ? dates.sort().reverse()[0] : null,
    confidence: 70,
    rawTextPreview: text.slice(0, 300),
  };
}

function extractAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  let match;

  const frenchPattern = /(\d[\d\s.]*),(\d{2})\b/g;
  while ((match = frenchPattern.exec(text)) !== null) {
    const value = parseFloat(`${match[1].replace(/[\s.]/g, "")}.${match[2]}`);
    if (!isNaN(value) && value > 0 && value < 10000000) amounts.push(value);
  }

  const wholePattern = /(\d{2,7})\s*(?:MAD|DH|Dhs|dirhams?)/gi;
  while ((match = wholePattern.exec(text)) !== null) {
    const value = parseInt(match[1]);
    if (!isNaN(value) && value > 0 && !amounts.includes(value)) amounts.push(value);
  }

  return amounts.sort((a, b) => b - a);
}

function extractDatesFromText(text: string): string[] {
  const dates: string[] = [];
  const pattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    let [, d, m, y] = match.map(Number);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2030) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (!dates.includes(iso)) dates.push(iso);
    }
  }
  return dates;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
}

export async function verifyResetCode(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/reset/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
}