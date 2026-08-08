const fs = require('fs');
const os = require('os');
const path = require('path');

const appRoot = path.join(__dirname, '..');

// Where uploaded files live. They are deliberately kept OUTSIDE the project so they survive
// code updates and redeploys, which means the path has to be discovered rather than assumed:
// build-based deploys (Hostinger hbuilds) relocate the app root, so a relative UPLOAD_DIR
// such as "../uploads" quietly starts pointing at a folder that doesn't exist. When that
// happens the old behaviour was to mkdir an empty directory and serve 404s for every image.
//
// Candidates, in priority order:
//   1. UPLOAD_DIR (absolute wins outright; relative is resolved against the app root)
//   2. <home>/uploads   — where the uploads sit on shared hosting, regardless of app root
//   3. <appRoot>/uploads — the in-project fallback, used in dev
//
// The first candidate that is a directory with files in it wins. An empty directory is
// treated as "not it", which is what makes a stale relative UPLOAD_DIR self-correcting.
const candidates = [
    ...(process.env.UPLOAD_DIR ? [path.resolve(appRoot, process.env.UPLOAD_DIR)] : []),
    path.join(os.homedir(), 'uploads'),
    path.join(appRoot, 'uploads'),
];

const isPopulated = (dir) => {
    try {
        return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0;
    } catch {
        return false;
    }
};

const uploadsDir = candidates.find(isPopulated) || candidates[0];

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (process.env.UPLOAD_DIR && path.resolve(appRoot, process.env.UPLOAD_DIR) !== uploadsDir) {
    console.warn(
        `[uploads] UPLOAD_DIR="${process.env.UPLOAD_DIR}" resolved to an empty/missing directory; ` +
        `using ${uploadsDir} instead. Set UPLOAD_DIR to an absolute path to silence this.`
    );
}
console.log('[uploads] serving from', uploadsDir);

module.exports = uploadsDir;
