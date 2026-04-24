const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "streams");
fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "thumb", extension)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "thumb";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${extension}`);
  },
});

function fileFilter(_req, file, cb) {
  if (IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
  error.message = "Thumbnails must be an image (JPEG, PNG, WebP, or GIF).";
  cb(error);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});
