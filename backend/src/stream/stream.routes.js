const express = require('express');
const router  = express.Router();
const streamController = require('./stream.controller');

/**
 * POST /api/streams/send-gift
 * Body: { streamId, userId, giftType, giftValue, quantity, totalValue }
 */
router.post('/send-gift', streamController.sendGift);

module.exports = router;