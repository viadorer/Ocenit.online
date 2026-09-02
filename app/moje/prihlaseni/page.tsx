/**
 * Přihlašovací stránka — jen email, magic link.
 *
 * Bez marketingového souhlasu na tomto formuláři: přihlášení =
 * poskytnutí služby (měsíční digest o VAŠÍ nemovitosti), za což nesmíme
 * podmiňovat souhlasem podle čl. 7 odst. 4 GDPR. Marketingový souhlas
 * (na cizí obsah, telefon) přijde v nastavení účtu, samostatně.
 */
export default function PrihlaseniPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
        Přihlaste se
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Zadejte svůj e-mail a pošleme vám odkaz pro přihlášení.
        Nepotřebujete heslo.
      </p>

      <FormOrConfirmation searchParams={searchParams} />

      <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 24, lineHeight: 1.6 }}>
        Přihlášením souhlasíte s{' '}
        <a href="/OP.html" style={{ color: '#0D28F2' }}>obchodními podmínkami</a> a{' '}
        <a href="/oou.html" style={{ color: '#0D28F2' }}>zpracováním osobních údajů</a>.
      </p>
    </div>
  );
}

async function FormOrConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (params.sent) {
    return (
      <div
        style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: 20,
          borderRadius: 8,
          color: '#065f46',
        }}
      >
        <strong>E-mail odeslán ✓</strong>
        <p style={{ margin: '8px 0 0' }}>
          Zkontrolujte schránku ({params.sent}) a klikněte na odkaz pro přihlášení.
          Platí 15 minut.
        </p>
      </div>
    );
  }

  return (
    <form action="/api/auth/login" method="post" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {params.error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 6 }}>
          {decodeURIComponent(params.error)}
        </div>
      ) : null}
      <label htmlFor="email" style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
        E-mail
      </label>
      <input
        id="email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="vas@email.cz"
        style={{
          padding: '12px 14px',
          borderRadius: 6,
          border: '1px solid #d1d5db',
          fontSize: 16,
          outlineColor: '#0D28F2',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '12px 20px',
          background: '#0D28F2',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 4,
        }}
      >
        Poslat odkaz pro přihlášení
      </button>
    </form>
  );
}
