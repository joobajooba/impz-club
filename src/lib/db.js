export function walletId(address) {
  return String(address || "").toLowerCase();
}

async function profileRequest(path, options = {}, attempt = 0) {
  try {
    const res = await fetch(`/api/profile${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Profile request failed (${res.status})`);
    }
    return data;
  } catch (error) {
    if (attempt >= 2) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    return profileRequest(path, options, attempt + 1);
  }
}

export async function loadProfile(address) {
  return profileRequest(`?wallet=${encodeURIComponent(walletId(address))}`);
}

export async function loadLeaderboard() {
  return (await profileRequest("?board=1")) || [];
}

export async function loadClub() {
  return (await profileRequest("?club=1")) || [];
}

export async function saveProfile(address, fields) {
  return profileRequest("", {
    method: "POST",
    body: JSON.stringify({
      wallet: walletId(address),
      ...fields,
    }),
  });
}

export function rankFromLeaderboard(address, totalImpz, rows) {
  const wallet = walletId(address);
  const scores = (rows || []).map((row) => ({
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
