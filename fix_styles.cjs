const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Replace style={{ fontFamily: 'Manrope' }} or 'Manrope, sans-serif'
            content = content.replace(/ style=\{\{\s*fontFamily:\s*'Manrope(?:,\s*sans-serif)?'\s*\}\}/g, " className=\"font-['Manrope']\"");
            content = content.replace(/ style=\{\{\s*fontFamily:\s*'Outfit(?:,\s*sans-serif)?'\s*\}\}/g, " className=\"font-['Outfit']\"");
            
            // Fix double className if any was created
            content = content.replace(/className="([^"]+)"\s+className="([^"]+)"/g, 'className="$1 $2"');
            
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

processDir(path.join(__dirname, 'src', 'app', 'pages'));
console.log('Done!');
