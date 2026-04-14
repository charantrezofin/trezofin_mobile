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
