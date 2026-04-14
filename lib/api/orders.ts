/**
 * Orders + SIPs client — mirrors the web app.
 *
 *   GET    /api/v1/orders            list user's orders
 *   POST   /api/v1/orders/lumpsum    place a lumpsum purchase
 *   POST   /api/v1/orders/{id}/payment-link  get a BSE payment URL
 *   GET    /api/v1/sips              list user's SIPs
 *   POST   /api/v1/sips              register a new SIP
 *   GET    /api/v1/sips/{id}/auth-link  get a BSE first-installment auth URL
 */
import { API_BASE } from './config';

export type OrderItem = {
  id: string;
  ucc: string;
  mem_ord_ref_id: string;
  bse_order_id?: string | null;
  scheme_code: string;
  scheme_name?: string | null;
  isin?: string | null;
  amount: number;
  order_type: string;
  status: string;
  created_at: string;
  sip_id?: string | null;
  allotted_units?: number | null;
  allotment_nav?: number | null;
};

export type SIPItem = {
  id: string;
  mandate_id?: string | null;
  bse_sxp_id?: string | null;
  mem_sxp_ref_id?: string | null;
  scheme_code: string;
  scheme_name?: string | null;
  amount: number;
  frequency: string;
  start_date: string;
  end_date?: string | null;
  txn_date?: number | null;
  completed_installments?: number | null;
  status: string;
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

export function listOrders(token: string) {
  return req<OrderItem[]>('/api/v1/orders', token);
}

export function listSips(token: string) {
  return req<SIPItem[]>('/api/v1/sips', token);
}

export type LumpsumBody = {
  scheme_code: string;
  scheme_name?: string;
  isin?: string;
  amount: number;
  buy_sell?: 'P';
};

export function placeLumpsum(token: string, body: LumpsumBody) {
  return req<{ order_id: string; mem_ord_ref_id: string; bse_order_id?: string; status: string }>(
    '/api/v1/orders/lumpsum',
    token,
    { method: 'POST', body: JSON.stringify({ buy_sell: 'P', ...body }) },
  );
}

export function getPaymentLink(token: string, orderId: string) {
  return req<{ success: boolean; auth_url?: string; message?: string }>(
    `/api/v1/orders/${orderId}/payment-link`,
    token,
    { method: 'POST' },
  );
}

export type SipBody = {
  scheme_code: string;
  scheme_name?: string;
  isin?: string;
  amount: number;
  frequency?: string;
  start_date?: string;
  txn_date: number;
  installments?: number;
};

export function placeSip(token: string, body: SipBody) {
  return req<{ sip_id: string; mem_sxp_ref_id: string; bse_sxp_id?: string; status: string }>(
    '/api/v1/sips',
    token,
    { method: 'POST', body: JSON.stringify({ frequency: 'MONTHLY', installments: 60, ...body }) },
  );
}

export function getSipAuthLink(token: string, sipId: string) {
  return req<{ success: boolean; auth_url?: string; message?: string }>(
    `/api/v1/sips/${sipId}/auth-link`,
    token,
  );
}
