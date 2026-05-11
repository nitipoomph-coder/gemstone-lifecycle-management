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
    const { q, type } = req.query;
    const queryText = q ? String(q).trim() : '';
    const searchType = type ? String(type).toLowerCase().trim() : null;

    console.log(`[Search Request] q: "${queryText}", type: "${searchType}"`);
    if (queryText.length < 2) return res.json({ ok: true, data: [] });

    const pool = await getPool();
    const likeQuery = `%${queryText}%`;
    const results = [];

    // Search Orders (OrdHD)
    if (!searchType || searchType === 'order' || searchType === 'po') {
      let whereClause = 'h.OrdNo LIKE @q OR h.PONo LIKE @q OR h.CustCode LIKE @q OR c.SalesName LIKE @q';
      if (searchType === 'po') {
        whereClause = 'h.PONo LIKE @q';
      }

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
          LEFT JOIN GMCust c ON c.CustCode = h.CustCode
          WHERE ${whereClause}
        `);
      results.push(...orderResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })));
    }

    // Search Items (OrdDT)
    if (!type || type === 'item') {
      const itemResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .query(`
          SELECT DISTINCT TOP 10 
            d.ItemNo AS id, 
            'item' AS type, 
            d.ItemNo AS title, 
            'Item Desc: ' + ISNULL(d.ItemDesc, '') + ' / Mat: ' + ISNULL(d.ItemMat, '') AS sub, 
            '/order-tracker?search=' + d.ItemNo AS path,
            CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
          FROM OrdDT d
          LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
          WHERE d.ItemNo LIKE @q OR d.ItemDesc LIKE @q OR d.ItemMat LIKE @q OR d.ItemSize LIKE @q
        `);
      results.push(...itemResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })));
    }

    // Search Customers (GMCust)
    if (!type || type === 'customer') {
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
      results.push(...custResult.recordset.map(r => ({ ...r, photo: null, ItemPhoto: undefined })));
    }

    res.json({ ok: true, data: results });
  } catch (err) {
    console.error('[Search API Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
