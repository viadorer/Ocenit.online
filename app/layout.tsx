import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Ocenit.online',
  description: 'Profesionální ocenění nemovitosti online zdarma.',
};

/**
 * Root layout — jen minimální kostra. Pravidelný web (index.html, ocenit.html…)
 * je servován ze `public/` a tento layout ho nikdy nevidí. Vidí ho jen
 * dynamické routy pod `/moje/*` a `/api/*` které mají vlastní layouty.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
