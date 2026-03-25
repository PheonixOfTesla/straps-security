// Simple in-memory database for Vercel serverless
import bcrypt from 'bcryptjs';

// In-memory data store
const data = {
  users: [],
  locations: [],
  guard_status: [],
  checkins: [],
  shifts: [],
  availability: [],
  shift_notes: [],
  activity_log: [],
  location_history: []
};

let initialized = false;

function initDB() {
  if (initialized) return;

  // Seed admin
  const adminHash = bcrypt.hashSync('straps2024', 10);
  data.users.push({
    id: 1, username: 'charles', password_hash: adminHash,
    name: 'Charles Admin', initials: 'CA', color: '#e8b84b', role: 'admin'
  });

  // Seed guards
  const guardHash = bcrypt.hashSync('guard123', 10);
  const guards = [
    { id: 2, username: 'marcus', name: 'Marcus Thompson', initials: 'MT', color: '#3b82f6' },
    { id: 3, username: 'deja', name: 'Deja Williams', initials: 'DW', color: '#22c55e' },
    { id: 4, username: 'ray', name: 'Ray Garcia', initials: 'RG', color: '#f97316' },
    { id: 5, username: 'tasha', name: 'Tasha Brown', initials: 'TB', color: '#a855f7' },
    { id: 6, username: 'luis', name: 'Luis Martinez', initials: 'LM', color: '#06b6d4' },
  ];
  guards.forEach(g => {
    data.users.push({ ...g, password_hash: guardHash, role: 'guard' });
  });

  // Seed locations
  data.locations.push(
    { id: 1, name: 'Ocean Palm Resort', address: '123 Beach Blvd', lat: 25.7617, lng: -80.1918 },
    { id: 2, name: 'Sandbar Plaza', address: '456 Marina Way', lat: 25.7650, lng: -80.1850 },
    { id: 3, name: 'Sunset Bay', address: '789 Harbor Dr', lat: 25.7580, lng: -80.1980 }
  );

  // Seed guard statuses
  const statuses = ['active', 'active', 'break', 'active', 'active'];
  const zones = ['Lobby', 'Poolside', 'Entrance', 'Perimeter', 'Parking'];
  guards.forEach((g, i) => {
    const loc = data.locations[i % 3];
    data.guard_status.push({
      id: i + 1,
      guard_id: g.id,
      status: statuses[i],
      current_location_id: loc.id,
      zone: zones[i],
      lat: loc.lat + (Math.random() - 0.5) * 0.01,
      lng: loc.lng + (Math.random() - 0.5) * 0.01,
      last_updated: new Date().toISOString()
    });
  });

  // Seed notes
  data.shift_notes.push(
    { id: 1, guard_id: 2, location_id: 1, content: 'Suspicious vehicle in lot C — silver sedan, no plates. Photo taken.', note_type: 'incident', created_at: new Date().toISOString() },
    { id: 2, guard_id: 5, location_id: 3, content: 'Gate 2 lock sticky, maintenance notified.', note_type: 'maintenance', created_at: new Date().toISOString() }
  );

  // Seed activity
  data.activity_log.push(
    { id: 1, guard_id: 5, location_id: 3, action: 'checkin', details: 'Tasha Brown arrived at Sunset Bay', timestamp: new Date().toISOString() },
    { id: 2, guard_id: 4, action: 'break_start', details: 'Ray Garcia started break', timestamp: new Date().toISOString() },
    { id: 3, guard_id: 2, location_id: 1, action: 'patrol', details: 'Marcus Thompson completed lobby sweep', timestamp: new Date().toISOString() }
  );

  initialized = true;
  console.log('Database initialized with seed data!');
}

// Helper to get next ID
function nextId(table) {
  const items = data[table];
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// Query helpers
function prepare(sql) {
  return {
    run: (...params) => {
      // Parse simple INSERT/UPDATE/DELETE
      const result = { lastInsertRowid: 0 };

      if (sql.includes('INSERT INTO users')) {
        const id = nextId('users');
        data.users.push({ id, username: params[0], password_hash: params[1], name: params[2], initials: params[3], color: params[4], role: params[5] || 'guard' });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO checkins')) {
        const id = nextId('checkins');
        data.checkins.push({ id, guard_id: params[0], location_id: params[1], type: params[2] || 'checkin', lat: params[3], lng: params[4], timestamp: new Date().toISOString() });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO guard_status')) {
        const id = nextId('guard_status');
        data.guard_status.push({ id, guard_id: params[0], status: params[1] || 'active', current_location_id: params[2], zone: params[3], lat: params[4], lng: params[5], last_updated: new Date().toISOString() });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO activity_log')) {
        const id = nextId('activity_log');
        data.activity_log.push({ id, guard_id: params[0], location_id: params[1], action: params[2], details: params[3], timestamp: new Date().toISOString() });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO shift_notes')) {
        const id = nextId('shift_notes');
        data.shift_notes.push({ id, shift_id: params[0], guard_id: params[1], location_id: params[2], content: params[3], note_type: params[4] || 'general', created_at: new Date().toISOString() });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO location_history')) {
        const id = nextId('location_history');
        data.location_history.push({ id, guard_id: params[0], lat: params[1], lng: params[2], accuracy: params[3], timestamp: new Date().toISOString() });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO locations')) {
        const id = nextId('locations');
        data.locations.push({ id, name: params[0], address: params[1], lat: params[2], lng: params[3] });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO shifts')) {
        const id = nextId('shifts');
        data.shifts.push({ id, guard_id: params[0], location_id: params[1], start_time: params[2], end_time: params[3], zone: params[4], created_by: params[5] });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('INSERT INTO availability')) {
        const id = nextId('availability');
        data.availability.push({ id, guard_id: params[0], date: params[1], start_time: params[2], end_time: params[3], available: params[4] });
        result.lastInsertRowid = id;
      }
      else if (sql.includes('UPDATE guard_status')) {
        const guardId = params[params.length - 1];
        const gs = data.guard_status.find(s => s.guard_id === guardId);
        if (gs) {
          if (sql.includes('status = ?, current_location_id')) {
            gs.status = params[0]; gs.current_location_id = params[1]; gs.zone = params[2]; gs.lat = params[3]; gs.lng = params[4];
          } else if (sql.includes('status =')) {
            gs.status = params[0];
          } else if (sql.includes('lat = ?, lng = ?')) {
            gs.lat = params[0]; gs.lng = params[1];
          }
          gs.last_updated = new Date().toISOString();
        }
      }
      else if (sql.includes('DELETE FROM')) {
        const table = sql.match(/DELETE FROM (\w+)/)[1];
        const idx = data[table]?.findIndex(i => i.id === params[0]);
        if (idx > -1) data[table].splice(idx, 1);
      }

      return result;
    },
    get: (...params) => {
      initDB();

      if (sql.includes('FROM users WHERE username')) {
        return data.users.find(u => u.username === params[0]);
      }
      if (sql.includes('FROM users WHERE id')) {
        return data.users.find(u => u.id === params[0]);
      }
      if (sql.includes('FROM guard_status WHERE guard_id')) {
        return data.guard_status.find(s => s.guard_id === params[0]);
      }
      if (sql.includes('FROM locations WHERE id')) {
        return data.locations.find(l => l.id === params[0]);
      }
      if (sql.includes('FROM availability WHERE guard_id') && sql.includes('AND date')) {
        return data.availability.find(a => a.guard_id === params[0] && a.date === params[1]);
      }
      if (sql.includes('FROM shift_notes WHERE id')) {
        return data.shift_notes.find(n => n.id === params[0]);
      }
      if (sql.includes('COUNT(DISTINCT current_location_id)')) {
        const locs = new Set(data.guard_status.filter(s => s.status !== 'offline' && s.current_location_id).map(s => s.current_location_id));
        return { count: locs.size };
      }

      // Complex guard query
      if (sql.includes('FROM users u') && sql.includes('LEFT JOIN guard_status') && sql.includes('WHERE u.id')) {
        const guard = data.users.find(u => u.id === params[0] && u.role === 'guard');
        if (!guard) return undefined;
        const status = data.guard_status.find(s => s.guard_id === guard.id);
        const loc = status ? data.locations.find(l => l.id === status.current_location_id) : null;
        return { ...guard, ...(status || {}), location_id: loc?.id, location_name: loc?.name };
      }

      return undefined;
    },
    all: (...params) => {
      initDB();

      if (sql.includes('FROM users') && sql.includes("role = 'guard'")) {
        return data.users.filter(u => u.role === 'guard').map(guard => {
          const status = data.guard_status.find(s => s.guard_id === guard.id);
          const loc = status ? data.locations.find(l => l.id === status.current_location_id) : null;
          return { ...guard, ...(status || {}), location_id: loc?.id, location_name: loc?.name };
        });
      }
      if (sql.includes('FROM locations ORDER')) {
        return data.locations;
      }
      if (sql.includes('FROM guard_status') && sql.includes('GROUP BY status')) {
        const counts = {};
        data.guard_status.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
        return Object.entries(counts).map(([status, count]) => ({ status, count }));
      }
      if (sql.includes('FROM checkins') && sql.includes('guard_id = ?')) {
        return data.checkins.filter(c => c.guard_id === params[0] && c.timestamp?.startsWith(params[1]));
      }
      if (sql.includes('FROM activity_log') && sql.includes('date(a.timestamp)')) {
        const today = params[0];
        return data.activity_log.filter(a => a.timestamp?.startsWith(today)).map(a => {
          const guard = data.users.find(u => u.id === a.guard_id);
          const loc = data.locations.find(l => l.id === a.location_id);
          return { ...a, guard_name: guard?.name, initials: guard?.initials, color: guard?.color, location_name: loc?.name };
        }).reverse();
      }
      if (sql.includes('FROM activity_log') && sql.includes('LIMIT')) {
        return data.activity_log.slice(-params[0]).reverse().map(a => {
          const guard = data.users.find(u => u.id === a.guard_id);
          const loc = data.locations.find(l => l.id === a.location_id);
          return { ...a, guard_name: guard?.name, initials: guard?.initials, color: guard?.color, location_name: loc?.name };
        });
      }
      if (sql.includes('FROM shift_notes') && sql.includes('date(n.created_at)')) {
        const today = params[0];
        return data.shift_notes.filter(n => n.created_at?.startsWith(today)).map(n => {
          const guard = data.users.find(u => u.id === n.guard_id);
          const loc = data.locations.find(l => l.id === n.location_id);
          return { ...n, guard_name: guard?.name, initials: guard?.initials, color: guard?.color, location_name: loc?.name };
        }).reverse();
      }
      if (sql.includes('FROM shift_notes') && sql.includes('guard_id = ?')) {
        return data.shift_notes.filter(n => n.guard_id === params[0]).slice(0, params[1] || 50).map(n => {
          const guard = data.users.find(u => u.id === n.guard_id);
          const loc = data.locations.find(l => l.id === n.location_id);
          return { ...n, guard_name: guard?.name, initials: guard?.initials, color: guard?.color, location_name: loc?.name };
        }).reverse();
      }
      if (sql.includes("status IN ('active', 'break')")) {
        return data.guard_status.filter(s => s.status === 'active' || s.status === 'break').map(s => {
          const guard = data.users.find(u => u.id === s.guard_id);
          const loc = data.locations.find(l => l.id === s.current_location_id);
          return { ...guard, ...s, location_name: loc?.name };
        });
      }
      if (sql.includes('FROM shifts')) {
        return data.shifts.map(s => {
          const guard = data.users.find(u => u.id === s.guard_id);
          const loc = data.locations.find(l => l.id === s.location_id);
          return { ...s, guard_name: guard?.name, initials: guard?.initials, color: guard?.color, location_name: loc?.name };
        });
      }

      return [];
    }
  };
}

export { initDB, prepare };
export default { initDB, prepare };
