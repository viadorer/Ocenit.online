/**
 * POST /api/properties — vytvořit nebo aktualizovat nemovitost uživatele.
 *
 * 1 user = 1 nemovitost. Pokud už existuje, aktualizujeme (UNIQUE(user_id)).
 * Po uložení zavoláme Realvisor pro první odhad — chyba tady neshodí uložení,
 * jen se digest nespočítá hned (spočte se při dalším cronu).
 */
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { valuate, type ValuationInput } from '@/lib/realvisor';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await requireSession();
  const form = await req.formData();

  const input = {
    property_type: strOrNull(form, 'property_type') || 'byt',
    address_city: strOrNull(form, 'address_city'),
    address_street: strOrNull(form, 'address_street'),
    address_zip: strOrNull(form, 'address_zip'),
    disposition: strOrNull(form, 'disposition'),
    area_m2: numOrNull(form, 'area_m2'),
    floor: intOrNull(form, 'floor'),
    year_built: intOrNull(form, 'year_built'),
    condition: strOrNull(form, 'condition'),
    ownership: strOrNull(form, 'ownership') || 'osobni',
    has_balcony: form.get('has_balcony') === 'on',
    has_parking: form.get('has_parking') === 'on',
    has_cellar: form.get('has_cellar') === 'on',
  };

  if (!input.address_city) {
    return NextResponse.json({ error: 'Město je povinné' }, { status: 400 });
  }
  if (!input.area_m2) {
    return NextResponse.json({ error: 'Plocha je povinná' }, { status: 400 });
  }

  // Upsert nemovitosti (UNIQUE(user_id))
  const upsert = await sql<{ id: string }>`
    INSERT INTO properties (
      user_id, property_type, address_city, address_street, address_zip,
      disposition, area_m2, floor, year_built, condition, ownership,
      has_balcony, has_parking, has_cellar
    ) VALUES (
      ${session.userId}, ${input.property_type}, ${input.address_city},
      ${input.address_street}, ${input.address_zip}, ${input.disposition},
      ${input.area_m2}, ${input.floor}, ${input.year_built}, ${input.condition},
      ${input.ownership}, ${input.has_balcony}, ${input.has_parking}, ${input.has_cellar}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      property_type = EXCLUDED.property_type,
      address_city = EXCLUDED.address_city,
      address_street = EXCLUDED.address_street,
      address_zip = EXCLUDED.address_zip,
      disposition = EXCLUDED.disposition,
      area_m2 = EXCLUDED.area_m2,
      floor = EXCLUDED.floor,
      year_built = EXCLUDED.year_built,
      condition = EXCLUDED.condition,
      ownership = EXCLUDED.ownership,
      has_balcony = EXCLUDED.has_balcony,
      has_parking = EXCLUDED.has_parking,
      has_cellar = EXCLUDED.has_cellar,
      updated_at = NOW()
    RETURNING id
  `;
  const propertyId = upsert.rows[0].id;

  // Event log
  await sql`
    INSERT INTO events (user_id, event_type, metadata)
    VALUES (${session.userId}, 'add_property', ${JSON.stringify({ property_id: propertyId })}::jsonb)
  `;

  // Spočítat první odhad — chyba neshodí request
  try {
    const val = await valuate(input as ValuationInput);
    await sql`
      INSERT INTO valuations (
        property_id, price_estimate, price_low, price_high, price_per_m2,
        method, raw_response, comparables
      ) VALUES (
        ${propertyId}, ${val.price_estimate}, ${val.price_low}, ${val.price_high},
        ${val.price_per_m2}, 'realvisor',
        ${JSON.stringify(val.raw)}::jsonb,
        ${val.comparables ? JSON.stringify(val.comparables) : null}::jsonb
      )
    `;
    if (val.realvisor_valuation_id) {
      await sql`
        UPDATE properties SET realvisor_valuation_id = ${val.realvisor_valuation_id}
        WHERE id = ${propertyId}
      `;
    }
  } catch (err) {
    console.error('[properties] realvisor valuation failed:', err);
  }

  const origin = new URL(req.url).origin;
  return NextResponse.redirect(new URL('/moje', origin), 303);
}

function strOrNull(f: FormData, k: string): string | null {
  const v = f.get(k);
  if (typeof v !== 'string' || v.trim() === '') return null;
  return v.trim();
}
function numOrNull(f: FormData, k: string): number | null {
  const v = f.get(k);
  if (typeof v !== 'string' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(f: FormData, k: string): number | null {
  const n = numOrNull(f, k);
  return n === null ? null : Math.trunc(n);
}
