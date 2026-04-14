/**
 * Non-AI backend endpoints — user profile, funds list, watchlist, etc.
 * Ports the relevant pieces of the web app's lib/api/client.js.
 */
import { API_BASE } from './config';

export type UserProfile = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  risk_score?: number | null;
  risk_category?: string | null;
};

async function getJson<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || `GET ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getUserProfile(token: string) {
  return getJson<UserProfile>('/api/v1/users/profile', token);
}

export type RecommendedFund = {
  isin: string;
  bse_code?: string | null;
  name: string;
  category: string;
  sub_category: string;
  amc_name: string;
};

export function getRecommendedFunds(token: string) {
  return getJson<RecommendedFund[]>('/api/v1/users/mutualfunds', token);
}

// ─── Scheme detail (single fund) ────────────────────────────────────────────
export type TxLimits = {
  min_amount: number;
  max_amount: number;
  multiplier: number;
  min_additional_amount: number;
  cutoff_time: string;
};
export type LumpsumLimits = { purchase: TxLimits; redemption: TxLimits };
export type SystematicLimits = {
  frequency: string;
  min_amount: number;
  max_amount: number;
  multiplier: number;
  allowed_dates: number[];
  min_installments: number;
  max_installments: number;
  min_gap: number;
  max_gap: number;
  installment_gap: number;
  max_pauses: number;
  min_pauses: number;
  no_of_pauses: number;
  first_order_today_allowed: boolean;
  pause_allowed: boolean;
  registration_allowed: boolean;
  trigger_allowed: boolean;
};
export type SchemeDetail = {
  isin: string;
  bse_code?: string | null;
  name: string;
  category: string;
  sub_category: string;
  scheme_option: string;
  scheme_plan: string;
  amc_name: string;
  lumpsum: LumpsumLimits;
  systematic?: SystematicLimits | null;
};

export function getSchemeByIsin(token: string, isin: string) {
  return getJson<SchemeDetail>(`/api/v1/users/scheme/${encodeURIComponent(isin)}`, token);
}
