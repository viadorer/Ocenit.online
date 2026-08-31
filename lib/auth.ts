/**
 * Vlastní minimalistický auth — magic link přes email + JWT session cookie.
 *
 * Proč ne NextAuth: jediný flow, jeden provider, žádné OAuth. NextAuth v5
 * beta + adapter overhead by přinesl víc kódu než tohle celé.
 *
 * Bezpečnostní model:
 *   - Login token: krátký JWT (15 min), obsahuje jen email + nonce.
 *   - Session token: dlouhý JWT (30 dní), obsahuje userId + email.
 *   - Oba podepsané HS256 z AUTH_SECRET.
 *   - Session cookie: HttpOnly, Secure v produkci, SameSite=Lax.
 *   - Redirect-open: `/api/auth/callback` po ověření redirectuje na `/moje`.
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from './db';

const COOKIE_NAME = 'ocenit_session';
const SESSION_TTL_DAYS = 30;
const LOGIN_TOKEN_TTL_MIN = 15;

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET není nastavené');
  return new TextEncoder().encode(s);
}

// ---- Login (magic link) token ----

export async function createLoginToken(email: string): Promise<string> {
  return await new SignJWT({ email, purpose: 'login' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${LOGIN_TOKEN_TTL_MIN}m`)
    .sign(secretKey());
}

export async function verifyLoginToken(token: string): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, secretKey());
  if (payload.purpose !== 'login' || typeof payload.email !== 'string') {
    throw new Error('Neplatný login token');
  }
  return { email: payload.email.toLowerCase() };
}

// ---- Session token + cookie ----

export type SessionPayload = { userId: string; email: string };

export async function createSessionCookie(user: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...user, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secretKey());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Přečte session z cookie a ověří JWT. Vrátí null když není nebo je neplatný. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== 'session') return null;
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

/** Pro server components / API — vyhodí redirect na login, když není přihlášen. */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) {
    const { redirect } = await import('next/navigation');
    redirect('/moje/prihlaseni');
  }
  return s;
}

// ---- User helpers ----

/** Najde uživatele podle emailu, nebo ho vytvoří. Vrátí userId. */
export async function findOrCreateUser(email: string): Promise<string> {
  const lower = email.toLowerCase();
  const existing = await sql<{ id: string }>`
    SELECT id FROM users WHERE email = ${lower} LIMIT 1
  `;
  if (existing.rows.length > 0) {
    // označíme email jako ověřený (magic link právě proběhl)
    await sql`UPDATE users SET "emailVerified" = NOW() WHERE id = ${existing.rows[0].id}`;
    return existing.rows[0].id;
  }
  const created = await sql<{ id: string }>`
    INSERT INTO users (email, "emailVerified")
    VALUES (${lower}, NOW())
    RETURNING id
  `;
  return created.rows[0].id;
}
