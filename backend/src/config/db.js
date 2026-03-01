const sql = require("mssql/msnodesqlv8");

const config = {
  server: "LAPTOP-VO6I66G0\\SQLEXPRESS",
  database: "GAMERSHUB_AUTH",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
  sql,
  pool,
  poolConnect,
};
