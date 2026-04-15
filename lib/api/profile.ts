/**
 * /api/v1/profile — UCC onboarding client.
 *
 *   GET  /profile            -> ProfileResponse (all fields + UCC status)
 *   PUT  /profile            -> draft-save any subset of fields
 *   POST /profile/submit-ucc -> submit UCC registration to BSE
 *   POST /profile/2fa-link   -> BSE 2FA link to activate UCC
 */
import { API_BASE } from './config';

export type ProfileFull = {
  id: string;
  email?: string | null;
  mobile?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;                 // 'pending' | 'ucc_submitted' | 'active'
  client_code?: string | null;
  risk_score?: number | null;
  risk_category?: string | null;
  pan?: string | null;
  dob?: string | null;                    // YYYY-MM-DD
  gender?: string | null;                 // 'M' | 'F'
  occupation_code?: string | null;
  upi_vpa?: string | null;
  bank_acc_type?: string | null;          // 'SB' | 'CB'
  bank_acc_num?: string | null;
  ifsc_code?: string | null;
  bank_name?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  place_of_birth?: string | null;
  wealth_source?: string | null;
  income_slab?: string | null;
  pep_status?: string | null;             // 'Y' | 'N' | 'R'
  nomination_opted?: boolean;
  nomination_data?: unknown | null;
  ucc_submitted_at?: string | null;
  ucc_activated_at?: string | null;
};

export type ProfileUpdate = Partial<{
  pan: string;
  dob: string;
  gender: 'M' | 'F';
  occupation_code: string;
  bank_acc_type: 'SB' | 'CB';
  bank_acc_num: string;
  ifsc_code: string;
  bank_name: string;
  address_line_1: string;
  address_line_2: string;
  pincode: string;
  city: string;
  state: string;
  place_of_birth: string;
  wealth_source: string;
  income_slab: string;
  pep_status: 'Y' | 'N' | 'R';
  nomination_opted: boolean;
}>;

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || `${init?.method || 'GET'} ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function getProfileFull(token: string) {
  return req<ProfileFull>('/api/v1/profile', token);
}

export function updateProfile(token: string, data: ProfileUpdate) {
  return req<ProfileFull>('/api/v1/profile', token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function submitUcc(token: string) {
  return req<{ success: boolean; message: string }>('/api/v1/profile/submit-ucc', token, {
    method: 'POST',
  });
}

export function getUccAuthLink(token: string) {
  return req<{ success: boolean; auth_url?: string; message?: string }>(
    '/api/v1/profile/2fa-link',
    token,
    { method: 'POST' },
  );
}

/** True if the user still needs to finish UCC onboarding to place orders. */
export function uccIncomplete(p: ProfileFull | null): boolean {
  if (!p) return true;
  return (p.status ?? 'pending') !== 'active';
}
