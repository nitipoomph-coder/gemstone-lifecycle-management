const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'ProductionSummaryPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Find the start of PageHeader
const startIdx = content.indexOf('<PageHeader');
if (startIdx === -1) {
  console.log('Could not find PageHeader');
  process.exit(1);
}

// Just replace everything from <PageHeader to the end of the whole topbar with a clean PageHeader
content = content.replace(
  /<PageHeader[\s\S]*?(<div className="flex-1 overflow-auto)/m,
  `<PageHeader
          breadcrumb={BREADCRUMBS.PRODUCTION_SUMMARY}
          contentLayout="workspace"
        />
      </div>

      $1`
);

fs.writeFileSync(filePath, content);
console.log('Fixed PageHeader in ProductionSummaryPage.tsx');
