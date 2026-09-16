const fs = require('fs');
const path = 'src/pages/CustomerDashboardLayout.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix imports
content = content.replace("import CustomSelect from '../components/ui/CustomSelect';\n", "");
content = content.replace("import { CalendarDays, ChevronDown, Users, BarChart3, Table2, LineChart, FilterX, RefreshCw } from 'lucide-react';", "import { Users, BarChart3, Table2, LineChart, FilterX, RefreshCw, ChevronDown } from 'lucide-react';");
content = content.replace("import { MONTHS } from '../utils/periodUtils';\n", "");

// Fix unused variables in destructuring
content = content.replace("    selectedYears,\n", "");
content = content.replace("    selectedMonths,\n", "");

// Fix the Outlet context
const outletStart = content.indexOf("<Outlet context={{");
const outletEnd = content.indexOf("}} />", outletStart) + 5;

const newOutlet = `<Outlet context={{ 
        periodSetup,
        selGroups, 
        availableYears, 
        refreshCounter, 
        isRefreshing, 
        triggerRefresh, 
        setIsRefreshing, 
        resetFilters 
      }} />`;

content = content.substring(0, outletStart) + newOutlet + content.substring(outletEnd);

fs.writeFileSync(path, content);
