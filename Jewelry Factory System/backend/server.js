console.log('=========================================');
console.log('!!! DIAGNOSTIC: SERVER IS STARTING !!!');
console.log('Path:', __filename);
console.log('=========================================');

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

// ⭐ 1. ปรับ CORS เป็นรับทุกโดเมน (ชั่วคราวเพื่อตัดปัญหา Port Frontend ไม่ตรง)
// หากทดสอบผ่านแล้ว ค่อยเอากลับไปเป็น Array แบบเดิมก็ได้ครับ
app.use(cors());

// ⭐ 2. เพิ่ม Request Logger เพื่อให้ Terminal แสดงผลทุกครั้งที่มีคนเรียก API
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('th-TH')}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
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
    console.error('❌ [HealthCheck DB Error]:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Network Photo Bridge Demo & Initialize ───────────────────────────────────
const fs = require('fs');
const path = require('path');

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

// Original legacy endpoint for backwards compatibility
app.get('/api/photos/:itemNo', (req, res) => {
  const itemNo = req.params.itemNo.trim();
  console.log(`[PhotoBridge Legacy] Serving Item: ${itemNo}`);

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
    res.setHeader('X-Source-Origin', 'RealServer');
    return res.sendFile(foundFile);
  }

  res.status(404).send('Photo not found');
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const authMiddleware = require('./middleware/authMiddleware');

app.use('/api/auth', require('./routes/auth'));                // Login API
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/search', authMiddleware, require('./routes/search'));
app.use('/api/procurement', authMiddleware, require('./routes/procurement'));
app.use('/api/requisition', authMiddleware, require('./routes/requisition')); // Requisition routes (SOA, SIA, SIB, SIP, SIS)
app.use('/api/sample', authMiddleware, require('./routes/sample'));            // Sample Room routes (SSA, SIM)
app.use('/api/lock', authMiddleware, require('./routes/lock'));                // Document locking

// ─── Global Error Handler (ดักจับ Error ที่หลุดรอด) ───────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Error]:', err.stack);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
});