-- ============================================================
-- BlockfolioX – Supabase PostgreSQL Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. EXCHANGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Binance', 'Coinbase'
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own exchanges" ON public.exchanges FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_exchanges_user ON public.exchanges(user_id);

-- ============================================================
-- 3. API KEYS (encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_id UUID NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_api_keys_exchange ON public.api_keys(exchange_id);

-- ============================================================
-- 4. HOLDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,          -- e.g. 'BTC'
  name TEXT NOT NULL,            -- e.g. 'Bitcoin'
  quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL(20,8) DEFAULT 0,
  current_price DECIMAL(20,8) DEFAULT 0,
  source TEXT DEFAULT 'manual',  -- 'manual' | 'exchange'
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own holdings" ON public.holdings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON public.holdings(symbol);

-- ============================================================
-- 5. TRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  total DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,8) DEFAULT 0,
  exchange_name TEXT,
  source TEXT DEFAULT 'manual',
  traded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);-- ============================================================
-- BlockfolioX – Supabase PostgreSQL Schema
-- ============================================================
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop trigger if exists to recreate safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
-- 2. EXCHANGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Binance', 'Coinbase'
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own exchanges" ON public.exchanges FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_exchanges_user ON public.exchanges(user_id);
-- ============================================================
-- 3. API KEYS (encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_id UUID NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_api_keys_exchange ON public.api_keys(exchange_id);
-- ============================================================
-- 4. HOLDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,          -- e.g. 'BTC'
  name TEXT NOT NULL,            -- e.g. 'Bitcoin'
  quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL(20,8) DEFAULT 0,
  current_price DECIMAL(20,8) DEFAULT 0,
  source TEXT DEFAULT 'manual',  -- 'manual' | 'exchange'
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own holdings" ON public.holdings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON public.holdings(symbol);
-- ============================================================
-- 5. TRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  total DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,8) DEFAULT 0,
  exchange_name TEXT,
  source TEXT DEFAULT 'manual',
  traded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(traded_at DESC);
-- ============================================================
-- 6. PRICE SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  market_cap DECIMAL(20,2),
  volume_24h DECIMAL(20,2),
  price_change_24h DECIMAL(10,4),
  recorded_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Authenticated can read prices" ON public.price_snapshots FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_snapshots_symbol ON public.price_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.price_snapshots(recorded_at DESC);
-- ============================================================
-- 7. RISK ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  token_address TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  alert_type TEXT NOT NULL,        -- 'scam', 'rug_pull', 'honeypot', 'suspicious'
  description TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users manage own risk alerts" ON public.risk_alerts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user ON public.risk_alerts(user_id);
-- ============================================================
-- 8. SCAM TOKENS (global registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scam_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT,
  name TEXT,
  contract_address TEXT UNIQUE,
  chain TEXT DEFAULT 'ethereum',
  scam_type TEXT,                  -- 'phishing', 'rug_pull', 'honeypot', 'fake_token'
  source TEXT,                     -- 'cryptoscamdb', 'etherscan', 'manual'
  reported_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT false
);
ALTER TABLE public.scam_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Authenticated can read scam tokens" ON public.scam_tokens FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_scam_tokens_address ON public.scam_tokens(contract_address);
CREATE INDEX IF NOT EXISTS idx_scam_tokens_symbol ON public.scam_tokens(symbol);


ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(traded_at DESC);

-- ============================================================
-- 6. PRICE SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  market_cap DECIMAL(20,2),
  volume_24h DECIMAL(20,2),
  price_change_24h DECIMAL(10,4),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated can read prices" ON public.price_snapshots FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_snapshots_symbol ON public.price_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.price_snapshots(recorded_at DESC);

-- ============================================================
-- 7. RISK ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  token_address TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  alert_type TEXT NOT NULL,        -- 'scam', 'rug_pull', 'honeypot', 'suspicious'
  description TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own risk alerts" ON public.risk_alerts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_risk_alerts_user ON public.risk_alerts(user_id);

-- ============================================================
-- 8. SCAM TOKENS (global registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scam_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT,
  name TEXT,
  contract_address TEXT UNIQUE,
  chain TEXT DEFAULT 'ethereum',
  scam_type TEXT,                  -- 'phishing', 'rug_pull', 'honeypot', 'fake_token'
  source TEXT,                     -- 'cryptoscamdb', 'etherscan', 'manual'
  reported_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT false
);

ALTER TABLE public.scam_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated can read scam tokens" ON public.scam_tokens FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_scam_tokens_address ON public.scam_tokens(contract_address);
CREATE INDEX IF NOT EXISTS idx_scam_tokens_symbol ON public.scam_tokens(symbol);
