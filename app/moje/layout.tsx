import Link from 'next/link';
import type { ReactNode } from 'react';
import { getSession } from '@/lib/auth';

export default async function MojeLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link href="/" style={{ fontWeight: 700, fontSize: 20, color: '#0D28F2', textDecoration: 'none' }}>
          Ocenit.online
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#374151', textDecoration: 'none' }}>Domů</Link>
          {session ? (
            <>
              <Link href="/moje" style={{ color: '#374151', textDecoration: 'none' }}>Moje nemovitost</Link>
              <span style={{ color: '#6b7280', fontSize: 14 }}>{session.email}</span>
              <form action="/api/auth/logout" method="post" style={{ margin: 0 }}>
                <button
                  type="submit"
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '6px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Odhlásit
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/moje/prihlaseni"
              style={{
                background: '#0D28F2',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Přihlásit
            </Link>
          )}
        </div>
      </nav>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>{children}</main>
    </div>
  );
}
