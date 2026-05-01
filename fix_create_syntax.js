const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/project/[id]/report/create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement was:
// : 
// <TouchableOpacity
// ...
// )}
// }

// I will use regex to find the specific blocks and wrap them in <> </>

// Fix commencementDate ternary
content = content.replace(
    /(\}\) : \n)(<TouchableOpacity onPress=\{\(\) => setActiveDatePicker\('commencementDate'\)[\s\S]*?\n\)\}\n)(\})/,
    "$1<>$2</>$3"
);

// Fix completionDate ternary
content = content.replace(
    /(\}\) : \n)(<TouchableOpacity onPress=\{\(\) => setActiveDatePicker\('completionDate'\)[\s\S]*?\n\)\}\n)(\})/,
    "$1<>$2</>$3"
);

// Fix anticipatedCompletionDate ternary
content = content.replace(
    /(\}\) : \n)(<TouchableOpacity onPress=\{\(\) => setActiveDatePicker\('anticipatedCompletionDate'\)[\s\S]*?\n\)\}\n)(\})/,
    "$1<>$2</>$3"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed create.tsx');
