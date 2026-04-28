import AsyncStorage from "@react-native-async-storage/async-storage";
import { DoctorProfile, Transaction } from "blackpine-engine";
function getAS() { return require("@react-native-async-storage/async-storage").default; }
// For development: your PC's local IP. Change this to your real server URL in production.
// Find your local IP by running `ipconfig` in Windows terminal and looking for your Wi-Fi IPv4 address.
const API_BASE = "https://blackpine-backend.vercel.app";

const KEYS = {
  TOKEN: "blackpine.auth.token.v1",
  USER: "blackpine.auth.user.v1",
};

export interface AuthUser {
  id: string;
  email: string;
}

async function getToken(): Promise<string | null> {
  return getAS().getItem(KEYS.TOKEN);
}

async function request(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

export async function signup(email: string, password: string): Promise<AuthUser> {
  const res = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur d'inscription");

  await getAS().setItem(KEYS.TOKEN, data.token);
  await getAS().setItem(KEYS.USER, JSON.stringify(data.user));
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion");

  await getAS().setItem(KEYS.TOKEN, data.token);
  await getAS().setItem(KEYS.USER, JSON.stringify(data.user));
  return data.user;
}

export async function logout(): Promise<void> {
  await getAS().multiRemove([KEYS.TOKEN, KEYS.USER]);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await getAS().getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function pushData(
  profile: DoctorProfile,
  transactions: Transaction[]
): Promise<void> {
  const res = await request("/sync/push", {
    method: "POST",
    body: JSON.stringify({ profile, transactions }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erreur de synchronisation");
  }
}

export async function pullData(): Promise<{
  profile: DoctorProfile | null;
  transactions: Transaction[];
}> {
  const res = await request("/sync/pull");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erreur de synchronisation");
  }
  return res.json();
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

  console.log("[OCR] Image size:", Math.round(base64.length / 1024), "KB");

  const res = await fetch(`${API_BASE}/ocr-proxy/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image: `data:image/jpeg;base64,${base64}` }),
  });

  const data = await res.json();

  if (data.error) throw new Error(data.error);
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.[0] || "OCR failed");

  if (!data.ParsedResults || data.ParsedResults.length === 0) {
    return { amounts: [], dates: [], bestAmount: null, bestDate: null, confidence: 0 };
  }

  const text = data.ParsedResults[0].ParsedText || "";
  const amounts = extractAmountsFromText(text);
  const dates = extractDatesFromText(text);

  return {
    amounts,
    dates,
    bestAmount: amounts.length > 0 ? amounts[0] : null,
    bestDate: dates.length > 0 ? dates.sort().reverse()[0] : null,
    confidence: 70,
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
  const res = await fetch(`${API_BASE}/reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
}

export async function verifyResetCode(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/reset/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
}