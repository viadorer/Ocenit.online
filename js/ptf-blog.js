/**
 * Články z PTF (administrace ptf.cz).
 *
 * Web běží na GitHub Pages, kde není server, který by dotaz přeposlal —
 * čte se tedy přímo z prohlížeče. Veřejné blogové API to povoluje
 * (publikovaný obsah bez přihlášení). Odpověď se převádí na tvar,
 * se kterým pracoval původní posts.json, takže vzhled zůstal 1:1.
 *
 * Úprava článku v administraci se tu projeví hned po načtení stránky.
 */
window.PTF_BLOG = (function () {
  var API = 'https://ptf-production.up.railway.app';
  var TENANT = 'ptf-reality';
  var WEB = 'ocenit';

  // Barvy štítků podle kategorie — stejné třídy, jaké měly statické
  // stránky. Kategorie mimo seznam (sdílené články z ostatních webů)
  // dostanou šedou.
  var BARVY = {
    'tipy & triky': 'bg-blue-100 text-blue-800',
    'tipy a triky': 'bg-blue-100 text-blue-800',
    'trh & finance': 'bg-purple-100 text-purple-800',
    'trh a finance': 'bg-purple-100 text-purple-800',
    'právní rady': 'bg-green-100 text-green-800',
    'průvodce': 'bg-indigo-100 text-indigo-800',
  };

  function hlavicky() {
    return { 'X-Tenant-Slug': TENANT, 'Accept': 'application/json' };
  }

  function prevod(p) {
    var datum = (p.publishedAt || p.createdAt || '').slice(0, 10);
    var nazev = (p.category && p.category.name) || '';
    return {
      id: p.slug,
      title: p.title,
      excerpt: p.excerpt || '',
      categoryName: nazev,
      categoryClass: BARVY[nazev.toLowerCase()] || 'bg-gray-100 text-gray-800',
      image: p.featuredImageUrl || '',
      imageAlt: p.featuredImageAlt || p.title,
      date: datum,
      dateFormatted: datum
        ? new Date(datum).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
      readTime: p.readingTimeMinutes || null,
    };
  }

  return {
    seznam: function () {
      return fetch(API + '/api/blog?web=' + WEB + '&limit=50', { headers: hlavicky() })
        .then(function (r) { if (!r.ok) throw new Error('API ' + r.status); return r.json(); })
        .then(function (d) { return (d.data || []).map(prevod); });
    },
    detail: function (slug) {
      return fetch(API + '/api/blog/' + encodeURIComponent(slug) + '?web=' + WEB, { headers: hlavicky() })
        .then(function (r) { if (!r.ok) throw new Error('API ' + r.status); return r.json(); })
        .then(function (d) {
          var m = prevod(d);
          m.content = d.content || '';
          m.canonicalUrl = d.canonicalUrl || null;
          return m;
        });
    },
    /**
     * Naplní tělo článku na samostatné stránce. Stránka zůstává na své
     * adrese (je zaindexovaná) i se svou hlavičkou, patičkou a stylem —
     * z PTF se bere jen text článku.
     */
    naplnClanek: function (slug, prvek) {
      if (!prvek) return;
      this.detail(slug).then(function (c) {
        prvek.innerHTML = c.content;
        if (c.canonicalUrl) {
          var canon = document.querySelector('link[rel="canonical"]');
          if (!canon) { canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon); }
          canon.setAttribute('href', c.canonicalUrl);
        }
      }).catch(function (e) {
        console.error('Článek se nenačetl:', e);
        // Statický text zůstane, dokud se načítání nepovede — prázdná
        // stránka by byla horší než chvilku stará verze.
      });
    },
  };
})();
