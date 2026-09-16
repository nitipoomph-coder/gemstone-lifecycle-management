const fs = require('fs');
const file = 'd:/gemstone-lifecycle-management/Jewelry Factory System/frontend/src/hooks/useCustomerReportData.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /for \(let d = 1; d <= 31; d\+\+\) \{\s*const dVal = daySource\?\.\[yr\]\?\.\[String\(d\)\] \|\| 0;\s*row\[\\$\{yr\}_D\$\{d\}\\] = Number\(row\[\\$\{yr\}_D\$\{d\}\\]\) \+ Number\(dVal\);\s*\}/g;

const replacement = "displayDays.forEach((dStr: string) => { const dVal = daySource?.[yr]?.[dStr] || 0; row[\_D_\] = Number(row[\_D_\]) + Number(dVal); });";

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
