  const streamService = require("./stream.service");
  const twitchService = require("./twitch.service");
  const igdbService = require("./igdb.service");

  const getStreams = async (req, res) => {
    try {
      const data = await streamService.listStreams({
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        liveOnly: req.query.liveOnly === "true",
      });

      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message || "Failed to load streams." });
    }
  };

  const getStreamById = async (req, res) => {
    try {
      const stream = await streamService.getStreamById(req.params.streamId);
      return res.status(200).json(stream);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        message: err.message || "Failed to load stream.",
      });
    }
  };

  const trackView = async (req, res) => {
    try {
      await streamService.trackView(req.params.streamId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Failed to track view." });
    }
  };

  const getLikeStatus = async (req, res) => {
    try {
      const userId = req.auth?.user?.userId;
      const data = await streamService.getLikeStatus(req.params.streamId, userId);
      return res.status(200).json(data);
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Failed to load like status." });
    }
  };

  const toggleLike = async (req, res) => {
    try {
      const data = await streamService.toggleLike(req.params.streamId, req.auth.user.userId);
      return res.status(200).json(data);
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Failed to like stream." });
    }
  };

  const removeLike = async (req, res) => {
    try {
      const data = await streamService.removeLike(req.params.streamId, req.auth.user.userId);
      return res.status(200).json(data);
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Failed to unlike stream." });
    }
  };

  const getComments = async (req, res) => {
    try {
      const comments = await streamService.listComments(req.params.streamId, {
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return res.status(200).json(comments);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        message: err.message || "Failed to load stream comments.",
      });
    }
  };

  const createComment = async (req, res) => {
    try {
      const comment = await streamService.createComment(req.params.streamId, {
        ...req.body,
        userId: req.auth.user.userId,
      });
      return res.status(201).json(comment);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        message: err.message || "Failed to create stream comment.",
      });
    }
  };

  const sendGift = async (req, res) => {
    try {
      const { streamId, giftType, giftValue, quantity, totalValue } = req.body;
      const giftValues = { Star: 5, Heart: 10, Rocket: 25 };

      if (streamId == null || !giftType || quantity == null) {
        return res.status(400).json({ message: "Missing required gift fields." });
      }

      if (!Object.prototype.hasOwnProperty.call(giftValues, giftType)) {
        return res.status(400).json({ message: "Invalid gift type." });
      }

      const parsedStreamId = parseInt(streamId, 10);
      const parsedUserId = req.auth.user.userId;
      const parsedQuantity = parseInt(quantity, 10);
      const computedGiftValue = giftValues[giftType];
      const computedTotalValue = computedGiftValue * parsedQuantity;

      if (
        !Number.isInteger(parsedStreamId) ||
        parsedStreamId < 1 ||
        !Number.isInteger(parsedUserId) ||
        parsedUserId < 1
      ) {
        return res.status(400).json({ message: "streamId and userId must be positive integers." });
      }

      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        return res.status(400).json({ message: "Quantity and total value must be positive." });
      }

      if (
        (giftValue != null && Number(giftValue) !== computedGiftValue) ||
        (totalValue != null && Number(totalValue) !== computedTotalValue)
      ) {
        return res.status(400).json({ message: "Gift values do not match gift type or quantity." });
      }

      const giftId = await streamService.sendGift({
        streamId: parsedStreamId,
        userId: parsedUserId,
        giftType,
        giftValue: computedGiftValue,
        quantity: parsedQuantity,
        totalValue: computedTotalValue,
      });

      return res.status(201).json({ success: true, giftId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error." });
    }
  };

  /**
   * GET /api/streams/twitch?game=Valorant&limit=8
   *
   * Returns live streams from Twitch for the given game.
   * These are NEVER saved to SQL Server and NEVER appear in admin moderation.
   * Falls back gracefully if Twitch is not configured or fails.
   */
  const getTwitchStreams = async (req, res) => {
    if (!twitchService.isTwitchConfigured()) {
      return res.status(200).json({
        items: [],
        source: "twitch",
        configured: false,
        message: "Twitch integration is not configured on this server.",
      });
    }

    try {
      const game = req.query.game ? String(req.query.game).trim() : "";
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const items = await twitchService.fetchTwitchStreams({ game, limit });
      return res.status(200).json({ items, source: "twitch", configured: true });
    } catch (err) {
      console.error("[Controller] getTwitchStreams error:", err.message);
      return res.status(200).json({
        items: [],
        source: "twitch",
        configured: true,
        message: "Twitch data is temporarily unavailable.",
      });
    }
  };

  /**
   * GET /api/streams/igdb/game?name=Valorant
   *
   * Returns IGDB metadata (cover art, genres, summary, rating) for a game name.
   * Falls back gracefully if IGDB is not configured or the game is not found.
   */
  const getIgdbGame = async (req, res) => {
    if (!igdbService.isIgdbConfigured()) {
      return res.status(200).json({
        game: null,
        configured: false,
        message: "IGDB integration is not configured on this server.",
      });
    }

    const name = req.query.name ? String(req.query.name).trim() : "";
    if (!name) {
      return res.status(400).json({ message: "Query parameter 'name' is required." });
    }

    try {
      const game = await igdbService.fetchGameData(name);
      return res.status(200).json({ game, configured: true });
    } catch (err) {
      console.error("[Controller] getIgdbGame error:", err.message);
      return res.status(200).json({
        game: null,
        configured: true,
        message: "IGDB data is temporarily unavailable.",
      });
    }
  };

  module.exports = {
    getStreams,
    getStreamById,
    trackView,
    getLikeStatus,
    toggleLike,
    removeLike,
    getComments,
    createComment,
    sendGift,
    getTwitchStreams,
    getIgdbGame,
  };
