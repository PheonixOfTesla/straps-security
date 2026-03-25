import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get availability
router.get('/', verifyToken, (req, res) => {
  const { guard_id, date, start_date, end_date } = req.query;

  let query = `
    SELECT a.*, u.name as guard_name, u.initials
    FROM availability a
    JOIN users u ON a.guard_id = u.id
  `;

  const conditions = [];
  const params = [];

  if (guard_id) {
    conditions.push('a.guard_id = ?');
    params.push(parseInt(guard_id));
  }

  if (date) {
    conditions.push('a.date = ?');
    params.push(date);
  }

  if (start_date && end_date) {
    conditions.push('a.date BETWEEN ? AND ?');
    params.push(start_date, end_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.date, a.start_time';

  const availability = prepare(query).all(...params);
  res.json({ availability });
});

// Get my availability
router.get('/my', verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;

  let query = 'SELECT * FROM availability WHERE guard_id = ?';
  const params = [req.user.id];

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY date, start_time';

  const availability = prepare(query).all(...params);
  res.json({ availability });
});

// Set availability
router.post('/', verifyToken, (req, res) => {
  const { date, start_time, end_time, available } = req.body;
  const guardId = req.user.role === 'guard' ? req.user.id : (req.body.guard_id ? parseInt(req.body.guard_id) : req.user.id);

  if (!date) {
    return res.status(400).json({ error: 'Date required' });
  }

  const existing = prepare('SELECT id FROM availability WHERE guard_id = ? AND date = ?').get(guardId, date);

  if (existing) {
    prepare(`
      UPDATE availability
      SET start_time = ?, end_time = ?, available = ?
      WHERE id = ?
    `).run(start_time || null, end_time || null, available !== false ? 1 : 0, existing.id);
  } else {
    prepare(`
      INSERT INTO availability (guard_id, date, start_time, end_time, available)
      VALUES (?, ?, ?, ?, ?)
    `).run(guardId, date, start_time || null, end_time || null, available !== false ? 1 : 0);
  }

  res.json({ message: 'Availability updated' });
});

// Delete availability
router.delete('/:id', verifyToken, (req, res) => {
  const avail = prepare('SELECT guard_id FROM availability WHERE id = ?').get(parseInt(req.params.id));

  if (!avail) {
    return res.status(404).json({ error: 'Availability not found' });
  }

  if (avail.guard_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot delete this availability' });
  }

  prepare('DELETE FROM availability WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Availability deleted' });
});

export default router;
