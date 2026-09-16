const fs = require('fs');

// 1. Clean CustomerDashboardLayout.tsx
const layoutPath = 'src/pages/CustomerDashboardLayout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

layout = layout.replace("import CustomSelect from '../components/ui/CustomSelect';\n", "");
layout = layout.replace("CalendarDays, ChevronDown, ", "");
layout = layout.replace("import { MONTHS } from '../utils/periodUtils';\n", "");

fs.writeFileSync(layoutPath, layout);

// 2. Clean useCustomerDashboardLayout.ts
const hookPath = 'src/hooks/useCustomerDashboardLayout.ts';
let hook = fs.readFileSync(hookPath, 'utf8');

hook = hook.replace("    applyPeriodPresetLayout,\n    applyPeriodChangesLayout,\n", "");

fs.writeFileSync(hookPath, hook);
