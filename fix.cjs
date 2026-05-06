const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, files);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

const files = getFiles(srcDir);

for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
        let content = fs.readFileSync(file, 'utf8');
        
        // The error was that a number (offset) was appended right after the closing quote of an import path.
        // It looks like: from './path.js'123; or import './path.js'123;
        // We need to remove the digits that follow a quote if they are part of an import statement.
        
        // We can just look for quotes followed by digits and optionally a semicolon
        // specifically in lines starting with import
        
        // Let's use a regex that matches quotes followed by digits
        // content = content.replace(/(['"])\d+(?=[\s;]*)/g, '$1');
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('import')) {
                // Find quotes followed by digits
                lines[i] = lines[i].replace(/(['"])\d+/g, '$1');
            }
        }
        
        fs.writeFileSync(file, lines.join('\n'));
    }
}
console.log("Fixed numbers!");
