ALTER VIEW [dbo].[VW_Web_OrderVolume]
AS
SELECT 
    HD.OrdID,
    HD.OrdNo,
    CAST(HD.OrdDate AS DATE) AS OrdDate,
    CAST(HD.DueDate AS DATE) AS DueDate,
    CAST(NULL AS DATE) AS CustDate,
    CAST(NULL AS DATE) AS ShipDate,
    CAST(HD.DueDate AS DATE) AS CustDue,
    HD.PONo,
    CAST(NULL AS VARCHAR(50)) AS PO2,
    CAST(NULL AS VARCHAR(50)) AS Brand,
    CAST(NULL AS VARCHAR(50)) AS ShipT,
    CAST(NULL AS VARCHAR(50)) AS ShipTo,
    HD.OrdStamp AS OrderStamp,
    HD.OrdMaker AS OrderMaker,
    HD.OrdStamp,
    HD.OrdMaker,
    HD.OrdStatus,
    HD.CustCode AS CustomerCode,
    CUST.CustName AS CustomerName,
    CUST.CustStatus AS CustomerStatus,
    ISNULL(CUST.SalesName, HD.SalesName) AS SalesName,
    CAST(NULL AS VARCHAR(50)) AS Market,
    
    CAST(NULL AS INT) AS OrdLineNo,
    CAST(NULL AS VARCHAR(50)) AS ItemSKU,
    CAST(NULL AS VARCHAR(50)) AS CustomerItem,
    CAST(NULL AS VARCHAR(50)) AS ItemMat,
    CAST(NULL AS VARCHAR(50)) AS ItemSize,
    CAST(NULL AS VARCHAR(50)) AS ItemStone,
    CAST(NULL AS VARCHAR(255)) AS ItemDescription,
    CAST(NULL AS VARCHAR(50)) AS ItemPlate,
    CAST(NULL AS VARCHAR(50)) AS SetType,
    CAST(NULL AS FLOAT) AS ItemWeight,
    
    DT.ItemNo,
    DT.ItemType,
    CASE 
        WHEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3)) IN ('BBS','BES','BNS','BRS') THEN UPPER(LEFT(ISNULL(DT.ItemNo, ''), 3))
        WHEN UPPER(ISNULL(DT.ItemType, '')) IN ('BBS','BES','BNS','BRS') THEN UPPER(DT.ItemType)
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) IN ('B', 'T') THEN 'BBS'
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'E' THEN 'BES'
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'N' THEN 'BNS'
        WHEN UPPER(LEFT(ISNULL(DT.ItemType, ''), 1)) = 'R' THEN 'BRS'
        ELSE 'Others'
    END AS ProductType,
    
    ISNULL(DT.ItemQty, 0) AS OrderQty,
    ISNULL(DT.FinishQty, 0) AS ShippedQty,
    (ISNULL(DT.ItemQty, 0) - ISNULL(DT.FinishQty, 0)) AS OpenQty,
    
    ISNULL(DT.ItemPrice, 0) AS ItemPrice,
    ISNULL(DT.ItemExchAmnt, ISNULL(DT.ItemAmnt, 0)) AS OrderAmount,
    (ISNULL(DT.FinishQty, 0) * ISNULL(DT.ItemPrice, 0)) AS ShippedAmount

FROM dbo.OrdHD HD
INNER JOIN dbo.OrdDT DT ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo
LEFT JOIN dbo.GMCust CUST ON HD.CustCode = CUST.CustCode
WHERE 
    ISNULL(HD.OrdStatus, '') <> 'C'
    AND SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')
    AND ISNULL(HD.PONo, '') NOT IN ('','TOP','Test','Testing','Stock','STOCK')
    AND (HD.PONo IS NULL OR UPPER(HD.PONo) NOT LIKE '%SAMPLE%')
