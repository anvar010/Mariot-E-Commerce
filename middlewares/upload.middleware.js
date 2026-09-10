const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Resolved (and created if needed) in config/uploadsDir — must stay the same directory the
// static handler in app.js serves from, so uploads and reads never drift apart.
const uploadDir = require('../config/uploadsDir');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let targetDir = uploadDir;
        if (req.query.folder) {
            targetDir = path.join(uploadDir, req.query.folder);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

/**
 * 3D models, by extension rather than mime type.
 *
 * Browsers disagree about what a .glb is -- Chrome sends model/gltf-binary, others send
 * application/octet-stream, and some send nothing useful at all. The extension is the only
 * reliable signal, and since this route is admin-only the risk of trusting it is low.
 */
const MODEL_EXTENSIONS = ['.glb', '.gltf', '.usdz'];

const isModel = (file) => MODEL_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase());

// File filter (images, documents, and 3D models)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || isModel(file)) {
        cb(null, true);
    } else {
        cb(new Error('Only image, PDF and 3D model (.glb, .gltf, .usdz) files are allowed!'), false);
    }
};

// An image or a PDF has no business being this large; a 3D model of a piece of equipment
// routinely is. multer's own limit is a single number, so the ceiling is raised to the
// larger of the two and the smaller one is enforced per-file below.
const IMAGE_LIMIT = 5 * 1024 * 1024;
const MODEL_LIMIT = 40 * 1024 * 1024;

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (isModel(file)) {
            // multer cannot vary fileSize per file, so the model's own ceiling is checked
            // from the declared length. A request that lies about it still cannot exceed
            // MODEL_LIMIT, which multer enforces.
            const declared = Number(req.headers['content-length']) || 0;
            if (declared > MODEL_LIMIT) {
                return cb(new Error('3D models must be 40MB or smaller.'), false);
            }
            return cb(null, true);
        }
        // Images and PDFs keep their original, tighter limit.
        const declared = Number(req.headers['content-length']) || 0;
        if (declared > IMAGE_LIMIT + 1024 * 1024) {
            return cb(new Error('Images and PDFs must be 5MB or smaller.'), false);
        }
        return fileFilter(req, file, cb);
    },
    limits: {
        fileSize: MODEL_LIMIT
    }
});

module.exports = upload;
