import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const statusCounts = await prepare(`SELECT status, COUNT(*) as count FROM guard_status GROUP BY status`).all();
    const stats = { active: 0, break: 0, offline: 0 };
    statusCounts.forEach(row => { stats[row.status] = row.count; });

    const locationsCovered = await prepare(`SELECT COUNT(DISTINCT current_location_id) as count FROM guard_status WHERE status IN ('active', 'break') AND current_location_id IS NOT NULL`).get();

    const checkins = await prepare(`SELECT guard_id, type, timestamp FROM checkins WHERE date(timestamp) = ? ORDER BY guard_id, timestamp`).all(today);

    let totalMinutes = 0;
    const guardSessions = {};
    for (const record of checkins) {
      if (!guardSessions[record.guard_id]) guardSessions[record.guard_id] = [];
      guardSessions[record.guard_id].push(record);
    }

    for (const guardId in guardSessions) {
      const records = guardSessions[guardId];
      let lastCheckin = null;
      for (const record of records) {
        if (record.type === 'checkin') {
          lastCheckin = new Date(record.timestamp);
        } else if (record.type === 'checkout' && lastCheckin) {
          totalMinutes += (new Date(record.timestamp) - lastCheckin) / (1000 * 60);
          lastCheckin = null;
        }
      }
      if (lastCheckin) totalMinutes += (new Date() - lastCheckin) / (1000 * 60);
    }

    res.json({
      onDuty: stats.active,
      onBreak: stats.break,
      offline: stats.offline,
      locationsCovered: locationsCovered?.count || 0,
      hoursLogged: Math.round(totalMinutes / 60 * 10) / 10,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get activity log
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await prepare(`SELECT a.*, u.name as guard_name, u.initials, u.color, l.name as location_name FROM activity_log a LEFT JOIN users u ON a.guard_id = u.id LEFT JOIN locations l ON a.location_id = l.id ORDER BY a.timestamp DESC LIMIT ?`).all(limit);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Get today's activity
router.get('/activity/today', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const activities = await prepare(`SELECT a.*, u.name as guard_name, u.initials, u.color, l.name as location_name FROM activity_log a LEFT JOIN users u ON a.guard_id = u.id LEFT JOIN locations l ON a.location_id = l.id WHERE date(a.timestamp) = ? ORDER BY a.timestamp DESC`).all(today);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Get map data
router.get('/map', verifyToken, async (req, res) => {
  try {
    const guards = await prepare(`SELECT u.id, u.name, u.initials, u.color, gs.status, gs.zone, gs.lat, gs.lng, gs.last_updated, l.name as location_name FROM users u JOIN guard_status gs ON u.id = gs.guard_id LEFT JOIN locations l ON gs.current_location_id = l.id WHERE gs.status IN ('active', 'break')`).all();
    const locations = await prepare('SELECT * FROM locations ORDER BY name').all();
    res.json({ guards, locations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get map data' });
  }
});

// Get checkins for export
router.get('/checkins', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const checkins = await prepare(`SELECT c.*, u.name as guard_name, l.name as location_name FROM checkins c LEFT JOIN users u ON c.guard_id = u.id LEFT JOIN locations l ON c.location_id = l.id ORDER BY c.timestamp DESC LIMIT ?`).all(limit);
    res.json({ checkins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get checkins' });
  }
});

export default router;
