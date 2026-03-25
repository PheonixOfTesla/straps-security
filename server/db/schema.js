// Database schema for Straps Security Operations Platform

export const schema = `
-- Users table (guards and admins)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  role TEXT CHECK(role IN ('admin', 'guard')) NOT NULL DEFAULT 'guard',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (resorts, venues, etc.)
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guard status tracking (current status and location)
CREATE TABLE IF NOT EXISTS guard_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT CHECK(status IN ('active', 'break', 'offline')) DEFAULT 'offline',
  current_location_id INTEGER REFERENCES locations(id),
  zone TEXT,
  lat REAL,
  lng REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guard_id)
);

-- Check-in/out logs
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  type TEXT CHECK(type IN ('checkin', 'checkout')) NOT NULL,
  lat REAL,
  lng REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shifts table (scheduled shifts)
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  zone TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guard availability
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  available BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shift notes
CREATE TABLE IF NOT EXISTS shift_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER REFERENCES shifts(id),
  guard_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  content TEXT NOT NULL,
  note_type TEXT CHECK(note_type IN ('incident', 'observation', 'maintenance', 'general')) DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  action TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Location history (GPS tracking)
CREATE TABLE IF NOT EXISTS location_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guard_id INTEGER NOT NULL REFERENCES users(id),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_guard ON checkins(guard_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_shifts_guard ON shifts(guard_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_location_history_guard ON location_history(guard_id);
`;

export default schema;
