console.log('=========================================');
console.log('!!! DIAGNOSTIC: SERVER IS STARTING !!!');
console.log('Path:', __filename);
console.log('=========================================');

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// Middleware

// Allow API access from frontend dev hosts.
app.use(cors());

// Log each API request during development.
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('th-TH')}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { getPool } = require('./db');
    const pool = await getPool();
    const result = await pool.request().query('SELECT @@VERSION AS version, GETDATE() AS serverTime');
    res.json({
      ok: true,
      message: 'API is running',
      db: result.recordset[0],
    });
  } catch (err) {
    console.error('[HealthCheck DB Error]:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Network photo bridge
const fs = require('fs');

// Register the Photo Bridge API Route
// Register the Photo Bridge API Route (PS Photo / Cost)
app.get('/api/photos/ps/:itemNo', (req, res) => {
  const itemNo = req.params.itemNo.trim();
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
  const itemNo = req.params.itemNo.trim();
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



// Routes
const authMiddleware = require('./middleware/authMiddleware');

app.use('/api/auth', require('./routes/auth'));                // Login API
app.use('/api/orders', authMiddleware, require('./routes/poTracker'));
app.use('/api/dashboard', authMiddleware, require('./routes/productionDashboard'));
app.use('/api/dashboard', authMiddleware, require('./routes/customerReportMatrix'));
app.use('/api/dashboard', authMiddleware, require('./routes/salesAnalytics'));
app.use('/api/items', authMiddleware, require('./routes/topOrdersGallery'));
app.use('/api/search', authMiddleware, require('./routes/search'));
app.use('/api/procurement', authMiddleware, require('./routes/procurementReceiving'));
app.use('/api/requisition', authMiddleware, require('./routes/orderLinesIssues')); // Requisition routes (SOA, SIA, SIB, SIP, SIS)
app.use('/api/sample', authMiddleware, require('./routes/sampleDepartment'));            // Sample Room routes (SSA, SIM)
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
