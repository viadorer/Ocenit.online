-- =================================================================
-- Ocenit.online — Databázové schéma
-- Spouští se ručně přes Vercel Postgres console nebo psql.
-- =================================================================

-- ------------ NextAuth tabulky (povinné pro auth) ------------
-- https://authjs.dev/reference/adapter/postgres

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  -- vlastní pole
  phone TEXT,
  region TEXT, -- kraj/město (např. "Plzeňský kraj")
  consent_marketing BOOLEAN DEFAULT FALSE,
  consent_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ------------ Nemovitosti (1 user = 1 nemovitost dle rozhodnutí) ------------

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Základní adresa
  address_street TEXT,
  address_city TEXT NOT NULL,
  address_region TEXT,
  address_zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  -- Parametry
  property_type TEXT NOT NULL, -- 'byt' | 'dum' | 'pozemek' | 'komercni'
  disposition TEXT,            -- '1+kk', '2+1', '3+kk', ...
  area_m2 NUMERIC(8,2),
  floor INT,
  floors_total INT,
  year_built INT,
  condition TEXT,              -- 'novostavba' | 'velmi_dobry' | 'dobry' | 'k_rekonstrukci' | 'pred_rekonstrukci'
  has_balcony BOOLEAN,
  has_parking BOOLEAN,
  has_cellar BOOLEAN,
  ownership TEXT,              -- 'osobni' | 'druzstevni'
  -- Reference na Realvisor request (pokud je)
  realvisor_valuation_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Jeden user = jedna nemovitost (dle rozhodnutí)
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(address_city);

-- ------------ Historie odhadů (pro graf vývoje ceny v čase) ------------

CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  price_estimate NUMERIC(14,2) NOT NULL,  -- odhad v Kč
  price_low NUMERIC(14,2),                -- spodní hranice intervalu
  price_high NUMERIC(14,2),               -- horní hranice
  price_per_m2 NUMERIC(10,2),
  method TEXT,                            -- 'realvisor' | 'manual' | 'imported'
  raw_response JSONB,                     -- kompletní odpověď z Realvisoru pro audit
  comparables JSONB,                      -- pole srovnatelných nemovitostí
  valued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuations_property_time ON valuations(property_id, valued_at DESC);

-- ------------ Události (skóring, chování — Vrstva 4 z investorského motoru) ------------

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,                        -- pro anonymní eventy
  event_type TEXT NOT NULL,               -- 'signup', 'add_property', 'view_dashboard', 'open_digest', 'click_digest_link', ...
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at DESC);

-- ------------ Digest log (kontrola co bylo odesláno) ------------

CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,                   -- 'sent' | 'failed' | 'skipped'
  error TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_digests_user_time ON digests(user_id, sent_at DESC);
