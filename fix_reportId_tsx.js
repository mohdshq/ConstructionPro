const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/project/[id]/report/[reportId].tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix Daily Report logos
content = content.replace(
    /\.logo-container \{flex: 1; display: flex; gap: 10px; align-items: center; \}/g,
    ".logo-container {flex: 1; display: flex; gap: 15px; align-items: center; justify-content: flex-start; }"
);
content = content.replace(
    /\.logo-container\.right \{justify - content: flex-end; \}/g,
    ".logo-container.right {justify-content: flex-end; }"
);
content = content.replace(
    /\.header-logo \{height: 50px; width: 120px; \}/g,
    ".header-logo {height: 60px; width: 100px; background-size: contain; background-repeat: no-repeat; background-position: center; }"
);

content = content.replace(
    /background-position: left center;/g,
    ""
);
content = content.replace(
    /background-position: right center;/g,
    ""
);

// Fix fonts
content = content.replace(
    /body \{ background: #FFFFFF; font-size: 12px; color: #0F172A; \}/g,
    "body { background: #FFFFFF; font-size: 12px; color: #0F172A; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated [reportId].tsx');
