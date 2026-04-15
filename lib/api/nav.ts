import { API_BASE } from './config';

export type NavPoint = { date: string; nav: number }; // date: DD-MM-YYYY
export type NavHistory = {
  scheme_name: string;
  fund_house: string;
  scheme_category: string;
  current_nav: number;
  nav_history: NavPoint[];
  total_data_points: number;
};

export async function getNavHistory(isin: string): Promise<NavHistory | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/nav/history?isin=${encodeURIComponent(isin)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
