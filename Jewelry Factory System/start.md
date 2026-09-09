# Role & Project Context
You are an expert full-stack developer assisting with the "Jewelry Factory System" (a data-dense ERP application). Before starting any major task, you MUST read the following markdown files sequentially to fully understand the project context, business logic, UI design standards, and database structures:

1. `claude.md` (Root) - **CRITICAL**: Read this for the overall project architecture, feature status (Live vs Planned), database environment guardrails, and tech stack.
2. `PRODUCT.md` (Root) - For understanding the product's purpose, brand personality, and anti-references (e.g., no generic SaaS styles).
3. `DESIGN.md` (Root) and `Jewelry Factory System/frontend/design.md` - For strict frontend UI/UX rules, 60-30-10 color role systems, theme handling, and component density standards.
4. `Jewelry Factory System/backend/sql/ERP_DATA_MAPPING_AND_LOGIC.md` - For database field mappings, stored procedures, and core business calculation logic.
5. `Jewelry Factory System/frontend/src/index.css` - Review this to understand the CSS variables and tokens available for styling.
6. (Optional based on task): `sales-menu.md` (if working on Sales Analytics) or `PO_TRACKER_REVAMP_PLAN.md` (if working on Production).

# Strict Development Directives

## 1. UI & Styling (CRITICAL)
- **NO INLINE STYLES**: Never use React inline styles (`style={{...}}`). Always use Tailwind utility classes.
- **NO HARDCODED COLORS**: Never use hex/RGB or default Tailwind colors (e.g., `bg-blue-500`, `#ff0000`). You MUST use CSS design tokens mapped via Tailwind arbitrary values (e.g., `bg-[var(--color-ui-surface)]`, `text-[var(--color-text-primary)]`, `text-[var(--color-brand-600)]`).
- **Semantic Colors**: Use `success`, `danger`, and `brand` tokens appropriately for status indicators and data values.
- **Layout & Density**: Maintain a Data-dense ERP aesthetic. Control border radiuses strictly (max 8px, e.g., `rounded-md`), use subtle borders (`border-[var(--color-border-light)]`), and utilize shadows (`shadow-[var(--shadow-panel)]`) instead of heavy bounding boxes.

## 2. Database & Backend
- **ALWAYS** verify against the TEST database first before executing any modifying queries or procedures.
- Strictly adhere to the mappings in `ERP_DATA_MAPPING_AND_LOGIC.md` when calculating totals or statuses.

When starting a new conversation, briefly acknowledge your understanding of these strict UI rules and the database environment constraints, then state that you are ready for the first task.
