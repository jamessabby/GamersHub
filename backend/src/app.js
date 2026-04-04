const express = require("express");
const app = express();
const port = 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use("/api/auth", require("./auth/auth.routes"));
app.use("/api/users", require("./users/user.routes"));

const streamRoutes = require("./stream/stream.routes");
app.use("/api/streams", streamRoutes);

const { poolConnect: authPoolConnect } = require("./config/db.auth");
const { poolConnect: feedPoolConnect } = require("./config/db.feed");
const { poolConnect: userPoolConnect } = require("./config/db.user");

Promise.all([authPoolConnect, feedPoolConnect, userPoolConnect])
  .then(() => console.log("Connected to SQL Server (AUTH + FEED + USER)"))
  .catch((err) => console.error("Database connection failed", err));

app.listen(port, () => {
  console.log(`Service is running on http://localhost:${port}`);
});
