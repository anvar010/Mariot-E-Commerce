const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const hoverWrapper = () => {
    return {
        postcssPlugin: 'hover-wrapper',
        Rule(rule, { AtRule }) {
            if (rule.selector.includes(':hover')) {
                // Check if already in @media (hover: ...)
                let isInsideHoverMedia = false;
                let parent = rule.parent;
                while (parent && parent.type !== 'root') {
                    if (parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('hover')) {
                        isInsideHoverMedia = true;
                        break;
                    }
                    parent = parent.parent;
                }
                if (!isInsideHoverMedia) {
                    const clonedRule = rule.clone();
                    const mediaQuery = new AtRule({
                        name: 'media',
                        params: '(hover: hover)'
                    });
                    mediaQuery.append(clonedRule);
                    rule.replaceWith(mediaQuery);
                }
            }
        }
    };
};
hoverWrapper.postcss = true;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

async function processFiles() {
    let count = 0;
    walkDir('./src', async (filepath) => {
        if (filepath.endsWith('.css')) {
            const css = fs.readFileSync(filepath, 'utf8');
            if (css.includes(':hover')) {
                try {
                    const result = await postcss([hoverWrapper]).process(css, { from: filepath, to: filepath });
                    if (result.css !== css) {
                        fs.writeFileSync(filepath, result.css);
                        console.log(`Updated hover states in ${filepath}`);
                        count++;
                    }
                } catch (e) {
                    console.error(`Failed parsing ${filepath}`, e);
                }
            }
        }
    });
    // Add small delay to let async finish
    setTimeout(() => console.log(`Finished processing. Updated ${count} files.`), 3000);
}

processFiles();
