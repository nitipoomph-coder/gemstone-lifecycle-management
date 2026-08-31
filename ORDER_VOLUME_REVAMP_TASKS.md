# 📋 งาน Revamp หน้า Order Volume Summary (Order Trends)

## สถานะ: ✅ เสร็จสมบูรณ์ 100% (Completed & Verified against Production DB)

---

## 🎯 สรุปผลงานการปรับปรุง (Key Accomplishments):

1. **SQL View & Database Layer (`dbo.VW_Web_OrderTrends` & `dbo.VW_Web_SalesDashboard`):**
   - [x] รวมศูนย์ Business Logic เข้าสู่ View กลาง SSOT (Single Source of Truth)
   - [x] สอดคล้อง 100% กับ Stored Procedure โรงงาน (`dbo.PC_Show_OrdTrack_Sum_OrdDate`)
   - [x] กรองเฉพาะ Order Prefixes การผลิตจริง: `IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP')`
   - [x] ตัดงานตัวอย่างภายใน (`BBI`), ใบเสนอราคา (`BBQ`), งานซ่อม (`BBD`), งานสต็อกโชว์รูม (`BBK`) ออก 100%
   - [x] ตัดบิลทดสอบที่ระบุ PONo เป็น `TOP`, `Test`, `Testing`, `Stock`, หรือค่าว่าง ออกทั้งหมด
   - [x] ป้องกันข้อมูลลูกค้า: ใช้เฉพาะ `CustCode` ไม่เปิดเผย `CustName`

2. **Backend Endpoints (`backend/routes/orderVolumeSummary.js`):**
   - [x] ยกระดับให้ใช้ Aggregation API ความเร็วสูง:
     - `GET /api/dashboard/sales-monthly-analytics` (ยอดขายรายเดือนเทียบ YoY)
     - `GET /api/dashboard/sales-delivery-outlook` (จุดคอขวด 9 แผนก + สรุปกลุ่มลูกค้า)
     - `GET /api/dashboard/sales-risk-analytics` (ความเสี่ยงตามกลุ่มลูกค้า)
     - `GET /api/dashboard/sales-orders` (Order Details แบบเบาและรวดเร็ว)

3. **Frontend Overview Tab (`OrderVolumeSummaryPage.tsx`):**
   - [x] ปรับแถบสรุป 6 KPI แบบ Sleek Flat Single Row:
     - `Total Overdue`, `Due in 15 Days`, `Total WIP (Factory)`, `Top Bottleneck`, `On-Time Completion Rate (%)`, `Overdue Rate (%)`
   - [x] กราฟแนวโน้มคำสั่งซื้อ `Order Volume & Delivery Rate Trend` (Recharts SVG Dark Mode Contrast ปรับแต่งสมบูรณ์)
   - [x] กราฟแท่งความเสี่ยง `Delivery Risk by Customer Group` (แยกสถานะ On Schedule vs Overdue)
   - [x] ตาราง `Active Production by Department` (9 แผนก พร้อม % Share ของโรงงาน และปัดเศษทศนิยมชัดเจน `< 1%`)
   - [x] ตาราง `Pending Orders by Customer Group` (สรุปภาพรวมรายกลุ่มใหญ่ N008, N044, N098, N051, N083, MLT)
   - [x] ลบ Container และเส้นขอบซ้ำซ้อนตาม ERP Design Standards

4. **Frontend Order Details Tab (`VolumeOrdersTable.tsx`):**
   - [x] รองรับการเข้าดูได้โดยตรง (Direct Access) โดยไม่ต้อง Drill-down ก่อน
   - [x] ตารางจัดเต็ม 14 คอลัมน์ (`Order No.`, `PO No.`, `CustCode`, `Group`, `Item No.`, `Order Date`, `Due Date`, `Status`, `Factory Stage`, `Ordered Qty`, `Shipped Qty`, `Open Qty`, `Open Value ($)`, `Days +/-`)
   - [x] เพิ่มแถบตัวกรอง Interactive Filters:
     - **Dept Filter:** เลือกระบุแผนกเอง (`All Departments`, `Wax/Prep`, `Casting`, `Grinding`, `Filing`, `Setting`, `Polishing`, `Plating`, `QC`, `Packing`)
     - **Status Filter:** เลือกระบุสถานะความเสี่ยงเอง (`All Statuses`, `Overdue`, `Due in 15 Days`, `Due in 16-30 Days`, `Future Due`, `Shipped`)
     - **Group Filter:** เลือกระบุกลุ่มลูกค้าเอง (`All Groups`, `N008`, `N044`, `N098`, `N051`, `N083`, `MLT`)
     - **Search Box:** ค้นหาด่วนด้วย OrdNo, PONo, ItemNo, CustCode
     - **Reset Button:** รีเซ็ตตัวกรองทั้งหมดในคลิกเดียว

5. **Print & PDF High-Fidelity Styling:**
   - [x] เพิ่ม `@media print` จัดหน้ากระดาษ A4 แนวนอน (Landscape) อัตโนมัติ
   - [x] แก้ปัญหาการ์ดทับซ้อน ปลดล็อก Scrollbars และป้องกัน Page Break ตัดกลางการ์ด

---

## 📁 ไฟล์ทั้งหมดที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `backend/sql/views/VW_Web_OrderTrends.sql` | View กลางสำหรับ Order Trends / Details |
| `backend/sql/views/VW_Web_SalesDashboard.sql` | View กลางสำหรับ Customer Dashboard / Matrix |
| `backend/sql/ERP_DATA_MAPPING_AND_LOGIC.md` | คู่มือความสัมพันธ์ข้อมูลและ Business Logic |
| `backend/routes/orderVolumeSummary.js` | API routes สำหรับ Order Trends |
| `frontend/src/pages/OrderVolumeSummaryPage.tsx` | หน้าหลัก Order Trends |
| `frontend/src/components/dashboard/orderVolume/VolumeOrdersTable.tsx` | ตาราง Order Details พร้อม Interactive Filters |
| `frontend/src/components/dashboard/orderVolume/FactoryDepartmentWIP.tsx` | ตารางแผนกโรงงาน 9 ขั้นตอน |
| `frontend/src/components/dashboard/orderVolume/CustomerBacklogTable.tsx` | ตารางสรุปยอดค้างส่งรายกลุ่มลูกค้า |
| `frontend/src/hooks/useOrderVolumeSummaryData.ts` | Hook จัดการ State และ API Fetching |
