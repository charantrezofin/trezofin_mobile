/**
 * Fund analytics — the per-scheme enrichment data the web page shows.
 *
 *   GET /api/v1/fund-analytics/{amfi_code}
 *   -> {
 *        fund: FundAnalytics,
 *        calendar_years:  [{ year, return_pct }],
 *        calendar_months: [{ month_date, return_pct }],
 *        rolling_returns: { avg_return, volatility, high, low, positive_pct },
 *        sip_returns:     { invested_value, xirr, final_value },
 *        overlaps:        [{ amfi_code, fund_name, overlap_pct }],
 *      }
 */
import { API_BASE } from './config';

export type CalendarYearReturn  = { year: number; return_pct: number | null };
export type CalendarMonthReturn = { month_date: string; return_pct: number | null };
export type RollingReturn = {
  avg_return: number | null;
  volatility: number | null;
  high: number | null;
  low: number | null;
  range_val?: number | null;
  positive_pct: number | null;
};
export type SipReturn = {
  invested_value: number | null;
  xirr: number | null;
  final_value: number | null;
};
export type FundOverlap = {
  amfi_code: string;
  fund_name: string | null;
  overlap_pct: number | null;
};

export type FundAnalyticsDetail = {
  success: boolean;
  fund: Record<string, unknown>;
  calendar_years: CalendarYearReturn[];
  calendar_months: CalendarMonthReturn[];
  rolling_returns: RollingReturn | null;
  sip_returns: SipReturn | null;
  overlaps: FundOverlap[];
};

export async function getFundAnalytics(
  amfiCode: string,
): Promise<FundAnalyticsDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/fund-analytics/${encodeURIComponent(amfiCode)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
