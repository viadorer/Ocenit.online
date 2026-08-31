/**
 * Odesílání emailů přes PTF backend (Railway).
 *
 * Endpoint a klíč jsou v env: PTF_EMAIL_API_URL, PTF_EMAIL_API_KEY.
 * Pokud PTF API má jiný tvar payloadu než níže, uprav `sendEmail`
 * a `NextAuth` `sendVerificationRequest` v `lib/auth.ts` bude fungovat dál.
 */

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiUrl = process.env.PTF_EMAIL_API_URL;
  const apiKey = process.env.PTF_EMAIL_API_KEY;
  const from = input.from || process.env.PTF_EMAIL_FROM || 'noreply@ocenit.online';
  const fromName = process.env.PTF_EMAIL_FROM_NAME || 'Ocenit.online';

  if (!apiUrl) {
    // Bez API URL jen zalogujeme (dev prostředí bez env vars).
    console.warn('[ptf-email] PTF_EMAIL_API_URL není nastavené — email neodeslán:', input.subject);
    return;
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      to: input.to,
      from,
      fromName,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PTF email API selhalo (${res.status}): ${body.slice(0, 300)}`);
  }
}
