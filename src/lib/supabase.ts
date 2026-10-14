import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || "http://localhost:54321", key || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Unwrap a Supabase response or throw a readable Error. */
export async function must<T>(
  p: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

/** Map profile ids to full names (RLS decides which ones you can see). */
export async function fetchNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const { data } = await supabase.from("profiles").select("id, full_name, phone, email").in("id", unique);
  const out: Record<string, string> = {};
  (data ?? []).forEach((p: any) => { out[p.id] = p.full_name || p.email || p.phone || "Unnamed"; });
  return out;
}
