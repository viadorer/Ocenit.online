/**
 * Sestavení HTML těla měsíčního digestu.
 *
 * Struktura přesně podle „Vrstvy 3" z Investorského motoru:
 *   1) Aktuální odhad vaší nemovitosti + změna vs minulý měsíc
 *   2) Mini historie (posledních 6 měsíců)
 *   3) Co se prodalo v okolí (data z Nemovizoru, pokud je k dispozici)
 *   4) Jeden konkrétní byt na prodej v jeho segmentu (Vrstva 3 dokumentu)
 *   5) CTA na dashboard
 */

export type DigestData = {
  userEmail: string;
  property: {
    address_street: string | null;
    address_city: string;
    disposition: string | null;
    area_m2: number | null;
  };
  latestValuation: {
    price_estimate: number;
    price_per_m2?: number;
    valued_at: string;
  };
  previousValuation?: {
    price_estimate: number;
    valued_at: string;
  } | null;
  history: Array<{ price_estimate: number; valued_at: string }>;
  neighborhood?: {
    sold_count?: number;
    avg_price_per_m2?: number;
    period?: string;
  };
  appUrl: string;
};

export function buildDigestHtml(d: DigestData): { html: string; subject: string } {
  const change = d.previousValuation
    ? d.latestValuation.price_estimate - d.previousValuation.price_estimate
    : null;
  const changePct = change !== null && d.previousValuation
    ? (change / d.previousValuation.price_estimate) * 100
    : null;
  const changeColor = change === null ? '#6b7280' : change > 0 ? '#059669' : change < 0 ? '#dc2626' : '#6b7280';
  const changeSign = change === null ? '' : change > 0 ? '+' : '';
  const address = [d.property.address_street, d.property.address_city].filter(Boolean).join(', ');
  const monthName = new Date(d.latestValuation.valued_at).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  const subject = change === null
    ? `Váš měsíční přehled — ${address}`
    : change > 0
      ? `${address}: hodnota vzrostla o ${formatKc(change)}`
      : change < 0
        ? `${address}: hodnota klesla o ${formatKc(Math.abs(change))}`
        : `${address}: hodnota beze změny`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;color:#6b7280;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Měsíční přehled · ${escape(monthName)}</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#111827;">${escape(address)}</h1>
          ${d.property.disposition || d.property.area_m2 ? `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${d.property.disposition ? escape(d.property.disposition) : ''}${d.property.area_m2 ? ` · ${d.property.area_m2} m²` : ''}</p>` : ''}
        </td></tr>

        <!-- Value -->
        <tr><td style="padding:32px;background:linear-gradient(135deg,#0D28F2 0%,#3b82f6 100%);color:#fff;">
          <p style="margin:0;font-size:13px;opacity:0.85;letter-spacing:1px;text-transform:uppercase;">Aktuální odhad</p>
          <p style="margin:8px 0 0;font-size:38px;font-weight:800;">${formatKc(d.latestValuation.price_estimate)}</p>
          ${change !== null && changePct !== null ? `<p style="margin:6px 0 0;font-size:15px;opacity:0.95;">${changeSign}${formatKc(change)} (${changeSign}${changePct.toFixed(1)}%) oproti minulému měsíci</p>` : ''}
          ${d.latestValuation.price_per_m2 ? `<p style="margin:4px 0 0;font-size:13px;opacity:0.85;">${formatKc(d.latestValuation.price_per_m2)} / m²</p>` : ''}
        </td></tr>

        ${d.history.length > 1 ? buildHistoryRow(d.history) : ''}

        ${d.neighborhood ? buildNeighborhoodRow(d.neighborhood) : ''}

        <!-- CTA -->
        <tr><td style="padding:32px;text-align:center;background:#f9fafb;">
          <a href="${escape(d.appUrl)}/moje" style="display:inline-block;background:#0D28F2;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
            Zobrazit celý přehled →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;line-height:1.6;">
          Ocenit.online · Pro <strong>${escape(d.userEmail)}</strong><br>
          Odhad je orientační a nenahrazuje znalecký posudek. Sledujte změny průběžně —
          hodnotu ovlivňují lokální faktory, které nemusíme z veřejných dat vždy zachytit.<br><br>
          <a href="${escape(d.appUrl)}/moje" style="color:#0D28F2;">Nastavení účtu</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { html, subject };
}

function buildHistoryRow(history: DigestData['history']): string {
  const items = history
    .slice(0, 6)
    .reverse()
    .map((h) => {
      const d = new Date(h.valued_at);
      const label = d.toLocaleDateString('cs-CZ', { month: 'short' });
      return `<td style="padding:6px 4px;text-align:center;font-size:11px;color:#6b7280;border-right:1px solid #f3f4f6;">
        <div style="font-weight:600;color:#374151;font-size:12px;">${formatKcCompact(h.price_estimate)}</div>
        <div style="margin-top:4px;">${escape(label)}</div>
      </td>`;
    })
    .join('');
  return `<tr><td style="padding:24px 32px;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#111827;">Vývoj za posledních měsíců</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:6px;">
      <tr>${items}</tr>
    </table>
  </td></tr>`;
}

function buildNeighborhoodRow(n: NonNullable<DigestData['neighborhood']>): string {
  return `<tr><td style="padding:24px 32px;border-top:1px solid #f3f4f6;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#111827;">Co se dělo ve vaší čtvrti</h3>
    ${n.sold_count !== undefined ? `<p style="margin:0 0 8px;color:#374151;font-size:14px;">Prodalo se <strong>${n.sold_count}</strong> nemovitostí ${n.period ? `za ${escape(n.period)}` : ''}.</p>` : ''}
    ${n.avg_price_per_m2 ? `<p style="margin:0;color:#374151;font-size:14px;">Průměrná cena: <strong>${formatKc(n.avg_price_per_m2)} / m²</strong></p>` : ''}
  </td></tr>`;
}

function formatKc(n: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n);
}
function formatKcCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (n >= 1_000) return Math.round(n / 1_000) + ' k';
  return String(Math.round(n));
}
function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
