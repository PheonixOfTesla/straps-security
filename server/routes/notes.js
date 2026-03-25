import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Get all notes
router.get('/', verifyToken, (req, res) => {
  const { shift_id, guard_id, location_id, limit = 50 } = req.query;

  let query = `
    SELECT
      n.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM shift_notes n
    JOIN users u ON n.guard_id = u.id
    LEFT JOIN locations l ON n.location_id = l.id
  `;

  const conditions = [];
  const params = [];

  if (shift_id) {
    conditions.push('n.shift_id = ?');
    params.push(parseInt(shift_id));
  }

  if (guard_id) {
    conditions.push('n.guard_id = ?');
    params.push(parseInt(guard_id));
  }

  if (location_id) {
    conditions.push('n.location_id = ?');
    params.push(parseInt(location_id));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY n.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const notes = prepare(query).all(...params);
  res.json({ notes });
});

// Get today's notes
router.get('/today', verifyToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const notes = prepare(`
    SELECT
      n.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM shift_notes n
    JOIN users u ON n.guard_id = u.id
    LEFT JOIN locations l ON n.location_id = l.id
    WHERE date(n.created_at) = ?
    ORDER BY n.created_at DESC
  `).all(today);

  res.json({ notes });
});

// Create note
router.post('/', verifyToken, (req, res) => {
  const { content, note_type, shift_id, location_id } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }

  let locId = location_id ? parseInt(location_id) : null;
  if (!locId) {
    const status = prepare('SELECT current_location_id FROM guard_status WHERE guard_id = ?').get(req.user.id);
    locId = status?.current_location_id || null;
  }

  const result = prepare(`
    INSERT INTO shift_notes (shift_id, guard_id, location_id, content, note_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(shift_id ? parseInt(shift_id) : null, req.user.id, locId, content, note_type || 'general');

  const guard = prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  prepare(`
    INSERT INTO activity_log (guard_id, location_id, action, details)
    VALUES (?, ?, 'note', ?)
  `).run(req.user.id, locId, `${guard.name} added a ${note_type || 'general'} note`);

  res.json({ id: result.lastInsertRowid, message: 'Note created' });
});

// Get note by ID
router.get('/:id', verifyToken, (req, res) => {
  const note = prepare(`
    SELECT
      n.*,
      u.name as guard_name, u.initials, u.color,
      l.name as location_name
    FROM shift_notes n
    JOIN users u ON n.guard_id = u.id
    LEFT JOIN locations l ON n.location_id = l.id
    WHERE n.id = ?
  `).get(parseInt(req.params.id));

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  res.json({ note });
});

// Delete note
router.delete('/:id', verifyToken, (req, res) => {
  const note = prepare('SELECT guard_id FROM shift_notes WHERE id = ?').get(parseInt(req.params.id));

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  if (note.guard_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot delete this note' });
  }

  prepare('DELETE FROM shift_notes WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Note deleted' });
});

export default router;
