/**
 * GET /api/cron/monthly-digest — spouští Vercel Cron 1. dne v měsíci v 8:00.
 *
 * Pro každou nemovitost:
 *   1) Zavolat Realvisor re-valuation (pokud známe realvisor_valuation_id)
 *   2) Uložit nový odhad do valuations
 *   3) Sestavit HTML digest ze všech potřebných dat
 *   4) Poslat email přes PTF API
 *   5) Zalogovat výsledek do digests
 *
 * Auth: hlavička `Authorization: Bearer $CRON_SECRET` nebo query `?secret=X`.
 * Vercel Cron nastaví hlavičku `x-vercel-cron: 1` — dodatečná ochrana.
 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { reValuate } from '@/lib/realvisor';
import { sendEmail } from '@/lib/ptf-email';
import { buildDigestHtml, type DigestData } from '@/lib/digest';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min pro sériovou smyčku (Pro plán)

type PropertyRow = {
  id: string;
  user_id: string;
  user_email: string;
  address_street: string | null;
  address_city: string;
  disposition: string | null;
  area_m2: number | null;
  realvisor_valuation_id: string | null;
};

type ValuationRow = {
  price_estimate: string;
  price_per_m2: string | null;
  valued_at: string;
};

export async function GET(req: Request) {
  // Auth check
  const auth = req.headers.get('authorization') || '';
  const secretFromHeader = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secretFromQuery = new URL(req.url).searchParams.get('secret') || '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && secretFromHeader !== process.env.CRON_SECRET && secretFromQuery !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.ocenit.online');

  // Načíst všechny nemovitosti s emaily uživatelů
  const props = (
    await sql<PropertyRow>`
      SELECT p.id, p.user_id, u.email AS user_email,
             p.address_street, p.address_city, p.disposition, p.area_m2,
             p.realvisor_valuation_id
      FROM properties p JOIN users u ON u.id = p.user_id
      WHERE u."emailVerified" IS NOT NULL
    `
  ).rows;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const p of props) {
    try {
      // 1) Re-valuation přes Realvisor
      if (p.realvisor_valuation_id) {
        try {
          const val = await reValuate(p.realvisor_valuation_id);
          if (val.price_estimate > 0) {
            await sql`
              INSERT INTO valuations (
                property_id, price_estimate, price_low, price_high, price_per_m2,
                method, raw_response
              ) VALUES (
                ${p.id}, ${val.price_estimate}, ${val.price_low}, ${val.price_high},
                ${val.price_per_m2}, 'realvisor', ${JSON.stringify(val.raw)}::jsonb
              )
            `;
          }
        } catch (err) {
          console.warn('[cron] revaluation failed for property', p.id, err);
        }
      }

      // 2) Načíst historii (posledních 12 měsíců, DESC)
      const hist = (
        await sql<ValuationRow>`
          SELECT price_estimate, price_per_m2, valued_at
          FROM valuations WHERE property_id = ${p.id}
          ORDER BY valued_at DESC LIMIT 12
        `
      ).rows;

      if (hist.length === 0) {
        // žádný odhad = nic neposílat
        continue;
      }

      const latest = hist[0];
      const previous = hist.length > 1 ? hist[1] : null;

      // 3) Sestavit digest
      const data: DigestData = {
        userEmail: p.user_email,
        property: {
          address_street: p.address_street,
          address_city: p.address_city,
          disposition: p.disposition,
          area_m2: p.area_m2 ? Number(p.area_m2) : null,
        },
        latestValuation: {
          price_estimate: Number(latest.price_estimate),
          price_per_m2: latest.price_per_m2 ? Number(latest.price_per_m2) : undefined,
          valued_at: latest.valued_at,
        },
        previousValuation: previous
          ? { price_estimate: Number(previous.price_estimate), valued_at: previous.valued_at }
          : null,
        history: hist.map((h) => ({ price_estimate: Number(h.price_estimate), valued_at: h.valued_at })),
        appUrl,
      };
      const { html, subject } = buildDigestHtml(data);

      // 4) Odeslat email
      await sendEmail({ to: p.user_email, subject, html });

      // 5) Log
      await sql`
        INSERT INTO digests (user_id, property_id, status, payload)
        VALUES (${p.user_id}, ${p.id}, 'sent', ${JSON.stringify({ subject })}::jsonb)
      `;
      sent++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${p.id}: ${msg}`);
      await sql`
        INSERT INTO digests (user_id, property_id, status, error)
        VALUES (${p.user_id}, ${p.id}, 'failed', ${msg})
      `;
    }
  }

  return NextResponse.json({ ok: true, total: props.length, sent, failed, errors });
}
