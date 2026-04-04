const sql = require("mssql/msnodesqlv8");

const config = {
  server: "LAPTOP-VO6I66G0\\SQLEXPRESS",
  database: "GAMERSHUB_USER",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

poolConnect
  .then(() => console.log("USER DB Connected"))
  .catch((err) => console.error("USER DB Connection Failed:", err));

module.exports = {
  sql,
  pool,
  poolConnect,
};
