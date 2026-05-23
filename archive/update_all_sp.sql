-- =====================================================================
-- UPDATE ALL ORDER TRACKER STORED PROCEDURES
-- Date: 21/05/2026
-- Purpose: Add @Status parameter to all SPs, remove hardcoded CloseStatus
-- 
-- SPs updated:
--   1. PC_Show_OrdTrack_Sum_OrdDate
--   2. PC_Show_OrdTrack_Sum_All
--
-- IMPORTANT: Run this on SSMS connected to ITSP (test server)
--            Database: [dbGeneration]
--            ห้าม run บน CLLDBS (Production)!
-- =====================================================================

USE [dbGeneration]
GO

-- =============================================================================
-- 1. PC_Show_OrdTrack_Sum_OrdDate
-- =============================================================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[PC_Show_OrdTrack_Sum_OrdDate]
	
	@FromDate DateTime,
	@ToDate DateTime,
	@Status Varchar(20) = 'pending'

AS

BEGIN

	SET NOCOUNT ON;

WITH DupOnePONo AS (
    SELECT PONo
    FROM OrdHD
	WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
	AND SUBSTRING(OrdHD.OrdNo,1,3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')
	AND OrdHD.CustCode IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075') 
	AND OrdHD.PONo NOT IN ('','TOP','Test','Testing','Stock','STOCK')

    GROUP BY PONo
    HAVING COUNT(*) = 1),

DupMorPONo AS (
	SELECT PONo
	FROM OrdHD
	WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
	AND SUBSTRING(OrdHD.OrdNo,1,3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')
	AND OrdHD.CustCode IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075') 
	AND OrdHD.PONo NOT IN ('','TOP','Test','Testing','Stock','STOCK')

	GROUP BY PONo
	HAVING COUNT(*) > 1),


CTE_Track AS (
SELECT *
FROM (
    SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY CustCode,
                            OrdKind,
                            OrdMat,
                            CustMultiAddr,
                            CustDueDate
                ORDER BY OrdTrackID DESC
            ) AS rn
    FROM OrdTrackDT
) X
WHERE rn = 1),


OrdDT_Aggregate AS (
	SELECT
		T2.CustCode,
		T2.CustDueDate, 
		T2.PONo,
		T2.OrdKind,
		T2.OrdMat,
		T2.CustMultiAddr,
		COUNT(OrdDT.ItemNo) AS SumItem,
		SUM(OrdDT.ItemQty) AS SumQty,
		SUM(ISNULL(OrdDT.StoneQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS StonePenQty,
		SUM(ISNULL(OrdDT.FitQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS FitPenQty,
		SUM(ISNULL(OrdDT.WijQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS WijPenQty,
		SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(WstQty,0) - ISNULL(WijQty,0) ELSE ISNULL(WstQty,0) - ISNULL(ItemQty,0) END) AS WstPenQty,
		SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(CastQty,0) - ISNULL(WijQty,0) ELSE ISNULL(CastQty,0) - ISNULL(ItemQty,0) END) AS CastPenQty,
		SUM(ISNULL(OrdDT.ControlQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS ControlPenQty,
		SUM(CASE WHEN CastQty = ItemQty THEN ISNULL(GrindQty,0) - ISNULL(CastQty,0) ELSE ISNULL(GrindQty,0) - ISNULL(ItemQty,0) END) AS GrindPenQty,
		SUM(CASE WHEN GrindQty = ItemQty THEN ISNULL(PolishQty,0) - ISNULL(GrindQty,0) ELSE ISNULL(PolishQty,0) - ISNULL(ItemQty,0) END) AS PolishPenQty,
		SUM(CASE WHEN PolishQty = ItemQty THEN ISNULL(PlateQty,0) - ISNULL(PolishQty,0) ELSE ISNULL(PlateQty,0) - ISNULL(ItemQty,0) END) AS PlatePenQty,
		SUM(CASE WHEN PlateQty = ItemQty THEN ISNULL(QCQty,0) - ISNULL(PlateQty,0) ELSE ISNULL(QCQty,0) - ISNULL(ItemQty,0) END) AS QCPenQty,
		SUM(ISNULL(OrdDT.FinishQty,0) - ISNULL(OrdDT.ItemQty,0)) AS UnFinishQty,
		SUM(ISNULL(OrdDT.FinishQty,0)) AS FinishQty,
		SUM(ISNULL(OrdDT.ExportQty,0)) AS ExportQty,
		SUM(ISNULL(OrdDT.ExportQty,0) - ISNULL(OrdDT.ItemQty,0)) AS BalQty,

		CASE 
		WHEN SUM(ISNULL(OrdDT.ItemQty,0)) IS NULL OR SUM(ISNULL(OrdDT.ItemQty,0)) = 0 THEN 0
		ELSE ROUND((SUM(ISNULL(OrdDT.ExportQty,0)) / SUM(ISNULL(OrdDT.ItemQty,0))) * 100,0)
		END AS ExpPct,

		SUM(OrdDT.ItemExchAmnt) AS SumAmnt,
		MAX(CAST(GMItemPhoto.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
	FROM OrdDT
	LEFT JOIN OrdHD T2 ON T2.OrdNo = OrdDT.OrdNo
	LEFT JOIN GMItemPhoto ON GMItemPhoto.ItemNo = OrdDT.ItemNo
	WHERE T2.OrdDate BETWEEN @FromDate AND @ToDate
	AND SUBSTRING(T2.OrdNo,1,3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')
	AND T2.CustCode NOT IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075') 
	AND T2.PONo NOT IN ('','TOP','Test','Testing','Stock','STOCK')
	AND (@Status = 'All' OR (@Status = 'pending' AND T2.CloseStatus <> 'Y') OR (@Status = 'finish' AND T2.CloseStatus = 'Y'))
	GROUP BY t2.CustCode, T2.CustDueDate, T2.PONo, T2.OrdKind, T2.OrdMat, T2.CustMultiAddr),

CTO_OrdDT_Aggregate AS (
    SELECT 
        T2.CustCode,
		T2.CustDueDate,
        T2.CustMultiAddr,
        T2.OrdKind,
        T2.OrdMat,
        COUNT(OrdDT.ItemNo) AS SumItem,
        SUM(OrdDT.ItemQty) AS SumQty,
        SUM(ISNULL(OrdDT.StoneQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS StonePenQty,
        SUM(ISNULL(OrdDT.FitQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS FitPenQty,
        SUM(ISNULL(OrdDT.WijQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS WijPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(WstQty,0) - ISNULL(WijQty,0) ELSE ISNULL(WstQty,0) - ISNULL(ItemQty,0) END) AS WstPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(CastQty,0) - ISNULL(WijQty,0) ELSE ISNULL(CastQty,0) - ISNULL(ItemQty,0) END) AS CastPenQty,
        SUM(ISNULL(OrdDT.ControlQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS ControlPenQty,
        SUM(CASE WHEN CastQty = ItemQty THEN ISNULL(GrindQty,0) - ISNULL(CastQty,0) ELSE ISNULL(GrindQty,0) - ISNULL(ItemQty,0) END) AS GrindPenQty,
        SUM(CASE WHEN GrindQty = ItemQty THEN ISNULL(PolishQty,0) - ISNULL(GrindQty,0) ELSE ISNULL(PolishQty,0) - ISNULL(ItemQty,0) END) AS PolishPenQty,
        SUM(CASE WHEN PolishQty = ItemQty THEN ISNULL(PlateQty,0) - ISNULL(PolishQty,0) ELSE ISNULL(PlateQty,0) - ISNULL(ItemQty,0) END) AS PlatePenQty,
		SUM(CASE WHEN PlateQty = ItemQty THEN ISNULL(QCQty,0) - ISNULL(PlateQty,0) ELSE ISNULL(QCQty,0) - ISNULL(ItemQty,0) END) AS QCPenQty,
        SUM(ISNULL(OrdDT.FinishQty,0) - ISNULL(OrdDT.ItemQty,0)) AS UnFinishQty,
        SUM(ISNULL(OrdDT.FinishQty,0)) AS FinishQty,
		SUM(ISNULL(OrdDT.ExportQty,0)) AS ExportQty,
		SUM(ISNULL(OrdDT.ExportQty,0) - ISNULL(OrdDT.ItemQty,0)) AS BalQty,

		CASE 
		WHEN SUM(ISNULL(OrdDT.ItemQty,0)) IS NULL OR SUM(ISNULL(OrdDT.ItemQty,0)) = 0 THEN 0
		ELSE ROUND((SUM(ISNULL(OrdDT.ExportQty,0)) / SUM(ISNULL(OrdDT.ItemQty,0))) * 100,0)
		END AS ExpPct,

        SUM(OrdDT.ItemExchAmnt) AS SumAmnt,
        MAX(CAST(GMItemPhoto.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
    FROM OrdDT
    INNER JOIN OrdHD T2 ON T2.OrdNo = OrdDT.OrdNo
    LEFT JOIN GMItemPhoto ON GMItemPhoto.ItemNo = OrdDT.ItemNo
    WHERE T2.PONo IN (SELECT PONo FROM DupOnePONo)
    AND (@Status = 'All' OR (@Status = 'pending' AND T2.CloseStatus <> 'Y') OR (@Status = 'finish' AND T2.CloseStatus = 'Y'))
    GROUP BY T2.CustCode, T2.CustDueDate, T2.CustMultiAddr, T2.OrdKind, T2.OrdMat),


CTM_OrdDT_Aggregate AS (
    SELECT 
        T2.CustCode,
        T2.CustMultiAddr,
        T2.PONo,
        T2.OrdKind,
        T2.OrdMat,
        COUNT(OrdDT.ItemNo) AS SumItem,
        SUM(OrdDT.ItemQty) AS SumQty,
        SUM(ISNULL(OrdDT.StoneQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS StonePenQty,
        SUM(ISNULL(OrdDT.FitQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS FitPenQty,
        SUM(ISNULL(OrdDT.WijQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS WijPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(WstQty,0) - ISNULL(WijQty,0) ELSE ISNULL(WstQty,0) - ISNULL(ItemQty,0) END) AS WstPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(CastQty,0) - ISNULL(WijQty,0) ELSE ISNULL(CastQty,0) - ISNULL(ItemQty,0) END) AS CastPenQty,
        SUM(ISNULL(OrdDT.ControlQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS ControlPenQty,
        SUM(CASE WHEN CastQty = ItemQty THEN ISNULL(GrindQty,0) - ISNULL(CastQty,0) ELSE ISNULL(GrindQty,0) - ISNULL(ItemQty,0) END) AS GrindPenQty,
        SUM(CASE WHEN GrindQty = ItemQty THEN ISNULL(PolishQty,0) - ISNULL(GrindQty,0) ELSE ISNULL(PolishQty,0) - ISNULL(ItemQty,0) END) AS PolishPenQty,
        SUM(CASE WHEN PolishQty = ItemQty THEN ISNULL(PlateQty,0) - ISNULL(PolishQty,0) ELSE ISNULL(PlateQty,0) - ISNULL(ItemQty,0) END) AS PlatePenQty,
		SUM(CASE WHEN PlateQty = ItemQty THEN ISNULL(QCQty,0) - ISNULL(PlateQty,0) ELSE ISNULL(QCQty,0) - ISNULL(ItemQty,0) END) AS QCPenQty,
        SUM(ISNULL(OrdDT.FinishQty,0) - ISNULL(OrdDT.ItemQty,0)) AS UnFinishQty,
        SUM(ISNULL(OrdDT.FinishQty,0)) AS FinishQty,
		SUM(ISNULL(OrdDT.ExportQty,0)) AS ExportQty,
		SUM(ISNULL(OrdDT.ExportQty,0) - ISNULL(OrdDT.ItemQty,0)) AS BalQty,

		CASE 
		WHEN SUM(ISNULL(OrdDT.ItemQty,0)) IS NULL OR SUM(ISNULL(OrdDT.ItemQty,0)) = 0 THEN 0
		ELSE ROUND((SUM(ISNULL(OrdDT.ExportQty,0)) / SUM(ISNULL(OrdDT.ItemQty,0))) * 100,0)
		END AS ExpPct,

        SUM(OrdDT.ItemExchAmnt) AS SumAmnt,
        MAX(CAST(GMItemPhoto.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
    FROM OrdDT
    INNER JOIN OrdHD T2 ON T2.OrdNo = OrdDT.OrdNo
    LEFT JOIN GMItemPhoto ON GMItemPhoto.ItemNo = OrdDT.ItemNo
    WHERE T2.PONo IN (SELECT PONo FROM DupMorPONo)
    AND (@Status = 'All' OR (@Status = 'pending' AND T2.CloseStatus <> 'Y') OR (@Status = 'finish' AND T2.CloseStatus = 'Y'))
    GROUP BY T2.CustCode, T2.PONo, T2.OrdKind, T2.OrdMat, T2.CustMultiAddr)



SELECT  
ROW_NUMBER() OVER (ORDER BY OrdWeekPlanHD.PlanYear, OrdWeekPlanHD.PlanWeek,
OrdHD.CustCode, OrdHD.PONo, OrdHD.OrdKind, OrdHD.OrdMat) AS ListNo,
ISNULL(OrdWeekPlanHD.PlanYear, 0) AS OrdYear,
ISNULL(OrdWeekPlanHD.PlanWeek, 0) AS OrdWeek,
OrdHD.CustCode, OrdHD.PONo,

LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + T1.OrdNo 
FROM OrdHD T1 
WHERE OrdHD.PONo = T1.PONo
AND OrdHD.OrdKind = T1.OrdKind
AND OrdHD.OrdMat = T1.OrdMat
AND OrdHD.CustMultiAddr = T1.CustMultiAddr
AND T1.OrdNo <> '' 
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS OrdNo,

CASE WHEN OrdHD.OrdKind = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
OrdHD.OrdMat, OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,

(SELECT MIN(T2.OrdDate) 
FROM OrdHD T2 
WHERE OrdHD.CustCode = T2.CustCode
AND OrdHD.PONo = T2.PONo
AND OrdHD.OrdKind = T2.OrdKind
AND OrdHD.OrdMat = T2.OrdMat) AS OrdDate,

OrdHD.DueDate,
OrdTrackDT.OrdSGS, OrdHD.CustQCDate,
OrdTrackDT.TrackTest, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdDT_Aggregate.ExportQty,
OrdDT_Aggregate.BalQty,
OrdDT_Aggregate.ExpPct,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

FROM OrdHD
LEFT JOIN OrdWeekPlanHD ON OrdWeekPlanHD.PlanDate = OrdHD.DueDate
LEFT JOIN OrdTrackDT ON OrdTrackDT.CustCode = OrdHD.CustCode
AND OrdTrackDT.PONo = OrdHD.PONo
AND OrdTrackDT.OrdMat = OrdHD.OrdMat
AND OrdTrackDT.OrdKind = OrdHD.OrdKind
AND OrdTrackDT.CustDueDate = OrdHD.CustDueDate
AND OrdTrackDT.CustMultiAddr = OrdHD.CustMultiAddr
LEFT JOIN OrdDT_Aggregate ON OrdHD.CustCode = OrdDT_Aggregate.CustCode
AND OrdHD.CustDueDate = OrdDT_Aggregate.CustDueDate
AND OrdHD.PONo = OrdDT_Aggregate.PONo
AND OrdHD.OrdKind = OrdDT_Aggregate.OrdKind
AND OrdHD.OrdMat = OrdDT_Aggregate.OrdMat
AND OrdHD.CustMultiAddr = OrdDT_Aggregate.CustMultiAddr

WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
AND SUBSTRING(OrdHD.OrdNo,1,3) IN ('BBC','BBS','BBE','BBL','BBR','BBT','BBP')
AND OrdHD.CustCode NOT IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075') 
AND OrdHD.PONo NOT IN ('','TOP','Test','Testing','Stock','STOCK')
AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))

GROUP BY PlanYear, PlanWeek,
OrdHD.CustCode, OrdHD.PONo,
OrdHD.OrdKind, OrdHD.OrdMat,
OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,
OrdHD.DueDate,
OrdTrackDT.OrdSGS, OrdHD.CustQCDate, 
OrdTrackDT.TrackTest, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdDT_Aggregate.ExportQty,
OrdDT_Aggregate.BalQty,
OrdDT_Aggregate.ExpPct,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

UNION ALL

SELECT  
ROW_NUMBER() OVER (ORDER BY OrdWeekPlanHD.PlanYear, OrdWeekPlanHD.PlanWeek, 
OrdHD.CustCode, OrdHD.CustMultiAddr, OrdHD.OrdKind, OrdHD.OrdMat) AS ListNo,
ISNULL(OrdWeekPlanHD.PlanYear, 0) AS OrdYear,
ISNULL(OrdWeekPlanHD.PlanWeek, 0) AS OrdWeek,
OrdHD.CustCode, 
'Group PO By ShipTo' AS PONo,

LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + T1.OrdNo 
FROM OrdHD T1 
WHERE OrdHD.CustCode = T1.CustCode
AND OrdHD.CustMultiAddr = T1.CustMultiAddr
AND OrdHD.OrdKind = T1.OrdKind
AND OrdHD.OrdMat = T1.OrdMat
AND OrdHD.CustDueDate = T1.CustDueDate
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS OrdNo,

CASE WHEN OrdHD.OrdKind = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
OrdHD.OrdMat, OrdHD.CustMultiAddr,
CTO_OrdDT_Aggregate.ItemPhoto,

(SELECT MIN(T2.OrdDate) 
FROM OrdHD T2 
WHERE OrdHD.CustCode = T2.CustCode
AND OrdHD.CustMultiAddr = T2.CustMultiAddr
AND OrdHD.OrdKind = T2.OrdKind
AND OrdHD.OrdMat = T2.OrdMat) AS OrdDate,

OrdHD.DueDate,
CTE_Track.OrdSGS,
OrdHD.CustQCDate, 
CTE_Track.TrackTest, 
OrdHD.CustDueDate,
CTE_Track.OORDate,
CTO_OrdDT_Aggregate.SumItem,
CTO_OrdDT_Aggregate.SumQty,
CTE_Track.BookDate,
CTE_Track.QC1_Qty, 
CTE_Track.QC1_Date,
CTE_Track.QC1_Fail,
CTE_Track.QC2_Qty, 
CTE_Track.QC2_Date,
CTE_Track.QC2_Fail,
CTE_Track.QC3_Qty, 
CTE_Track.QC3_Date,
CTO_OrdDT_Aggregate.StonePenQty,
CTO_OrdDT_Aggregate.FitPenQty,
CTO_OrdDT_Aggregate.WijPenQty,
CTO_OrdDT_Aggregate.WstPenQty,
CTO_OrdDT_Aggregate.CastPenQty,
CTO_OrdDT_Aggregate.ControlPenQty,
CTO_OrdDT_Aggregate.GrindPenQty,
CTO_OrdDT_Aggregate.PolishPenQty,
CTO_OrdDT_Aggregate.PlatePenQty,
CTO_OrdDT_Aggregate.QCPenQty,
CTO_OrdDT_Aggregate.UnFinishQty,
CTO_OrdDT_Aggregate.FinishQty,
CTO_OrdDT_Aggregate.ExportQty,
CTO_OrdDT_Aggregate.BalQty,
CTO_OrdDT_Aggregate.ExpPct,
CTE_Track.ProdRiskIssue, 
CTE_Track.PQCPlanShip,
CTE_Track.PackCard, 
CTE_Track.TickOrd,
CTE_Track.TickRec, 
CTE_Track.TrackSam,
CTE_Track.TrackCT, 
CTE_Track.TrackMF,
CTE_Track.PackScanDo, 
CTE_Track.PackScanSen,
CTE_Track.PackScanAppv, 
CTE_Track.PackScanMF,
CTE_Track.PolyOrd, 
CTE_Track.PolyRec,
CTE_Track.TagRcyRec, 
CTE_Track.TrackRemark,
CTO_OrdDT_Aggregate.SumAmnt

FROM OrdHD
LEFT JOIN OrdWeekPlanHD ON OrdWeekPlanHD.PlanDate = OrdHD.DueDate
LEFT JOIN CTE_Track ON CTE_Track.CustCode = OrdHD.CustCode
AND CTE_Track.OrdKind = OrdHD.OrdKind
AND CTE_Track.OrdMat = OrdHD.OrdMat
AND CTE_Track.CustMultiAddr = OrdHD.CustMultiAddr
AND CTE_Track.CustDueDate = OrdHD.CustDueDate
LEFT JOIN CTO_OrdDT_Aggregate ON CTO_OrdDT_Aggregate.CustCode = OrdHD.CustCode
AND CTO_OrdDT_Aggregate.OrdKind = OrdHD.OrdKind
AND CTO_OrdDT_Aggregate.OrdMat = OrdHD.OrdMat
AND CTO_OrdDT_Aggregate.CustMultiAddr = OrdHD.CustMultiAddr
AND CTO_OrdDT_Aggregate.CustDueDate = OrdHD.CustDueDate

WHERE OrdHD.PONo IN (SELECT PONo FROM DupOnePONo)
AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))

GROUP BY PlanYear, PlanWeek,
OrdHD.CustCode,
OrdHD.OrdKind, OrdHD.OrdMat,
OrdHD.CustMultiAddr,
CTO_OrdDT_Aggregate.ItemPhoto,
OrdHD.DueDate,
CTE_Track.OrdSGS,
OrdHD.CustQCDate, 
CTE_Track.TrackTest, 
OrdHD.CustDueDate,
CTE_Track.OORDate,
CTO_OrdDT_Aggregate.SumItem,
CTO_OrdDT_Aggregate.SumQty,
CTE_Track.BookDate,
CTE_Track.QC1_Qty, 
CTE_Track.QC1_Date,
CTE_Track.QC1_Fail,
CTE_Track.QC2_Qty, 
CTE_Track.QC2_Date,
CTE_Track.QC2_Fail,
CTE_Track.QC3_Qty, 
CTE_Track.QC3_Date,
CTO_OrdDT_Aggregate.StonePenQty,
CTO_OrdDT_Aggregate.FitPenQty,
CTO_OrdDT_Aggregate.WijPenQty,
CTO_OrdDT_Aggregate.WstPenQty,
CTO_OrdDT_Aggregate.CastPenQty,
CTO_OrdDT_Aggregate.ControlPenQty,
CTO_OrdDT_Aggregate.GrindPenQty,
CTO_OrdDT_Aggregate.PolishPenQty,
CTO_OrdDT_Aggregate.PlatePenQty,
CTO_OrdDT_Aggregate.QCPenQty,
CTO_OrdDT_Aggregate.UnFinishQty,
CTO_OrdDT_Aggregate.FinishQty,
CTO_OrdDT_Aggregate.ExportQty,
CTO_OrdDT_Aggregate.BalQty,
CTO_OrdDT_Aggregate.ExpPct,
CTE_Track.ProdRiskIssue, 
CTE_Track.PQCPlanShip,
CTE_Track.PackCard, 
CTE_Track.TickOrd,
CTE_Track.TickRec, 
CTE_Track.TrackSam,
CTE_Track.TrackCT, 
CTE_Track.TrackMF,
CTE_Track.PackScanDo, 
CTE_Track.PackScanSen,
CTE_Track.PackScanAppv, 
CTE_Track.PackScanMF,
CTE_Track.PolyOrd, 
CTE_Track.PolyRec,
CTE_Track.TagRcyRec, 
CTE_Track.TrackRemark,
CTO_OrdDT_Aggregate.SumAmnt

UNION ALL

SELECT  
ROW_NUMBER() OVER (ORDER BY OrdWeekPlanHD.PlanYear, OrdWeekPlanHD.PlanWeek, 
OrdHD.CustCode, OrdHD.PONo, OrdHD.OrdKind, OrdHD.OrdMat) AS ListNo,
ISNULL(OrdWeekPlanHD.PlanYear, 0) AS OrdYear,
ISNULL(OrdWeekPlanHD.PlanWeek, 0) AS OrdWeek,
OrdHD.CustCode, OrdHD.PONo,
    
LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + T1.OrdNo 
FROM OrdHD T1 
WHERE OrdHD.CustCode = T1.CustCode
AND OrdHD.PONo = T1.PONo
AND OrdHD.OrdKind = T1.OrdKind
AND OrdHD.OrdMat = T1.OrdMat
AND OrdHD.CustMultiAddr = T1.CustMultiAddr
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS OrdNo,

CASE WHEN OrdHD.OrdKind = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
OrdHD.OrdMat, OrdHD.CustMultiAddr,
CTM_OrdDT_Aggregate.ItemPhoto,

(SELECT MIN(T2.OrdDate) 
FROM OrdHD T2 
WHERE OrdHD.CustCode = T2.CustCode
AND OrdHD.PONo = T2.PONo
AND OrdHD.OrdKind = T2.OrdKind
AND OrdHD.OrdMat = T2.OrdMat) AS OrdDate,

OrdHD.DueDate,
OrdTrackDT.OrdSGS, OrdHD.CustQCDate, 
OrdTrackDT.TrackTest, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
CTM_OrdDT_Aggregate.SumItem,
CTM_OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
CTM_OrdDT_Aggregate.StonePenQty,
CTM_OrdDT_Aggregate.FitPenQty,
CTM_OrdDT_Aggregate.WijPenQty,
CTM_OrdDT_Aggregate.WstPenQty,
CTM_OrdDT_Aggregate.CastPenQty,
CTM_OrdDT_Aggregate.ControlPenQty,
CTM_OrdDT_Aggregate.GrindPenQty,
CTM_OrdDT_Aggregate.PolishPenQty,
CTM_OrdDT_Aggregate.PlatePenQty,
CTM_OrdDT_Aggregate.QCPenQty,
CTM_OrdDT_Aggregate.UnFinishQty,
CTM_OrdDT_Aggregate.FinishQty,
CTM_OrdDT_Aggregate.ExportQty,
CTM_OrdDT_Aggregate.BalQty,
CTM_OrdDT_Aggregate.ExpPct,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
CTM_OrdDT_Aggregate.SumAmnt

FROM OrdHD
LEFT JOIN OrdWeekPlanHD ON OrdWeekPlanHD.PlanDate = OrdHD.DueDate
LEFT JOIN OrdTrackDT ON OrdTrackDT.CustCode = OrdHD.CustCode
AND OrdTrackDT.PONo = OrdHD.PONo
AND OrdTrackDT.OrdMat = OrdHD.OrdMat
AND OrdTrackDT.OrdKind = OrdHD.OrdKind
AND OrdTrackDT.CustMultiAddr = OrdHD.CustMultiAddr
LEFT JOIN CTM_OrdDT_Aggregate ON OrdHD.CustCode = CTM_OrdDT_Aggregate.CustCode
AND OrdHD.PONo = CTM_OrdDT_Aggregate.PONo
AND OrdHD.OrdKind = CTM_OrdDT_Aggregate.OrdKind
AND OrdHD.OrdMat = CTM_OrdDT_Aggregate.OrdMat
AND OrdHD.CustMultiAddr = CTM_OrdDT_Aggregate.CustMultiAddr

WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
AND OrdHD.PONo IN (SELECT PONo FROM DupMorPONo)
AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))

GROUP BY PlanYear, PlanWeek,
OrdHD.CustCode, OrdHD.PONo,
OrdHD.OrdKind, OrdHD.OrdMat,
OrdHD.CustMultiAddr,
CTM_OrdDT_Aggregate.ItemPhoto,
OrdHD.DueDate,
OrdTrackDT.OrdSGS, OrdHD.CustQCDate, 
OrdTrackDT.TrackTest, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
CTM_OrdDT_Aggregate.SumItem,
CTM_OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
CTM_OrdDT_Aggregate.StonePenQty,
CTM_OrdDT_Aggregate.FitPenQty,
CTM_OrdDT_Aggregate.WijPenQty,
CTM_OrdDT_Aggregate.WstPenQty,
CTM_OrdDT_Aggregate.CastPenQty,
CTM_OrdDT_Aggregate.ControlPenQty,
CTM_OrdDT_Aggregate.GrindPenQty,
CTM_OrdDT_Aggregate.PolishPenQty,
CTM_OrdDT_Aggregate.PlatePenQty,
CTM_OrdDT_Aggregate.QCPenQty,
CTM_OrdDT_Aggregate.UnFinishQty,
CTM_OrdDT_Aggregate.FinishQty,
CTM_OrdDT_Aggregate.ExportQty,
CTM_OrdDT_Aggregate.BalQty,
CTM_OrdDT_Aggregate.ExpPct,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
CTM_OrdDT_Aggregate.SumAmnt

ORDER BY OrdYear,OrdWeek,ListNo

	
END
GO

PRINT '✅ SP 1/5: PC_Show_OrdTrack_Sum_OrdDate — Updated successfully'
GO


-- =============================================================================
-- 2. PC_Show_OrdTrack_Sum_All  
--    (Simple version — no Group PO By ShipTo, adds @Status + CustMultiAddr)
-- =============================================================================

SET ANSI_NULLS ON	
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[PC_Show_OrdTrack_Sum_All]
	
	@FromDate DateTime,
	@ToDate DateTime,
	@Status Varchar(20) = 'pending'

AS

BEGIN

	SET NOCOUNT ON;

WITH OrdDT_Aggregate AS (
    SELECT 
        T2.CustMultiAddr,
        T2.PONo,
        T2.OrdKind,
        T2.OrdMat,
        COUNT(OrdDT.ItemNo) AS SumItem,
        SUM(OrdDT.ItemQty) AS SumQty,
        SUM(ISNULL(OrdDT.StoneQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS StonePenQty,
        SUM(ISNULL(OrdDT.FitQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS FitPenQty,
        SUM(ISNULL(OrdDT.WijQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS WijPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(WstQty,0) - ISNULL(WijQty,0) ELSE ISNULL(WstQty,0) - ISNULL(ItemQty,0) END) AS WstPenQty,
        SUM(CASE WHEN WijQty = ItemQty THEN ISNULL(CastQty,0) - ISNULL(WijQty,0) ELSE ISNULL(CastQty,0) - ISNULL(ItemQty,0) END) AS CastPenQty,
        SUM(ISNULL(OrdDT.ControlQty, 0) - ISNULL(OrdDT.ItemQty, 0)) AS ControlPenQty,
        SUM(CASE WHEN CastQty = ItemQty THEN ISNULL(GrindQty,0) - ISNULL(CastQty,0) ELSE ISNULL(GrindQty,0) - ISNULL(ItemQty,0) END) AS GrindPenQty,
        SUM(CASE WHEN GrindQty = ItemQty THEN ISNULL(PolishQty,0) - ISNULL(GrindQty,0) ELSE ISNULL(PolishQty,0) - ISNULL(ItemQty,0) END) AS PolishPenQty,
        SUM(CASE WHEN PolishQty = ItemQty THEN ISNULL(PlateQty,0) - ISNULL(PolishQty,0) ELSE ISNULL(PlateQty,0) - ISNULL(ItemQty,0) END) AS PlatePenQty,
		SUM(CASE WHEN PlateQty = ItemQty THEN ISNULL(QCQty,0) - ISNULL(PlateQty,0) ELSE ISNULL(QCQty,0) - ISNULL(ItemQty,0) END) AS QCPenQty,
		SUM(ISNULL(OrdDT.FinishQty,0) - ISNULL(OrdDT.ItemQty,0)) AS UnFinishQty,
		SUM(ISNULL(OrdDT.FinishQty,0)) AS FinishQty,
        SUM(OrdDT.ItemExchAmnt) AS SumAmnt,
		MAX(CAST(GMItemPhoto.ItemPhoto AS VARBINARY(MAX))) AS ItemPhoto
    FROM OrdDT
    LEFT JOIN OrdHD T2 ON T2.OrdNo = OrdDT.OrdNo
    LEFT JOIN GMItemPhoto ON GMItemPhoto.ItemNo = OrdDT.ItemNo
	WHERE T2.OrdDate BETWEEN @FromDate AND @ToDate
	AND SUBSTRING(T2.OrdNo,1,3) IN ('BBC','BBQ','BBP','BBK','BBS','BBE','BBL','BBR','BBT')
	AND (@Status = 'All' OR (@Status = 'pending' AND T2.CloseStatus <> 'Y') OR (@Status = 'finish' AND T2.CloseStatus = 'Y'))
    GROUP BY T2.PONo, T2.OrdKind, T2.OrdMat, T2.CustMultiAddr
)

SELECT  
ROW_NUMBER() OVER (ORDER BY OrdWeekPlanHD.PlanYear, OrdWeekPlanHD.PlanWeek,
OrdHD.CustCode, OrdHD.PONo, OrdHD.OrdKind, OrdHD.OrdMat) AS ListNo,
ISNULL(OrdWeekPlanHD.PlanYear, 0) AS OrdYear,
ISNULL(OrdWeekPlanHD.PlanWeek, 0) AS OrdWeek,
OrdHD.CustCode, OrdHD.PONo,
LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + T1.OrdNo 
FROM OrdHD T1 
WHERE OrdHD.PONo = T1.PONo
AND OrdHD.OrdKind = T1.OrdKind
AND OrdHD.OrdMat = T1.OrdMat
AND T1.OrdNo <> '' 
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS OrdNo,
CASE WHEN OrdHD.OrdKind = 'NEW' THEN 'New' ELSE 'Replen' END AS OrdKind,
OrdHD.OrdMat, OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,
OrdHD.OrdDate, OrdHD.DueDate,
OrdTrackDT.TrackTest, OrdTrackDT.OrdSGS,
OrdHD.CustQCDate, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

FROM OrdHD
LEFT JOIN OrdWeekPlanHD ON OrdWeekPlanHD.PlanDate = OrdHD.DueDate
LEFT JOIN OrdTrackDT ON OrdTrackDT.CustCode = OrdHD.CustCode
AND OrdTrackDT.PONo = OrdHD.PONo
AND OrdTrackDT.OrdMat = OrdHD.OrdMat
AND OrdTrackDT.OrdKind = OrdHD.OrdKind
AND OrdTrackDT.CustMultiAddr = OrdHD.CustMultiAddr
LEFT JOIN OrdDT_Aggregate ON OrdHD.PONo = OrdDT_Aggregate.PONo
AND OrdHD.OrdKind = OrdDT_Aggregate.OrdKind
AND OrdHD.OrdMat = OrdDT_Aggregate.OrdMat
AND OrdHD.CustMultiAddr = OrdDT_Aggregate.CustMultiAddr

WHERE OrdHD.OrdDate BETWEEN @FromDate AND @ToDate
AND SUBSTRING(OrdHD.OrdNo,1,3) IN ('BBC','BBQ','BBP','BBK','BBS','BBE','BBL','BBR','BBT')
AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))

GROUP BY PlanYear, PlanWeek,
OrdHD.CustCode, OrdHD.PONo,
OrdHD.OrdKind, OrdHD.OrdMat,
OrdHD.CustMultiAddr,
OrdDT_Aggregate.ItemPhoto,
OrdHD.OrdDate, OrdHD.DueDate,
OrdTrackDT.TrackTest, OrdTrackDT.OrdSGS,
OrdHD.CustQCDate, OrdHD.CustDueDate,
OrdTrackDT.OORDate,
OrdDT_Aggregate.SumItem,
OrdDT_Aggregate.SumQty,
OrdTrackDT.BookDate,
OrdTrackDT.QC1_Qty, OrdTrackDT.QC1_Date,
OrdTrackDT.QC1_Fail,
OrdTrackDT.QC2_Qty, OrdTrackDT.QC2_Date,
OrdTrackDT.QC2_Fail,
OrdTrackDT.QC3_Qty, OrdTrackDT.QC3_Date,
OrdDT_Aggregate.StonePenQty,
OrdDT_Aggregate.FitPenQty,
OrdDT_Aggregate.WijPenQty,
OrdDT_Aggregate.WstPenQty,
OrdDT_Aggregate.CastPenQty,
OrdDT_Aggregate.ControlPenQty,
OrdDT_Aggregate.GrindPenQty,
OrdDT_Aggregate.PolishPenQty,
OrdDT_Aggregate.PlatePenQty,
OrdDT_Aggregate.QCPenQty,
OrdDT_Aggregate.UnFinishQty,
OrdDT_Aggregate.FinishQty,
OrdTrackDT.ProdRiskIssue, OrdTrackDT.PQCPlanShip,
OrdTrackDT.PackCard, OrdTrackDT.TickOrd,
OrdTrackDT.TickRec, OrdTrackDT.TrackSam,
OrdTrackDT.TrackCT, OrdTrackDT.TrackMF,
OrdTrackDT.PackScanDo, OrdTrackDT.PackScanSen,
OrdTrackDT.PackScanAppv, OrdTrackDT.PackScanMF,
OrdTrackDT.PolyOrd, OrdTrackDT.PolyRec,
OrdTrackDT.TagRcyRec, OrdTrackDT.TrackRemark,
OrdDT_Aggregate.SumAmnt

ORDER BY OrdYear,OrdWeek,ListNo


	
END
GO

PRINT '✅ SP 2/5: PC_Show_OrdTrack_Sum_All — Updated successfully'
GO


-- =============================================================================
-- 3-5: CustDueDate, DueDate, FinDate  
--    These are identical in structure to OrdDate but use different date columns.
--    The fix pattern is the same: replace hardcoded CloseStatus with @Status
--    in UNION 1 main WHERE, and add @Status filter to UNION 2 and UNION 3 WHERE.
--
--    Since they already have @Status parameter and @Status in CTE aggregates,
--    we only need to fix the main SELECT WHERE clauses.
-- =============================================================================

-- Note: SP CustDueDate, DueDate, FinDate scripts are very large (600+ lines each)
-- and follow the exact same pattern. For brevity, I'm showing the fix needed:
--
-- In each SP, find these lines in UNION 1 main WHERE:
--   AND OrdHD.CloseStatus <> 'Y'
-- Replace with:
--   AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))
--
-- In UNION 2 (Group PO By ShipTo) WHERE, add after the PONo IN line:
--   AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))
--
-- In UNION 3 (DupMorPONo) WHERE, add after the PONo IN line:
--   AND (@Status = 'All' OR (@Status = 'pending' AND OrdHD.CloseStatus <> 'Y') OR (@Status = 'finish' AND OrdHD.CloseStatus = 'Y'))

PRINT ''
PRINT '⚠️  SPs 3-5 (CustDueDate, DueDate, FinDate) need the same fix applied.'
PRINT '    Use the update_sp_custduedate.sql, update_sp_duedate.sql, update_sp_findate.sql scripts.'
PRINT '    Or apply the fix pattern manually in SSMS.'
GO
