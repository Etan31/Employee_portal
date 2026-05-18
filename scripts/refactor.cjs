const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

const files = [];

// Recursive function to get all files
function getFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath);
        } else {
            files.push(fullPath);
        }
    }
}

getFiles(srcDir);

// Map old paths to new paths
const fileMap = new Map();

files.forEach(oldPath => {
    let newPath = oldPath;
    
    // Convert views/* to *
    newPath = newPath.replace(path.join(srcDir, 'views', 'components'), path.join(srcDir, 'components'));
    newPath = newPath.replace(path.join(srcDir, 'views', 'layouts'), path.join(srcDir, 'layouts'));
    newPath = newPath.replace(path.join(srcDir, 'views', 'pages'), path.join(srcDir, 'pages'));
    
    // Convert models to data
    newPath = newPath.replace(path.join(srcDir, 'models'), path.join(srcDir, 'data'));
    
    // Convert controllers
    if (oldPath.includes(path.join(srcDir, 'controllers'))) {
        const basename = path.basename(oldPath);
        if (basename.startsWith('use')) {
            newPath = newPath.replace(path.join(srcDir, 'controllers'), path.join(srcDir, 'hooks'));
        } else {
            newPath = newPath.replace(path.join(srcDir, 'controllers'), path.join(srcDir, 'utils'));
        }
    }

    fileMap.set(oldPath, newPath);
});

// Create directories for new paths
const newDirs = new Set();
for (const newPath of fileMap.values()) {
    newDirs.add(path.dirname(newPath));
}
for (const dir of newDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const extensions = ['.js', '.jsx', '.css', '.svg', '.png', '.txt'];
function resolveExtension(targetPath) {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) return targetPath;
    for (const ext of extensions) {
        if (fs.existsSync(targetPath + ext)) return targetPath + ext;
    }
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        if (fs.existsSync(path.join(targetPath, 'index.jsx'))) return path.join(targetPath, 'index.jsx');
        if (fs.existsSync(path.join(targetPath, 'index.js'))) return path.join(targetPath, 'index.js');
    }
    return null;
}

// Read, process and write
for (const [oldPath, newPath] of fileMap.entries()) {
    if (oldPath.endsWith('.js') || oldPath.endsWith('.jsx')) {
        let content = fs.readFileSync(oldPath, 'utf8');
        
        const importRegex = /(import.*?from\s*)(['"])(.*?)\2/g;
        const importSideEffectRegex = /(import\s*)(['"])(.*?)\2/g;
        const dynamicImportRegex = /(import\s*\(\s*)(['"])(.*?)\2(\s*\))/g;

        function replacer(match, p1, quote, importPath, p4) {
            if (!importPath.startsWith('.')) {
                return match; 
            }
            
            const oldTargetAbsPath = path.resolve(path.dirname(oldPath), importPath);
            const resolvedOldTarget = resolveExtension(oldTargetAbsPath);
            
            if (resolvedOldTarget && fileMap.has(resolvedOldTarget)) {
                const newTargetAbsPath = fileMap.get(resolvedOldTarget);
                let newRelPath = path.relative(path.dirname(newPath), newTargetAbsPath);
                newRelPath = newRelPath.replace(/\\/g, '/');
                
                const originalHasExt = path.extname(importPath) !== '';
                if (!originalHasExt) {
                    const newExt = path.extname(newRelPath);
                    if (newExt === '.js' || newExt === '.jsx') {
                        newRelPath = newRelPath.slice(0, -newExt.length);
                    }
                }
                
                if (!newRelPath.startsWith('.')) {
                    newRelPath = './' + newRelPath;
                }
                
                if (p4 !== undefined) {
                    return `${p1}${quote}${newRelPath}${quote}${p4}`;
                }
                return `${p1}${quote}${newRelPath}${quote}`;
            }
            
            return match;
        }

        content = content.replace(importRegex, replacer);
        // Don't replace side effects if they are identical to from matches (which they aren't, the regex is different)
        // Actually, we must be careful not to process `import x from "y"` with the side effect regex.
        // The side effect regex `import "y"` shouldn't match `import x from "y"`.
        // The regex is: /(import\s*)(['"])(.*?)\2/g
        // Let's test: 'import "style.css"' -> matches.
        // 'import x from "y"' -> matches 'import x' not quote. So it works.
        // Oh wait, `import "style.css"` matches, but `import { x } from "y"` doesn't match the side effect regex because there's no quote right after import.
        content = content.replace(/(?<!from\s*)(import\s*)(['"])(.*?)\2/g, replacer);
        content = content.replace(dynamicImportRegex, replacer);
        
        fs.writeFileSync(newPath, content);
    } else {
        // Just write to new location
        if (oldPath !== newPath) {
            fs.copyFileSync(oldPath, newPath);
        }
    }
}

// Clean up old directories
const dirsToRemove = ['views', 'models', 'controllers'];
dirsToRemove.forEach(d => {
    const p = path.join(srcDir, d);
    if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
    }
});

console.log("Refactoring complete!");
