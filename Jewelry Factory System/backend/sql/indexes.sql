/* =============================================================================
   PO Tracker — Covering Indexes for PC_Show_OrdTrack_Sum_* stored procedures
   Target: SQL Server 2012 Enterprise, DB [dbGeneration], server 192.168.5.40

   บริบท (2026-07-02): หลัง restore ตาราง OrdHD/OrdDT/OrdTrackDT/OrdWeekPlanHD
   กลายเป็น HEAP ไม่มี index เลย (เหลือแค่ PK_GMCust) ทำให้ SP วิ่ง full scan
   บน OrdDT (755k แถว) + correlated subquery ต่อแถว = คอขวดหลัก

   ชุด index นี้เป็น NONCLUSTERED COVERING ทั้งหมด (ไม่แตะ heap/ไม่สร้าง clustered PK
   เพื่อลดความเสี่ยงต่อระบบเดิม VB.net ที่ใช้ DB ร่วมกัน) และสร้างแบบ ONLINE=ON
   เพื่อไม่ให้ล็อกตารางระหว่างสร้าง — ทุกตัวมี IF NOT EXISTS กัน error ตอนรันซ้ำ

   คอลัมน์ทั้งหมดตรวจสอบกับ schema จริงแล้ว (sys.columns) ณ 2026-07-02
   ============================================================================= */

USE [dbGeneration];
GO

/* ---- OrdHD : date-range driving indexes (ต่อ 1 SP ต่อ 1 date column) ---- */

-- SP: _OrdDate และ _All
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_OrdDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_OrdDate ON dbo.OrdHD (OrdDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, DueDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _DueDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_DueDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_DueDate ON dbo.OrdHD (DueDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _CustDueDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_CustDueDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_CustDueDate ON dbo.OrdHD (CustDueDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, DueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

-- SP: _FinDate (กรองด้วยคอลัมน์ FinishDate)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_FinishDate' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_FinishDate ON dbo.OrdHD (FinishDate)
  INCLUDE (OrdNo, CustCode, PONo, OrdKind, OrdMat, CustMultiAddr, CloseStatus, OrdDate, DueDate, CustDueDate, CustQCDate)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdHD : รองรับ correlated subquery MIN(OrdDate), STUFF FOR XML, และ outer join ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdHD_Cust_PO_Kind_Mat' AND object_id = OBJECT_ID('dbo.OrdHD'))
CREATE NONCLUSTERED INDEX IX_OrdHD_Cust_PO_Kind_Mat ON dbo.OrdHD (CustCode, PONo, OrdKind, OrdMat)
  INCLUDE (OrdNo, OrdDate, DueDate, CustDueDate, CustMultiAddr, CloseStatus)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdDT (755k แถว) : covering index สำหรับ aggregate SUM ทุกขั้นตอน + MIN(ItemNo) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdDT_OrdNo' AND object_id = OBJECT_ID('dbo.OrdDT'))
CREATE NONCLUSTERED INDEX IX_OrdDT_OrdNo ON dbo.OrdDT (OrdNo)
  INCLUDE (ItemNo, ItemQty, StoneQty, FitQty, WijQty, WstQty, CastQty, ControlQty,
           GrindQty, PolishQty, PlateQty, QCQty, FinishQty, ExportQty, ItemExchAmnt)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdTrackDT (เล็ก) : join key (CustCode,PONo,OrdMat,OrdKind,CustDueDate,CustMultiAddr) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdTrackDT_Join' AND object_id = OBJECT_ID('dbo.OrdTrackDT'))
CREATE NONCLUSTERED INDEX IX_OrdTrackDT_Join ON dbo.OrdTrackDT (CustCode, PONo, OrdMat, OrdKind, CustDueDate, CustMultiAddr)
  INCLUDE (OrdTrackID)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- OrdWeekPlanHD (เล็ก) : join OrdHD.DueDate = OrdWeekPlanHD.PlanDate ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrdWeekPlanHD_PlanDate' AND object_id = OBJECT_ID('dbo.OrdWeekPlanHD'))
CREATE NONCLUSTERED INDEX IX_OrdWeekPlanHD_PlanDate ON dbo.OrdWeekPlanHD (PlanDate)
  INCLUDE (PlanYear, PlanWeek)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

/* ---- GMCust : lookup ชื่อลูกค้า/เซลส์ (ใช้ในหน้า detail) ---- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GMCust_CustCode' AND object_id = OBJECT_ID('dbo.GMCust'))
CREATE NONCLUSTERED INDEX IX_GMCust_CustCode ON dbo.GMCust (CustCode)
  INCLUDE (CustName, SalesName, CustStatus)
  WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);
GO

PRINT 'PO Tracker indexes ensured.';
GO
