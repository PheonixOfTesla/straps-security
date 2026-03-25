import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all shifts
router.get('/', verifyToken, (req, res) => {
  const { date, guard_id } = req.query;

  let query = `
    SELECT
      s.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM shifts s
    JOIN users u ON s.guard_id = u.id
    JOIN locations l ON s.location_id = l.id
  `;

  const conditions = [];
  const params = [];

  if (date) {
    conditions.push('date(s.start_time) = ?');
    params.push(date);
  }

  if (guard_id) {
    conditions.push('s.guard_id = ?');
    params.push(parseInt(guard_id));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.start_time';

  const shifts = prepare(query).all(...params);
  res.json({ shifts });
});

// Get shift by ID
router.get('/:id', verifyToken, (req, res) => {
  const shift = prepare(`
    SELECT
      s.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM shifts s
    JOIN users u ON s.guard_id = u.id
    JOIN locations l ON s.location_id = l.id
    WHERE s.id = ?
  `).get(parseInt(req.params.id));

  if (!shift) {
    return res.status(404).json({ error: 'Shift not found' });
  }

  res.json({ shift });
});

// Create shift (admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { guard_id, location_id, start_time, end_time, zone } = req.body;

  if (!guard_id || !location_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Guard, location, start time, and end time required' });
  }

  const result = prepare(`
    INSERT INTO shifts (guard_id, location_id, start_time, end_time, zone, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guard_id, location_id, start_time, end_time, zone || null, req.user.id);

  res.json({ id: result.lastInsertRowid, message: 'Shift created' });
});

// Update shift (admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { guard_id, location_id, start_time, end_time, zone } = req.body;

  prepare(`
    UPDATE shifts
    SET guard_id = ?, location_id = ?, start_time = ?, end_time = ?, zone = ?
    WHERE id = ?
  `).run(guard_id, location_id, start_time, end_time, zone, parseInt(req.params.id));

  res.json({ message: 'Shift updated' });
});

// Delete shift (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  prepare('DELETE FROM shifts WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Shift deleted' });
});

// Get my current shift (for guards)
router.get('/my/current', verifyToken, (req, res) => {
  const now = new Date().toISOString();

  const shift = prepare(`
    SELECT
      s.*,
      l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN locations l ON s.location_id = l.id
    WHERE s.guard_id = ?
      AND s.start_time <= ?
      AND s.end_time >= ?
    ORDER BY s.start_time
    LIMIT 1
  `).get(req.user.id, now, now);

  res.json({ shift: shift || null });
});

// Get my upcoming shifts (for guards)
router.get('/my/upcoming', verifyToken, (req, res) => {
  const now = new Date().toISOString();

  const shifts = prepare(`
    SELECT
      s.*,
      l.name as location_name, l.address as location_address
    FROM shifts s
    JOIN locations l ON s.location_id = l.id
    WHERE s.guard_id = ? AND s.start_time > ?
    ORDER BY s.start_time
    LIMIT 10
  `).all(req.user.id, now);

  res.json({ shifts });
});

export default router;
