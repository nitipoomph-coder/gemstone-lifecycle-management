const { getPool, sql } = require('./db');

async function checkSales() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                SUBSTRING(CustCode, 1, 4) as Prefix, 
                SalesName, 
                COUNT(*) as Count
            FROM GMCust
            WHERE CustStatus = 'Y'
            GROUP BY SUBSTRING(CustCode, 1, 4), SalesName
            ORDER BY Count DESC
        `);
        console.table(result.recordset);
        
        const result2 = await pool.request().query(`
            SELECT DISTINCT SalesName FROM GMCust WHERE CustStatus = 'Y'
        `);
        console.log('Distinct Sales:', result2.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkSales();
