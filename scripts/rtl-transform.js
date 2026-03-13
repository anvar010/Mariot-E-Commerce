const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            if (!dirFile.includes('node_modules') && !dirFile.includes('.next')) {
                filelist = walkSync(dirFile, filelist);
            }
        } else if (file.endsWith('.module.css') || file.endsWith('globals.css')) {
            filelist.push(dirFile);
        }
    });
    return filelist;
};

const cssFiles = walkSync(path.join(__dirname, 'src'));

cssFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Transform left/right to inline-start/inline-end
    content = content.replace(/margin-left:/g, 'margin-inline-start:');
    content = content.replace(/margin-right:/g, 'margin-inline-end:');
    content = content.replace(/padding-left:/g, 'padding-inline-start:');
    content = content.replace(/padding-right:/g, 'padding-inline-end:');
    content = content.replace(/border-left:/g, 'border-inline-start:');
    content = content.replace(/border-right:/g, 'border-inline-end:');
    content = content.replace(/border-left-color:/g, 'border-inline-start-color:');
    content = content.replace(/border-right-color:/g, 'border-inline-end-color:');
    content = content.replace(/border-left-width:/g, 'border-inline-start-width:');
    content = content.replace(/border-right-width:/g, 'border-inline-end-width:');
    content = content.replace(/border-left-style:/g, 'border-inline-start-style:');
    content = content.replace(/border-right-style:/g, 'border-inline-end-style:');

    // Transform border radiuses (logical)
    content = content.replace(/border-top-left-radius:/g, 'border-start-start-radius:');
    content = content.replace(/border-top-right-radius:/g, 'border-start-end-radius:');
    content = content.replace(/border-bottom-left-radius:/g, 'border-end-start-radius:');
    content = content.replace(/border-bottom-right-radius:/g, 'border-end-end-radius:');

    // Careful with absolute positioning `left:` and `right:`
    // For safety we only replace left/right if they are CSS properties (e.g. \n left: 10px; )
    content = content.replace(/([\{\s;])left\s*:\s*([^;\}]+)(?:;)?/g, '$1inset-inline-start: $2;');
    content = content.replace(/([\{\s;])right\s*:\s*([^;\}]+)(?:;)?/g, '$1inset-inline-end: $2;');

    // Handle transform: translateX
    // A standard RTL approach is to add a `[dir="rtl"]` rule for explicit transforms that need mirroring, 
    // but let's stick to simple inline logical properties for now since Next/CSS handles most natively.

    // We should also look for text-align: left/right (wait, text-align: start / end)
    content = content.replace(/text-align:\s*left;/g, 'text-align: start;');
    content = content.replace(/text-align:\s*right;/g, 'text-align: end;');

    // Float
    content = content.replace(/float:\s*left;/g, 'float: inline-start;');
    content = content.replace(/float:\s*right;/g, 'float: inline-end;');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated RTL logical properties in:', file);
    }
});
