# SQL — Stored Procedures & Indexes (dbGeneration)

SSOT ของ Stored Procedures และ Index ที่ระบบ PO Tracker ใช้ เก็บไว้ใน repo เพื่อกัน "หายตอน restore"
(ก่อนหน้านี้ SP/Index อยู่แต่บนเซิร์ฟเวอร์ พอ restore database ทีก็หายหมด ต้องมานั่งสร้างใหม่)

Target: **SQL Server 2012 Enterprise** · DB `dbGeneration` · server `192.168.5.40`

## โครงสร้าง

```
sql/
├── indexes.sql                     # 9 covering indexes (NONCLUSTERED, ONLINE=ON) สำหรับ PC_Show_OrdTrack_Sum_*
├── stored-procedures/              # SP เวอร์ชันปัจจุบัน (ตัดรูป base64 ออกแล้ว)
│   ├── PC_Show_OrdTrack_Sum_OrdDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_DueDate.sql      # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_CustDueDate.sql  # @FromDate/@ToDate/@Status · 63 cols
│   ├── PC_Show_OrdTrack_Sum_FinDate.sql      # @FromDate/@ToDate/@Status · 63 cols (กรอง FinishDate)
│   └── PC_Show_OrdTrack_Sum_All.sql          # @FromDate/@ToDate/@Status · 63 cols (ไม่มี UNION, ตัด dead view join)
└── _baseline/                      # snapshot ของเดิม (ก่อนแก้) ไว้ rollback + อ้างอิง
    ├── PC_Show_OrdTrack_Sum_*.sql  # definition เดิม (ยังมี GMItemPhoto/ItemPhoto)
    ├── _columns.json               # รายชื่อคอลัมน์จริงของ 6 ตารางหลัก
    └── _indexes_snapshot.json      # index ที่มีอยู่ ณ ตอน dump (มีแค่ PK_GMCust)
```

## การเปลี่ยนแปลงหลัก (2026-07-02)

### 1. ตัดรูป base64 ออกจาก SP → ประสิทธิภาพ
เดิมทุก SP `LEFT JOIN GMItemPhoto` แล้ว `MAX(CAST(ItemPhoto AS VARBINARY(MAX)))` ในทุก aggregate CTE
และ outer query ยัง `GROUP BY` ด้วยก้อน blob อีกชั้น → คอขวด
- ลบ join รูปทั้งหมด แล้วส่ง **`SampleItemNo` = `MIN(OrdDT.ItemNo)`** (ItemNo ตัวแทน 1 ค่า/กลุ่ม) แทน
- Frontend เอา `SampleItemNo`/`ItemNo` ไปประกอบ URL รูปจาก network path (`/api/photos/ps|cad/:itemNo`)
- ยืนยันแล้วว่า `GMItemPhoto` เป็น 1:1 กับ ItemNo → ผลรวม (SumQty/SumItem/SumAmnt) **ไม่เปลี่ยน** (row count เท่าเดิมเป๊ะ)

### 2. สร้าง Index (จากที่หายหมดเหลือแค่ PK_GMCust)
ตาราง OrdHD (176k), OrdDT (755k), OrdTrackDT, OrdWeekPlanHD เป็น HEAP ไม่มี index เลย → SP full scan
- `indexes.sql` สร้าง 9 covering index (NONCLUSTERED, `ONLINE=ON` ไม่ล็อกตาราง, `DATA_COMPRESSION=PAGE`)
- **ไม่** สร้าง clustered PK / ไม่แตะ heap (ลดความเสี่ยงต่อระบบ VB.net เดิมที่ใช้ DB ร่วมกัน)
- ไม่สร้าง index บน GMItemPhoto เพราะระบบเลิก join ตารางนี้แล้ว

### 3. ซ่อม `_All` ที่พังอยู่เดิม
`_All` เดิม `LEFT JOIN VPC_OrdSum_Detail` ซึ่งเป็น view ที่ binding error (อ้างตาราง MasterFileProduct/Item_Head
ที่หายหลัง restore) ทำให้ ALTER/รันไม่ได้ — view ถูก join แบบ LEFT แต่ไม่มีคอลัมน์ใดถูก SELECT (dead join, no-op
ต่อผลลัพธ์เพราะ GROUP BY ยุบ row ซ้ำ) จึงลบทิ้ง → `_All` กลับมาใช้งานได้

## การเปลี่ยนแปลงหลัก (2026-07-04) — เติมคอลัมน์ที่ UI มีช่องแต่ว่าง + @Status ครบทุกตัว

ทั้ง 5 SP ตอนนี้คืน **63 คอลัมน์เท่ากัน** (เดิม `_OrdDate`=60, `_All`=57, `_Due/_CustDue/_Fin`=62) และรับ `@Status` ครบ
ทุกการเปลี่ยนเป็นแบบ **"เพิ่ม" อย่างเดียว ไม่ลบ/ไม่แก้ logic เดิม** และ **behavior-preserving สำหรับ `@Status='pending'`**
(นิพจน์ที่ใส่ยุบกลับเป็น `CloseStatus <> 'Y'` เดิมเป๊ะเมื่อ pending) — ทดสอบด้วยการรัน body แบบ read-only เข้า DB จริง
ผ่านครบทั้ง 3 โหมด (pending/finish/All) ทุกไฟล์

| SP | `@Status` param+filter | `EXNo` (PO2) | `BookShip` | `CloseStatus` | `ExportQty/BalQty/ExpPct` |
|----|:---:|:---:|:---:|:---:|:---:|
| `_OrdDate`     | มีอยู่แล้ว | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | มีอยู่แล้ว |
| `_DueDate`     | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_CustDueDate` | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_FinDate`     | **+เพิ่ม** | มีอยู่แล้ว | มีอยู่แล้ว | **+เพิ่ม** | มีอยู่แล้ว |
| `_All`         | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** | **+เพิ่ม** |

รายละเอียดการออกแบบ:
- **`EXNo` (PO2)** — เพิ่มเป็น correlated subquery `(SELECT TOP 1 T2.EXNo ...)` วางหลัง `CustCode, PONo` (ลอก pattern จาก `_DueDate` ที่มีอยู่แล้ว) → **ไม่ต้องใส่ GROUP BY** จึงไม่กระทบ granularity ของกลุ่ม N008
- **`CloseStatus`** — เพิ่มเป็น `MIN(OrdHD.CloseStatus) AS CloseStatus` (aggregate, **ไม่อยู่ใน GROUP BY**) → ไม่แตกแถว N008 ที่รวมหลายออเดอร์. ความหมาย: MIN = "เปิดอยู่ถ้ามีออเดอร์ใดในกลุ่มยังไม่ปิด" (frontend ใช้ทำไฮไลต์แดง 'เลยกำหนด Due')
- **`BookShip`** — เพิ่ม `OrdTrackDT.BookShip`/`CTE_Track.BookShip` หลัง `BookDate` ทั้ง SELECT+GROUP BY (granularity เท่า BookDate เดิม)
- **`@Status`** — 4 ตัวที่ยังไม่มี: เพิ่ม param `@Status Varchar(20) = 'pending'` + ห่อตัวกรอง `CloseStatus <> 'Y'` เดิมทุกจุดด้วยนิพจน์ 3 ทาง
- **`_All`** — เพิ่ม `ExportQty/BalQty/ExpPct` ในทั้ง CTE + outer SELECT + GROUP BY. ⚠️ พฤติกรรม default เปลี่ยน: เดิม `_All` ไม่กรอง status (คืนทุกอย่าง) → ตอนนี้ default `@Status='pending'` (สอดคล้องกับ dateType อื่น; เลือก status='All' เพื่อคืนทุกอย่างเหมือนเดิม)
- **Idempotent header** — ทุกไฟล์ใช้ pattern `IF OBJECT_ID(...) IS NULL EXEC('CREATE ... stub'); GO; ALTER PROCEDURE ...` → rerun ซ้ำได้ ไม่ error (SQL 2012 ไม่มี `CREATE OR ALTER`); ซ่อม `_All` ที่เดิมเป็น `ALTER` เดี่ยว (พังถ้า proc ไม่มี)

> ⚠️ **finish/All mode เป็นเส้นทางใหม่ที่ควร verify กับระบบเก่า**: pending (default) preserve พฤติกรรมเดิม 100% แต่
> finish/All บน `_DueDate/_CustDueDate/_FinDate` ยังคง filter `TrackStatus <> 'Y'` ใน CTE_Track ไว้ตามเดิม
> (ออเดอร์ที่ปิดแล้วอาจมี track fields ว่างในกลุ่ม N008) — แนะนำเทียบผลกับ VB.net เดิมก่อนใช้จริง

## วิธี Apply (ตามลำดับ)

รันด้วย SSMS หรือ `sqlcmd` (ไฟล์มี `GO` batch separator + `IF NOT EXISTS` / `ALTER PROCEDURE` กันพัง):

```bash
# 1) Index ก่อน (ONLINE, ใช้เวลาไม่กี่วินาที)
sqlcmd -S 192.168.5.40 -d dbGeneration -U <user> -i indexes.sql

# 2) Stored Procedures (ALTER — คงสิทธิ์เดิม ไม่ต้อง DROP)
sqlcmd -S 192.168.5.40 -d dbGeneration -U <user> -i stored-procedures/PC_Show_OrdTrack_Sum_OrdDate.sql
#   ... ทำครบทั้ง 5 ไฟล์
```

> ⚠️ **ต้อง apply SP ทั้ง 5 ก่อน deploy backend รุ่นใหม่**: `routes/orders.js` ตอนนี้ส่ง `@Status` ให้ SP **ทุกตัว**
> — ถ้ายังไม่ apply SP ใหม่ ตัวที่ยังไม่มี `@Status` จะ error "too many arguments" ทันที (apply SQL → แล้วค่อย deploy backend)

## Rollback
ALTER กลับด้วยไฟล์ใน `_baseline/` (ต้องเติม `USE [dbGeneration]` + เปลี่ยน `CREATE` เป็น `ALTER` เอง
เพราะ dump มาเป็น `CREATE PROCEDURE`)
