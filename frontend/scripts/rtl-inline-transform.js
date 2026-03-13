const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            if (!dirFile.includes('node_modules') && !dirFile.includes('.next')) {
                filelist = walkSync(dirFile, filelist);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            filelist.push(dirFile);
        }
    });
    return filelist;
};

const files = walkSync(path.join(__dirname, 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace inline logical properties
    content = content.replace(/marginLeft/g, 'marginInlineStart');
    content = content.replace(/marginRight/g, 'marginInlineEnd');
    content = content.replace(/paddingLeft/g, 'paddingInlineStart');
    content = content.replace(/paddingRight/g, 'paddingInlineEnd');
    content = content.replace(/borderLeft/g, 'borderInlineStart');
    content = content.replace(/borderRight/g, 'borderInlineEnd');
    content = content.replace(/left\s*:\s*(['"`]\d+.*?['"`]|0)/g, 'insetInlineStart: $1');
    content = content.replace(/right\s*:\s*(['"`]\d+.*?['"`]|0)/g, 'insetInlineEnd: $1');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed inline RTL properties in', file);
    }
});
