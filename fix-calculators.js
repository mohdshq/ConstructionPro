const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app');

function fixCalculators() {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (!file.endsWith('-calculator.tsx') && file !== 'converter.tsx') {
            continue;
        }

        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        let modified = false;

        // Check if colors or isDark is used
        if (content.includes('colors.') || content.includes('colors,') || content.includes('isDark')) {
            // Check if useThemeColors is imported
            if (!content.includes('import { useThemeColors }')) {
                // Add import after the last import
                const lines = content.split('\n');
                let lastImportIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('import ')) {
                        lastImportIndex = i;
                    }
                }
                if (lastImportIndex !== -1) {
                    lines.splice(lastImportIndex + 1, 0, "import { useThemeColors } from '../store/useThemeColors';");
                    content = lines.join('\n');
                    modified = true;
                }
            }

            // Check if instantiated
            if (!content.includes('const { colors') && !content.includes('const { isDark, colors }') && !content.includes('const { colors, isDark }')) {
                // Find default export function
                const exportFuncRegex = /export default function\s+\w+\s*\([^)]*\)\s*\{/;
                const match = content.match(exportFuncRegex);
                if (match) {
                    const insertIndex = match.index + match[0].length;
                    content = content.slice(0, insertIndex) + '\n    const { colors, isDark } = useThemeColors();' + content.slice(insertIndex);
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed ${file}`);
        }
    }
}

fixCalculators();
