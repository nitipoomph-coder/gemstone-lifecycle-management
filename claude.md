# Gemstone Lifecycle Management — Project Context

## Project Overview

ระบบจัดการวงจรชีวิตพลอยและเครื่องประดับ (Gemstone Lifecycle Management) สำหรับโรงงานเครื่องประดับ
เป็นการ **Modernize** ระบบเดิมที่เขียนด้วย VB.net + SQL Server ให้เป็น Web Application แบบ Full-Stack  
ใช้งานภายในองค์กร (Intranet) เชื่อมต่อฐานข้อมูลจริง (MSSQL — `CLLDBS`) ผ่าน Stored Procedures

### Business Modules

| Module                 | รหัสเอกสาร                          | สถานะ              |
|------------------------|--------------------------------------|--------------------|
| ภาพรวม (Dashboard)      | —                                    | ✅ Live             |
| จัดซื้อและรับเข้า        | SPA, SRA, SRB, SIR                   | 🟡 SIR done, อื่น placeholder |
| ออเดอร์และการเบิก       | SOA, SIA, SIB, SIP, SIS             | ⬜ Placeholder      |
| ห้องตัวอย่าง            | SSA, SIM                             | 🟡 SIM done        |
| ตรวจสอบและนับสต็อก      | Check Dispatch/Sample/Purchase/Stock | ⬜ Placeholder      |
| Order Tracker          | —                                    | ✅ Live (core feature) |
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

| Aspect       | Details                                         |
|--------------|--------------------------------------------------|
| Theme Engine | 3 themes via `ThemeContext` + CSS custom properties |
| Themes       | `modern-dark` (default), `dark-gold`, `royal-white` |
| Color System | OKLCH color space                                |
| Fonts        | **Cinzel** (logo), **Outfit** (headings/display), **Prompt** (body) |
| Animations   | `fadeInUp`, skeleton shimmer, stagger classes    |

---

## Folder Structure

```
gemstone-lifecycle-management/
├── claude.md                          # ← ไฟล์นี้ (project context)
├── Project_phase1.code-workspace      # VS Code Workspace config
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
    │       │   │   ├── AppLayout.tsx   # Shell layout (Sidebar + Topbar + Outlet)
    │       │   │   ├── Sidebar.tsx     # Left nav sidebar
    │       │   │   └── Topbar.tsx      # Top bar (search, theme switcher, breadcrumb)
    │       │   ├── dashboard/
    │       │   │   ├── StatCard.tsx    # Dashboard stat card component
    │       │   │   └── OrderTable.tsx  # Order summary table component
    │       │   └── navigation/
    │       │       └── NavGroup.tsx    # Collapsible nav group component
    │       │
    │       ├── pages/
    │       │   ├── Dashboard.tsx              # หน้าภาพรวม (home)
    │       │   ├── DashboardDetail.tsx         # Dashboard detail drilldown
    │       │   ├── OrderTrackerAdvanced.tsx    # ⭐ Order Tracker main (list view)
    │       │   ├── OrderTrackerPage.tsx        # Order Tracker (legacy/alternate)
    │       │   ├── OrderDetailPage.tsx         # Order detail (by ord/po/group)
    │       │   ├── ItemDetailPage.tsx          # Item-level detail
    │       │   ├── SIRPage.tsx                # บันทึกคืนพลอย
    │       │   ├── SIMPage.tsx                # บันทึกส่งพลอย ห้องตัวอย่าง
    │       │   └── PlaceholderPage.tsx         # Placeholder for unimplemented modules
    │       │
    │       ├── services/
    │       │   ├── orderTrackerAPI.ts  # API client for Order Tracker endpoints
    │       │   ├── orderAPI.ts        # API client for order detail endpoints
    │       │   └── dashboardAPI.ts    # API client for dashboard stats
    │       │
    │       ├── config/
    │       │   ├── menuConfig.ts      # Sidebar menu structure definition
    │       │   └── formConfigs.ts     # Document form field configurations
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
        ├── server.js                  # Express app entry point
        ├── db.js                      # SQL Server connection pool (singleton)
        ├── .env                       # 🔒 Local env (gitignored)
        ├── .env.example               # Env template
        ├── package.json
        │
        ├── routes/
        │   ├── orders.js              # ⭐ /api/orders — Order Tracker APIs
        │   ├── dashboard.js           # /api/dashboard — Dashboard stats
        │   └── search.js              # /api/search — Global search
        │
        ├── update_sp.js               # Utility: update stored procedures
        ├── get_sp*.js                 # Utility: inspect stored procedures
        ├── revert_sp.js               # Utility: revert SP changes
        ├── sp_dump.txt                # SP definition dump
        └── test*.js                   # Ad-hoc test scripts (gitignored)
```

---

## Coding Rules

### General

1. **ภาษา**: Code ทั้งหมดเป็นภาษาอังกฤษ, Comments สามารถใช้ภาษาไทยได้
2. **Encoding**: UTF-8 ทุกไฟล์ (รองรับ Thai text)
3. **Line Ending**: CRLF (Windows environment)
4. **Git**: ห้าม commit `.env`, `node_modules/`, `dist/`, test scripts

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
   - Headings: `font-display` → Outfit
   - Body text: `font-body` → Prompt
   - Logo/Brand: `font-logo` → Cinzel

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

```bash
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

### Order Tracker

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
| `status`   | string | `pending` | `pending` or `finish`            |
| `noCache`  | string | —         | Set to skip cache                |

### Dashboard

| Method | Endpoint          | Description      |
|--------|-------------------|------------------|
| GET    | `/api/dashboard`  | Dashboard stats  |

### Search

| Method | Endpoint       | Description      |
|--------|----------------|------------------|
| GET    | `/api/search`  | Global search    |

### System

| Method | Endpoint       | Description               |
|--------|----------------|---------------------------|
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
