-- Straps Security Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Users table (guards and admins)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  role TEXT CHECK(role IN ('admin', 'guard')) NOT NULL DEFAULT 'guard',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guard status tracking
CREATE TABLE IF NOT EXISTS guard_status (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT CHECK(status IN ('active', 'break', 'offline')) DEFAULT 'offline',
  current_location_id INTEGER REFERENCES locations(id),
  zone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guard_id)
);

-- Check-in/out logs
CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  type TEXT CHECK(type IN ('checkin', 'checkout')) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  zone TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guard availability
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift notes
CREATE TABLE IF NOT EXISTS shift_notes (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id),
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  content TEXT NOT NULL,
  note_type TEXT CHECK(note_type IN ('incident', 'observation', 'maintenance', 'general')) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Location history (GPS tracking)
CREATE TABLE IF NOT EXISTS location_history (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_checkins_guard ON checkins(guard_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_shifts_guard ON shifts(guard_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_location_history_guard ON location_history(guard_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for simplicity - tighten for production)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON guard_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON availability FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shift_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON location_history FOR ALL USING (true) WITH CHECK (true);
