const streamRepository = require('./stream.repository');

/**
 * Business logic layer for stream gift transactions.
 * Add gift cost validation, user balance checks, etc. here when ready.
 */

/**
 * @param {{ streamId, userId, giftType, giftValue, quantity, totalValue }} giftData
 * @returns {Promise<number>}
 */
const sendGift = async (giftData) => {
  /* Future: check user has sufficient balance before inserting */
  /* Future: deduct balance from user account */

  const giftId = await streamRepository.insertGift(giftData);
  return giftId;
};

module.exports = { sendGift };
