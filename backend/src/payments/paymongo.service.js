const crypto = require("crypto");

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY || "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function createPaymentLink({ amount, description, remarks, redirectSuccess }) {
  const attributes = {
    amount: Number(amount),
    description: String(description || "Tournament Registration Fee"),
    remarks: String(remarks || ""),
  };
  if (redirectSuccess) {
    attributes.redirect = { success: redirectSuccess };
  }

  const res = await fetch(`${PAYMONGO_BASE}/links`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { attributes } }),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body?.errors?.[0]?.detail || "PayMongo: failed to create payment link.";
    const err = new Error(msg);
    err.statusCode = 502;
    throw err;
  }

  const attrs = body?.data?.attributes;
  return {
    linkId: body.data.id,
    checkoutUrl: attrs.checkout_url,
    status: attrs.status,
  };
}

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  try {
    // Split on ',' first to get each key=value pair, then split each pair on the
    // FIRST '=' only (using indexOf) so that values containing '=' are preserved.
    const parts = {};
    for (const segment of signatureHeader.split(",")) {
      const idx = segment.indexOf("=");
      if (idx === -1) continue;
      parts[segment.slice(0, idx)] = segment.slice(idx + 1);
    }
    const timestamp = parts.t;
    const receivedSig = parts.te || parts.li; // te = test mode, li = live mode
    if (!timestamp || !receivedSig) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedSig, "hex")
    );
  } catch {
    return false;
  }
}

module.exports = { createPaymentLink, verifyWebhookSignature };