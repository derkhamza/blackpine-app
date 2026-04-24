import AsyncStorage from "@react-native-async-storage/async-storage";
import { DoctorProfile, Transaction } from "blackpine-engine";

// For development: your PC's local IP. Change this to your real server URL in production.
// Find your local IP by running `ipconfig` in Windows terminal and looking for your Wi-Fi IPv4 address.
const API_BASE = "https://justifier-factsheet-grapple.ngrok-free.dev";

const KEYS = {
  TOKEN: "blackpine.auth.token.v1",
  USER: "blackpine.auth.user.v1",
};

export interface AuthUser {
  id: string;
  email: string;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.TOKEN);
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

  await AsyncStorage.setItem(KEYS.TOKEN, data.token);
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(data.user));
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion");

  await AsyncStorage.setItem(KEYS.TOKEN, data.token);
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(data.user));
  return data.user;
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER);
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
  // Read the image as base64
  const FileSystem = require("expo-file-system/legacy");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const token = await getToken();
  const res = await fetch(`${API_BASE}/ocr/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ imageBase64: base64 }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur OCR");
  return data;
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