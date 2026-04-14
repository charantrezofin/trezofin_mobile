import { supabase } from '../supabase/client';

export type Fund = {
  id: string;
  isin: string | null;
  amfi_code: string | null;
  fund_name: string;
  category: string | null;
  trezofin_score: number | null;
  return_1y: number | null;
  return_3y: number | null;
  return_5y: number | null;
  aum_cr: number | null;
  sharpe: number | null;
  risk_category: string | null;
};

export async function listFunds(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from('funds')
    .select('id, isin, amfi_code, fund_name, category, trezofin_score, return_1y, return_3y, return_5y, aum_cr, sharpe, risk_category')
    .not('amfi_code', 'is', null)
    .not('fund_name', 'is', null)
    .order('trezofin_score', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Fund[];
}
