# Ocenit.online — Vercel deploy krok za krokem

Tato branch (`feat/vercel-dashboard`) přidává:
- Kompletní přesun z GitHub Pages na Vercel (statika beze změny)
- Auth přes magic link (email z PTF backendu)
- Dashboard „Moje nemovitost" s historií odhadů
- Cron pro měsíční digest (1. dne v měsíci v 8:00)

## 1. Import repa na Vercel

1. Otevři https://vercel.com/new
2. **Import Git Repository** → vyber `viadorer/Ocenit.online`
3. **Framework Preset**: Next.js (Vercel to detekuje sám podle package.json)
4. **Root Directory**: `.` (default)
5. **Branch**: přepni z `main` na **`feat/vercel-dashboard`** pro první testovací deploy
6. **Environment Variables** (viz krok 3 níže)
7. Deploy

Testovací URL: `ocenit-online-<hash>.vercel.app`. Původní produkce na GitHub Pages běží nezávisle.

## 2. Přidat Vercel Postgres

Ve Vercel projektu → **Storage** → **Create Database** → **Postgres** → název `ocenit-db` (Hobby zdarma).
Vercel automaticky přidá 7 env vars (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, …). Nic ručně.

Po vytvoření spusť schema:
- Klikni na DB → **Query** tab
- Zkopíruj obsah `db/schema.sql` a spusť

## 3. Environment Variables

Nastav v Vercel projektu → Settings → Environment Variables (Production + Preview):

| Klíč | Hodnota |
|------|---------|
| `AUTH_SECRET` | Vygeneruj: `openssl rand -base64 32` |
| `APP_URL` | `https://www.ocenit.online` (pro produkci) — pro preview nech prázdné (odvodí z VERCEL_URL) |
| `CRON_SECRET` | Vygeneruj: `openssl rand -hex 32` |
| `REALVISOR_API_URL` | `https://api-production-88cf.up.railway.app/api/v1` |
| `REALVISOR_API_KEY` | (pokud API vyžaduje) |
| `PTF_EMAIL_API_URL` | endpoint na PTF pro odeslání emailu (viz níže) |
| `PTF_EMAIL_API_KEY` | Bearer token pro PTF email API |
| `PTF_EMAIL_FROM` | `noreply@ocenit.online` (nebo tvoje) |
| `PTF_EMAIL_FROM_NAME` | `Ocenit.online` |
| `PTF_BACKEND_URL` | `https://ptf-production.up.railway.app` (default) |

### Co potřebuju od tebe pro PTF email API

Payload který posílám v `lib/ptf-email.ts`:
```json
POST {PTF_EMAIL_API_URL}
Authorization: Bearer {PTF_EMAIL_API_KEY}
Content-Type: application/json

{
  "to": "user@example.cz",
  "from": "noreply@ocenit.online",
  "fromName": "Ocenit.online",
  "subject": "…",
  "html": "…",
  "text": "…"
}
```

Pokud PTF očekává jiný tvar, uprav `lib/ptf-email.ts` — jde jen o mapování polí.

## 4. Test na preview URL

Po deploy otevři preview URL (`ocenit-online-xxx.vercel.app`):

1. `/` → měl by se zobrazit původní `index.html` beze změny
2. `/ocenit.html`, `/blog/`, `/metodika.html` → identicky jako předtím
3. `/moje` → přesměruje na `/moje/prihlaseni`
4. `/moje/prihlaseni` → zadej email, klikni „Poslat odkaz"
5. Zkontroluj schránku, klikni magic link → měl by tě přesměrovat na `/moje` s prázdným dashboardem
6. Klikni „Přidat nemovitost", vyplň formulář, ulož
7. Po uložení uvidíš dashboard s odhadem (pokud Realvisor API vrátilo hodnotu)

## 5. Test měsíčního cronu (bez čekání na 1. den)

Zavolat manuálně:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://ocenit-online-xxx.vercel.app/api/cron/monthly-digest
```

Odpověď obsahuje `{ total, sent, failed, errors }`.

## 6. Přepnutí produkce (až vše funguje)

1. **Merge `feat/vercel-dashboard` do `main`** — Vercel deployne main na produkční URL
2. Ve Vercel projektu **Domains** → přidat `www.ocenit.online` a `ocenit.online`
3. Vercel ukáže DNS instrukce (obvykle CNAME `cname.vercel-dns.com`)
4. Ve **Forpsi** → DNS → uprav CNAME záznamy podle Vercelu
5. Počkej ~1 h na DNS propagaci (TTL)
6. Vypni GitHub Pages ve Github → viadorer/Ocenit.online → Settings → Pages → None
7. Otestuj `https://www.ocenit.online/moje/prihlaseni` — mělo by fungovat

**SEO nulový dopad**: URL zůstávají stejné, canonical taky. Sitemap a robots.txt beze změny.

## Struktura

```
├── api/                            # Vercel Functions pro PTF blog (zůstává)
│   ├── blog.js
│   └── blog-post.js
├── app/                            # Next.js App Router (jen /moje/* a /api/*)
│   ├── layout.tsx
│   ├── moje/
│   │   ├── layout.tsx              # navbar
│   │   ├── page.tsx                # dashboard
│   │   ├── prihlaseni/page.tsx     # login
│   │   └── nemovitost/nova/page.tsx
│   └── api/
│       ├── auth/login/route.ts     # POST — pošle magic link
│       ├── auth/callback/route.ts  # GET — ověří link
│       ├── auth/logout/route.ts    # POST — smaže cookie
│       ├── properties/route.ts     # POST — CRUD nemovitost
│       └── cron/monthly-digest/route.ts
├── db/schema.sql                   # SQL k prvnímu spuštění
├── lib/
│   ├── auth.ts                     # JWT session + magic link
│   ├── db.ts                       # @vercel/postgres wrapper
│   ├── digest.ts                   # HTML digest sestavení
│   ├── ptf-email.ts                # PTF backend wrapper
│   └── realvisor.ts                # Realvisor API wrapper
├── public/                         # Statika (index.html, blog/, Images/…)
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vercel.json                     # + cron config
```
