const express = require("express");
const app = express();
const port = 3000;

app.use(express.json());
app.use("/api/auth", require("./auth/auth.routes"));

const { poolConnect } = require("./config/db");
poolConnect
  .then(() => console.log("Connected to SQL Server"))
  .catch((err) => console.error("Database connection failed", err));

app.listen(port, () => {
  console.log(`Service is running on http://localhost:${port}`);
});
  