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

// Safe, automated local mock folder initializer
const mockDir = path.join(__dirname, 'mock_chong_photo');
try {
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true });
  }
  const srcEarring = 'C:\\Users\\ITSP\\.gemini\\antigravity\\brain\\69fc8a62-b577-472b-baaf-550808027499\\bes33075a_1779158418297.png';
  const srcRing = 'C:\\Users\\ITSP\\.gemini\\antigravity\\brain\\69fc8a62-b577-472b-baaf-550808027499\\bes32379a_1779158435877.png';
  
  const destEarring = path.join(mockDir, 'BES33075A.jpg');
  const destRing = path.join(mockDir, 'BES32379A.jpg');

  if (fs.existsSync(srcEarring) && !fs.existsSync(destEarring)) {
    fs.copyFileSync(srcEarring, destEarring);
    console.log('✔ [PhotoBridge Init] Copied mock Earring to:', destEarring);
  }
  if (fs.existsSync(srcRing) && !fs.existsSync(destRing)) {
    fs.copyFileSync(srcRing, destRing);
    console.log('✔ [PhotoBridge Init] Copied mock Ring to:', destRing);
  }
} catch (e) {
  console.log('⚠️ [PhotoBridge Init Error]:', e.message);
}

// Register the Photo Bridge API Route
app.get('/api/photos/:itemNo', (req, res) => {
  const itemNo = req.params.itemNo.trim();
  console.log(`[PhotoBridge] Serving Item: ${itemNo}`);

  // Try the real network path first! Fallback to mock path if inaccessible.
  const searchDirs = [
    '\\\\chongdts\\Chong Photo\\Cost',
    mockDir
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
    res.setHeader('X-Source-Origin', foundFile.includes('mock_chong_photo') ? 'MockServer' : 'RealServer');
    return res.sendFile(foundFile);
  }

  res.status(404).send('Photo not found');
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/orders', require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/search', require('./routes/search'));
app.use('/api/procurement', require('./routes/procurement'));

// ─── Global Error Handler (ดักจับ Error ที่หลุดรอด) ───────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Error]:', err.stack);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
});