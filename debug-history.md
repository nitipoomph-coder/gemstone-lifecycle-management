# Debug & Troubleshooting History

ไฟล์นี้ใช้สำหรับบันทึกปัญหาที่เคยเกิดขึ้น (Errors/Bugs/UI Issues) และวิธีการแก้ไข เพื่อป้องกันการเกิดซ้ำและเป็น knowledge base สำหรับนักพัฒนาในอนาคต

> **📋 กฎ**: ทุกครั้งที่เกิด Bug/Error/UI Issue ที่ต้องแก้ไข ต้องบันทึกลงไฟล์นี้ตามรูปแบบด้านล่าง พร้อมอัปเดต `claude.md` ให้ตรงกัน

---

## [2026-06-04] UI Inconsistency in Document Pages

**ปัญหาที่พบ:**
1. หน้า Document Pages (ที่ใช้ `DocumentLayout.tsx`) มีการใช้ Hardcoded colors ในหลายจุด (เช่น `#2ecc71`, `#f1c40f`, `#107C41`) ทำให้เมื่อเปลี่ยน Theme สีจะไม่เปลี่ยนตาม และดูไม่เข้ากับ "Enterprise Flat Design"
2. มีการเรียกใช้ตัวแปร CSS `--color-surface-900` แต่ไม่มีการประกาศตัวแปรนี้ใน `index.css` ทำให้สี fall back ไปที่ค่าเริ่มต้น (หรือโปร่งใส) 
3. Component บางตัวไม่ได้ถูกใช้งานในระบบ เช่น `SkillsDisplay.tsx` และ `SkillsConfig.ts` ก่อให้เกิด TypeScript/Linter errors

**สาเหตุ:**
- การเขียน Inline styles โดยตรงและระบุสีเป็น HEX (#) แทนที่จะดึงผ่าน `var(--color-...)`
- ขาดความครบถ้วนของการกำหนดสี Surface ใน `@theme`
- หลงเหลือไฟล์/โค้ดจากการทดสอบ (Skills portfolio) ใน Directory หลัก

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **Theme System (`index.css`):**
   - เพิ่ม `--color-surface-800` และ `--color-surface-900` ในทุก Theme block (Modern Dark, Dark Gold, Royal White)
   - เพิ่มตัวแปรสี Semantic ที่ขาดหาย เช่น `--color-warning-*`, `--color-danger-*`, `--color-success-*`
2. **DocumentLayout & PlaceholderPage:**
   - ค้นหาโค้ดที่เป็น HEX color และแทนที่ด้วยตัวแปรสีจาก Theme (เช่น `#2ecc71` ➔ `var(--color-success-500)`)
   - ลบ Inline styles ที่ไม่จำเป็นและเปลี่ยนไปใช้ Tailwind utility classes 
   - เปลี่ยน Badge background จากสีเทาเข้มเป็น `bg-[var(--color-brand-500)]` เพื่อความสวยงามและอ่านง่าย
3. **Clean Up:**
   - ลบ `SkillsDisplay.tsx`, `SkillsConfig.ts`, และ `types/skills.ts`

**ข้อควรระวังในอนาคต (Preventive Action):**
- **งดการใช้สีแบบ HEX/RGB โดยตรงใน Component** ให้ใช้ผ่านตัวแปรใน `index.css` หรือ Tailwind classes (`bg-[var(--color-*)]`) เสมอ
- หากต้องการเพิ่มสีใหม่ ให้พิจารณาว่าเป็นสีเฉพาะจุด (Specific) หรือสีที่ควรอยู่ใน Theme (Global) หากควรอยู่ใน Theme ให้เพิ่มใน `index.css` ให้ครบทุก Theme (Dark/Light)
- **Component ไหนที่ไม่ได้ใช้งาน (Dead Code) ควรลบออกทันที** ไม่ควรคอมเมนต์ทิ้งไว้เพื่อป้องกันความสับสน

---

## [2026-06-04] TypeScript & JSX Syntax Errors in Dashboard and Item Detail Pages

**ปัญหาที่พบ:**
1. โปรเจกต์เกิด Error ตอนสั่ง Build (`tsc -b && vite build`) หรือการรัน dev server ทำให้ไม่สามารถ compile โค้ดได้
2. `CustomerDashboard.tsx`: มีปัญหา JSX fragment `</>` ปิดไม่ถูกต้อง (Unclosed tags) ทำให้เกิด Error `TS17014`, `TS1003`, `TS1381`, `TS1005`
3. `CustomerDashboard.tsx` และ `SalesDashboard.tsx`: มีปัญหา `TS2353: Object literal may only specify known properties, and 'group' does not exist...` (ใช้งาน `group: 'true'` ใน `style` แทนที่จะใช้เป็น `className="group"`)
4. ตัวแปรที่ประกาศแล้วไม่ได้ใช้งาน (Unused variables) เช่น `idx`, `isFlat`, `isUp`, `v1`, `v2` ทำให้ Linter ฟ้อง
5. `ItemDetailPage.tsx`: ขาดการประกาศตัวแปรหลัก (Missing Mock Data) ได้แก่ `itemData` และ `stoneList` และไม่ได้กำหนด type ให้กับ argument ในฟังก์ชัน `.map()`

**สาเหตุ:**
- การปรับโครงสร้างของ HTML/JSX แล้วลืมปิดแท็ก `</div>` 
- การใช้ Tailwind property `group` ผิดที่ นำไปใส่ใน `style={{}}` แทนที่จะใส่ใน `className`
- การลบ Logic บางส่วนออกแต่ลืมลบตัวแปรที่ผูกไว้ออก
- โค้ดส่วน `ItemDetailPage.tsx` เป็นโครงร่างเริ่มต้น (Placeholder) ทำให้ไม่ได้กำหนดค่า Mock Data และ Types ไว้รองรับ TypeScript

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **CustomerDashboard.tsx & SalesDashboard.tsx:**
   - เพิ่มแท็ก `</div>` ที่ขาดหายไปในโครงสร้าง Grid/Flexbox
   - ย้าย `group: 'true'` ออกจาก `style` และเปลี่ยนเป็น `className="group"`
   - ลบตัวแปรที่ไม่ได้ใช้ออกทั้งหมด (`idx`, `isFlat`, `isUp`, `v1`, `v2`)
2. **ItemDetailPage.tsx:**
   - เพิ่มตัวแปร `itemData` (รับค่า `id` มาจาก Params เป็นเลข Item) และ `stoneList` เพื่อเป็น Mock Data ป้องกัน Type Error
   - ใส่ Types `(rmk: string, idx: number)` และ `(st: any, i: number)` ใน `.map()`
3. **Verification:**
   - ทดสอบรัน `npm run build` ผ่าน 100% เรียบร้อยแล้ว ไม่มีแจ้งเตือน Typescript Errors

**ข้อควรระวังในอนาคต (Preventive Action):**
- **ตรวจสอบ JSX Nesting:** เวลาปรับแก้ Layout/Div ที่มีความซับซ้อน ควรเช็คคู่เปิด-ปิดให้ครบถ้วนทุกครั้ง
- **Tailwind Grouping:** `group` เป็น Tailwind Class ต้องอยู่คู่กับ `className` เสมอ ไม่ใช่ Inline Style
- **TypeScript Types:** กำหนด Type ทุกครั้งเมื่อเขียนโครงสร้าง Data เบื้องต้น หรือเขียน `.map()`

---

## [2026-06-06] SCSS Preprocessor Error in Vite

**ปัญหาที่พบ:**
1. เกิด Error ระหว่างการรัน `npm run dev` หรือ `npm run build` ฝั่ง Frontend ว่า `Error: Preprocessor dependency "sass-embedded" not found. Did you install it?`

**สาเหตุ:**
- มีการนำไฟล์ `.scss` (เช่น `tetrominos.scss`) เข้ามาใช้งานใน Component ใหม่ (`TetrominosLoader.tsx`) แต่โปรเจกต์ (Vite) ยังไม่ได้ติดตั้ง preprocessor สำหรับการแปลงไฟล์ SASS/SCSS

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **ติดตั้ง Sass Preprocessor:** รันคำสั่ง `npm install -D sass-embedded` ในโฟลเดอร์ `frontend` เพื่อติดตั้ง package ให้ Vite สามารถ compile ไฟล์ `.scss` ได้ 

**ข้อควรระวังในอนาคต (Preventive Action):**
- **ตรวจสอบ Dependencies:** เมื่อมีการนำไฟล์ styles ที่ไม่ใช่ CSS ธรรมดา (เช่น .scss, .sass, .less) เข้ามาใช้ในโปรเจกต์ Vite ต้องมั่นใจว่าได้ติดตั้ง preprocessor ที่ตรงกันใน `devDependencies` เสมอ

---

## [2026-06-06] CustomerDashboard — Year-Color Mapping Fix & Data Table Modal Removal

**ปัญหาที่พบ:**
1. **สีกราฟเลื่อนเมื่อกด Toggle ปี**: เมื่อกดเปิด-ปิดปี สีของแท่งกราฟ (Bar Chart) จะเปลี่ยนไปเรื่อยๆ เพราะ Color index ถูกคำนวณจาก `selectedYears.indexOf(yr)` (ตำแหน่งในอาเรย์ที่เลือก) แทนที่จะเป็นตำแหน่งคงที่
2. **Hardcoded HEX Colors ใน COLORS array**: มีสี HEX 6 ตัว (`#f59e0b`, `#10b981`, `#8b5cf6`, `#ec4899`, `#f43f5e`, `#06b6d4`) ซึ่งละเมิดกฎ "ห้าม hardcode สี" ใน claude.md

**สาเหตุ:**
- Color mapping ใช้ `selectedYears.indexOf(yr)` ทำให้ตำแหน่ง index เปลี่ยนทุกครั้งที่มีการเพิ่ม/ลดปี
- สี HEX ถูกใส่ไว้ตั้งแต่เริ่มสร้าง COLORS array โดยไม่ได้ตรวจสอบว่ามี CSS Custom Properties ใน Theme ที่รองรับอยู่แล้ว

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **Fixed Year-Color Mapping**: เปลี่ยนจาก `selectedYears.indexOf(yr)` เป็น `availableYears.indexOf(yr)` ในทุกจุดที่ใช้ (ปุ่มเลือกปี, Legend, แท่งกราฟ) เพื่อให้แต่ละปีมีสีคงที่ตลอด
2. **แก้ Hardcoded Colors**: แทนที่ HEX 6 ตัวด้วย CSS Custom Properties ที่มีอยู่แล้วใน Theme:
   - `#f59e0b` → `var(--color-proc-qc)`
   - `#10b981` → `var(--color-success-500)`
   - `#8b5cf6` → `var(--color-proc-grinding)`
   - `#ec4899` → `var(--color-danger-500)`
   - `#f43f5e` → `var(--color-proc-casting)`
   - `#06b6d4` → `var(--color-accent-500)`
3. **ลบ Data Table Modal**: ลบ `showSummaryModal` state, ปุ่ม "Data Table", และ Modal ทั้งหมดออกตามคำสั่ง
4. **อัปเดตเอกสาร**: แก้ไข `claude.md` ลบ reference ถึง "Data Table Modal" และเพิ่มหมายเหตุเรื่อง Year-Color Mapping

**ไฟล์ที่แก้ไข:**
- `frontend/src/pages/CustomerDashboard.tsx` — แก้ COLORS, color mapping, ลบ modal
- `claude.md` — อัปเดตส่วน Customer Dashboard section

**ข้อควรระวังในอนาคต (Preventive Action):**
- **Color Mapping ใน Charts**: เมื่อมีการ Toggle ข้อมูลเข้า-ออก ต้องใช้ Index จากแหล่งข้อมูลคงที่ (เช่น `availableYears`) ไม่ใช่จากอาเรย์ที่เปลี่ยนแปลงได้ (เช่น `selectedYears`)
- **ห้ามใช้ HEX/RGB ตรงๆ ใน Component**: ตรวจสอบ `index.css` ก่อนว่ามี Theme Variable ที่ใกล้เคียงอยู่แล้วหรือไม่ หากไม่มี ให้เพิ่ม Variable ใหม่ใน `@theme` block ทุก Theme
- **อัปเดตเอกสารทุกครั้ง**: เมื่อลบ/เพิ่มฟีเจอร์ ต้องอัปเดต `claude.md` และ `debug-history.md` ให้ตรงกัน

---

## [2026-06-09] CustomerDashboard — White Screen (Cannot read properties of undefined)

**ปัญหาที่พบ:**
1. หน้า Customer Dashboard กลายเป็นจอขาว (White screen of death) หลังจากเปลี่ยนมาใช้ Recharts
2. **ทั้งเว็บไม่แสดงผล** — ไม่ใช่แค่หน้า Customer Dashboard แต่ทุกหน้า (รวมถึง Dashboard หลัก) เป็นจอขาวหมด เพราะ React crash ตั้งแต่ root level
3. Browser Console ไม่แสดง Error ใดๆ (Silent failure) ทำให้ Debug ยากมาก

**สาเหตุ:**
- มีการ Rewrite `CustomerDashboard.tsx` จากเวอร์ชัน Pure CSS/HTML chart (709 บรรทัด) ไปเป็นเวอร์ชันที่ใช้ **Recharts library** (363 บรรทัด)
- เวอร์ชันที่ใช้ Recharts มีปัญหาเรื่อง **Runtime Error ที่ React catch แล้วทำให้ Render tree ทั้งหมดพัง** (React 19 StrictMode ไม่แสดง Error boundary โดย default)
- การเข้าถึง Nested Object แบบ `RAW[y][m][g]` ในฟังก์ชัน `chartData` (สำหรับโหมด Yearly) โดยที่ไม่ได้ใช้ Optional Chaining (`?.`) — เมื่อข้อมูล `availableYears` และ `RAW` ถูกดึง/คำนวณแบบ Asynchronous จังหวะที่ `availableYears` มีค่า `[2024, 2025]` แต่ `RAW` อาจจะยังไม่ทันสร้าง property ของปีนั้นๆ เสร็จ ทำให้ `RAW[y]` เป็น `undefined` จึงเกิด Error: Cannot read properties of undefined
- นอกจากนี้ ฟังก์ชัน `fmt` และ `fmtTip` ที่ใช้เป็น `LabelFormatter` ใน Recharts ถูกระบุพารามิเตอร์เป็น `(v: number)` ซึ่งไม่ตรงกับ Type ที่ Library Recharts ต้องการ (`LabelFormatter` สามารถโยนค่ากลับมาเป็น `string | number` ได้) ส่งผลให้เกิด Type Error ทำให้ Vite ไม่สามารถ Compile โค้ดส่งไปแสดงผลบนเบราว์เซอร์ได้ (จอขาว)

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **Revert กลับไปเวอร์ชัน Pure CSS/HTML chart** — ลบ Recharts dependency ออกจาก Component และกลับไปใช้โค้ดเดิมที่วาด Bar Chart ด้วย CSS flexbox + inline styles
2. ตรวจสอบด้วยคำสั่ง `npm run build` ผ่าน 100% เรียบร้อยแล้ว ไม่มีแจ้งเตือน TypeScript Errors

**ไฟล์ที่แก้ไข:**
- `frontend/src/pages/CustomerDashboard.tsx` — revert กลับเป็น Pure CSS/HTML chart (709 บรรทัด)

**ข้อควรระวังในอนาคต (Preventive Action):**
- **Safe Object Access**: เมื่อต้องเข้าถึง Nested Object หลายชั้น ต้องใช้ Optional Chaining (`?.`) เสมอเพื่อป้องกัน Runtime Error ที่ทำให้แอปพังทั้งหน้า
- **Library Type Mismatch**: เมื่อใช้งาน Library ภายนอก (Third-party) อย่าง Recharts ควรให้พารามิเตอร์ใน Callback functions ตรงตาม Type Signature ที่ Library กำหนด หรือใช้ `any` คู่กับการป้องกัน Runtime Error
- **React 19 Silent Crash**: React 19 StrictMode จะไม่แสดง Error overlay เมื่อ Component crash ในบางกรณี ทำให้ได้แค่จอขาว — ควรเพิ่ม `ErrorBoundary` component ครอบ Route ทั้งหมดเพื่อ catch และแสดง Error ที่เกิดขึ้น
- **ห้าม Rewrite ทั้งไฟล์โดยไม่ทดสอบ**: เมื่อต้องการเปลี่ยน Library หรือ Rewrite Component ขนาดใหญ่ ควรทำเป็นขั้นตอน ทดสอบทีละ Feature และ verify ด้วย `npm run build` ก่อน commit

---

## [2026-06-09] Vite Compile Error (TS2322: LabelFormatter type mismatch)

**ปัญหาที่พบ:**
1. หน้า Customer Dashboard กลายเป็นจอขาวอีกครั้ง และเซิร์ฟเวอร์ `npm run dev` พ่น Error ออกมาเมื่อมีพยายามแก้ไขโค้ดหรือ Restart

**สาเหตุ:**
- Linter ของ TypeScript ตรวจพบว่า Function `fmt` และ `fmtTip` ถูกระบุพารามิเตอร์เป็น `(v: number)` ซึ่งไม่ตรงกับ Type ที่ Library `Recharts` ต้องการ (`LabelFormatter` สามารถโยนค่ากลับมาเป็น `string | number` ได้)
- ส่งผลให้เกิด Type Error ทำให้ Vite ไม่สามารถ Compile โค้ดส่งไปแสดงผลบนเบราว์เซอร์ได้ (จอขาว)

**การแก้ไขที่ดำเนินการ (Resolution):**
1. ปรับแก้พารามิเตอร์ของ `fmt` และ `fmtTip` ให้รับ `(v: any)` และดักทาง Type ป้องกันไว้ก่อน (`if (typeof v !== 'number') return String(v);`)
2. ตรวจสอบด้วยคำสั่ง `npm run build` ผ่าน 100% เรียบร้อย

**ข้อควรระวังในอนาคต (Preventive Action):**
- **Library Type Mismatch**: เมื่อใช้งาน Library ภายนอก (Third-party) อย่าง Recharts ควรให้พารามิเตอร์ใน Callback functions ตรงตาม Type Signature ที่ Library กำหนด หรือใช้ `any` คู่กับการป้องกัน Runtime Error

---

## [2026-06-09] debug-history.md — Corrupted UTF-16 Null Bytes

**ปัญหาที่พบ:**
1. ไฟล์ `debug-history.md` มีข้อมูล encoding เสีย (UTF-16 null bytes ปนกับ UTF-8) ตั้งแต่บรรทัดที่ 117 เป็นต้นไป ทำให้อ่านเนื้อหาไม่ได้

**สาเหตุ:**
- AI Agent ก่อนหน้าเขียนข้อมูลลงไฟล์โดยใช้ encoding ที่ผิดพลาด (UTF-16 LE แทนที่จะเป็น UTF-8) ทำให้เกิด null bytes (`\x00`) แทรกอยู่ระหว่างตัวอักษรทุกตัว

**การแก้ไขที่ดำเนินการ (Resolution):**
1. ลบส่วนที่ encoding เสียออกทั้งหมด
2. เขียนเนื้อหา debug entries ที่เคยอยู่ในส่วน encoding เสียใหม่ด้วย UTF-8 ถูกต้อง

**ข้อควรระวังในอนาคต (Preventive Action):**
- **ตรวจสอบไฟล์หลังเขียน**: เมื่อ AI Agent เขียนไฟล์เสร็จ ควรตรวจสอบว่าเนื้อหาถูกต้องและอ่านได้ก่อน commit

---

## [2026-06-10] Syntax Error in CustomerDashboard (Fuzzy Match Failure)

**ปัญหาที่พบ:**
1. เกิด Syntax Error ในไฟล์ `CustomerDashboard.tsx` บริเวณบรรทัดที่ 180-192 ทำให้หน้าเว็บกลายเป็นจอขาว (Compile ไม่ผ่าน)
2. มีการเรียกใช้ตัวแปร `yoy` ที่ยังไม่ได้ประกาศ (Cannot find name 'yoy') และวงเล็บปีกกาปิดไม่ครบสมบูรณ์

**สาเหตุ:**
- การใช้เครื่องมือแก้ไขโค้ดอัตโนมัติ (Tool) ในการพยายามเปลี่ยน Logic การคำนวณเปอร์เซ็นต์ Year-over-Year (YoY) เกิดการจับคู่โค้ดเดิม (Fuzzy match) คลาดเคลื่อน ทำให้เอาโค้ดไปแทรกผิดจุดในบล็อก `summaries useMemo` ซึ่งทำให้โครงสร้าง Syntax พังทั้งหมด

**การแก้ไขที่ดำเนินการ (Resolution):**
1. **Manual Restore:** เข้าไปตรวจสอบและแก้ไขโครงสร้าง Syntax ตรงบริเวณบรรทัด 180-192 แบบ Manual ให้กลับมาเป็นแบบเดิมที่ถูกต้อง โดยคืนค่า `return { ...g, yearTotals, totalAllSelected, pct, maxYear, minYear };` กลับคืนมาให้ Typescript ทำงานได้ปกติ

**ข้อควรระวังในอนาคต (Preventive Action):**
- **Strict Target Matching:** เมื่อสั่งแก้โค้ดที่มีโครงสร้างซ้ำๆ กัน (เช่นบล็อก `useMemo` ที่คล้ายกัน) ต้องระบุ `TargetContent` ให้กว้างและครอบคลุมที่สุด เพื่อป้องกันไม่ให้ระบบนำไปเขียนทับผิดบล็อก