const streamService = require('./stream.service');

/**
 * POST /api/streams/send-gift
 */
const sendGift = async (req, res) => {
  try {
    const { streamId, userId, giftType, giftValue, quantity, totalValue } = req.body;
    const giftValues = { Star: 5, Heart: 10, Rocket: 25 };

    /* Basic validation */
    if (streamId == null || userId == null || !giftType || quantity == null) {
      return res.status(400).json({ message: 'Missing required gift fields.' });
    }

    if (!Object.prototype.hasOwnProperty.call(giftValues, giftType)) {
      return res.status(400).json({ message: 'Invalid gift type.' });
    }

    const parsedStreamId = parseInt(streamId, 10);
    const parsedUserId = parseInt(userId, 10);
    const parsedQuantity = parseInt(quantity, 10);
    const computedGiftValue = giftValues[giftType];
    const computedTotalValue = computedGiftValue * parsedQuantity;

    if (
      !Number.isInteger(parsedStreamId) ||
      parsedStreamId < 1 ||
      !Number.isInteger(parsedUserId) ||
      parsedUserId < 1
    ) {
      return res.status(400).json({ message: 'streamId and userId must be positive integers.' });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ message: 'Quantity and total value must be positive.' });
    }

    if (
      giftValue != null && Number(giftValue) !== computedGiftValue
      || totalValue != null && Number(totalValue) !== computedTotalValue
    ) {
      return res.status(400).json({ message: 'Gift values do not match gift type or quantity.' });
    }

    const giftId = await streamService.sendGift({
      streamId  : parsedStreamId,
      userId    : parsedUserId,
      giftType,
      giftValue : computedGiftValue,
      quantity  : parsedQuantity,
      totalValue: computedTotalValue,
    });

    return res.status(201).json({ success: true, giftId });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { sendGift };
