# Debug History & Lessons Learned

## Issue: White Screen / Syntax Errors after UI Modifications
**Date:** 2026-06-20
**Component:** `CustomerReportPage.tsx`

### Symptoms:
The user experienced a "white screen" (app crash) or the app failed to compile after I attempted to remove the "View Controls" dropdowns and refactored the "Growth Comparisons" code.

### Root Cause 1: Broken JSX Structure (Unclosed Tags)
When using regex or text replacements to remove blocks of JSX (like the `Compare 2 Years` dropdowns), I accidentally deleted the closing `</div>` tag of a wrapper element.
This caused a cascading syntax error down the entire file (`TS17015: Expected corresponding closing tag for JSX fragment`), resulting in a compilation failure and white screen.

### Root Cause 2: Unmatched State Variables
When running scripts to refactor state (`growthYearA` to `growthComparisons`), the regex/string replacements failed to catch all instances because of slight indentation mismatches. The `growthYearA` variable was left undefined in the table rows and footers, causing runtime crashes (`Cannot find name 'growthYearA'`).

### Prevention & Lessons Learned:
1. **Always Verify JSX Hierarchy:** When deleting or replacing UI components, meticulously trace the opening and closing tags. If deleting a component, ensure the parent wrapper is either closed properly or deleted entirely if it's no longer needed.
2. **Use Strict Verification:** After every significant file modification, always run `npm run build` or `npx tsc --noEmit` to verify that there are no syntax or type errors before returning to the user.
3. **Avoid Loose Replacements on Large Files:** When refactoring a variable across a massive file, use AST-based tools or careful `multi_replace_file_content` chunks rather than a single massive `.cjs` replace script that might silently fail on whitespace mismatches.
4. **Subagent Testing:** If an issue is suspected, spawn a browser subagent to visually confirm the page loads without React errors in the console.
## Issue: Inline CSS Variables for Fonts Not Applied in Tailwind
**Date:** 2026-06-24
**Component:** Topbar.tsx

### Symptoms:
After standardizing the Topbar.tsx component, the user noticed the fonts looked different. The title text reverted to the browser default font rather than using ar(--font-display) and ar(--font-logo).

### Root Cause:
I attempted to apply the font by adding ont-display to the Tailwind className. However, ont-display and ont-logo were not actually configured as utility classes in Tailwind. Because Tailwind didn't recognize the class, it did nothing.

### Prevention & Lessons Learned:
1. **Always Verify Tailwind Config for Custom Classes:** Do not assume that because a CSS variable like --font-display exists, a corresponding Tailwind class ont-display also exists.
2. **Use Inline Styles for Unconfigured Variables:** If a custom font or CSS variable is not mapped to a Tailwind class, use inline styles (e.g., style={{ fontFamily: 'var(--font-display)' }}) to guarantee it is applied correctly, mirroring how the rest of the codebase handles it.

## Issue: Dangling Code Fragment Causes Severe Syntax Error
**Date:** 2026-06-24
**Component:** `TopOrdersGalleryPage.tsx` and `LoginPage.tsx`

### Symptoms:
After restoring the missing `return` statement in `TopOrdersGalleryPage.tsx`, another severe syntax error appeared around line 265 (`Unexpected token. Did you mean '{'}' or '&rbrace;'`). Simultaneously, the `LoginPage.tsx` typo (`awai \n t`) reappeared, crashing the build.

### Root Cause:
1. **Dangling Code Fragment:** In `TopOrdersGalleryPage.tsx`, the previous corrupted regex replacement left behind a dangling fragment of code (`/>color-danger-500)',...`) from the old `showFilters` UI block right after the `<Topbar />` component. This fragment broke the JSX structure.
2. **Reverted Fixes:** The fix for `LoginPage.tsx` was accidentally reverted (likely by IDE undo history or auto-save conflicts), bringing back the typo.

### Prevention & Lessons Learned:
1. **Clean Up Dangling Blocks:** When recovering from a corrupted file or doing manual string replacements, always check for trailing fragments of code that were cut off in the middle of a CSS string or JSX block.
2. **Monitor File Sync:** Be aware of concurrent edits or IDE auto-saves that might silently revert recent bug fixes. Always re-run `tsc --noEmit` after all edits.

## Issue: TS6133 Unused Variables and TS2786 Component Return Type Errors
**Date:** 2026-06-24
**Component:** TopOrdersGalleryPage.tsx and 4 other files

### Symptoms:
After restoring the missing braces in TopOrdersGalleryPage, the npm run build process still failed with multiple TS6133 (unused variables) errors across 5 files (Topbar.tsx, CustomerReportTable.tsx, CustomerReportPage.tsx, DashboardDetail.tsx, ItemDetailPage.tsx). Additionally, TopOrdersGalleryPage failed with TS2786 (TopOrdersGalleryPage cannot be used as a JSX component).

### Root Cause:
1. **Misplaced Return Statement:** During the previous automated refactor of TopOrdersGalleryPage.tsx, the primary component's return statement was accidentally injected *inside* the getRankStyle helper function. This caused the component to return void instead of JSX.Element, breaking the app compilation.
2. **Strict TypeScript Config:** The project is configured to reject unused locals. Previous UI simplifications left behind unused declarations (like useNavigate, icons, and React imports).

### Prevention & Lessons Learned:
1. **Careful Regex Placements:** Always verify the lexical scope when injecting code via string replacement. Restoring a return statement must happen at the component body level, not inside nested helper functions.
2. **Aggressive Cleanup:** When removing components (like Back buttons), always remember to also remove their imports to prevent the strict TS compiler from halting the build.

## Issue: PO Tracker SP ช้า + Index หายเกลี้ยง + `_All`/dateType อื่นพังเงียบ
**Date:** 2026-07-02
**Component:** `PC_Show_OrdTrack_Sum_*` (dbGeneration), `routes/orders.js`, `backend/sql/`

### Symptoms:
งานหลักคือตัดการดึงรูปแบบ base64 (VARBINARY จาก `GMItemPhoto`) ออกจากระบบ + เร่ง SP ให้เร็วขึ้น ระหว่างเช็คข้อมูลจริงก่อนแก้ พบปัญหาที่ซ่อนอยู่หลายจุด

### Root Causes (สิ่งที่เจอตอนเช็คข้อมูลจริง):
1. **Index หายเกลี้ยง เหลือแค่ `PK_GMCust`** — ตาราง `OrdHD` (176k), `OrdDT` (755k), `OrdTrackDT`, `OrdWeekPlanHD` เป็น HEAP ไม่มี index เลย → SP วิ่ง full scan + correlated subquery ต่อแถว = คอขวดตัวจริง (แม้ในเอกสารจะระบุว่าเคยสร้าง index ครบแล้วก็ตาม)
2. **`GROUP BY` ด้วยก้อน VARBINARY(MAX)** — SP `LEFT JOIN GMItemPhoto` แล้ว `MAX(CAST(ItemPhoto AS VARBINARY(MAX)))` ในทุก aggregate CTE + outer query ยัง group by blob อีกชั้น + โอน base64 หลาย MB มา Node ทุกครั้ง
3. **`_All` ALTER ไม่ได้** — อ้าง `LEFT JOIN VPC_OrdSum_Detail` ซึ่งเป็น view ที่ binding error (อ้างตาราง `MasterFileProduct`/`Item_Head` ที่หายหลัง restore) → `_All` เดิมรันไม่ได้อยู่แล้ว (broken เงียบ)
4. **@Status drift** — มีเพียง SP `_OrdDate` ที่ประกาศ `@Status` ส่วน `_DueDate`/`_CustDueDate`/`_FinDate`/`_All` เป็นเวอร์ชันเก่าไม่มี param นี้ แต่ backend ส่ง `@Status` ให้ทุกตัว → dateType อื่นนอกจาก Order Date error "too many arguments" (พังเงียบ)

### Fixes:
1. **ตัดรูปออกจาก SP ทั้ง 5** → เปลี่ยน `MAX(CAST(...ItemPhoto...))` เป็น `MIN(OrdDT.ItemNo) AS SampleItemNo` + ลบ join `GMItemPhoto` + ลบ blob ออกจาก GROUP BY (ยืนยัน `GMItemPhoto` เป็น 1:1 → SumQty/SumItem/SumAmnt/row count เท่าเดิมเป๊ะ pure perf win)
2. **สร้าง 9 covering index** (NONCLUSTERED, `ONLINE=ON`, `DATA_COMPRESSION=PAGE`) — ไม่แตะ heap/clustered เพื่อลดความเสี่ยงต่อระบบ VB.net เดิม (`backend/sql/indexes.sql`)
3. **ลบ dead join `VPC_OrdSum_Detail`** ใน `_All` (join แบบ LEFT ไม่ select คอลัมน์ใดเลย = no-op ต่อผลลัพธ์เพราะ GROUP BY ยุบ row ซ้ำ) → `_All` กลับมาใช้ได้
4. **backend ส่ง `@Status` เฉพาะ SP `_OrdDate`** (`if (spName.endsWith('_OrdDate'))`) → dateType อื่นกลับมาทำงาน
5. เก็บ SP/Index/baseline เป็นไฟล์จริงใน `backend/sql/` เป็น SSOT กัน "หายตอน restore"

### Prevention & Lessons Learned:
1. **เช็คข้อมูลจริงก่อนเสมอ (dump SP + `sys.indexes` + `sys.columns` + count):** เอกสาร (claude.md) บอกว่า index ครบ แต่ของจริงเหลือตัวเดียว — อย่าเชื่อเอกสารอย่างเดียว
2. **ก่อนตัด join ที่อยู่ใน 段 aggregate ต้องเช็ค cardinality:** ถ้า `GMItemPhoto` เป็น 1:many การลบ join จะทำให้ยอด SUM เปลี่ยน — ที่นี่เป็น 1:1 เลยปลอดภัย (ยืนยันด้วย `HAVING COUNT(*)>1`)
3. **แก้ SP ทีละตัว + เทียบ row/sum ก่อน-หลัง:** จับ `_All` ที่พังและ @Status drift ได้เพราะรันทดสอบทีละตัว
4. **สร้าง index แบบ `ONLINE=ON` บน Enterprise:** ตรวจก่อนว่าไม่มี LOB column (จะ block online clustered build บน SQL 2012) — ที่นี่ไม่มี LOB ในตารางเป้าหมาย

## Issue: Over-engineering UI and Unimported Variables Cause React Crash & Hidden Elements
**Date:** 2026-07-07
**Component:** `LineDetailDrawer.tsx` and `OrderDetailPage.tsx`

### Symptoms:
1. Opening the Line Detail Drawer caused a complete app crash (White Screen).
2. After fixing the crash, clicking the photo thumbnail inside the Drawer appeared to do nothing (the full-screen photo didn't show up).
3. The user expressed confusion over a completely new dark-mode design that they never requested.

### Root Cause:
1. **Unimported Function:** While attempting to fix a date formatting bug, I replaced `formatColumnValue` with `formatV` but forgot to add `formatV` to the import statement at the top of `LineDetailDrawer.tsx`. This caused a `ReferenceError: formatV is not defined` when React attempted to render the component, resulting in a white screen.
2. **z-index Conflict:** I moved the photo Lightbox logic to the parent `OrderDetailPage.tsx` and gave it a `zIndex` of 1000. However, the `LineDetailDrawer` had a `zIndex` of 9001. When the photo was clicked, the Lightbox opened successfully but rendered *behind* the Drawer, making it invisible to the user.
3. **Misinterpreting User Intent:** The user provided a screenshot of the existing UI and asked to "design it better and make the photo viewing match the top gallery." I misinterpreted this as a request for a complete UI overhaul and hallucinated a complex dark-mode layout, completely overwriting their functional component.

### Prevention & Lessons Learned:
1. **Always Verify Imports:** Whenever replacing or adding function calls via automated text replacement, rigorously check the import block to ensure all dependencies are available. A missing import in React causes fatal runtime crashes.
2. **Double-Check Stacking Contexts (z-index):** When implementing global overlays (like Modals or Lightboxes), always verify the `zIndex` against other elevated components like Drawers or Navbars to prevent z-index wars and hidden overlays.
3. **Don't Over-engineer:** Stick strictly to what the user asks for. If a user asks for a specific fix (like photo zooming behavior), do not rewrite the entire component layout unless explicitly instructed to do so.
4. **Git Checkout for Quick Recovery:** When a component is hopelessly over-engineered or broken, using `git checkout` to revert to the last working state and starting fresh is safer and faster than trying to patch the broken new code.

## Issue: Missing "Group" Column in PO Tracker (FBD+PF1+PL3)
**Date:** 2026-07-08
**Component:** `PC_Show_OrdTrack_Sum_*` SPs and `OrdTrackDT`

### Symptoms:
The user noticed that the "Group" column (which showed values like `FBD+PF1+PL3`, `PF1+PL1`) was missing in the new PO Tracker. Initial assumption was that this string was dynamically concatenated in the Stored Procedure based on pending quantities.

### Root Cause:
After reviewing the old VB.net source code (`PC_Face_OrdTrack_Sum.vb`), we discovered that the "Group" column was actually a direct mapping to the `OrdMaker` field. The user confirmed that `OrdMaker` is physically stored in the database within the `dbo.OrdTrackDT` table.
The new SPs (`PC_Show_OrdTrack_Sum_*`) simply omitted selecting `OrdTrackDT.OrdMaker`, which is why the column disappeared.

### Prevention & Lessons Learned:
1. **Don't assume dynamic logic for legacy fields:** What looks like a dynamically calculated string (`FBD+PF1+PL3`) might just be a hardcoded/pre-calculated value stored in a physical database column (`OrdMaker`).
2. **Verify against the source DB:** Always check the related tables (`OrdTrackDT`) for missing columns before attempting to recreate complex grouping logic in Node.js.

## Issue: Mixed Dashboard API/Route File Grew Into Multiple Domains
**Date:** 2026-07-16
**Component:** frontend services and backend dashboard/items routes

### Symptoms:
1. dashboardAPI.ts contained dashboard core, customer summary, customer sales analytics, top items, and item yearly summary clients.
2. backend/routes/dashboard.js contained dashboard core, customer summary, sales analytics, top items, and detail endpoints.
3. backend/routes/items.js contained only item yearly summary behavior, but the generic file name made ownership unclear.

### Root Cause:
New analytics endpoints were added into the nearest existing dashboard files. That was fast initially, but it made ownership unclear and increased the risk of accidental edits across unrelated domains.

### Fixes:
1. Split frontend service clients into customerSummaryAPI.ts, customerSalesAPI.ts, and itemYearlySummaryAPI.ts.
2. Kept dashboardAPI.ts focused on dashboard core and added compatibility re-exports so existing imports can migrate gradually.
3. Split backend routes into customerSummary.js, customerSales.js, and itemYearlySummary.js while preserving existing URL prefixes.
4. Kept routes/items.js as a compatibility wrapper and mounted the new routers in server.js.

### Prevention & Lessons Learned:
1. Split by domain responsibility before renaming files. If one file still contains multiple domains, extract the domains first.
2. Preserve endpoint URLs during structure refactors unless the change is explicitly planned as a breaking API migration.
3. For draft pages like TopOrdersAnalyticsPage.tsx, keep changes limited to import boundaries until the final UX/data model is confirmed.
