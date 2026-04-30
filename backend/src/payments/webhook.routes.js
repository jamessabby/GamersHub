const express = require("express");
const { verifyWebhookSignature } = require("./paymongo.service");
const tournamentRepo = require("../tournaments/tournament.repository");

const router = express.Router();

// Raw body needed for signature verification
router.post(
  "/paymongo",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["paymongo-signature"] || "";
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET || "";
    const rawBody = req.body.toString("utf8");

    if (secret && !verifyWebhookSignature(rawBody, sig, secret)) {
      return res.status(401).json({ message: "Invalid signature." });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ message: "Invalid JSON." });
    }

    const eventType = event?.data?.attributes?.type;

    try {
      if (eventType === "link.payment.paid") {
        // Payment link paid — link ID is the data object's own ID
        const linkId = event?.data?.attributes?.data?.id;
        if (linkId) await tournamentRepo.markRegistrationPaid(linkId);

      } else if (eventType === "payment.paid") {
        // General payment paid — link ID is in source.resource_id
        const source = event?.data?.attributes?.data?.attributes?.source;
        const linkId = source?.type === "payment_link" ? source.resource_id : null;
        if (linkId) await tournamentRepo.markRegistrationPaid(linkId);
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }

    // Always 200 — PayMongo retries on non-2xx
    res.status(200).json({ received: true });
  }
);

module.exports = router;
