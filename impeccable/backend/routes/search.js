const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

function toBase64Photo(buf) {
  if (!buf) return null;
  try {
    let b;
    if (Buffer.isBuffer(buf)) b = buf;
    else if (buf?.data) b = Buffer.from(buf.data);
    else b = Buffer.from(buf);
    if (b.length === 0) return null;
    return `data:image/jpeg;base64,${b.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ ok: true, data: [] });

    const pool = await getPool();
    const likeQuery = `%${q}%`;

    // Search Orders (OrdHD) - Get first item's photo
    const orderResult = await pool.request()
      .input('q', sql.NVarChar, likeQuery)
      .query(`
        SELECT TOP 10 
          h.OrdNo AS id, 
          'order' AS type, 
          h.OrdNo AS title, 
          'Order No: ' + h.OrdNo + ' / PO: ' + ISNULL(h.PONo, '-') + ' / Cust: ' + ISNULL(h.CustCode, '') AS sub, 
          '/order-tracker?search=' + h.OrdNo AS path,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdHD h
        LEFT JOIN OrdDT d ON d.OrdNo = h.OrdNo AND d.OrdLineNo = 1
        LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
        WHERE h.OrdNo LIKE @q OR h.PONo LIKE @q OR h.CustCode LIKE @q
      `);

    // Search Items (OrdDT) - distinct items
    const itemResult = await pool.request()
      .input('q', sql.NVarChar, likeQuery)
      .query(`
        SELECT DISTINCT TOP 10 
          d.ItemNo AS id, 
          'item' AS type, 
          d.ItemNo AS title, 
          'Item Desc: ' + ISNULL(d.ItemDesc, '') AS sub, 
          '/order-tracker?search=' + d.ItemNo AS path,
          CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
        FROM OrdDT d
        LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
        WHERE d.ItemNo LIKE @q OR d.ItemDesc LIKE @q
      `);

    // Search Customers (GMCust)
    const custResult = await pool.request()
      .input('q', sql.NVarChar, likeQuery)
      .query(`
        SELECT TOP 10 
          CustCode AS id, 
          'customer' AS type, 
          CustName AS title, 
          'Customer Code: ' + CustCode AS sub, 
          '/order-tracker?search=' + CustCode AS path
        FROM GMCust
        WHERE CustCode LIKE @q OR CustName LIKE @q
      `);

    const results = [
      ...orderResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })),
      ...itemResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })),
      ...custResult.recordset.map(r => ({ ...r, photo: null, ItemPhoto: undefined })),
    ];

    res.json({ ok: true, data: results });
  } catch (err) {
    console.error('[Search API Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
