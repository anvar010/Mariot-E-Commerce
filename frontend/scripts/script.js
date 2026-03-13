const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove localStorage.getItem for tokens
    content = content.replace(/const\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);\s*/g, '');
    content = content.replace(/let\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);\s*/g, '');
    content = content.replace(/var\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);\s*/g, '');

    // 2. Remove token from headers block
    content = content.replace(/['"]?Authorization['"]?:\s*`Bearer\s*\$\{t(oken)?\}`/g, '"credentials": "dummy"');

    // Remove the , if trailing or leading
    content = content.replace(/,\s*\n\s*"credentials": "dummy"/g, '');
    content = content.replace(/"credentials": "dummy",\s*\n\s*/g, '');
    content = content.replace(/"credentials": "dummy"\s*/g, '');

    // Remove empty headers blocks
    content = content.replace(/headers:\s*\{\s*\}/g, 'credentials: "include"');

    // 3. Add credentials: "include" to fetch without options
    content = content.replace(/fetch\(([^,\)]+)\)/g, 'fetch($1, { credentials: "include" })');

    // 4. Add credentials: "include" to fetch with options
    // Find all 'fetch(' and parse options. Actually, regexing nested objects is tough.
    // Let's just blindly add it after `{` when it's part of fetch options.
    let index = 0;
    while ((index = content.indexOf('fetch(', index)) !== -1) {
        let commaIndex = content.indexOf(',', index);
        let parenIndex = content.indexOf(')', index);

        // If there is a comma before the closing parenthesis, there are options
        if (commaIndex !== -1 && commaIndex < parenIndex) {
            let optionsStartIndex = content.indexOf('{', commaIndex);
            if (optionsStartIndex !== -1 && optionsStartIndex < parenIndex) {
                // Check if credentials is already there in the next 100 chars
                let snippet = content.substring(optionsStartIndex, optionsStartIndex + 200);
                if (!snippet.includes('credentials')) {
                    // insert
                    content = content.substring(0, optionsStartIndex + 1) +
                        ' credentials: "include", ' +
                        content.substring(optionsStartIndex + 1);
                }
            }
        }
        index = index + 6;
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated: " + filePath);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

traverse(path.join(__dirname, 'src'));
