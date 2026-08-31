/**
 * Wrapper nad Realvisor API — pro počáteční ocenění a měsíční re-ocenění.
 *
 * API URL je v env: REALVISOR_API_URL (default z widgetu:
 * https://api-production-88cf.up.railway.app/api/v1).
 *
 * Konkrétní tvar endpointů se doladí podle Realvisor docs — dokud
 * nemáme přesnou dokumentaci, oba níže vrací typový tvar, který
 * naše appka očekává, a `raw` uchováme kompletně do `valuations.raw_response`.
 */

const BASE = process.env.REALVISOR_API_URL || 'https://api-production-88cf.up.railway.app/api/v1';

export type ValuationInput = {
  address_city: string;
  address_street?: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  property_type: string;
  disposition?: string;
  area_m2?: number;
  floor?: number;
  floors_total?: number;
  year_built?: number;
  condition?: string;
  has_balcony?: boolean;
  has_parking?: boolean;
  has_cellar?: boolean;
  ownership?: string;
};

export type ValuationResult = {
  price_estimate: number;
  price_low?: number;
  price_high?: number;
  price_per_m2?: number;
  realvisor_valuation_id?: string;
  comparables?: unknown[];
  raw: unknown;
};

/** Prvotní ocenění — volá se z formuláře „Přidat nemovitost". */
export async function valuate(input: ValuationInput): Promise<ValuationResult> {
  const res = await fetch(`${BASE}/valuations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.REALVISOR_API_KEY ? { Authorization: `Bearer ${process.env.REALVISOR_API_KEY}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Realvisor valuation failed: ${res.status}`);
  const data: unknown = await res.json();
  return normalize(data);
}

/** Re-ocenění existující nemovitosti — volá se z Vercel Cronu pro měsíční digest. */
export async function reValuate(realvisorValuationId: string): Promise<ValuationResult> {
  const res = await fetch(`${BASE}/valuations/${encodeURIComponent(realvisorValuationId)}/refresh`, {
    method: 'POST',
    headers: {
      ...(process.env.REALVISOR_API_KEY ? { Authorization: `Bearer ${process.env.REALVISOR_API_KEY}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Realvisor re-valuation failed: ${res.status}`);
  const data: unknown = await res.json();
  return normalize(data);
}

function normalize(raw: unknown): ValuationResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const est = pickNumber(r, ['price_estimate', 'estimate', 'price', 'value']);
  return {
    price_estimate: est ?? 0,
    price_low: pickNumber(r, ['price_low', 'low', 'min']),
    price_high: pickNumber(r, ['price_high', 'high', 'max']),
    price_per_m2: pickNumber(r, ['price_per_m2', 'price_per_sqm', 'pricePerM2']),
    realvisor_valuation_id: pickString(r, ['id', 'valuation_id', 'valuationId']),
    comparables: Array.isArray(r.comparables) ? r.comparables : undefined,
    raw,
  };
}

function pickNumber(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  }
  return undefined;
}
function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}
