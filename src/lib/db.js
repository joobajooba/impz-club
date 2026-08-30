import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://phlixtsxxuicatmrmdou.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobGl4dHN4eHVpY2F0bXJtZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzExNTQsImV4cCI6MjEwMzYwNzE1NH0.DMLjjNJir1sHlnlBFIh6FKyOZUkK6a_wL7-8Cf2YlC4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function walletId(address) {
  return String(address || "").toLowerCase();
}

export async function loadProfile(address) {
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet,username,pfp_id,rank,total_impz,imp_coins,account_age,updated_at")
    .eq("wallet", walletId(address))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadLeaderboard() {
  const { data, error } = await supabase.from("profiles").select("wallet,total_impz").limit(2000);
  if (error) throw error;
  return data || [];
}

export async function saveProfile(address, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        wallet: walletId(address),
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" }
    )
    .select("wallet,username,pfp_id,rank,total_impz,imp_coins,account_age,updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function rankFromLeaderboard(address, totalImpz, rows) {
  const wallet = walletId(address);
  const scores = rows.map((row) => ({
    wallet: walletId(row.wallet),
    total: Number(row.total_impz) || 0,
  }));
  const existing = scores.find((row) => row.wallet === wallet);
  if (existing) existing.total = Number(totalImpz) || 0;
  else scores.push({ wallet, total: Number(totalImpz) || 0 });
  scores.sort((a, b) => b.total - a.total || a.wallet.localeCompare(b.wallet));
  const index = scores.findIndex((row) => row.wallet === wallet);
  return index >= 0 ? String(index + 1) : "—";
}

export function joinedAtFromProfile(row) {
  if (row?.account_age && !Number.isNaN(Date.parse(row.account_age))) {
    return new Date(row.account_age);
  }
  if (row?.updated_at) return new Date(row.updated_at);
  return new Date();
}

export function daysSince(date) {
  const start = date instanceof Date ? date : new Date(date);
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}
