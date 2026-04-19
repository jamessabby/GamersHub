const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 32) {
  let secret = "";
  const bytes = crypto.randomBytes(length);
  for (let index = 0; index < bytes.length; index += 1) {
    secret += BASE32_ALPHABET[bytes[index] % BASE32_ALPHABET.length];
  }
  return secret.slice(0, length);
}

function buildOtpAuthUri({ secret, accountName, issuer = "GamersHub" }) {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${accountName}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function verifyTotp(secret, token, { window = 1, period = 30 } = {}) {
  const normalizedToken = String(token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / period);
  for (let offset = -window; offset <= window; offset += 1) {
    if (generateTotp(secret, currentCounter + offset) === normalizedToken) {
      return true;
    }
  }
  return false;
}

function generateTotp(secret, counter) {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

function decodeBase32(value) {
  const cleaned = String(value || "").toUpperCase().replace(/=+$/g, "");
  let bits = "";
  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error("Invalid base32 secret.");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

module.exports = {
  generateBase32Secret,
  buildOtpAuthUri,
  verifyTotp,
};
