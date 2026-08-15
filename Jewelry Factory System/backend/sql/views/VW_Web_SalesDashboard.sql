-- =========================================================================
-- View: dbo.VW_Web_SalesDashboard
-- Database: dbGeneration (SQL Server 2012+)
-- Description: Central SSOT View for Customer Dashboard, Matrix Report, and Order Trends
-- Business Logic: 100% Aligned with Production "Yearly Sales Summary By Customer"
-- =========================================================================

CREATE OR ALTER VIEW dbo.VW_Web_SalesDashboard
AS
SELECT        
    HD.OrdID, 
    HD.OrdNo, 
    HD.OrdDate, 
    YEAR(HD.OrdDate) AS OrdYear, 
    MONTH(HD.OrdDate) AS OrdMonth, 
    HD.DueDate,
    ISNULL(HD.CustDueDate, HD.DueDate) AS CustDueDate,
    HD.CustCode, 
    CUST.CustName, 
    CUST.CustStatus, 
    ISNULL(CUST.SalesName, HD.SalesName) AS SalesName, 
    
    HD.PONo,
    HD.EXNo AS PO2,
    HD.CustMultiAddr AS ShipTo,
    HD.OrdMaker,
    HD.OrdStamp,

    -- Item Information
    DT.OrdLineNo,
    DT.ItemNo, 
    LEFT(DT.ItemNo, 8) AS [Item SKU],
    DT.ItemCust AS [Cust Item],

    -- Product Type Logic (BBS: Bracelet/Bangle, BES: Earring, BNS: Necklace, BRS: Ring, Others)
    CASE 
        WHEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3)) IN ('BBS', 'BES', 'BNS', 'BRS') 
            THEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3)) 
        WHEN UPPER(ISNULL(DT.ItemType, '')) IN ('BBS', 'BES', 'BNS', 'BRS') 
            THEN UPPER(DT.ItemType) 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) IN ('B', 'T') 
            THEN 'BBS' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'E' 
            THEN 'BES' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'N' 
            THEN 'BNS' 
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'R' 
            THEN 'BRS' 
        ELSE 'Others' 
    END AS ProductType,

    DT.ItemType,
    DT.ItemMat,
    DT.ItemSize,
    DT.ItemStone,
    DT.ItemDesc,
    DT.ItemPlate,
    DT.SetType,
    HD.CurrCode AS Currency,
    ISNULL(DT.ItemWeight, 0) AS ItemWeight,

    -- Quantities
    ISNULL(DT.ItemQty, 0) AS ItemQty, 
    ISNULL(DT.ExportQty, 0) AS ExportQty,
    CASE 
        WHEN ISNULL(DT.ItemQty, 0) > ISNULL(DT.ExportQty, 0) 
            THEN ISNULL(DT.ItemQty, 0) - ISNULL(DT.ExportQty, 0) 
        ELSE 0 
    END AS OpenQty,

    -- Financial Amounts ($ USD Standardized via ItemExchAmnt)
    ISNULL(DT.ItemPrice, 0) AS ItemPrice,
    ISNULL(DT.ItemExchAmnt, DT.ItemAmnt) AS ItemAmnt, 
    ISNULL(DT.ExportAmnt, 0) AS ExportAmnt,

    -- Order Status
    ISNULL(HD.OrdStatus, 'P') AS OrdStatus,
    ISNULL(HD.CloseStatus, 'N') AS CloseStatus

FROM dbo.OrdHD AS HD WITH (NOLOCK)
INNER JOIN dbo.OrdDT AS DT WITH (NOLOCK)
    ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo 
LEFT OUTER JOIN dbo.GMCust AS CUST WITH (NOLOCK)
    ON HD.CustCode = CUST.CustCode
WHERE 
    -- 1. Exclude cancelled orders
    (ISNULL(HD.OrdStatus, N'') <> 'C') 
    
    -- 2. Include active customers only
    AND (ISNULL(CUST.CustStatus, N'Y') = 'Y')
    
    -- 3. Exclude non-finished goods / internal processing order prefixes
    AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBL', 'BBD', 'BBK', 'BBT', 'BBP'));
GO
