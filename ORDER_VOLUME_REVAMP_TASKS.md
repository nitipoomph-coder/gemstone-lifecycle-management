# 📋 งาน Revamp หน้า Order Volume Summary

## สถานะ: รอตัดสินใจ + ทดสอบข้อมูล

---

## 🐛 Bug ที่พบ (ต้องแก้แน่นอน)

- [ ] **YoY เปรียบเทียบไม่ทำงาน** — `primaryChartData` กับ `compareChartData` เรียกฟังก์ชันเดียวกัน ได้ข้อมูลเหมือนกัน (บรรทัด 620-633 ใน `OrderVolumeSummaryPage.tsx`)
- [x] **`customerName` ลบจาก search filter แล้ว** (บรรทัด 682)

---

## 📊 ส่วน 1: SQL View (`VW_Web_SalesDashboard`)

**ปัญหา**: View ดึงข้อมูลจาก 3 ตาราง (`OrdHD` INNER JOIN `OrdDT` LEFT JOIN `GMCust`) บาง field ไม่ได้ใช้ หรือห้ามใช้

**สิ่งที่ต้องทำ**:
- [ ] ดู View ปัจจุบันใน DB จริงว่าเป็น `VW_Web_SalesDashboard` หรือ `VW_SalesOrderLineAnalytics` (ชื่อต่างกันในโค้ด)
- [ ] ตรวจว่า View จริงใน DB ตรงกับไฟล์ `sql/viewsDB/VW_SalesOrderLineAnalytics.sql` หรือไม่
- [ ] ออกแบบ View ใหม่ — ไม่ใช่แค่ตัด field แต่ต้องดูว่า:
  - field ไหนต้อง**เพิ่ม**เข้ามา
  - field ไหน**ไม่จำเป็น**
  - JOIN ไหน**ตัดได้** หรือ**ต้องเปลี่ยนวิธี**
- [ ] **ห้ามใช้**: `CustomerName` (`GMCust.CustName`)
- [ ] ตรวจว่าหน้าอื่นที่ใช้ View เดียวกัน (`customerReportMatrix.js`) จะไม่กระทบ

**ไฟล์ที่เกี่ยวข้อง**:
- `backend/sql/viewsDB/VW_SalesOrderLineAnalytics.sql` — นิยาม View
- `backend/routes/orderVolumeSummary.js` บรรทัด 13 — ชื่อ View ที่ใช้
- `backend/routes/customerReportMatrix.js` บรรทัด 84 — หน้า Matrix ใช้ View เดียวกัน

---

## 🔧 ส่วน 2: Backend Endpoints

**ปัญหา**: `sales-orders` endpoint ดึง 30+ fields + LEFT JOIN GMGoodType ทุกครั้ง

**สิ่งที่ต้องทำ**:
- [ ] ลด fields ใน `sales-orders` endpoint หรือสร้าง endpoint ใหม่ `sales-orders-light`
- [ ] ตัด `LEFT JOIN GMGoodType` ออก (ใช้แค่เพื่อได้ `itemTypeName` ที่ใช้แค่ search filter)
- [ ] ตรวจว่า `SalesCustomerGroupDetail.tsx` ที่เรียก endpoint เดียวกันจะไม่กระทบ

**Endpoint ที่มีอยู่แล้วแต่ frontend ไม่ได้ใช้** (ควรเปลี่ยนมาใช้):
| Endpoint | ข้อมูล | ขนาด |
|---|---|---|
| `sales-monthly-analytics` | year/month aggregate | ~24 rows |
| `sales-type-analytics` | year/month/type aggregate | ~120 rows |
| `sales-weekly-analytics` | year/week aggregate | ~104 rows |
| `sales-due-outlook` | due/shipped ต่อ year/month | ~24 rows |

**ไฟล์ที่เกี่ยวข้อง**:
- `backend/routes/orderVolumeSummary.js` — ทุก endpoint อยู่ในนี้

---

## 💻 ส่วน 3: Frontend (`OrderVolumeSummaryPage.tsx`)

**ปัญหา**: ดึง raw rows หลายพัน → คำนวณ aggregate ฝั่ง client ทั้งที่ backend มี API สำเร็จรูป

**สิ่งที่ต้องทำ**:
- [ ] **แก้ bug YoY** — แยก report year กับ compare year ให้ถูก
- [ ] **เปลี่ยน Overview** ให้ใช้ aggregate API:
  - `calcTotals()` → `fetchSalesMonthlyAnalytics`
  - `buildMonthlyTypeData()` → `fetchSalesTypeAnalytics`
  - `buildWeeklyComparisonData()` → `fetchSalesWeeklyAnalytics`
  - `buildDueOutlookData()` → `fetchSalesDueOutlook`
- [ ] **ลบ filter bar ซ้ำซ้อน** — ใช้ filter จาก Layout ทั้งหมดเหมือน Matrix
- [ ] **รับ `kpiCompareYear`** จาก `useOutletContext` (ปัจจุบันไม่ได้ใช้)
- [ ] **Details view** — lazy load `fetchSalesOrders` เฉพาะตอนกดเข้า Details

**ไฟล์ที่เกี่ยวข้อง**:
- `frontend/src/pages/OrderVolumeSummaryPage.tsx` (~1,068 บรรทัด)
- `frontend/src/services/orderVolumeSummaryAPI.ts` — API functions

---

## 🧹 ส่วน 4: Cleanup

- [ ] ลบ client-side aggregation functions ที่ไม่ใช้แล้ว (~230 บรรทัด):
  - `buildMonthlyTypeData()`, `buildWeeklyComparisonData()`
  - `buildDueOutlookData()`, `calcTotals()`
  - `calendarWeekNumber()`, `weekFromOrder()`, `calendarWeekRange()`
  - `formatWeekRange()`, `groupWeeklyComparisonData()`
  - `rowMetricValue()`, `growthPercent()`

---

## ❓ สิ่งที่ต้องตัดสินใจ (รอพี่ตอบ)

1. **Details view** — เก็บไว้ (lazy load) / ลบทิ้ง / ลด columns?
2. **Weekly comparison** — เก็บไว้ (แก้ bug) / ลบออก?
3. **Due Date Outlook** — เก็บไว้ (ใช้ API aggregate) / ลบออก?
4. **View ต้องเพิ่ม field อะไร** — รอพี่ดูข้อมูลจริงใน DB แล้วบอก

---

## 📁 ไฟล์ทั้งหมดที่เกี่ยวข้อง

| ไฟล์ | ทำอะไร |
|---|---|
| `backend/sql/viewsDB/VW_SalesOrderLineAnalytics.sql` | ออกแบบ View ใหม่ |
| `backend/routes/orderVolumeSummary.js` | ลด fields / ตัด JOIN |
| `frontend/src/pages/OrderVolumeSummaryPage.tsx` | เปลี่ยนมาใช้ aggregate API |
| `frontend/src/services/orderVolumeSummaryAPI.ts` | API functions (อาจไม่ต้องแก้) |
| `frontend/src/pages/CustomerDashboardLayout.tsx` | Layout filter (อาจไม่ต้องแก้) |
