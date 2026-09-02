/**
 * GET /api/auth/callback?token=... — ověří magic link, vytvoří session.
 */
import { NextResponse } from 'next/server';
import { verifyLoginToken, findOrCreateUser, createSessionCookie } from '@/lib/auth';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/moje/prihlaseni?error=Chybí+token', url.origin));
  }

  let email: string;
  try {
    ({ email } = await verifyLoginToken(token));
  } catch {
    return NextResponse.redirect(
      new URL('/moje/prihlaseni?error=Odkaz+vypršel+nebo+je+neplatný', url.origin),
    );
  }

  const userId = await findOrCreateUser(email);
  await createSessionCookie({ userId, email });

  // Log event
  try {
    await sql`
      INSERT INTO events (user_id, event_type, metadata)
      VALUES (${userId}, 'login', ${JSON.stringify({ via: 'magic-link' })}::jsonb)
    `;
  } catch (err) {
    console.error('[auth/callback] event log failed:', err);
  }

  return NextResponse.redirect(new URL('/moje', url.origin));
}
