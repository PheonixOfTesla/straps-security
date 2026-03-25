import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare } from '../db/database.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());

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
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  const user = prepare('SELECT id, username, name, initials, color, role FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// Verify token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;
