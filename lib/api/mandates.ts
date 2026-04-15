import { API_BASE } from './config';

export type MandateItem = {
  id: string;
  exch_mandate_id?: string | null;
  mandate_type: string;       // "UPI" | "ENACH"
  amount_limit: number;
  status: string;
  bank_acc_num?: string | null;
  valid_till?: string | null;
  created_at: string;
};

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

export function listMandates(token: string) {
  return req<MandateItem[]>('/api/v1/mandates', token);
}

export function getMandateAuthLink(token: string, mandateId: string) {
  return req<{ success: boolean; auth_url?: string; message?: string }>(
    `/api/v1/mandates/${mandateId}/auth-link`,
    token,
  );
}

export function cancelMandate(token: string, mandateId: string) {
  return req<{ success: boolean; message?: string }>(
    `/api/v1/mandates/${mandateId}/cancel`,
    token,
    { method: 'POST' },
  );
}
