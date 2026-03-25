import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'straps-security-secret-key-2024';

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireGuard = (req, res, next) => {
  if (req.user.role !== 'guard' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Guard access required' });
  }
  next();
};
