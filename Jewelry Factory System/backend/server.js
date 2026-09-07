console.log('=========================================');
console.log('!!! DIAGNOSTIC: SERVER IS STARTING !!!');
console.log('Path:', __filename);
console.log('=========================================');

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// ─── Security Middleware ───────────────────────────────────────────────────────

// Security headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet());

// CORS — restrict to allowed origins only
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin (for local intranet usage from other IP addresses)
    callback(null, true);
  },
  credentials: true,
}));

// Log each API request during development.
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('th-TH')}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { getPool } = require('./db');
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS serverTime');
    res.json({
      ok: true,
      message: 'API is running',
      serverTime: result.recordset[0].serverTime,
    });
  } catch (err) {
    console.error('[HealthCheck DB Error]:', err.message);
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

// Network photo bridge
const fs = require('fs');

// Helper: validate itemNo to prevent path traversal
function sanitizeItemNo(itemNo) {
  const cleaned = itemNo.trim();
  // Block path traversal characters
  if (/[\/\\:*?"<>|]|\.\./g.test(cleaned) || cleaned.length > 100) {
    return null;
  }
  return cleaned;
}

// Register the Photo Bridge API Route (PS Photo / Cost)
app.get('/api/photos/ps/:itemNo', (req, res) => {
  const itemNo = sanitizeItemNo(req.params.itemNo);
  if (!itemNo) {
    return res.status(400).send('Invalid item number');
  }
  console.log(`[PhotoBridge PS] Serving Item: ${itemNo}`);

  const searchDirs = [
    '\\\\chongdts\\Chong Photo\\Cost'
  ];

  const formats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
  let foundFile = null;

  for (const baseDir of searchDirs) {
    try {
      for (const ext of formats) {
        const testPath = path.join(baseDir, `${itemNo}${ext}`);
        if (fs.existsSync(testPath)) {
          foundFile = testPath;
          break;
        }
      }
    } catch (e) {
      // Access denied or offline share - skip silently
    }
    if (foundFile) break;
  }

  if (foundFile) {
    res.setHeader('X-Source-Origin', 'RealServer-PS');
    return res.sendFile(foundFile);
  }

  res.status(404).send('PS Photo not found');
});

// Register the Photo Bridge API Route (CAD Photo / MoldCAD)
app.get('/api/photos/cad/:itemNo', (req, res) => {
  const itemNo = sanitizeItemNo(req.params.itemNo);
  if (!itemNo) {
    return res.status(400).send('Invalid item number');
  }
  console.log(`[PhotoBridge CAD] Serving Item: ${itemNo}`);

  const searchDirs = [
    '\\\\chongdts\\Chong Photo\\Mold',
    '\\\\chongdts\\Chong Photo\\MoldCAD'
  ];

  const formats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
  let foundFile = null;

  for (const baseDir of searchDirs) {
    try {
      for (const ext of formats) {
        const testPath = path.join(baseDir, `${itemNo}${ext}`);
        if (fs.existsSync(testPath)) {
          foundFile = testPath;
          break;
        }
      }
    } catch (e) {
      // Access denied or offline share - skip silently
    }
    if (foundFile) break;
  }

  if (foundFile) {
    res.setHeader('X-Source-Origin', 'RealServer-CAD');
    return res.sendFile(foundFile);
  }

  res.status(404).send('CAD Photo not found');
});



// ─── Rate Limiting ─────────────────────────────────────────────────────────────

// Strict rate limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // max 15 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,                 // max 200 requests per minute
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
const { authMiddleware, requireRole } = require('./middleware/authMiddleware');

app.use('/api/auth', authLimiter, require('./routes/auth'));   // Login API (rate limited)
app.use('/api/orders', authMiddleware, require('./routes/poTracker'));
app.use('/api/dashboard', authMiddleware, require('./routes/productionDashboard'));
app.use('/api/dashboard', authMiddleware, require('./routes/customerReportMatrix'));
app.use('/api/dashboard', authMiddleware, require('./routes/orderVolumeSummary'));
app.use('/api/production-summary', authMiddleware, require('./routes/productionSummary'));
app.use('/api/production-forecast', authMiddleware, require('./routes/productionForecast'));
app.use('/api/order-tracking', authMiddleware, requireRole('admin', 'sales'), require('./routes/orderTracking')); // 👈 ป้องกันสิทธิ์ตรงนี้
app.use('/api/items', authMiddleware, require('./routes/topOrdersGallery'));
app.use('/api/search', authMiddleware, require('./routes/search'));
app.use('/api/procurement', authMiddleware, requireRole('admin'), require('./routes/procurementReceiving'));
app.use('/api/requisition', authMiddleware, requireRole('admin'), require('./routes/orderLinesIssues')); // Requisition routes (SOA, SIA, SIB, SIP, SIS)
app.use('/api/sample', authMiddleware, requireRole('admin'), require('./routes/sampleDepartment'));            // Sample Room routes (SSA, SIM)
app.use('/api/lock', authMiddleware, require('./routes/lock'));                // Document locking

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.stack);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});