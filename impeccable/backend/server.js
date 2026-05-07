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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/orders', require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/search', require('./routes/search'));

// ─── Global Error Handler (ดักจับ Error ที่หลุดรอด) ───────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Error]:', err.stack);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
});