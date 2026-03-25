import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Get all notes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { guard_id, limit = 50 } = req.query;

    if (guard_id) {
      const notes = await prepare(`SELECT n.*, u.name as guard_name, u.initials, u.color, l.name as location_name FROM shift_notes n JOIN users u ON n.guard_id = u.id LEFT JOIN locations l ON n.location_id = l.id WHERE n.guard_id = ? ORDER BY n.created_at DESC LIMIT ?`).all(parseInt(guard_id), parseInt(limit));
      return res.json({ notes });
    }

    const notes = await prepare(`SELECT n.*, u.name as guard_name, u.initials, u.color, l.name as location_name FROM shift_notes n JOIN users u ON n.guard_id = u.id LEFT JOIN locations l ON n.location_id = l.id ORDER BY n.created_at DESC LIMIT ?`).all(parseInt(limit));
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// Get today's notes
router.get('/today', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const notes = await prepare(`SELECT n.*, u.name as guard_name, u.initials, u.color, l.name as location_name FROM shift_notes n JOIN users u ON n.guard_id = u.id LEFT JOIN locations l ON n.location_id = l.id WHERE date(n.created_at) = ? ORDER BY n.created_at DESC`).all(today);
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// Create note
router.post('/', verifyToken, async (req, res) => {
  try {
    const { content, note_type, shift_id, location_id } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    let locId = location_id ? parseInt(location_id) : null;
    if (!locId) {
      const status = await prepare('SELECT current_location_id FROM guard_status WHERE guard_id = ?').get(req.user.id);
      locId = status?.current_location_id || null;
    }

    const result = await prepare(`INSERT INTO shift_notes (shift_id, guard_id, location_id, content, note_type) VALUES (?, ?, ?, ?, ?)`).run(shift_id ? parseInt(shift_id) : null, req.user.id, locId, content, note_type || 'general');

    const guard = await prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    await prepare(`INSERT INTO activity_log (guard_id, location_id, action, details) VALUES (?, ?, 'note', ?)`).run(req.user.id, locId, 'note', `${guard.name} added a ${note_type || 'general'} note`);

    res.json({ id: result.lastInsertRowid, message: 'Note created' });
  } catch (err) {
    console.error('Note error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Delete note
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const note = await prepare('SELECT guard_id FROM shift_notes WHERE id = ?').get(parseInt(req.params.id));

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.guard_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete this note' });
    }

    await prepare('DELETE FROM shift_notes WHERE id = ?').run(parseInt(req.params.id));
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
