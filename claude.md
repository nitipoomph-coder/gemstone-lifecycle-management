# Gemstone Lifecycle Management — Project Context

## Project Overview

ระบบจัดการวงจรชีวิตพลอยและเครื่องประดับ (Gemstone Lifecycle Management) สำหรับโรงงานเครื่องประดับ
เป็นการ **Modernize** ระบบเดิมที่เขียนด้วย VB.net + SQL Server ให้เป็น Web Application แบบ Full-Stack  
ใช้งานภายในองค์กร (Intranet) เชื่อมต่อฐานข้อมูลจริง (MSSQL — `CLLDBS`) ผ่าน Stored Procedures

### Business Modules

| Module                 | รหัสเอกสาร                          | สถานะ              |
|------------------------|--------------------------------------|--------------------|
| ภาพรวม (Dashboard)      | —                                    | ✅ Live             |
| Sales Dashboard        | —                                    | ✅ Live             |
| Customer Dashboard     | —                                    | ✅ Live             |
| จัดซื้อและรับเข้า        | SPA, SRA, SRB, SIR                   | 🟡 DocumentLayout done |
| ออเดอร์และการเบิก       | SOA, SIA, SIB, SIP, SIS             | 🟡 DocumentLayout done |
| ห้องตัวอย่าง            | SSA, SIM                             | 🟡 DocumentLayout done |
| ตรวจสอบและนับสต็อก      | Check Dispatch/Sample/Purchase/Stock | ⬜ Placeholder      |
| PO Tracker             | —                                    | ✅ Live (core feature) |
| สต็อกอะไหล่             | SP-Order, SP-Issue, SP-Receive, …    | ⬜ Placeholder      |

### Key Feature: Order Tracker

ระบบ Order Tracker เป็นฟีเจอร์หลักที่ใช้งานจริงแล้ว ทำหน้าที่:
- ดึงข้อมูล Order จาก Stored Procedures (`PC_Show_OrdTrack_Sum_*`)
- Aggregate ข้อมูลฝั่ง Node.js (กรุ๊ปด้วย 5 แกน: Cust, PO, Type, ShipTo, Material)
- กรอง Pending/Finish ที่ฝั่ง Backend (ไม่ส่ง Status parameter ไปให้ DB เก่าเพราะ SP ไม่รองรับ)
- แสดงรูป Item Photo (base64 conversion จาก VARBINARY)
- In-Memory Cache 5 นาที + Request Coalescing ป้องกัน concurrent queries

---

## Tech Stack

### Frontend

| Technology        | Version | Purpose                              |
|-------------------|---------|--------------------------------------|
| React             | 19.x    | UI Library                           |
| TypeScript        | 6.x     | Type Safety                          |
| Vite              | 8.x     | Build Tool & Dev Server              |
| Tailwind CSS      | 4.x     | Utility-First CSS (via `@tailwindcss/vite`) |
| React Router DOM  | 7.x     | Client-Side Routing                  |
| Lucide React      | 1.x     | Icon Library                         |

### Backend

| Technology | Version | Purpose                         |
|------------|---------|----------------------------------|
| Node.js    | —       | Runtime                          |
| Express    | 5.x     | HTTP Framework                   |
| mssql      | 12.x   | SQL Server Driver (Connection Pool) |
| dotenv     | 17.x   | Environment Variable Management  |
| cors       | 2.x    | Cross-Origin Resource Sharing    |
| nodemon    | 3.x    | Dev Auto-Restart (devDependency) |

### Database

| Technology      | Details                               |
|-----------------|---------------------------------------|
| Microsoft SQL Server | Production: `CLLDBS` server        |
| Connection      | TCP/IP, Port 1433, No Encryption     |
| Key Tables      | `OrdHD`, `OrdDT`, `GMCust`, `GMItemPhoto` |
| Stored Procedures | `PC_Show_OrdTrack_Sum_*` (OrdDate, DueDate, CustDueDate, FinDate, All) |

### Design System

| Design System | Details                                         |
|---------------|--------------------------------------------------|
| Theme Engine  | 3 themes via `ThemeContext` + CSS custom properties |
| Themes        | `modern-dark` (default), `dark-gold`, `royal-white` |
| Color System  | OKLCH color space                                |
| Fonts         | **Cinzel** (logo), **Outfit** (headings/display), **Prompt** (body) |
| Chart Colors  | `--color-chart-1` ~ `--color-chart-6` (semantic, ครบทุก theme) |
| Table Colors  | `--color-table-header`, `--color-table-row-alt`, `--color-table-footer` |
| Animations    | `fadeInUp`, skeleton shimmer, stagger classes    |
| Login Page    | Redesigned split-screen layout with Luxury UI enhancements (parchment texture, floating inputs, glare-sweep buttons). Protected Registration Flow (Admin Auth). Custom generated realistic catalog photos for background slider. Forced `royal-white` theme to prevent dark-mode text invisibility on logout. |

---

## Folder Structure

```
gemstone-lifecycle-management/
├── claude.md                          # ← ไฟล์นี้ (project context)
├── debug-history.md                   # 🔧 บันทึกปัญหาและการแก้ไข
│
└── Jewelry Factory System/
    ├── .gitignore
    │
    ├── frontend/                      # ⭐ React + Vite + TypeScript
    │   ├── index.html                 # HTML entry point
    │   ├── vite.config.ts             # Vite config (proxy /api → :3001)
    │   ├── tsconfig.json              # TypeScript root config
    │   ├── tsconfig.app.json          # App-specific TS config
    │   ├── tsconfig.node.json         # Node TS config (vite.config)
    │   ├── eslint.config.js           # ESLint flat config
    │   ├── package.json
    │   │
    │   └── src/
    │       ├── main.tsx               # React entry (ThemeProvider wraps App)
    │       ├── App.tsx                # Route definitions (BrowserRouter)
    │       ├── index.css              # 🎨 Global styles, theme variables, animations
    │       │
    │       ├── components/
    │       │   ├── layout/
    │       │   │   ├── AppLayout.tsx        # Shell layout (Sidebar + Topbar + Outlet)
    │       │   │   ├── DocumentLayout.tsx   # 🏗️ Unified Document Layout (IoC/Slot Injection)
    │       │   │   ├── Sidebar.tsx          # Left nav sidebar
    │       │   │   └── Topbar.tsx           # Top bar (search, theme switcher, breadcrumb)
    │       │   ├── dashboard/
    │       │   │   ├── StatCard.tsx         # Dashboard stat card component
    │       │   │   ├── CardDetailPanel.tsx  # Dashboard card drill-down panel (YoY comparison)
    │       │   │   ├── OrderTable.tsx       # Order summary table component
    │       │   └── navigation/
    │       │       └── NavGroup.tsx         # Collapsible nav group component
    │       │
    │       ├── pages/
    │       │   ├── LoginPage.tsx              # หน้า Login
    │       │   ├── Dashboard.tsx              # หน้าภาพรวม (home)
    │       │   ├── DashboardDetail.tsx         # Dashboard detail drilldown
    │       │   ├── SalesDashboard.tsx          # ⭐ Sales Summary By Rep (กราฟเปรียบเทียบยอดขาย Sales)
    │       │   ├── CustomerDashboard.tsx       # ⭐ Yearly Sales By Customer (กราฟเปรียบเทียบยอดขายลูกค้า)
    │       │   ├── CustomerReportPage.tsx      # ⭐ Customer Report (Matrix Table สรุปยอดขายรายลูกค้า)
    │       │   ├── POTrackerAdvanced.tsx       # ⭐ PO Tracker main (list view — เดิมชื่อ OrderTrackerAdvanced)
    │       │   ├── OrderDetailPage.tsx         # Order detail (by ord/po/group)
    │       │   ├── ItemDetailPage.tsx          # Item-level detail
    │       │   ├── PlaceholderPage.tsx         # Placeholder for unimplemented modules
    │       │   └── document/
    │       │       ├── ProcurementDocPage.tsx   # 🏗️ จัดซื้อและรับเข้า (SPA, SRA, SRB, SIR)
    │       │       ├── RequisitionDocPage.tsx   # 🏗️ ออเดอร์และการเบิก (SOA, SIA, SIB, SIP, SIS)
    │       │       └── SampleDocPage.tsx        # 🏗️ ห้องตัวอย่าง (SSA, SIM)
    │       │
    │       ├── services/
    │       │   ├── poTrackerAPI.ts     # API client for PO Tracker endpoints
    │       │   ├── orderAPI.ts        # API client for order detail endpoints
    │       │   ├── dashboardAPI.ts    # API client for dashboard/sales/customer stats
    │       │   ├── procurementAPI.ts  # API client for procurement document endpoints
    │       │   ├── requisitionAPI.ts  # API client for requisition document endpoints
    │       │   └── sampleAPI.ts       # API client for sample room endpoints
    │       │
    │       ├── config/
    │       │   ├── menuConfig.ts      # Sidebar menu structure definition
    │       │   ├── formConfigs.ts     # Document form field configurations (all doc types)
    │       │   └── customerGroups.ts  # SSOT for customer group mapping (N008, MLT, etc.)
    │       │
    │       ├── contexts/
    │       │   └── ThemeContext.tsx    # Theme provider (dark-gold/royal-white/modern-dark)
    │       │
    │       ├── types/
    │       │   └── index.ts           # Shared TypeScript interfaces
    │       │
    │       └── assets/                # Static assets (images, icons)
    │
    └── backend/                       # ⭐ Express + MSSQL
        ├── server.js                  # Express app entry (+ Photo Bridge routes)
        ├── db.js                      # SQL Server connection pool (singleton)
        ├── .env                       # 🔒 Local env (gitignored)
        ├── .env.example               # Env template
        ├── package.json
        │
        ├── routes/
        │   ├── orders.js              # ⭐ /api/orders — PO Tracker APIs
        │   ├── dashboard.js           # /api/dashboard — Dashboard/Sales/Customer stats
        │   ├── search.js              # /api/search — Global search
        │   ├── procurement.js         # /api/procurement — Procurement document APIs
        │   ├── requisition.js         # /api/requisition — Requisition document APIs
        │   ├── sample.js              # /api/sample — Sample room APIs
        │   └── lock.js                # /api/lock — Document locking
        │
        └── check_sales.js             # Utility: sales data inspection
```

---

## Coding Rules

### General

1. **ภาษา**: Code ทั้งหมดเป็นภาษาอังกฤษ, Comments สามารถใช้ภาษาไทยได้
2. **Encoding**: UTF-8 ทุกไฟล์ (รองรับ Thai text)
3. **Line Ending**: CRLF (Windows environment)
4. **Git**: ห้าม commit `.env`, `node_modules/`, `dist/`, test scripts
5. **📋 Documentation Rule**: ทุกครั้งที่ทำการเพิ่ม/ลบ/แก้ไขฟีเจอร์ หรือแก้ bug ต้องอัปเดตไฟล์เอกสารให้ตรงกันเสมอ:
   - `claude.md` — อัปเดต Folder Structure, Business Modules, API Endpoints, และ Section ที่เกี่ยวข้อง
   - `debug-history.md` — บันทึกปัญหาที่เกิดขึ้นและวิธีแก้ไข (เฉพาะกรณี Bug/Error เท่านั้น)
6. **🔍 File Integrity Check Rule**: เมื่อได้รับมอบหมายให้อ่านหรือแก้ไขไฟล์ใด ๆ **ต้องตรวจสอบไฟล์นั้นทุกบรรทัดอย่างละเอียด ทั้งก่อนเริ่มงานและหลังจบงานเสมอ** เพื่อป้องกันปัญหาโค้ดขาดหาย (Missing code/JSX tags) หรือ Syntax errors จากการทำ Replace/Edit พลาด

### Frontend Rules

1. **Component Style**: ใช้ Functional Components + Hooks เท่านั้น (ไม่ใช้ Class Components)
2. **Styling**: ใช้ Tailwind CSS v4 เป็นหลัก, inline `@theme` variables ใน `index.css`
3. **Theme Variables**: สีทั้งหมดต้องอ้างอิงผ่าน CSS Custom Properties ใน `@theme` block — ห้าม hardcode สี
4. **Type Safety**: ทุก component ต้อง type props ด้วย TypeScript interfaces (ประกาศใน `types/index.ts` หรือ inline)
5. **Routing**: ใช้ React Router v7 (`BrowserRouter` + `Routes` + `Route`), layout ผ่าน `<Route element={<AppLayout />}>`
6. **API Calls**: แยก API calls ไว้ใน `services/` folder — ห้ามเรียก fetch ตรงใน component
7. **Icons**: ใช้ `lucide-react` เท่านั้น — import เฉพาะ icon ที่ใช้ (tree-shakable)
8. **Menu Config**: Menu structure ทั้งหมดอยู่ใน `config/menuConfig.ts` — ห้าม hardcode menu ใน Sidebar
9. **Font Stack**: 
   - Headings: `font-display` → Outfit (or Inter for enterprise/B2B feel)
   - Body text: `font-body` → Prompt
   - Logo/Brand: `font-logo` → Cinzel
10. **Loading Skeletons**: เมื่อมีการเพิ่ม/แก้ไข กล่องข้อมูล (Boxes/Cards) ในหน้าจอใด ๆ ต้องอัปเดตส่วนแสดงสถานะกำลังโหลด (Loading Skeleton) ให้สอดคล้องกันทั้งหน้าจอ เพื่อหลีกเลี่ยงอาการ Layout Shift โดยส่วนโหลดนี้ต้องคลุมเฉพาะพื้นที่แสดงผลของหน้านั้น ๆ (Content Outlet) ไม่ต้องโหลดส่วนเมนู (Sidebar/Topbar) ซ้ำ
11. **UI Components & UX**: 
    - หลีกเลี่ยงการใช้ native `<datalist>` สำหรับ Dropdown ที่ซับซ้อน ให้ใช้ Custom React Dropdown component แทน เพื่อให้สามารถกำหนด CSS, z-index, hover states และ interaction ได้เต็มที่
    - **Accessibility & Contrast**: สีตัวอักษรบนพื้นหลังใดๆ ต้องมี Contrast ratio อย่างน้อย 4.5:1 (เช่น placeholder บนพื้นสีเข้มควรใช้สีที่สว่างพอ, หรือเพิ่ม glassmorphism card รองรับแบบฟอร์มเพื่อป้องกันพื้นหลังลายตา)
    - **Capitalization**: ใช้มาตรฐานเดียวกันทั้งแอป เช่น Title Case ("Sales", "Password") แทนที่จะผสม ALL CAPS กับ Title Case ใน level เดียวกัน

## Frontend Architecture Rules (UI Layout Patterns)

เพื่อป้องกันการเกิดภาวะโค้ดปนเปื้อน (Code Pollution) และลดความเกี่ยวเนื่องกันอย่างหนาแน่นเกินไป (Tight Coupling) ระบบจึงถูกขับเคลื่อนด้วยหลักการ **Inversion of Control (IoC) / Slot Injections** ผ่านคอมโพเนนต์ส่วนกลางสูงสุดตัวเดียวคือ `DocumentLayout.tsx`

## Skills & Portfolio Data Rules
1. **Single Source of Truth:** ข้อมูลสกิล ผลงาน หรือใบเซอร์ทั้งหมดของระบบ ต้องสถิตอยู่ภายในไดเรกทอรี `src/config/` เท่านั้น (ห้าม Hardcode สตริงข้อมูลลงในไฟล์ UI `.tsx` โดยตรง)
2. **Icon Mapping:** ให้ผูกตัวแปร Object ของ Icon Library (`lucide-react`) เข้ากับโครงสร้างของอาเรย์ข้อมูลในไฟล์ Config โดยตรง เพื่อหลีกเลี่ยงการใช้คำสั่ง `switch-case` ค้นหาชื่อไอคอนภายหลังในฝั่ง Component

### กฎเหล็กในการรักษามาตรฐานสากล:
1. **DocumentLayout (The Shell)** มีหน้าที่รับผิดชอบแต่เพียงระบบรอบนอก (เช่น โครงปุ่มทูลบาร์, กล่องแถบค้นหาเอกสารฝั่งซ้าย, ระบบสถานะ Loading/Error) โดยจะ**ไม่รับรู้ข้อมูลเชิงธุรกิจใดๆ** ทั้งสิ้น
2. **ห้ามทำการ Hardcode หรือฝังเงื่อนไขเฉพาะเมนู** (เช่น ดักเงื่อนไขข้อมูลพลอย หรือยิงเรียก URL API ของรูปภาพ PS/CAD) ภายในไฟล์ `DocumentLayout.tsx` เด็ดขาด
3. หากมีหน้าจอใดที่ต้องการแสดงผลโครงสร้างข้อมูลเฉพาะตัว ให้ทำการป้อนโค้ด JSX ชิ้นส่วนนั้นผ่านกล่องรับฝาก (Extensible Props Slots) แทน:

```typescript
// คุณสมบัติยืดหยุ่นที่ถูกจัดเตรียมไว้ให้หน้าลูกเรียกใช้
interface DocumentLayoutProps {
  renderHeaderSummary?: (header: any, lines: any[]) => React.ReactNode; // ชิ้นส่วนสรุปหัวด้านบน
  renderSubDetailPanel?: (selectedLine: any, idx: number) => React.ReactNode; // ชิ้นส่วนข้อมูลเชิงลึกขอด้านล่างฟอร์ม
  renderRightSidePanel?: (selectedLine: any, idx: number) => React.ReactNode; // ชิ้นส่วนรูปภาพ/สถิติแถบขวา
  renderFooterStats?: (lines: any[]) => React.ReactNode; // แถบข้อมูลสรุปท้ายตารางประมวลผล
  customModal?: React.ReactNode; // กล่องเปรียบเทียบรูปภาพป๊อปอัปภายนอก
}

### Backend Rules

1. **Module System**: CommonJS (`require` / `module.exports`) — `"type": "commonjs"` ใน package.json
2. **DB Connection**: ใช้ `getPool()` จาก `db.js` เสมอ — ห้ามสร้าง connection ใหม่เอง
3. **SQL Injection**: ใช้ parameterized queries (`request.input()`) เท่านั้น — ห้ามใช้ string interpolation กับ user input
4. **Error Handling**: ทุก route ต้อง `try/catch` และ return `{ ok: false, error: message }`
5. **Response Format**: ทุก API ต้อง return format `{ ok: boolean, data?: any, error?: string }`
6. **Logging**: ใช้ `console.log` + emoji prefix สำหรับ debug (`[EXEC SP]`, `[CACHE HIT]`, `❌`)
7. **Caching**: ใช้ In-Memory Cache ที่มีอยู่ (`cache` Map + `inFlight` Map) สำหรับ heavy queries
8. **Photo Handling**: ใช้ `toBase64Photo()` helper สำหรับแปลง VARBINARY → base64 data URI
9. **Stored Procedures**: เรียกผ่าน `request.execute(spName)` — ระวังจำนวน parameters ต้องตรงกับ SP definition (ระบบเก่าจำกัด parameters)

### Database Rules

1. **Connection Pool**: ใช้ pool size max=20, min=2, idle timeout 1 นาที
2. **Request Timeout**: 300 วินาที (5 นาที) — dataset ขนาดใหญ่
3. **Date Handling**: ใช้ `sql.DateTime` สำหรับ date parameters ที่ส่งไป SP
4. **VARBINARY**: Cast photo columns เป็น `VARBINARY(MAX)` ใน SELECT
5. **NULL Handling**: ใช้ `ISNULL()` ใน WHERE clause สำหรับ nullable columns

---

## Commands

### Frontend (Working Directory: `Jewelry Factory System/frontend`)

```bash
# Development server (port 3000, proxy /api → localhost:3001)
npm run dev

# Production build (TypeScript check + Vite build)
npm run build

# Lint (ESLint flat config)
npm run lint

# Preview production build locally
npm run preview
```

### Backend (Working Directory: `Jewelry Factory System/backend`)

```bash (ถ้าใช้งานแล้วกรุณาปิดกลับคืนด้วย)
# Production start
npm start              # → node server.js

# Development with auto-reload
npm run dev            # → nodemon server.js
```

### Health Check

```bash
# ตรวจสอบว่า API + DB เชื่อมต่อได้
curl http://localhost:3001/api/health
```

### Environment Setup

```bash
# 1. Clone repo
git clone <repo-url>

# 2. Frontend setup
cd "Jewelry Factory System/frontend"
npm install

# 3. Backend setup
cd "../backend"
npm install
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง (DB_HOST, DB_USER, DB_PASS, DB_NAME)

# 4. Run both (ใช้ 2 terminals)
# Terminal 1: Backend
cd "Jewelry Factory System/backend"
npm run dev

# Terminal 2: Frontend
cd "Jewelry Factory System/frontend"
npm run dev
```

---

## API Endpoints

### PO Tracker

| Method | Endpoint                                    | Description                           |
|--------|---------------------------------------------|---------------------------------------|
| GET    | `/api/orders`                               | รายการ Order (aggregated, cached)      |
| GET    | `/api/orders/:ordNo`                        | รายละเอียด Order (single or grouped)  |
| GET    | `/api/orders/by-po/:poNo`                   | รายละเอียด Order by PO Number         |
| GET    | `/api/orders/group/:cust/:addr/:kind/:mat/:duedate` | รายละเอียด Group by 5 axes   |
| GET    | `/api/orders/photo/:itemNo`                 | Item photo (base64)                   |

**Query Parameters for `/api/orders`:**

| Param      | Type   | Default   | Description                      |
|------------|--------|-----------|----------------------------------|
| `dateFrom` | string | 7 months ago | Start date (ISO format)       |
| `dateTo`   | string | today     | End date (ISO format)            |
| `dateType` | string | `All`     | SP selector: `OrdDate`, `DueDate`, `CustDueDate`, `FinDate`, `All` |
| `status`   | string | `pending` | `pending` or `finish` or `All`   |
| `noCache`  | string | —         | Set to skip cache                |

### Dashboard

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/dashboard`                      | Main Dashboard stats (9 sections)  |
| GET    | `/api/dashboard/years`                | Available years for filter         |
| GET    | `/api/dashboard/detail/:cardType`     | Card drill-down (YoY comparison)   |
| GET    | `/api/dashboard/sales-summary`        | Sales by rep/year (SalesDashboard) |
| GET    | `/api/dashboard/customer-summary`     | Sales by cust/year (CustomerDashboard) |

### Documents (Unified DocumentLayout)

| Method | Endpoint                              | Description                        |
|--------|---------------------------------------|------------------------------------|
| GET    | `/api/procurement/list`               | รายการเอกสารจัดซื้อ (SPA/SRA/SRB/SIR) |
| GET    | `/api/procurement/:docNo`             | รายละเอียดเอกสารจัดซื้อ              |
| GET    | `/api/requisition/list`               | รายการเอกสารเบิก (SOA/SIA/SIB/SIP/SIS) |
| GET    | `/api/requisition/:docNo`             | รายละเอียดเอกสารเบิก                 |
| GET    | `/api/sample/list`                    | รายการเอกสารห้องตัวอย่าง (SSA/SIM)   |
| GET    | `/api/sample/:docNo`                  | รายละเอียดเอกสารห้องตัวอย่าง          |
| POST   | `/api/lock/acquire`                   | ล็อคเอกสารสำหรับแก้ไข                |
| POST   | `/api/lock/release`                   | ปลดล็อคเอกสาร                      |

### Photo Bridge (Network File Server → HTTP)

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/photos/ps/:itemNo`    | PS Photo (Cost) จาก `\\chongdts\Chong Photo\Cost` |
| GET    | `/api/photos/cad/:itemNo`   | CAD Photo จาก `\\chongdts\Chong Photo\Mold(CAD)` |
| GET    | `/api/photos/:itemNo`       | Legacy endpoint (backwards compat)       |

### Search & System

| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
| GET    | `/api/search`  | Global search             |
| GET    | `/api/health`  | Health check (API + DB)   |

---

## Development Workflow

### Day-to-Day Development

1. **เปิด 2 terminals** — Backend (`npm run dev`) + Frontend (`npm run dev`)
2. **Vite Dev Server** (port 3000) จะ proxy `/api/*` ไปที่ Backend (port 3001) อัตโนมัติ
3. **Hot Reload**: Frontend มี HMR, Backend มี nodemon auto-restart
4. **Test API**: ใช้ browser DevTools Network tab หรือ `curl` ตรงไปที่ `:3001`

### Adding a New Page

1. สร้าง page component ใน `src/pages/NewPage.tsx`
2. เพิ่ม route ใน `src/App.tsx` ภายใต้ `<Route element={<AppLayout />}>`
3. เพิ่ม menu item ใน `src/config/menuConfig.ts`
4. (ถ้าต้องเรียก API) สร้าง service ใน `src/services/newPageAPI.ts`
5. (ถ้ามี type ใหม่) เพิ่ม interface ใน `src/types/index.ts`

### Adding a New API Route

1. สร้าง route file ใน `backend/routes/newRoute.js`
2. Register ใน `backend/server.js`: `app.use('/api/new-route', require('./routes/newRoute'))`
3. ใช้ `const { getPool, sql } = require('../db');` สำหรับ DB access
4. Wrap ด้วย `try/catch` + return `{ ok: boolean, ... }`

### Theme Development

1. Theme variables ประกาศใน `src/index.css` → `@theme { ... }` block
2. Theme overrides อยู่ใน `@layer base` → `.theme-<name> { ... }`
3. Toggle ผ่าน `ThemeContext` → `useTheme()` hook
4. ทุก component ต้องใช้ theme variables — ห้ามใช้ hardcoded colors

### Database Considerations

- **Legacy SP Compatibility**: Stored Procedures ของระบบเก่ามีข้อจำกัดเรื่องจำนวน parameters — ห้ามเพิ่ม parameter เองโดยไม่ตรวจสอบ SP definition
- **Aggregation**: การ group/filter data ทำที่ Node.js (ไม่ใช่ DB) เพราะ SP เก่าไม่รองรับ
- **Connection Pool**: Pool จะ auto-reconnect เมื่อเกิด error — ไม่ต้อง restart server

---

## Environment Variables

### Backend `.env`

```env
DB_HOST=<SQL Server hostname or IP>
DB_PORT=1433
DB_NAME=<database name>
DB_USER=<username>
DB_PASS=<password>
API_PORT=3001
```

> ⚠️ ห้าม commit ไฟล์ `.env` จริง — ใช้ `.env.example` เป็น template

---

## Important Notes

1. **ระบบนี้เป็น Internal Tool** — ใช้งานภายใน LAN ของโรงงาน ไม่มี authentication (ยัง)
2. **Data จาก Production DB** — ระวังเรื่อง query performance, ใช้ cache เสมอสำหรับ heavy queries
3. **Thai Language UI** — ข้อความในระบบเป็นภาษาไทย, ใช้ web fonts (Outfit, Prompt)
4. **Legacy Migration** — กำลัง migrate จาก VB.net ทีละ module, หลายหน้ายังเป็น Placeholder
5. **Photo Data** — รูปสินค้าเก็บเป็น VARBINARY ใน DB, แปลงเป็น base64 ตอน serve — ระวัง payload size 
6. **Active Order Filters** — เนื่องจากมีข้อมูลขยะ (Sample/Dead orders) ในระบบจำนวนมาก Dashboard จึงต้องถูกฟิลเตอร์ให้แสดงเฉพาะออเดอร์ 13 รหัสหลักที่มีความเคลื่อนไหวตั้งแต่ปี 2024 ขึ้นมาเท่านั้น (BBC, BBQ, BBD, BBI, BBF, BBP, BBT, BBX, BBK, BBR, BBL, BBS, BBE)

---

## Order Prefixes Analysis (As of May 25, 2026)

จากการตรวจสอบความเคลื่อนไหวล่าสุด (Latest `OrdDate`) ของคำนำหน้าออเดอร์ในฐานข้อมูลทั้งหมด (OrdHD) พบว่าสามารถแบ่งกลุ่มออเดอร์ที่ใช้งานได้และใช้งานไม่ได้ ดังนี้:

### ✅ Active Orders (ใช้งานได้ มีความเคลื่อนไหวปี 2025-2026)
| Prefix | จำนวนออเดอร์ทั้งหมด | การเคลื่อนไหวล่าสุด | หมายเหตุ |
|--------|---------------------|---------------------|----------|
| **BBC** | 118,809 | 2026-05-25 | ตรงกับปุ่มในระบบเก่า |
| **BBQ** | 14,221 | 2026-05-25 | ตรงกับปุ่มในระบบเก่า |
| **BBD** | 5,206 | 2026-05-25 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBI** | 818 | 2026-05-22 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBF** | 62 | 2026-05-21 | ตรงกับปุ่มในระบบเก่า |
| **BBP** | 1,461 | 2026-05-19 | ตรงกับปุ่มในระบบเก่า |
| **BBT** | 1,126 | 2026-05-15 | ตรงกับปุ่มในระบบเก่า |
| **BBX** | 189 | 2026-05-08 | ⚠️ ไม่มีปุ่มในระบบเก่า แต่มีออเดอร์ใช้งานอยู่ |
| **BBK** | 353 | 2026-04-30 | ตรงกับปุ่มในระบบเก่า |
| **BBR** | 1,610 | 2026-04-09 | ตรงกับปุ่มในระบบเก่า |
| **BBL** | 4,909 | 2026-04-09 | ตรงกับปุ่มในระบบเก่า |
| **BBS** | 762 | 2026-04-06 | ตรงกับปุ่มในระบบเก่า |
| **BBE** | 38 | 2025-04-29 | ตรงกับปุ่มในระบบเก่า |

### ❌ Inactive/Dead/Sample Orders (ใช้งานไม่ได้ ข้อมูลขยะที่ไม่มีการเคลื่อนไหวแล้ว)
*คำนำหน้าเหล่านี้ไม่มีความเคลื่อนไหวมาหลายปีแล้ว และถูกบล็อกออกจากสถิติใน Dashboard ทั้งหมด เพื่อความแม่นยำของตัวเลข*

- **BTC** (5,231) — ล่าสุด 2022-10-14
- **BBA** (3,354) — ล่าสุด 2022-10-13
- **BOC** (1,378) — ล่าสุด 2022-10-12
- **BPC** (1,263) — ล่าสุด 2022-09-30
- **LBC** (608) — ล่าสุด 2020-11-26
- **LBS** (104) — ล่าสุด 2020-05-13 *(งานตัวอย่าง)*
- **LBT** (17) — ล่าสุด 2020-02-28
- **BTS** (1) — ล่าสุด 2020-01-08
- **LLC** (239) — ล่าสุด 2016-07-29
- **GBT** (296) — ล่าสุด 2016-03-02
- **IBT** (37) — ล่าสุด 2016-02-18
- **SBC** (6,005) — ล่าสุด 2016-02-08
- **SBT** (3,151) — ล่าสุด 2015-12-23
- **CBT** (146) — ล่าสุด 2015-10-23
- **SPC** (337) — ล่าสุด 2015-09-11
- **SPT** (143) — ล่าสุด 2015-08-21
- **KBT** (586) — ล่าสุด 2015-08-19
- **KPT** (87) — ล่าสุด 2015-08-19
- **BRC** (11) — ล่าสุด 2015-07-17
- **GGT** (1) — ล่าสุด 2015-06-25
- **CPT** (13) — ล่าสุด 2015-03-23
- **CBC** (379) — ล่าสุด 2015-02-02
- **BLC** (5) — ล่าสุด 2014-10-27
- **BPT** (256) — ล่าสุด 2013-03-26
- **GPT** (4) — ล่าสุด 2013-03-23
- **BTT** (20) — ล่าสุด 2013-01-11
- **CPC** (3) — ล่าสุด 2012-06-22
- **GBC** (2) — ล่าสุด 2011-09-02
- **GTT** (4) — ล่าสุด 2011-08-31

---

## Document Page Design Standard

- **Unified Layout**: ทุกหน้าเอกสาร (เช่น จัดซื้อ, เบิก, ห้องตัวอย่าง) ต้องใช้โครงสร้างร่วมกันผ่าน `DocumentLayout.tsx` เพื่อลดความซ้ำซ้อนของโค้ด
- **Flat & Enterprise UI**: งดใช้สี Gradients (`bg-gradient-*`) ใช้โทนสีเรียบ แบน และชัดเจน เพื่อความเป็นมืออาชีพระดับองค์กร (Enterprise ERP / SAP-like)
- **Visual Distinctness**: ใช้ `border`, และ `bg-[var(--color-surface-*)]` เพื่อแบ่งสัดส่วนเนื้อหา (Header, Details, Lines) ให้ชัดเจน
- **Data Configuration**: โครงสร้างฟอร์มและตารางต่างๆ ต้องกำหนดที่เดียวใน `formConfigs.ts` เพื่อให้จัดการง่าย

## Testing & Cleanup Rules

- ห้ามลบหน้าเพจเดิม (เช่น `SOAPage.tsx`, `ProcurementPage.tsx`) จนกว่าการสร้าง Unified Layout และเพจใหม่จะเสร็จสมบูรณ์และทดสอบแล้วว่าไม่มีข้อผิดพลาด
- ก่อนลบไฟล์เก่า ต้องตรวจสอบ Routing ใน `App.tsx` ว่าชี้ไปยัง Component ใหม่ทั้งหมดแล้ว
- ตรวจสอบให้แน่ใจว่าได้ย้าย API Calls ไปไว้ใน Services อย่างถูกต้องแล้ว

---

## Customer Dashboard (Yearly Sales By Customer)

### ภาพรวม
หน้า `CustomerDashboard.tsx` แสดงกราฟเปรียบเทียบยอดขายรายลูกค้า ข้ามหลายปี
- **2 โหมดการแสดงผล**: Monthly View (กราฟรายเดือนรวม) / Yearly Breakdown (กราฟรายลูกค้า)

### Year-Color Mapping
สีของปีถูก Map แบบ Fixed ตาม Index ของ `availableYears` (ไม่ใช่ `selectedYears`) เพื่อป้องกันสีเลื่อนเมื่อกดเปิด-ปิดปี
- ใช้ `COLORS` array ที่อ้างอิง CSS Custom Properties ทั้งหมด (**ห้าม Hardcode HEX/RGB**)

### Filter System (Frontend-side filtering)
ข้อมูลถูก filter ที่ฝั่ง Frontend ด้วย `useMemo` — ไม่ได้ filter ที่ Backend

| Filter             | ตัวเลือก                                                     | State Variable    |
|--------------------|--------------------------------------------------------------|-------------------|
| **Customer Group** | All Customers, N008, MLT, N083, N044, N051, General          | `selectedGroup`   |
| **Sales Rep**      | All Sales, (ชื่อ placeholder — แก้ไขภายหลัง)                  | `selectedSales`   |

- **Customer Group Mapping**: จัดการผ่าน SSOT ที่ `src/config/customerGroups.ts`
  - N008 Group: N008, N048, N066-N075
  - MLT Group: U411-U426
  - N083 Group: N083, N086-N089
  - N044 Group: N044
  - N051 Group: N051
  - General: ลูกค้าที่ไม่ตรงกับกลุ่มด้านบน
- ปุ่ม Filter ใช้ Radio-button style (วงกลมเล็กด้านหน้า)
- **Default Chart Grouping**: เนื่องจากบางกลุ่มมียอดขายสูงมากจนไปกดสเกลกราฟของกลุ่มอื่นให้มองไม่เห็น กราฟถูกตั้งค่าให้เลือกเฉพาะ 4 กลุ่มแรก (Top 4) ขึ้นมาเป็นค่าเริ่มต้น หากมีกลุ่มที่ 5, 6, ... หรือ General จะถูก Uncheck ซ่อนไว้ก่อน เพื่อให้กราฟ Scale สวยงาม (ผู้ใช้สามารถติ๊กเปิดดูภายหลังได้)

### Interactive Charts & Full Report Page
1. **Recharts Integration**: เปลี่ยนจากการใช้ CSS Chart ล้วนมาเป็น library `recharts`
   - สามารถ Toggle เป็น Bar Chart และ Line Chart ได้
   - โชว์ Label บนกราฟ หรือ Tooltip ตามการทำงานที่สมบูรณ์ขึ้น
   - **Chart Margins**: Bar Chart ใช้ `{ top: 20, right: 30, left: 10, bottom: 5 }`, Line Chart ใช้ `{ top: 20, right: 40, left: 10, bottom: 5 }` เพื่อป้องกันชนขอบ
   - **XAxis Padding** (Line Chart): `{ left: 30, right: 30 }` ป้องกันจุดข้อมูลชิดขอบ
   - **YAxis**: width=70, dx=-5 ป้องกัน label ถูกตัด
   - **Dot Markers**: Line Chart ใช้ r=6, strokeWidth=3, activeDot r=8
2. **CustomerReportPage**: หน้าต่างสรุปตัวเลขแบบ Full-screen Matrix (รายลูกค้า × รายเดือน) ที่ถูกแยก (Separate) ออกมาจาก `CustomerDashboard.tsx` เดิมที่เป็นเพียง Modal 
   - **หน้าที่และความจำเป็น**: ทำหน้าที่แสดงผลตารางสรุปยอดขาย (Matrix Table) แบบเจาะลึกทุกเดือนและทุกปี การแยกออกมาเป็นหน้าจอใหม่ (Page) ช่วยลดความหนาแน่นของโค้ดในหน้า Dashboard และให้พื้นที่เต็มหน้าจอสำหรับตารางข้อมูลขนาดใหญ่
   - **ขีดจำกัด (Limitations)**: ตารางมีการเรนเดอร์ DOM Elements จำนวนมหาศาล (จำนวนลูกค้า × จำนวนปี × จำนวน 12 เดือน) หากผู้ใช้เลือกช่วงปีจำนวนมาก และไม่กรองกลุ่มลูกค้า (แสดงทั้งหมด) อาจทำให้เกิดความหน่วง (Lag) ในระหว่างการ Scroll หรือการสลับโหมด View/Growth เนื่องจาก React ต้องคำนวณและวาดคอมโพเนนต์จำนวนมากในครั้งเดียว
   - กรองข้อมูลผ่าน Base Year, Compare Year, Customer Groups, และเลือก Customer IDs ได้
   - **Dynamic Sorting**: รองรับการจัดเรียงข้อมูลลูกค้าในตาราง (Sort Order) จากมากไปน้อย หรือน้อยไปมาก โดยอิงจากยอดขายรวมของปีเป้าหมาย
   - แสดง Badge อัตราการเติบโต YoY แบบ Inline ในตาราง รองรับการเลือกเทียบปี (Multiple Growth Comparisons) หลายคู่พร้อมกัน

### Growth Indicator Design
ไอคอน Growth ใช้ `ArrowUpRight` / `ArrowDownRight` จาก `lucide-react` (size 16, strokeWidth 2.5)
- ขนาดฟอนต์: 0.78rem / fontWeight: 900
- Border-left accent 3px สี success/danger
- Border-radius: 20px (pill shape)
- Background: color-mix 14% ของสี success/danger
- Flat indicator: ใช้ `Minus` icon (size 14, strokeWidth 3)

### API Endpoint
`GET /api/dashboard/customer-summary?years=2025,2026`
- OrdNo Filter: NOT IN blocklist (`BBP, BBK, BBS, BBL, BBT, BBD`)
- กรองเฉพาะ `CustStatus = 'Y'` (Active customers)
- Return: `{ ok, data: [{ id, name, custStatus, salesName, data: {year: total}, monthly: {year: {month: total}}, currentMonthSales }] }`

