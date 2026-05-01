const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app');
const files = fs.readdirSync(dir).filter(f => f.endsWith('-calculator.tsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add import if not exists
    if (!content.includes('useThemeColors')) {
        content = content.replace(
            "import { useStore } from '../store/useStore';",
            "import { useStore } from '../store/useStore';\nimport { useThemeColors } from '../store/useThemeColors';"
        );
    }

    // Add colors hook
    if (!content.includes('const { colors } = useThemeColors();')) {
        content = content.replace(
            "const { units } = useStore();",
            "const { units } = useStore();\n    const { colors } = useThemeColors();"
        );
    }

    // Replace styles
    content = content.replace(/style=\{styles\.container\}/g, "style={[styles.container, { backgroundColor: colors.background }]}");
    content = content.replace(/style=\{styles\.headerBar\}/g, "style={[styles.headerBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}");
    content = content.replace(/style=\{styles\.headerBarTitle\}/g, "style={[styles.headerBarTitle, { color: colors.text }]}");
    content = content.replace(/style=\{styles\.inputSection\}/g, "style={[styles.inputSection, { backgroundColor: colors.card, borderColor: colors.border }]}");
    content = content.replace(/style=\{styles\.sectionHeader\}/g, "style={[styles.sectionHeader, { color: colors.text }]}");
    content = content.replace(/style=\{styles\.label\}/g, "style={[styles.label, { color: colors.text }]}");
    content = content.replace(/style=\{styles\.inputWrapper\}/g, "style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}");
    content = content.replace(/style=\{styles\.input\}/g, "style={[styles.input, { color: colors.text }]}");
    
    // Some don't have inputSection styles directly on View but we wrap it
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
