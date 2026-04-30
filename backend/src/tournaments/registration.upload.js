const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "payment-proofs");
fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-proof${extension}`);
  },
});

module.exports = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) { cb(null, true); return; }
    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.message = "Payment proof must be an image (JPEG, PNG, or WebP).";
    cb(error);
  },
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
