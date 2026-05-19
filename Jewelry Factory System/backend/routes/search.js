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
    const prefixQuery = `${queryText}%`;
    const results = [];

    // Search Orders (OrdHD)
    if (!searchType || searchType === 'order' || searchType === 'po') {
      let whereClause = 'h.OrdNo LIKE @qPrefix OR h.PONo LIKE @qPrefix OR h.CustCode LIKE @qPrefix OR c.SalesName LIKE @qPrefix';
      if (searchType === 'po') {
        whereClause = 'h.PONo LIKE @qPrefix';
      }

      const orderResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredOrders AS (
            SELECT TOP 10 h.OrdNo, h.PONo, h.CustCode, c.SalesName
            FROM OrdHD h
            LEFT JOIN GMCust c ON c.CustCode = h.CustCode
            WHERE ${whereClause}
          )
          SELECT 
            f.OrdNo AS id, 
            'order' AS type, 
            f.OrdNo AS title, 
            'Order No: ' + f.OrdNo + ' / PO: ' + ISNULL(f.PONo, '-') + ' / Cust: ' + ISNULL(f.CustCode, '') AS sub, 
            '/order-tracker?search=' + f.OrdNo AS path,
            CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
          FROM FilteredOrders f
          LEFT JOIN OrdDT d ON d.OrdNo = f.OrdNo AND d.OrdLineNo = '1'
          LEFT JOIN GMItemPhoto p ON p.ItemNo = d.ItemNo
        `);
      results.push(...orderResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })));
    }

    // Search Items (OrdDT)
    if (!searchType || searchType === 'item') {
      const itemResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          WITH FilteredItems AS (
            SELECT DISTINCT TOP 10 d.ItemNo, d.ItemDesc, d.ItemMat
            FROM OrdDT d
            WHERE d.ItemNo LIKE @qPrefix OR d.ItemDesc LIKE @qPrefix
          )
          SELECT 
            f.ItemNo AS id, 
            'item' AS type, 
            f.ItemNo AS title, 
            'Item Desc: ' + ISNULL(f.ItemDesc, '') + ' / Mat: ' + ISNULL(f.ItemMat, '') AS sub, 
            '/order-tracker?search=' + f.ItemNo AS path,
            CAST(p.ItemPhoto AS VARBINARY(MAX)) AS ItemPhoto
          FROM FilteredItems f
          LEFT JOIN GMItemPhoto p ON p.ItemNo = f.ItemNo
        `);
      results.push(...itemResult.recordset.map(r => ({ ...r, photo: toBase64Photo(r.ItemPhoto), ItemPhoto: undefined })));
    }

    // Search Customers (GMCust)
    if (!searchType || searchType === 'customer') {
      const custResult = await pool.request()
        .input('q', sql.NVarChar, likeQuery)
        .input('qPrefix', sql.NVarChar, prefixQuery)
        .query(`
          SELECT TOP 10 
            CustCode AS id, 
            'customer' AS type, 
            CustName AS title, 
            'Customer Code: ' + CustCode AS sub, 
            '/order-tracker?search=' + CustCode AS path
          FROM GMCust
          WHERE CustCode LIKE @qPrefix OR CustName LIKE @q
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
