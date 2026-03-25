import bcrypt from 'bcryptjs';
import { initDB, prepare, saveDB } from './database.js';

async function seedData() {
  await initDB();

  // Check if admin exists
  const adminExists = prepare('SELECT id FROM users WHERE username = ?').get('charles');

  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('straps2024', 10);

    // Create admin user
    prepare(`
      INSERT INTO users (username, password_hash, name, initials, color, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('charles', passwordHash, 'Charles Admin', 'CA', '#e8b84b', 'admin');

    // Create sample guards
    const guards = [
      { username: 'marcus', password: 'guard123', name: 'Marcus Thompson', initials: 'MT', color: '#3b82f6' },
      { username: 'deja', password: 'guard123', name: 'Deja Williams', initials: 'DW', color: '#22c55e' },
      { username: 'ray', password: 'guard123', name: 'Ray Garcia', initials: 'RG', color: '#f97316' },
      { username: 'tasha', password: 'guard123', name: 'Tasha Brown', initials: 'TB', color: '#a855f7' },
      { username: 'luis', password: 'guard123', name: 'Luis Martinez', initials: 'LM', color: '#06b6d4' },
    ];

    for (const guard of guards) {
      const hash = bcrypt.hashSync(guard.password, 10);
      prepare(`
        INSERT INTO users (username, password_hash, name, initials, color, role)
        VALUES (?, ?, ?, ?, ?, 'guard')
      `).run(guard.username, hash, guard.name, guard.initials, guard.color);
    }

    // Create sample locations
    const locations = [
      { name: 'Ocean Palm Resort', address: '123 Beach Blvd', lat: 25.7617, lng: -80.1918 },
      { name: 'Sandbar Plaza', address: '456 Marina Way', lat: 25.7650, lng: -80.1850 },
      { name: 'Sunset Bay', address: '789 Harbor Dr', lat: 25.7580, lng: -80.1980 },
    ];

    for (const loc of locations) {
      prepare(`
        INSERT INTO locations (name, address, lat, lng)
        VALUES (?, ?, ?, ?)
      `).run(loc.name, loc.address, loc.lat, loc.lng);
    }

    // Set up initial guard statuses
    const guardIds = prepare('SELECT id FROM users WHERE role = ?').all('guard');
    const locationIds = prepare('SELECT id FROM locations').all();

    const statuses = ['active', 'active', 'break', 'active', 'active'];
    const zones = ['Lobby', 'Poolside', 'Entrance', 'Perimeter', 'Parking'];

    guardIds.forEach((guard, i) => {
      const locId = locationIds[i % locationIds.length].id;
      const loc = locations[i % locations.length];
      prepare(`
        INSERT INTO guard_status (guard_id, status, current_location_id, zone, lat, lng)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        guard.id,
        statuses[i],
        locId,
        zones[i],
        loc.lat + (Math.random() - 0.5) * 0.01,
        loc.lng + (Math.random() - 0.5) * 0.01
      );
    });

    // Add sample shift notes
    prepare(`
      INSERT INTO shift_notes (guard_id, location_id, content, note_type)
      VALUES (?, ?, ?, ?)
    `).run(guardIds[0].id, locationIds[0].id, 'Suspicious vehicle in lot C — silver sedan, no plates. Photo taken.', 'incident');

    prepare(`
      INSERT INTO shift_notes (guard_id, location_id, content, note_type)
      VALUES (?, ?, ?, ?)
    `).run(guardIds[3].id, locationIds[2].id, 'Gate 2 lock sticky, maintenance notified.', 'maintenance');

    // Add sample activity log entries
    prepare(`
      INSERT INTO activity_log (guard_id, location_id, action, details)
      VALUES (?, ?, ?, ?)
    `).run(guardIds[3].id, locationIds[2].id, 'checkin', 'Tasha Brown arrived at Sunset Bay');

    prepare(`
      INSERT INTO activity_log (guard_id, action, details)
      VALUES (?, ?, ?)
    `).run(guardIds[2].id, 'break_start', 'Ray Garcia started break');

    prepare(`
      INSERT INTO activity_log (guard_id, location_id, action, details)
      VALUES (?, ?, ?, ?)
    `).run(guardIds[0].id, locationIds[0].id, 'patrol', 'Marcus Thompson completed lobby sweep');

    saveDB();
    console.log('Database initialized with seed data!');
  } else {
    console.log('Database already initialized.');
  }
}

export default seedData;
