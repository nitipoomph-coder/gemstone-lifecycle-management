const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.API_PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
}));
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
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/orders', require('./routes/orders'));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Orders API:   http://localhost:${PORT}/api/orders`);
});
