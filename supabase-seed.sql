-- Seed data for Straps Security
-- Run this AFTER the schema

-- Insert admin (password: straps2024)
INSERT INTO users (username, password_hash, name, initials, color, role) VALUES
('charles', '$2a$10$k7b6dUFno7Q/ZVTtWqAbr.kEbzBle05LQx4RWFbKFpHXpIPlzI0Fm', 'Charles Admin', 'CA', '#e8b84b', 'admin');

-- Insert guards (password: guard123)
INSERT INTO users (username, password_hash, name, initials, color, role) VALUES
('marcus', '$2a$10$7QYVtwZcPLuu0IncYEZXCOayKQRqetxswTs5slcvTLi.F0yFcg1Li', 'Marcus Thompson', 'MT', '#3b82f6', 'guard'),
('deja', '$2a$10$7QYVtwZcPLuu0IncYEZXCOayKQRqetxswTs5slcvTLi.F0yFcg1Li', 'Deja Williams', 'DW', '#22c55e', 'guard'),
('ray', '$2a$10$7QYVtwZcPLuu0IncYEZXCOayKQRqetxswTs5slcvTLi.F0yFcg1Li', 'Ray Garcia', 'RG', '#f97316', 'guard'),
('tasha', '$2a$10$7QYVtwZcPLuu0IncYEZXCOayKQRqetxswTs5slcvTLi.F0yFcg1Li', 'Tasha Brown', 'TB', '#a855f7', 'guard'),
('luis', '$2a$10$7QYVtwZcPLuu0IncYEZXCOayKQRqetxswTs5slcvTLi.F0yFcg1Li', 'Luis Martinez', 'LM', '#06b6d4', 'guard');

-- Insert locations
INSERT INTO locations (name, address, lat, lng) VALUES
('Ocean Palm Resort', '123 Beach Blvd', 25.7617, -80.1918),
('Sandbar Plaza', '456 Marina Way', 25.7650, -80.1850),
('Sunset Bay', '789 Harbor Dr', 25.7580, -80.1980);

-- Insert guard statuses (guard_id 2-6 are the guards we just inserted)
INSERT INTO guard_status (guard_id, status, current_location_id, zone, lat, lng) VALUES
(2, 'active', 1, 'Lobby', 25.762, -80.192),
(3, 'active', 1, 'Poolside', 25.763, -80.191),
(4, 'break', 2, 'Entrance', 25.765, -80.185),
(5, 'active', 3, 'Perimeter', 25.758, -80.198),
(6, 'active', 3, 'Parking', 25.759, -80.197);

-- Insert sample notes
INSERT INTO shift_notes (guard_id, location_id, content, note_type) VALUES
(2, 1, 'Suspicious vehicle in lot C — silver sedan, no plates. Photo taken.', 'incident'),
(5, 3, 'Gate 2 lock sticky, maintenance notified.', 'maintenance');

-- Insert sample activity
INSERT INTO activity_log (guard_id, location_id, action, details) VALUES
(5, 3, 'checkin', 'Tasha Brown arrived at Sunset Bay'),
(4, NULL, 'break_start', 'Ray Garcia started break'),
(2, 1, 'patrol', 'Marcus Thompson completed lobby sweep');
