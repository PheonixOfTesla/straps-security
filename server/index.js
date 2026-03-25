import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import guardsRoutes from './routes/guards.js';
import locationsRoutes from './routes/locations.js';
import shiftsRoutes from './routes/shifts.js';
import notesRoutes from './routes/notes.js';
import availabilityRoutes from './routes/availability.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guards', guardsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(join(__dirname, '../client')));

// Clean URLs
app.get('/dashboard', (req, res) => {
  res.sendFile(join(__dirname, '../client/dashboard.html'));
});

app.get('/guard', (req, res) => {
  res.sendFile(join(__dirname, '../client/guard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../client/index.html'));
});

// Initialize and start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Straps Security Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  // Start anyway for serverless
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
