const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app');
const files = fs.readdirSync(dir).filter(f => f.endsWith('-calculator.tsx') || f === 'converter.tsx' || f === 'dynamic-calculator.tsx');

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Ensure useThemeColors import
    if (!content.includes("import { useThemeColors } from '../store/useThemeColors';")) {
        // Find last import
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLastImport + 1) + "import { useThemeColors } from '../store/useThemeColors';\n" + content.slice(endOfLastImport + 1);
    }

    // 2. Ensure const { colors } = useThemeColors();
    if (!content.includes('const { colors }') && !content.includes('const { colors, isDark }')) {
        // Insert after component declaration
        content = content.replace(/export default function \w+\(\) \{/, "$&\n    const { colors } = useThemeColors();");
    }

    // 3. Fix inputSection
    content = content.replace(/style=\{\[styles\.inputSection, \{ backgroundColor: colors\.card, borderColor: colors\.border \}\]\}/g, "style={styles.inputSection}");

    // 4. Ensure converter.tsx has colors applied to container
    if (file === 'converter.tsx') {
        content = content.replace(/style=\{styles\.container\}/g, "style={[styles.container, { backgroundColor: colors.background }]}");
        content = content.replace(/style=\{styles\.headerBar\}/g, "style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}");
        content = content.replace(/style=\{styles\.headerBarTitle\}/g, "style={[styles.headerBarTitle, { color: colors.text }]}");
        content = content.replace(/style=\{styles\.label\}/g, "style={[styles.label, { color: colors.text }]}");
        content = content.replace(/style=\{styles\.inputWrapper\}/g, "style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}");
        content = content.replace(/style=\{styles\.input\}/g, "style={[styles.input, { color: colors.text }]}");
        
        // Also fix BackButton in converter.tsx (it wasn't imported from correct place or maybe didn't have correct props)
        // Wait, if it's using the dark theme now, the back button issue might be fixed because BackButton uses useThemeColors internally.
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Fixed', file);
}
