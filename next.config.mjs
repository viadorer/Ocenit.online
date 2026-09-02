/** @type {import('next').NextConfig} */
const nextConfig = {
  // Statické HTML v public/ Next.js servuje automaticky pro /ocenit.html, /blog/*, atd.
  // Kořen "/" musíme explicitně přesměrovat na /index.html.
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/blog', destination: '/blog/index.html' },
    ];
  },
  // Zamezit collision s existujícími statickými HTML soubory (Next.js by je jinak přepsal
  // dynamickým routerem, kdyby vznikla stejnojmenná /page.tsx).
  trailingSlash: false,
};

export default nextConfig;
