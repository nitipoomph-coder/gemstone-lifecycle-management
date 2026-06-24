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
