const fs = require('fs');

const uiPath = 'src/pages/CustomerDashboardLayout.tsx';
let ui = fs.readFileSync(uiPath, 'utf8');

const startIndex = ui.indexOf("{/* Period Dropdown Popover */}");
const endIndex = ui.indexOf("{/* Customer Groups Dropdown Popover */}");

const popoverCode = ui.substring(startIndex, endIndex);

console.log("Found popover length:", popoverCode.length);

fs.writeFileSync('scratch/popover_raw.txt', popoverCode);
