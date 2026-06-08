# Debug & Troubleshooting History

ไฟล์นี้ใช้สำหรับบันทึกปัญหาที่เคยเกิดขึ้น (Errors/Bugs/UI Issues) และวิธีการแก้ไข เพื่อป้องกันการเกิดซ้ำและเป็น knowledge base สำหรับนักพัฒนาในอนาคต

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
 
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
 