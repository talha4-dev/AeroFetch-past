require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./models');

if (process.env.USE_MOCK_REDIS === 'true') {
  console.log('🔄 Running in MOCK MODE - No Redis server required');
}

if (process.env.USE_SIMULATION === 'true') {
  console.log('🎭 Running in SIMULATION MODE - Mock responses enabled');
}

const app = express();
const PORT = process.env.PORT || 10000;

app.use(morgan('dev'));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', 
  credentials: true
}));

app.use(express.json());

// Automated Cleanup System (Temporary File Management)
const tempDir = path.join(process.platform === 'win32' ? __dirname : '/tmp', 'aerofetch_downloads');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

setInterval(() => {
  fs.readdir(tempDir, (err, files) => {
    if (err) return console.error('Cleanup read error:', err);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && (Date.now() - stats.mtimeMs > 3600000)) { // 1 Hour
          fs.unlink(filePath, () => console.log(`Cleaned up expired file: ${file}`));
        }
      });
    });
  });
}, 300000); // 5 minutes

// Routes
const authRoutes = require('./routes/auth.route').router;
const downloadRoutes = require('./routes/download.route');

app.use('/api/auth', authRoutes);
app.use('/api/download', downloadRoutes);

// Unified History & Batch (Inline for Phase 1 MVP mapping or direct routing)
app.get('/api/history', require('./routes/auth.route').authenticateJWT, async (req, res) => {
  const { DownloadHistory } = require('./models');
  try {
    const history = await DownloadHistory.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, history: history.map(h => h.toJSON()) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

app.post('/api/batch', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) return res.status(400).json({ success: false, error: 'Array of urls required' });
    
    // Simulating batch scheduling response as requested
    const { v4: uuidv4 } = require('uuid');
    res.json({
      success: true,
      batch_id: uuidv4(),
      status: "processing"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Batch error' });
  }
});

// In production, serve frontend static files from the same server
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));

  // Catch-all: serve index.html for any non-API route (React Router support)
  app.get('{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
  console.log('📦 Serving frontend static files from:', frontendDist);
}

// Database Sync and Server start
sequelize.sync().then(() => {
  console.log('✅ SQLite/MySQL Database connected and synced');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AeroFetch Node.js Backend strictly running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Database Sync Error:', err);
});
