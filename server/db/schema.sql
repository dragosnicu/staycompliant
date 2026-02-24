-- ============================================================
-- StayCompliant — Full Schema (Stage 1 + Stage 2)
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  address     VARCHAR(500),
  city        VARCHAR(100),
  state       VARCHAR(50),
  platform    VARCHAR(50),   -- airbnb | vrbo | both | other
  night_cap   INTEGER,       -- annual night cap (null = no cap)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- Permits
CREATE TABLE IF NOT EXISTS permits (
  id            SERIAL PRIMARY KEY,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  permit_number VARCHAR(100),
  issue_date    DATE,
  expiry_date   DATE,
  status        VARCHAR(50) DEFAULT 'active',  -- active | expired | pending
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permits_property_id ON permits(property_id);
CREATE INDEX IF NOT EXISTS idx_permits_expiry_date  ON permits(expiry_date);

-- Email reminder log (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS reminder_log (
  id          SERIAL PRIMARY KEY,
  permit_id   INTEGER NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(permit_id, days_before)
);

-- Bookings (Stage 2)
CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform    VARCHAR(50),
  guest_name  VARCHAR(100),
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in    ON bookings(check_in);

-- Documents (Stage 2)
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permit_id     INTEGER REFERENCES permits(id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path     VARCHAR(500) NOT NULL,
  file_size     INTEGER,
  mime_type     VARCHAR(100),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
