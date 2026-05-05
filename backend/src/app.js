const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env"), override: true });

const express = require("express");
const app = express();
const port = 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Webhook must be mounted before express.json() — it needs the raw request body for signature verification
app.use("/api/webhooks", require("./payments/webhook.routes"));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/auth", require("./auth/auth.routes"));
app.use("/api/users", require("./users/user.routes"));
app.use("/api/feed", require("./feed/feed.routes"));
app.use("/api/tournaments", require("./tournaments/tournament.routes"));
app.use("/api/reactions", require("./reactions/reaction.routes"));
app.use("/api/admin", require("./admin/admin.routes"));
app.use("/api/superadmin", require("./admin/superadmin.routes"));

const streamRoutes = require("./stream/stream.routes");
app.use("/api/streams", streamRoutes);

app.use("/api/events", require("./events/event.routes"));

// Public config endpoint for browser-side integrations.
// GIPHY API keys are public client keys, not server secrets. We still serve
// this from the backend so environment-specific values stay out of source.
app.get("/api/config/giphy", (_req, res) => {
  const key = process.env.GIPHY_API_KEY || "";
  res.json({ key, configured: Boolean(key) });
});

const { poolConnect: authPoolConnect } = require("./config/db.auth");
const { poolConnect: feedPoolConnect } = require("./config/db.feed");
const { poolConnect: reactionPoolConnect } = require("./config/db.reaction");
const { poolConnect: tournamentPoolConnect } = require("./config/db.tournament");
const { poolConnect: userPoolConnect } = require("./config/db.user");

Promise.all([
  authPoolConnect,
  feedPoolConnect,
  reactionPoolConnect,
  tournamentPoolConnect,
  userPoolConnect,
])
  .then(() => console.log("Connected to SQL Server (AUTH + FEED + REACTION + TOURNAMENT + USER)"))
  .catch((err) => console.error("Database connection failed", err));

app.use((err, _req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "File too large. Please choose media under 50 MB." });
    return;
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    res.status(415).json({ message: err.message || "Unsupported file type." });
    return;
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.status(400).json({ message: "Invalid JSON body." });
    return;
  }

  console.error("Unhandled request error:", err);
  res.status(err.statusCode || err.status || 500).json({
    message: err.message || "Internal server error.",
  });
});

app.listen(port, () => {
  console.log(`Service is running on http://localhost:${port}`);
});
