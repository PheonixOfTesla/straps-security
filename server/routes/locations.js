import { Router } from 'express';
import { prepare } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all locations
router.get('/', verifyToken, async (req, res) => {
  try {
    const locations = await prepare('SELECT * FROM locations ORDER BY name').all();
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get single location
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const location = await prepare('SELECT * FROM locations WHERE id = ?').get(parseInt(req.params.id));
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ location });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Create location
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, address, lat, lng } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    const result = await prepare(`INSERT INTO locations (name, address, lat, lng) VALUES (?, ?, ?, ?)`).run(name, address || null, lat || null, lng || null);
    res.json({ id: result.lastInsertRowid, message: 'Location created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Delete location
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await prepare('DELETE FROM locations WHERE id = ?').run(parseInt(req.params.id));
    res.json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
