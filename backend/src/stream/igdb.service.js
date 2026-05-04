/**
 * igdb.service.js
 * Fetches game metadata (cover art, genres, summary) from the IGDB API.
 * IGDB is owned by Twitch, so it reuses the same Client Credentials token.
 *
 * Environment variables required (same as Twitch):
 *   TWITCH_CLIENT_ID
 *   TWITCH_CLIENT_SECRET
 *
 * Design rules:
 *   - Never saves IGDB data to SQL Server. It is always fetched on demand.
 *   - Results are cached in memory per game name for 6 hours to stay within free-tier limits.
 *   - Failures return null gracefully so the calling UI can skip the cover art.
 *   - IGDB is enhancement-only; gameName from SQL Server remains authoritative.
 */

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";

// In-memory token cache (shared approach with twitch.service.js)
let _cachedToken = null;
let _tokenExpiresAt = 0;

// In-memory result cache: gameName (lowercase) -> { data, cachedAt }
const _gameCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isIgdbConfigured() {
  return Boolean(TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET);
}

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

  const resp = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`IGDB token request failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  _cachedToken = data.access_token;
  _tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

/**
 * Fetches IGDB metadata for a single game name.
 *
 * Returns an object with:
 *   coverUrl  — HTTPS URL to the game cover (720p quality)
 *   summary   — Short description from IGDB
 *   genres    — Array of genre name strings
 *   rating    — Aggregated rating (0–100) or null
 *
 * Returns null if not found or on any error.
 *
 * @param {string} gameName
 * @returns {Promise<object|null>}
 */
async function fetchGameData(gameName) {
  if (!isIgdbConfigured() || !gameName) return null;

  const key = String(gameName).trim().toLowerCase();
  if (!key) return null;

  // Return from cache if fresh
  const cached = _gameCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const token = await getAppAccessToken();
    const headers = {
      "Client-ID": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    // IGDB uses a POST with a body query language called Apicalypse
    const query = `
      search "${key.replace(/"/g, '\\"')}";
      fields name, cover.image_id, summary, genres.name, aggregated_rating, platforms.name;
      limit 1;
    `;

    const resp = await fetch(`${IGDB_BASE}/games`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "text/plain" },
      body: query,
    });

    if (!resp.ok) {
      console.warn(`[IGDB] Games fetch failed for "${gameName}":`, resp.status);
      _gameCache.set(key, { data: null, cachedAt: Date.now() });
      return null;
    }

    const games = await resp.json();
    const game = games?.[0];

    if (!game) {
      _gameCache.set(key, { data: null, cachedAt: Date.now() });
      return null;
    }

    const result = {
      igdbId: game.id,
      name: game.name || gameName,
      coverUrl: game.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
      summary: game.summary
        ? game.summary.substring(0, 300) + (game.summary.length > 300 ? "…" : "")
        : null,
      genres: Array.isArray(game.genres)
        ? game.genres.map((g) => g.name).filter(Boolean)
        : [],
      rating: game.aggregated_rating ? Math.round(game.aggregated_rating) : null,
    };

    _gameCache.set(key, { data: result, cachedAt: Date.now() });
    return result;
  } catch (err) {
    console.error(`[IGDB] fetchGameData error for "${gameName}":`, err.message);
    _gameCache.set(key, { data: null, cachedAt: Date.now() });
    return null;
  }
}

/**
 * Batch-fetch game data for an array of game names.
 * Deduplicates names and returns a Map: gameName (original case) -> igdb data | null
 *
 * @param {string[]} gameNames
 * @returns {Promise<Map<string, object|null>>}
 */
async function fetchGameDataBatch(gameNames) {
  const unique = [...new Set((gameNames || []).map((n) => String(n || "").trim()).filter(Boolean))];
  const results = new Map();

  await Promise.all(
    unique.map(async (name) => {
      const data = await fetchGameData(name);
      results.set(name, data);
    }),
  );

  return results;
}

module.exports = { isIgdbConfigured, fetchGameData, fetchGameDataBatch };
