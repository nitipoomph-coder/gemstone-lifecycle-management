const fs = require('fs');

const layoutPath = 'src/pages/CustomerDashboardLayout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

// Add import
layout = layout.replace(
  "import { useCustomerDashboardLayout } from '../hooks/useCustomerDashboardLayout';",
  "import { useCustomerDashboardLayout } from '../hooks/useCustomerDashboardLayout';\nimport PeriodSetupPanel from '../components/period/PeriodSetupPanel';"
);

// Remove extracted destructured variables
layout = layout.replace(
  /showPeriodPopover,\s*setShowPeriodPopover,\s*showGroupPopover/s,
  'showGroupPopover'
);
layout = layout.replace(
  /periodPopoverRef,\s*groupPopoverRef/s,
  'groupPopoverRef'
);

// Replace popover block
const popoverStart = layout.indexOf("<div style={{ position: 'relative' }} ref={periodPopoverRef}>");
const popoverEnd = layout.indexOf("{/* Customer Groups Dropdown Popover */}");
layout = layout.substring(0, popoverStart) + 
  "<PeriodSetupPanel periodSetup={periodSetup} availableYears={availableYears} />\n\n              " +
  layout.substring(popoverEnd);

// Remove PeriodSelect component at the bottom
const periodSelectStart = layout.indexOf("interface PeriodSelectProps");
if (periodSelectStart !== -1) {
  layout = layout.substring(0, periodSelectStart);
}

fs.writeFileSync(layoutPath, layout);

// Now patch useCustomerDashboardLayout.ts
const hookPath = 'src/hooks/useCustomerDashboardLayout.ts';
let hook = fs.readFileSync(hookPath, 'utf8');

hook = hook.replace(
  /const \[showPeriodPopover, setShowPeriodPopover\] = useState\(false\);\n\s*/,
  ''
);
hook = hook.replace(
  /const periodPopoverRef = useRef<HTMLDivElement>\(null\);\n\s*/,
  ''
);
hook = hook.replace(
  /if \(periodPopoverRef\.current && !periodPopoverRef\.current\.contains\(event\.target as Node\)\) \{\s*setShowPeriodPopover\(false\);\s*\}/,
  ''
);
hook = hook.replace(
  /showPeriodPopover,\s*setShowPeriodPopover,\s*showGroupPopover/s,
  'showGroupPopover'
);
hook = hook.replace(
  /periodPopoverRef,\s*groupPopoverRef/s,
  'groupPopoverRef'
);

fs.writeFileSync(hookPath, hook);
