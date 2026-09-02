import { requireSession } from '@/lib/auth';

export default async function NovaNemovitostPage() {
  await requireSession();

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        Přidat nemovitost
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
        Vyplňte základní údaje. Odhad ceny spočítáme automaticky a začneme vám posílat
        měsíční přehled.
      </p>

      <form
        action="/api/properties"
        method="post"
        style={{ display: 'grid', gap: 20, background: '#fff', padding: 32, borderRadius: 8, border: '1px solid #e5e7eb' }}
      >
        <Field label="Typ nemovitosti" required>
          <select name="property_type" required style={inputStyle} defaultValue="byt">
            <option value="byt">Byt</option>
            <option value="dum">Rodinný dům</option>
            <option value="pozemek">Pozemek</option>
            <option value="komercni">Komerční prostor</option>
          </select>
        </Field>

        <Row>
          <Field label="Město" required>
            <input name="address_city" required placeholder="Plzeň" style={inputStyle} />
          </Field>
          <Field label="PSČ">
            <input name="address_zip" placeholder="30100" style={inputStyle} />
          </Field>
        </Row>

        <Field label="Ulice a č. p.">
          <input name="address_street" placeholder="Nová 12" style={inputStyle} />
        </Field>

        <Row>
          <Field label="Dispozice">
            <select name="disposition" style={inputStyle} defaultValue="">
              <option value="">Neuvedeno</option>
              <option>1+kk</option>
              <option>1+1</option>
              <option>2+kk</option>
              <option>2+1</option>
              <option>3+kk</option>
              <option>3+1</option>
              <option>4+kk</option>
              <option>4+1</option>
              <option>5+kk</option>
              <option>5+1 a větší</option>
            </select>
          </Field>
          <Field label="Plocha (m²)" required>
            <input name="area_m2" type="number" step="0.1" min="1" required placeholder="65" style={inputStyle} />
          </Field>
        </Row>

        <Row>
          <Field label="Patro">
            <input name="floor" type="number" min="0" placeholder="3" style={inputStyle} />
          </Field>
          <Field label="Rok stavby">
            <input name="year_built" type="number" min="1800" max="2030" placeholder="1985" style={inputStyle} />
          </Field>
        </Row>

        <Field label="Stav">
          <select name="condition" style={inputStyle} defaultValue="">
            <option value="">Neuvedeno</option>
            <option value="novostavba">Novostavba</option>
            <option value="velmi_dobry">Velmi dobrý</option>
            <option value="dobry">Dobrý</option>
            <option value="k_rekonstrukci">K rekonstrukci</option>
            <option value="pred_rekonstrukci">Před rekonstrukcí</option>
          </select>
        </Field>

        <Field label="Vlastnictví">
          <select name="ownership" style={inputStyle} defaultValue="osobni">
            <option value="osobni">Osobní</option>
            <option value="druzstevni">Družstevní</option>
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
            <input type="checkbox" name="has_balcony" /> Balkon/lodžie
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
            <input type="checkbox" name="has_parking" /> Parkování
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
            <input type="checkbox" name="has_cellar" /> Sklep
          </label>
        </div>

        <button
          type="submit"
          style={{
            padding: '14px 24px',
            background: '#0D28F2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Uložit a spočítat odhad
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 15,
  width: '100%',
  boxSizing: 'border-box',
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
        {label} {required ? <span style={{ color: '#ef4444' }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}
