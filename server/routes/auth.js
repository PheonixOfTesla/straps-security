import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare } from '../db/database.js';
import { generateToken, verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        initials: user.initials,
        color: user.color,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prepare('SELECT id, username, name, initials, color, role FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Verify token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Get all users (admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await prepare('SELECT id, username, name, initials, color, role, guard_type FROM users ORDER BY name').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create new guard (admin only)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, color, guard_type } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name required' });
    }

    const existing = await prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await prepare('INSERT INTO users (username, password_hash, name, initials, color, role, guard_type) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      username.toLowerCase(), passwordHash, name, initials, color || '#3b82f6', 'guard', guard_type || 'security'
    );

    res.json({ id: result.lastInsertRowid, message: 'Guard created' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create guard' });
  }
});

// Update guard (admin only)
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, color, guard_type, password } = req.body;
    const userId = parseInt(req.params.id);

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      await prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    }

    if (name || color || guard_type) {
      await prepare('UPDATE users SET name = COALESCE(?, name), color = COALESCE(?, color), guard_type = COALESCE(?, guard_type) WHERE id = ?').run(name, color, guard_type, userId);
    }

    res.json({ message: 'Guard updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update guard' });
  }
});

// Delete guard (admin only)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Don't allow deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete all related records first (cascade delete)
    await prepare('DELETE FROM checkins WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM activity_log WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM shift_notes WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM location_history WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM shifts WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM availability WHERE guard_id = ?').run(userId);
    await prepare('DELETE FROM guard_status WHERE guard_id = ?').run(userId);

    // Finally delete the user
    await prepare('DELETE FROM users WHERE id = ? AND role = ?').run(userId, 'guard');
    res.json({ message: 'Guard deleted' });
  } catch (err) {
    console.error('Delete guard error:', err);
    res.status(500).json({ error: 'Failed to delete guard' });
  }
});

export default router;
