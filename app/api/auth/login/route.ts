/**
 * POST /api/auth/login — přijme email z formuláře, pošle magic link.
 *
 * Nikdy neprozradí jestli email existuje (odpoví vždy stejně) —
 * ochrana proti enumeration útoku.
 */
import { NextResponse } from 'next/server';
import { createLoginToken } from '@/lib/auth';
import { sendEmail } from '@/lib/ptf-email';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();

  if (!isValidEmail(email)) {
    return redirectBack('Zadejte platnou e-mailovou adresu.');
  }

  const token = await createLoginToken(email);
  const appUrl = getAppUrl(req);
  const link = `${appUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Přihlášení do Ocenit.online',
      html: buildEmail(link, email),
      text: `Pro přihlášení klikněte na odkaz (platí 15 minut): ${link}`,
    });
  } catch (err) {
    console.error('[auth/login] send failed:', err);
    // I při chybě odpovídáme stejně (kvůli enumeration), ale zalogujeme.
  }

  return NextResponse.redirect(new URL(`/moje/prihlaseni?sent=${encodeURIComponent(email)}`, appUrl), 303);
}

function redirectBack(msg: string): Response {
  return NextResponse.redirect(
    new URL(`/moje/prihlaseni?error=${encodeURIComponent(msg)}`, 'http://localhost'),
    303,
  );
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length < 254;
}

function getAppUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}

function buildEmail(link: string, email: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:40px 32px;border:1px solid #e5e7eb;">
    <h1 style="font-size:22px;margin:0 0 16px;color:#111827;">Přihlášení do Ocenit.online</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
      Klikněte na tlačítko níže a přihlásíme vás na účet <strong>${escapeHtml(email)}</strong>.
      Odkaz platí 15 minut.
    </p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${link}" style="display:inline-block;background:#0D28F2;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
        Přihlásit se
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
      Pokud jste o přihlášení nežádali, tento e-mail ignorujte. Nikdo se bez odkazu k účtu nedostane.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;word-break:break-all;">
      Nebo zkopírujte odkaz: ${link}
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
