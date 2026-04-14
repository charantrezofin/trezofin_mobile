/**
 * Watchlist client — mirrors the web app's lib/api/client.js watchlist calls.
 *   GET    /api/v1/watchlist/codes    -> ["amfi-code1", "amfi-code2", ...]
 *   POST   /api/v1/watchlist          { amfi_code }
 *   DELETE /api/v1/watchlist/{amfi_code}
 */
import { API_BASE } from './config';

export async function listWatchlistCodes(token: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/v1/watchlist/codes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addToWatchlist(token: string, amfiCode: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amfi_code: amfiCode }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Failed to add to watchlist');
  }
}

export async function removeFromWatchlist(token: string, amfiCode: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/watchlist/${encodeURIComponent(amfiCode)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Failed to remove from watchlist');
  }
}
