/**
 * twitch.service.js
 * Fetches live esports streams from the Twitch Helix API.
 * Uses Client Credentials flow — no user OAuth needed.
 *
 * Environment variables required:
 *   TWITCH_CLIENT_ID      — from dev.twitch.tv
 *   TWITCH_CLIENT_SECRET  — from dev.twitch.tv
 *
 * Design rules:
 *   - Never saves Twitch data to SQL Server.
 *   - Never mixes Twitch streams with GamersHub official streams.
 *   - Failures are caught and return empty arrays so the main page still works.
 *   - App-access token is cached in memory and refreshed when it expires.
 */

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";
const GAMES_URL = "https://api.twitch.tv/helix/games";
const USERS_URL = "https://api.twitch.tv/helix/users";

// In-memory token cache
let _cachedToken = null;
let _tokenExpiresAt = 0;

/**
 * Returns true only when both env vars are configured.
 * The controller checks this before calling Twitch so it can
 * return a graceful "not configured" response instead of failing.
 */
function isTwitchConfigured() {
  return Boolean(TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET);
}

/**
 * Fetches (or returns the cached) app-access token.
 * Twitch tokens last ~60 days; we refresh 60 seconds before expiry.
 */
async function getAppAccessToken() {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt - 60_000) {
    return _cachedToken;
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const resp = await fetch(`${TOKEN_URL}?${params.toString()}`, {
    method: "POST",
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Twitch token request failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  _cachedToken = data.access_token;
  // expires_in is in seconds
  _tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

/**
 * Builds the Authorization header object used in every Helix request.
 */
async function twitchHeaders() {
  const token = await getAppAccessToken();
  return {
    "Client-ID": TWITCH_CLIENT_ID,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetches live streams from Twitch filtered by game name.
 *
 * @param {object} options
 * @param {string} [options.game]   — Game name to filter by (e.g. "Valorant")
 * @param {number} [options.limit]  — Max results (1–20, default 8)
 * @returns {Promise<Array>}        — Normalized stream objects, never throws.
 */
async function fetchTwitchStreams({ game = "", limit = 8 } = {}) {
  if (!isTwitchConfigured()) {
    console.log("[Twitch] Not configured - missing env vars");
    return [];
  }

  try {
    console.log("[Twitch] Starting fetch for game:", game, "limit:", limit);
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
    const headers = await twitchHeaders();

    let gameId = null;

    // If a game name was given, resolve it to a Twitch game ID first.
    if (game) {
      console.log("[Twitch] Resolving game name:", game);
      const gameResp = await fetch(
        `${GAMES_URL}?name=${encodeURIComponent(game.trim())}`,
        { headers },
      );
      if (gameResp.ok) {
        const gameData = await gameResp.json();
        gameId = gameData.data?.[0]?.id || null;
        console.log("[Twitch] Game ID resolved:", gameId);
      } else {
        console.log(
          "[Twitch] Game resolution failed:",
          gameResp.status,
          gameResp.statusText,
        );
      }
    }

    // Build the streams query
    const streamParams = new URLSearchParams({ first: safeLimit });
    if (gameId) {
      streamParams.set("game_id", gameId);
    } else {
      // Fall back to the top esports category on Twitch (game_id 512980)
      // so we always get relevant content when no game is specified or not found.
      streamParams.set("game_id", "512980"); // Valorant default fallback
      console.log("[Twitch] Using default game_id: 512980");
    }
    streamParams.set("type", "live");

    console.log(
      "[Twitch] Fetching streams with params:",
      streamParams.toString(),
    );
    const streamsResp = await fetch(
      `${STREAMS_URL}?${streamParams.toString()}`,
      { headers },
    );
    if (!streamsResp.ok) {
      console.log(
        "[Twitch] Streams fetch failed:",
        streamsResp.status,
        streamsResp.statusText,
      );
      const errorText = await streamsResp.text();
      console.log("[Twitch] Error response:", errorText);
      return [];
    }

    const streamsData = await streamsResp.json();
    const rawStreams = streamsData.data || [];
    console.log("[Twitch] Found", rawStreams.length, "raw streams");

    if (!rawStreams.length) return [];

    // Enrich with user (channel) info to get profile image URLs
    const userIds = rawStreams.map((s) => s.user_id);
    const userParams = new URLSearchParams(userIds.map((id) => ["id", id]));
    const usersResp = await fetch(`${USERS_URL}?${userParams.toString()}`, {
      headers,
    });
    const usersData = usersResp.ok ? await usersResp.json() : { data: [] };
    const usersMap = Object.fromEntries(
      (usersData.data || []).map((u) => [u.id, u]),
    );

    const result = rawStreams.map((s) => {
      const user = usersMap[s.user_id] || {};
      const thumbnail = s.thumbnail_url
        ? s.thumbnail_url.replace("{width}", "440").replace("{height}", "248")
        : "";

      return {
        source: "twitch",
        streamId: s.id,
        title: s.title || "Untitled",
        gameName: s.game_name || game || "",
        viewerCount: s.viewer_count || 0,
        thumbnailUrl: thumbnail,
        channelName: s.user_name || s.user_login || "",
        profileImageUrl: user.profile_image_url || "",
        twitchUrl: `https://www.twitch.tv/${s.user_login || s.user_name}`,
        isLive: true,
        startedAt: s.started_at || null,
        language: s.language || "en",
        tags: Array.isArray(s.tags) ? s.tags.slice(0, 3) : [],
      };
    });

    console.log("[Twitch] Returning", result.length, "processed streams");
    return result;
  } catch (err) {
    // Never let Twitch errors crash the main page
    console.error("[Twitch] fetchTwitchStreams error:", err.message);
    return [];
  }
}

module.exports = { isTwitchConfigured, fetchTwitchStreams };
