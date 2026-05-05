const express = require("express");
const { verifyWebhookSignature } = require("./paymongo.service");
const tournamentRepo = require("../tournaments/tournament.repository");

const router = express.Router();

// Raw body needed for HMAC signature verification.
// Use type:'*/*' so express.raw buffers regardless of Content-Type variant.
router.post(
  "/paymongo",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const sig = req.headers["paymongo-signature"] || "";
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET || "";

    // req.body is a Buffer when express.raw matched, otherwise undefined.
    if (!req.body || !Buffer.isBuffer(req.body)) {
      console.warn("PayMongo webhook: no raw body received (Content-Type mismatch or empty body).");
      return res.status(400).json({ message: "Empty or unreadable body." });
    }

    const rawBody = req.body.toString("utf8");

    if (secret && secret !== "whsec_REPLACE_ME" && !verifyWebhookSignature(rawBody, sig, secret)) {
      console.warn("PayMongo webhook: signature mismatch.");
      return res.status(401).json({ message: "Invalid webhook signature." });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ message: "Invalid JSON." });
    }

    const eventType = event?.data?.attributes?.type;
    console.log("PayMongo webhook received:", eventType);

    try {
      if (eventType === "link.payment.paid") {
        // Payload structure: event.data.attributes.data.id = "link_xxx"
        const linkId = event?.data?.attributes?.data?.id;
        if (linkId) {
          console.log("PayMongo link.payment.paid - marking paid for linkId:", linkId);
          const updatedCount = await tournamentRepo.markRegistrationPaid(linkId);
          if (!updatedCount) {
            console.warn("PayMongo link.payment.paid - no unpaid registration matched linkId:", linkId);
          }
        } else {
          console.warn("PayMongo link.payment.paid - no linkId found in payload:", JSON.stringify(event?.data?.attributes?.data));
        }

      } else if (eventType === "payment.paid") {
        // Payload structure: event.data.attributes.data.attributes.source.resource_id = "link_xxx"
        const source = event?.data?.attributes?.data?.attributes?.source;
        const linkId = source?.type === "payment_link" ? source.resource_id : null;
        if (linkId) {
          console.log("PayMongo payment.paid - marking paid for linkId:", linkId);
          const updatedCount = await tournamentRepo.markRegistrationPaid(linkId);
          if (!updatedCount) {
            console.warn("PayMongo payment.paid - no unpaid registration matched linkId:", linkId);
          }
        } else {
          console.log("PayMongo payment.paid - not from a payment_link, skipping.");
        }
      } else {
        console.log("PayMongo webhook - unhandled event type, ignoring.");
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }

    // Always 200 - PayMongo retries on non-2xx
    res.status(200).json({ received: true });
  }
);

module.exports = router;
