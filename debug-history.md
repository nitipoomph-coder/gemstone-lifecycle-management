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