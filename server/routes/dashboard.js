import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats
router.get('/stats', verifyToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Count guards by status
  const statusCounts = prepare(`
    SELECT status, COUNT(*) as count
    FROM guard_status
    GROUP BY status
  `).all();

  const stats = { active: 0, break: 0, offline: 0 };
  statusCounts.forEach(row => {
    stats[row.status] = row.count;
  });

  // Count locations covered
  const locationsCovered = prepare(`
    SELECT COUNT(DISTINCT current_location_id) as count
    FROM guard_status
    WHERE status IN ('active', 'break') AND current_location_id IS NOT NULL
  `).get();

  // Calculate total hours logged today
  const checkins = prepare(`
    SELECT guard_id, type, timestamp
    FROM checkins
    WHERE date(timestamp) = ?
    ORDER BY guard_id, timestamp
  `).all(today);

  let totalMinutes = 0;
  const guardSessions = {};

  for (const record of checkins) {
    if (!guardSessions[record.guard_id]) {
      guardSessions[record.guard_id] = [];
    }
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

    if (lastCheckin) {
      totalMinutes += (new Date() - lastCheckin) / (1000 * 60);
    }
  }

  const hoursLogged = Math.round(totalMinutes / 60 * 10) / 10;

  res.json({
    onDuty: stats.active,
    onBreak: stats.break,
    offline: stats.offline,
    locationsCovered: locationsCovered.count,
    hoursLogged,
  });
});

// Get activity log
router.get('/activity', verifyToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const activities = prepare(`
    SELECT
      a.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM activity_log a
    LEFT JOIN users u ON a.guard_id = u.id
    LEFT JOIN locations l ON a.location_id = l.id
    ORDER BY a.timestamp DESC
    LIMIT ?
  `).all(limit);

  res.json({ activities });
});

// Get today's activity
router.get('/activity/today', verifyToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const activities = prepare(`
    SELECT
      a.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM activity_log a
    LEFT JOIN users u ON a.guard_id = u.id
    LEFT JOIN locations l ON a.location_id = l.id
    WHERE date(a.timestamp) = ?
    ORDER BY a.timestamp DESC
  `).all(today);

  res.json({ activities });
});

// Get all active guards with locations (for map)
router.get('/map', verifyToken, (req, res) => {
  const guards = prepare(`
    SELECT
      u.id, u.name, u.initials, u.color,
      gs.status, gs.zone, gs.lat, gs.lng, gs.last_updated,
      l.name as location_name
    FROM users u
    JOIN guard_status gs ON u.id = gs.guard_id
    LEFT JOIN locations l ON gs.current_location_id = l.id
    WHERE gs.status IN ('active', 'break')
  `).all();

  const locations = prepare('SELECT * FROM locations').all();

  res.json({ guards, locations });
});

export default router;
