const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function findAndReplaceFetch(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndReplaceFetch(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Simple replacements for token usage that can be cleaned up
            content = content.replace(/const\s+token\s*=\s*localStorage\.getItem\('token'\);\n?/g, '');
            // Some files might define token differently
            content = content.replace(/let\s+token\s*=\s*localStorage\.getItem\('token'\);\n?/g, '');

            // The hard part: we need to replace headers: { 'Authorization': `Bearer ${token}` }
            // With credentials: 'include'
            content = content.replace(/headers:\s*\{\s*'Authorization':\s*`Bearer\s*\$\{([a-zA-Z0-9_]+)\}`\s*\}?/g, 'credentials: "include"');
            content = content.replace(/headers:\s*\{\s*["']Authorization["']:\s*`Bearer\s*\$\{([a-zA-Z0-9_]+)\}`\s*\}?/g, 'credentials: "include"');

            // Find all fetch calls that don't have second argument, or have it but don't have credentials
            // This regex approach might be brittle, so we can also just use a simpler regex
            // This is just a basic pass. If `fetch(url)` => `fetch(url, { credentials: 'include' })`
            content = content.replace(/fetch\(([^,]+)\)/g, 'fetch($1, { credentials: "include" })');

            // If fetch was already having options, add credentials
            content = content.replace(/fetch\(([^,]+),\s*\{/g, 'fetch($1, { credentials: "include",');

            // Wait, what if there's both `credentials: "include"` and `{ credentials: "include", credentials: "include" }`?
            // To prevent duplicates:
            content = content.replace(/credentials:\s*"include",\s*credentials:\s*"include"/g, 'credentials: "include"');

            // Wait, that replacement is too aggressive.

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

findAndReplaceFetch(directoryPath);
