const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Replace en-GB and th-TH and en-EN
  content = content.replace(/new Date\((.*?)\)\.toLocaleDateString\('en-GB'(?:,\s*\{.*?\})?\)/g, 'formatDateDDMMYY($1)');
  content = content.replace(/new Date\((.*?)\)\.toLocaleDateString\('th-TH'(?:,\s*\{.*?\})?\)/g, 'formatDateDDMMYYYY($1)');
  content = content.replace(/new Date\((.*?)\)\.toLocaleDateString\('en-EN'(?:,\s*\{.*?\})?\)/g, 'formatDateDDMMYY($1)');

  if (content !== original) {
    if (!content.includes('import { formatDateDDMMYY')) {
      const relativePath = path.relative(path.dirname(f), './src/utils/dateUtils').replace(/\\/g, '/');
      const importStmt = "import { formatDateDDMMYY, formatDateDDMMYYYY } from '" + relativePath + "';\n";
      content = importStmt + content;
    }
    fs.writeFileSync(f, content, 'utf8');
    changedCount++;
  }
});
console.log('Modified files:', changedCount);
