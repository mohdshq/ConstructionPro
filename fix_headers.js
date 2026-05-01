const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./app', function(filePath) {
    if (filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        
        // Ensure all BackButtons are absolute positioned to the left
        content = content.replace(/<BackButton \/>/g, '<BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />');
        content = content.replace(/<BackButton style=\{styles\.backButton\} \/>/g, '<BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />');
        content = content.replace(/<BackButton style=\{\{ marginTop: 20 \}\} \/>/g, '<BackButton style={{ position: "absolute", left: 20, zIndex: 20, bottom: 8 }} />');
        
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated: " + filePath);
        }
    }
});
