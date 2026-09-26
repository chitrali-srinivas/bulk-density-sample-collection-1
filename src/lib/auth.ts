import { getSupabase } from "@/lib/supabase";
import type { Surveyor } from "@/lib/types";

const SURVEYOR_SESSION_KEY = "bulk-density-surveyor";
export const SURVEYOR_EMAIL_DOMAIN = "maticarbon.com";

export function normalizeSurveyorEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isMatiCarbonEmail(email: string) {
  const normalized = normalizeSurveyorEmail(email);
  return normalized.endsWith(`@${SURVEYOR_EMAIL_DOMAIN}`);
}

export async function lookupSurveyor(email: string): Promise<Surveyor> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizeSurveyorEmail(email);
  if (!normalized) throw new Error("Enter your work email.");
  if (!isMatiCarbonEmail(normalized)) {
    throw new Error(`Only @${SURVEYOR_EMAIL_DOMAIN} emails can sign in.`);
  }

  const { data, error } = await supabase.rpc("get_surveyor_by_email", {
    p_email: normalized,
  });
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("This email is not on the surveyor list.");
  }
  return data as Surveyor;
}

export function readStoredSurveyor(): Surveyor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SURVEYOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Surveyor;
    if (!parsed?.email || !parsed?.name) return null;
    if (!isMatiCarbonEmail(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSurveyor(surveyor: Surveyor) {
  window.localStorage.setItem(SURVEYOR_SESSION_KEY, JSON.stringify(surveyor));
}

export function clearStoredSurveyor() {
  window.localStorage.removeItem(SURVEYOR_SESSION_KEY);
}
