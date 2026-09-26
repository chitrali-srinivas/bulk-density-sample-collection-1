import { getSupabase } from "@/lib/supabase";
import type { Surveyor } from "@/lib/types";

export async function isAllowlistedEmail(email: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("is_surveyor_email", {
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function signInSurveyor(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error("Enter your email and password.");
  }

  const allowed = await isAllowlistedEmail(normalized);
  if (!allowed) {
    throw new Error("This email is not authorized for sample collection.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) {
    throw new Error(
      error.message === "Invalid login credentials"
        ? "Wrong email or password."
        : error.message,
    );
  }

  return fetchCurrentSurveyor();
}

export async function fetchCurrentSurveyor(): Promise<Surveyor> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("current_surveyor");
  if (error) {
    await supabase.auth.signOut();
    throw new Error(error.message);
  }
  if (!data) {
    await supabase.auth.signOut();
    throw new Error("This email is not authorized for sample collection.");
  }
  return data as Surveyor;
}

export async function getSessionSurveyor(): Promise<Surveyor | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) return null;

  try {
    return await fetchCurrentSurveyor();
  } catch {
    return null;
  }
}

export async function signOutSurveyor() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
