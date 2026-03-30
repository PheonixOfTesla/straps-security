import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Get all guards with status
router.get('/', verifyToken, async (req, res) => {
  try {
    const guards = await prepare(`
      SELECT u.id, u.username, u.name, u.initials, u.color,
        gs.status, gs.zone, gs.lat, gs.lng, gs.last_updated,
        l.id as location_id, l.name as location_name
      FROM users u
      LEFT JOIN guard_status gs ON u.id = gs.guard_id
      LEFT JOIN locations l ON gs.current_location_id = l.id
      WHERE u.role = 'guard'
      ORDER BY u.name
    `).all();
    res.json({ guards });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get guards' });
  }
});

// Get single guard
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const guard = await prepare(`
      SELECT u.id, u.username, u.name, u.initials, u.color,
        gs.status, gs.zone, gs.lat, gs.lng, gs.last_updated,
        l.id as location_id, l.name as location_name
      FROM users u
      LEFT JOIN guard_status gs ON u.id = gs.guard_id
      LEFT JOIN locations l ON gs.current_location_id = l.id
      WHERE u.id = ? AND u.role = 'guard'
    `).get(parseInt(req.params.id));

    if (!guard) {
      return res.status(404).json({ error: 'Guard not found' });
    }
    res.json({ guard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get guard' });
  }
});

// Update guard location (GPS tracking)
router.post('/location', verifyToken, async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    const guardId = req.user.id;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    await prepare(`UPDATE guard_status SET lat = ?, lng = ?, last_updated = datetime('now') WHERE guard_id = ?`).run(lat, lng, guardId);
    await prepare(`INSERT INTO location_history (guard_id, lat, lng, accuracy) VALUES (?, ?, ?, ?)`).run(guardId, lat, lng, accuracy || null);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Check in
router.post('/checkin', verifyToken, async (req, res) => {
  try {
    const { location_id, zone, lat, lng } = req.body;
    const guardId = req.user.id;

    if (!location_id) {
      return res.status(400).json({ error: 'Location required' });
    }

    const location = await prepare('SELECT * FROM locations WHERE id = ?').get(parseInt(location_id));
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await prepare(`INSERT INTO checkins (guard_id, location_id, type, lat, lng) VALUES (?, ?, 'checkin', ?, ?)`).run(guardId, location_id, lat || location.lat, lng || location.lng);

    const existing = await prepare('SELECT id FROM guard_status WHERE guard_id = ?').get(guardId);

    if (existing) {
      await prepare(`UPDATE guard_status SET status = 'active', current_location_id = ?, zone = ?, lat = ?, lng = ?, last_updated = datetime('now') WHERE guard_id = ?`).run(location_id, zone || null, lat || location.lat, lng || location.lng, guardId);
    } else {
      await prepare(`INSERT INTO guard_status (guard_id, status, current_location_id, zone, lat, lng) VALUES (?, 'active', ?, ?, ?, ?)`).run(guardId, location_id, zone || null, lat || location.lat, lng || location.lng);
    }

    const guard = await prepare('SELECT name FROM users WHERE id = ?').get(guardId);
    await prepare(`INSERT INTO activity_log (guard_id, location_id, action, details) VALUES (?, ?, ?, ?)`).run(guardId, location_id, 'checkin', `${guard.name} checked in at ${location.name}${zone ? ' - ' + zone : ''}`);

    res.json({ success: true, message: 'Checked in successfully' });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// Check out
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const guardId = req.user.id;

    const status = await prepare('SELECT * FROM guard_status WHERE guard_id = ?').get(guardId);

    if (!status || status.status === 'offline') {
      return res.status(400).json({ error: 'Not currently checked in' });
    }

    await prepare(`INSERT INTO checkins (guard_id, location_id, type, lat, lng) VALUES (?, ?, 'checkout', ?, ?)`).run(guardId, status.current_location_id, lat || status.lat, lng || status.lng);
    await prepare(`UPDATE guard_status SET status = 'offline', last_updated = datetime('now') WHERE guard_id = ?`).run(guardId);

    const guard = await prepare('SELECT name FROM users WHERE id = ?').get(guardId);
    const location = await prepare('SELECT name FROM locations WHERE id = ?').get(status.current_location_id);
    await prepare(`INSERT INTO activity_log (guard_id, location_id, action, details) VALUES (?, ?, ?, ?)`).run(guardId, status.current_location_id, 'checkout', `${guard.name} checked out from ${location?.name || 'location'}`);

    res.json({ success: true, message: 'Checked out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Check-out failed' });
  }
});

// Start break
router.post('/break/start', verifyToken, async (req, res) => {
  try {
    const guardId = req.user.id;
    await prepare(`UPDATE guard_status SET status = 'break', last_updated = datetime('now') WHERE guard_id = ?`).run(guardId);

    const guard = await prepare('SELECT name FROM users WHERE id = ?').get(guardId);
    await prepare(`INSERT INTO activity_log (guard_id, location_id, action, details) VALUES (?, ?, ?, ?)`).run(guardId, null, 'break_start', `${guard.name} started break`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start break' });
  }
});

// End break
router.post('/break/end', verifyToken, async (req, res) => {
  try {
    const guardId = req.user.id;
    await prepare(`UPDATE guard_status SET status = 'active', last_updated = datetime('now') WHERE guard_id = ?`).run(guardId);

    const guard = await prepare('SELECT name FROM users WHERE id = ?').get(guardId);
    await prepare(`INSERT INTO activity_log (guard_id, location_id, action, details) VALUES (?, ?, ?, ?)`).run(guardId, null, 'break_end', `${guard.name} ended break`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end break' });
  }
});

// Get hours worked today
router.get('/:id/hours', verifyToken, async (req, res) => {
  try {
    const guardId = parseInt(req.params.id);
    const today = new Date().toISOString().split('T')[0];

    const checkins = await prepare(`SELECT * FROM checkins WHERE guard_id = ? AND date(timestamp) = ? ORDER BY timestamp`).all(guardId, today);

    let totalMinutes = 0;
    let lastCheckin = null;

    for (const record of checkins) {
      if (record.type === 'checkin') {
        lastCheckin = new Date(record.timestamp);
      } else if (record.type === 'checkout' && lastCheckin) {
        totalMinutes += (new Date(record.timestamp) - lastCheckin) / (1000 * 60);
        lastCheckin = null;
      }
    }

    if (lastCheckin) {
      totalMinutes += (new Date() - lastCheckin) / (1000 * 60);
    }

    const hours = Math.round(totalMinutes / 60 * 10) / 10;
    res.json({ guard_id: guardId, hours, date: today });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get hours' });
  }
});

export default router;
