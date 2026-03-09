const { sql, pool, poolConnect } = require("../config/db.feed");
/**
 * Insert a gift record into StreamGifts.
 *
 * Table expected schema:
 *   StreamGifts (
 *     GiftID       INT IDENTITY PRIMARY KEY,
 *     StreamID     INT           NOT NULL,
 *     SenderUserID INT           NOT NULL,
 *     GiftType     NVARCHAR(50)  NOT NULL,
 *     GiftValue    DECIMAL(10,2) NOT NULL,
 *     Quantity     INT           NOT NULL,
 *     TotalValue   DECIMAL(10,2) NOT NULL,
 *     CreatedAt    DATETIME      DEFAULT GETDATE()
 *   )
 *
 * @param {{ streamId, userId, giftType, giftValue, quantity, totalValue }} gift
 * @returns {Promise<number>} The inserted GiftID
 */
const insertGift = async ({
  streamId,
  userId,
  giftType,
  giftValue,
  quantity,
  totalValue,
}) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("streamId", sql.Int, streamId)
      .input("userId", sql.Int, userId)
      .input("giftType", sql.NVarChar(50), giftType)
      .input("giftValue", sql.Int, giftValue)
      .input("quantity", sql.Int, quantity)
      .input("totalValue", sql.Int, totalValue).query(`
        INSERT INTO dbo.STREAM_GIFTS
          (STREAM_ID, SENDER_USERID, GIFT_TYPE, GIFT_VALUE, QUANTITY, TOTAL_VALUE, CREATED_AT)
        VALUES
          (@streamId, @userId, @giftType, @giftValue, @quantity, @totalValue, SYSDATETIME());

        SELECT SCOPE_IDENTITY() AS GiftID;
      `);

    if (!result.recordset?.[0]?.GiftID) {
      throw new Error("Gift insert succeeded but no GiftID was returned.");
    }

    return parseInt(result.recordset[0].GiftID, 10);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = { insertGift };
