const fs = require("fs");
const path = require("path");
const multer = require("multer");

const bannerDir = path.join(__dirname, "..", "..", "uploads", "team-banners");
fs.mkdirSync(bannerDir, { recursive: true });

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, bannerDir),
  filename(_req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-banner${extension}`,
    );
  },
});

module.exports = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const error = new multer.MulterError(
      "LIMIT_UNEXPECTED_FILE",
      file.fieldname,
    );
    error.message = "Team banner must be an image (JPEG, PNG, WebP, or GIF).";
    cb(error);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
