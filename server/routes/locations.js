import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all locations
router.get('/', verifyToken, (req, res) => {
  const locations = prepare('SELECT * FROM locations ORDER BY name').all();
  res.json({ locations });
});

// Get single location
router.get('/:id', verifyToken, (req, res) => {
  const location = prepare('SELECT * FROM locations WHERE id = ?').get(parseInt(req.params.id));

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  res.json({ location });
});

// Create location (admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, address, lat, lng } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  const result = prepare(`
    INSERT INTO locations (name, address, lat, lng)
    VALUES (?, ?, ?, ?)
  `).run(name, address || null, lat || null, lng || null);

  res.json({ id: result.lastInsertRowid, message: 'Location created' });
});

// Update location (admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { name, address, lat, lng } = req.body;

  prepare(`
    UPDATE locations SET name = ?, address = ?, lat = ?, lng = ?
    WHERE id = ?
  `).run(name, address, lat, lng, parseInt(req.params.id));

  res.json({ message: 'Location updated' });
});

// Delete location (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  prepare('DELETE FROM locations WHERE id = ?').run(parseInt(req.params.id));
  res.json({ message: 'Location deleted' });
});

// Get guards at location
router.get('/:id/guards', verifyToken, (req, res) => {
  const guards = prepare(`
    SELECT u.id, u.name, u.initials, u.color, gs.status, gs.zone, gs.lat, gs.lng
    FROM users u
    JOIN guard_status gs ON u.id = gs.guard_id
    WHERE gs.current_location_id = ? AND gs.status != 'offline'
  `).all(parseInt(req.params.id));

  res.json({ guards });
});

export default router;
