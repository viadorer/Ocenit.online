import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { sql } from '@/lib/db';

type Property = {
  id: string;
  address_street: string | null;
  address_city: string;
  address_region: string | null;
  property_type: string;
  disposition: string | null;
  area_m2: number | null;
  created_at: string;
};

type Valuation = {
  id: string;
  price_estimate: string;
  price_low: string | null;
  price_high: string | null;
  price_per_m2: string | null;
  valued_at: string;
};

export default async function MojePage() {
  const session = await requireSession();

  const props = (
    await sql<Property>`
      SELECT id, address_street, address_city, address_region,
             property_type, disposition, area_m2, created_at
      FROM properties WHERE user_id = ${session.userId} LIMIT 1
    `
  ).rows;

  if (props.length === 0) {
    return <EmptyState />;
  }

  const p = props[0];
  const valuations = (
    await sql<Valuation>`
      SELECT id, price_estimate, price_low, price_high, price_per_m2, valued_at
      FROM valuations WHERE property_id = ${p.id}
      ORDER BY valued_at DESC LIMIT 12
    `
  ).rows;

  const latest = valuations[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
            Vaše nemovitost
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0', color: '#111827' }}>
            {p.address_street ? `${p.address_street}, ` : ''}
            {p.address_city}
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
            {formatType(p.property_type)}
            {p.disposition ? ` · ${p.disposition}` : ''}
            {p.area_m2 ? ` · ${p.area_m2} m²` : ''}
          </p>
        </div>
        <Link
          href="/moje/nemovitost/upravit"
          style={{
            color: '#0D28F2',
            textDecoration: 'none',
            fontSize: 14,
            border: '1px solid #d1d5db',
            padding: '8px 16px',
            borderRadius: 6,
          }}
        >
          Upravit
        </Link>
      </div>

      {latest ? (
        <>
          <ValueCard latest={latest} />
          <HistoryList valuations={valuations} />
        </>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 24, borderRadius: 8 }}>
          Ještě nemáme odhad. Přepočet probíhá — zkuste to za pár minut.
        </div>
      )}

      <div
        style={{
          marginTop: 40,
          padding: 24,
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#374151',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Měsíční přehled</h3>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>
          První den každého měsíce vám na <strong>{session.email}</strong> pošleme aktualizovaný odhad
          vaší nemovitosti a přehled toho, co se prodalo v okolí.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
        Přidejte svou nemovitost
      </h1>
      <p style={{ color: '#6b7280', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Sledujte, jak se mění hodnota vaší nemovitosti. Každý měsíc dostanete aktualizovaný odhad
        a přehled prodejů v okolí.
      </p>
      <Link
        href="/moje/nemovitost/nova"
        style={{
          display: 'inline-block',
          background: '#0D28F2',
          color: '#fff',
          padding: '14px 28px',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Přidat nemovitost →
      </Link>
    </div>
  );
}

function ValueCard({ latest }: { latest: Valuation }) {
  const est = Number(latest.price_estimate);
  const low = latest.price_low ? Number(latest.price_low) : null;
  const high = latest.price_high ? Number(latest.price_high) : null;
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0D28F2 0%, #3b82f6 100%)',
        color: '#fff',
        padding: 32,
        borderRadius: 12,
        marginBottom: 24,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, opacity: 0.85, letterSpacing: 1, textTransform: 'uppercase' }}>
        Aktuální odhad ({formatDate(latest.valued_at)})
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 42, fontWeight: 800 }}>{formatKc(est)}</p>
      {low && high ? (
        <p style={{ margin: '4px 0 0', opacity: 0.85 }}>
          Rozpětí: {formatKc(low)} – {formatKc(high)}
        </p>
      ) : null}
      {latest.price_per_m2 ? (
        <p style={{ margin: '4px 0 0', opacity: 0.85 }}>
          {formatKc(Number(latest.price_per_m2))} / m²
        </p>
      ) : null}
    </div>
  );
}

function HistoryList({ valuations }: { valuations: Valuation[] }) {
  if (valuations.length < 2) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>
          Historie odhadů
        </h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {valuations.map((v) => (
            <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: 14 }}>{formatDate(v.valued_at)}</td>
              <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                {formatKc(Number(v.price_estimate))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatKc(n: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n);
}
function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatType(t: string): string {
  return { byt: 'Byt', dum: 'Dům', pozemek: 'Pozemek', komercni: 'Komerční prostor' }[t] || t;
}
