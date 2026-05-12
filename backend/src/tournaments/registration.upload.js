const fs = require("fs");
const path = require("path");
const multer = require("multer");

// ── Ensure upload directories exist ───────────────────────────────────────────
const proofDir = path.join(__dirname, "..", "..", "uploads", "payment-proofs");
const bannerDir = path.join(__dirname, "..", "..", "uploads", "team-banners");
fs.mkdirSync(proofDir, { recursive: true });
fs.mkdirSync(bannerDir, { recursive: true });

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    // Route each field to its own folder
    if (file.fieldname === "teamBanner") {
      cb(null, bannerDir);
    } else {
      cb(null, proofDir);
    }
  },
  filename(_req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const suffix = file.fieldname === "teamBanner" ? "banner" : "proof";
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-${suffix}${extension}`,
    );
  },
});

function fileFilter(_req, file, cb) {
  if (IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
  error.message = "Files must be an image (JPEG, PNG, WebP, or GIF).";
  cb(error);
}

// Accept both fields; each capped at 1 file
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).fields([
  { name: "paymentProof", maxCount: 1 },
  { name: "teamBanner", maxCount: 1 },
]);
