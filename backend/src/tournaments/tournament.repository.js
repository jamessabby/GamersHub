const { sql, pool, poolConnect } = require("../config/db.tournament");

async function listTournaments() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT
      t.TOURNAMENT_ID AS tournamentId,
      t.TITLE AS title,
      t.GAME_NAME AS gameName,
      CONVERT(varchar(10), t.START_DATE, 23) AS startDate,
      CONVERT(varchar(10), t.END_DATE, 23) AS endDate,
      t.STATUS AS status,
      CAST(t.IS_ACTIVE AS bit) AS isActive,
      COUNT(m.MATCH_ID) AS matchCount,
      COUNT(
        CASE
          WHEN m.TEAM_A_SCORE IS NOT NULL AND m.TEAM_B_SCORE IS NOT NULL THEN 1
        END
      ) AS completedMatchCount,
      (
        SELECT COUNT(DISTINCT allT.TEAM_ID)
        FROM (
          SELECT tt.TEAM_ID
          FROM dbo.TOURNAMENT_TEAM tt
          WHERE tt.TOURNAMENT_ID = t.TOURNAMENT_ID
          UNION
          SELECT mx.TEAM_A_ID
          FROM dbo.MATCH mx
          WHERE mx.TOURNAMENT_ID = t.TOURNAMENT_ID
          UNION
          SELECT mx.TEAM_B_ID
          FROM dbo.MATCH mx
          WHERE mx.TOURNAMENT_ID = t.TOURNAMENT_ID
        ) allT
      ) AS teamCount
    FROM dbo.TOURNAMENT t
    LEFT JOIN dbo.MATCH m
      ON m.TOURNAMENT_ID = t.TOURNAMENT_ID
    GROUP BY
      t.TOURNAMENT_ID,
      t.TITLE,
      t.GAME_NAME,
      t.START_DATE,
      t.END_DATE,
      t.STATUS,
      t.IS_ACTIVE
    ORDER BY
      CASE WHEN t.IS_ACTIVE = 1 THEN 0 ELSE 1 END,
      t.START_DATE,
      t.TOURNAMENT_ID
  `);

  return result.recordset;
}

async function findTournamentById(tournamentId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId).query(`
      SELECT
        TOURNAMENT_ID AS tournamentId,
        TITLE AS title,
        GAME_NAME AS gameName,
        CONVERT(varchar(10), START_DATE, 23) AS startDate,
        CONVERT(varchar(10), END_DATE, 23) AS endDate,
        STATUS AS status,
        CAST(IS_ACTIVE AS bit) AS isActive
      FROM dbo.TOURNAMENT
      WHERE TOURNAMENT_ID = @tournamentId
    `);

  return result.recordset[0] || null;
}

async function listScheduleByTournamentId(tournamentId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId).query(`
      SELECT
        m.MATCH_ID AS matchId,
        m.TOURNAMENT_ID AS tournamentId,
        m.TEAM_A_ID AS teamAId,
        COALESCE(teamA.TEAM_NAME, CONCAT('Team ', m.TEAM_A_ID)) AS teamAName,
        m.TEAM_B_ID AS teamBId,
        COALESCE(teamB.TEAM_NAME, CONCAT('Team ', m.TEAM_B_ID)) AS teamBName,
        m.TEAM_A_SCORE AS teamAScore,
        m.TEAM_B_SCORE AS teamBScore,
        CONVERT(varchar(10), m.MATCH_DATE, 23) AS matchDate,
        CONVERT(varchar(8), m.MATCH_TIME, 108) AS matchTime
      FROM dbo.MATCH m
      LEFT JOIN dbo.TEAM teamA
        ON teamA.TEAM_ID = m.TEAM_A_ID
      LEFT JOIN dbo.TEAM teamB
        ON teamB.TEAM_ID = m.TEAM_B_ID
      WHERE m.TOURNAMENT_ID = @tournamentId
      ORDER BY m.MATCH_DATE, m.MATCH_TIME, m.MATCH_ID
    `);

  return result.recordset;
}

async function listLeaderboardByTournamentId(tournamentId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId).query(`
      IF EXISTS (SELECT 1 FROM dbo.LEADERBOARD_ENTRY WHERE TOURNAMENT_ID = @tournamentId)
      BEGIN
        SELECT
          le.TEAM_ID AS teamId,
          COALESCE(t.TEAM_NAME, CONCAT('Team ', le.TEAM_ID)) AS teamName,
          le.WINS + le.LOSSES AS played,
          le.WINS AS wins,
          le.LOSSES AS losses
        FROM dbo.LEADERBOARD_ENTRY le
        LEFT JOIN dbo.TEAM t ON t.TEAM_ID = le.TEAM_ID
        WHERE le.TOURNAMENT_ID = @tournamentId
        ORDER BY le.WINS DESC, le.LOSSES ASC, le.UPDATED_AT ASC
      END
      ELSE
      BEGIN
        WITH team_entries AS (
          SELECT TEAM_A_ID AS teamId
          FROM dbo.MATCH
          WHERE TOURNAMENT_ID = @tournamentId
          UNION
          SELECT TEAM_B_ID AS teamId
          FROM dbo.MATCH
          WHERE TOURNAMENT_ID = @tournamentId
        ),
        team_stats AS (
          SELECT
            TEAM_A_ID AS teamId,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL AND TEAM_A_SCORE > TEAM_B_SCORE THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL AND TEAM_A_SCORE < TEAM_B_SCORE THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL THEN 1 ELSE 0 END) AS played
          FROM dbo.MATCH
          WHERE TOURNAMENT_ID = @tournamentId
          GROUP BY TEAM_A_ID
          UNION ALL
          SELECT
            TEAM_B_ID AS teamId,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL AND TEAM_B_SCORE > TEAM_A_SCORE THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL AND TEAM_B_SCORE < TEAM_A_SCORE THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL THEN 1 ELSE 0 END) AS played
          FROM dbo.MATCH
          WHERE TOURNAMENT_ID = @tournamentId
          GROUP BY TEAM_B_ID
        )
        SELECT
          te.teamId,
          COALESCE(team.TEAM_NAME, CONCAT('Team ', te.teamId)) AS teamName,
          COALESCE(SUM(ts.played), 0) AS played,
          COALESCE(SUM(ts.wins), 0) AS wins,
          COALESCE(SUM(ts.losses), 0) AS losses
        FROM team_entries te
        LEFT JOIN team_stats ts ON ts.teamId = te.teamId
        LEFT JOIN dbo.TEAM team ON team.TEAM_ID = te.teamId
        GROUP BY te.teamId, team.TEAM_NAME
        ORDER BY COALESCE(SUM(ts.wins), 0) DESC, COALESCE(SUM(ts.losses), 0) ASC, COALESCE(SUM(ts.played), 0) DESC, team.TEAM_NAME ASC
      END
    `);

  return result.recordset;
}

async function createTournament({ title, gameName, startDate, endDate, status, isActive }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("title", sql.NVarChar(200), title)
    .input("gameName", sql.NVarChar(100), gameName || null)
    .input("startDate", sql.Date, startDate || null)
    .input("endDate", sql.Date, endDate || null)
    .input("status", sql.NVarChar(50), status || "Pending")
    .input("isActive", sql.Bit, isActive ? 1 : 0)
    .query(`
      INSERT INTO dbo.TOURNAMENT (TITLE, GAME_NAME, START_DATE, END_DATE, STATUS, IS_ACTIVE)
      OUTPUT
        INSERTED.TOURNAMENT_ID AS tournamentId,
        INSERTED.TITLE AS title,
        INSERTED.GAME_NAME AS gameName,
        CONVERT(varchar(10), INSERTED.START_DATE, 23) AS startDate,
        CONVERT(varchar(10), INSERTED.END_DATE, 23) AS endDate,
        INSERTED.STATUS AS status,
        CAST(INSERTED.IS_ACTIVE AS bit) AS isActive
      VALUES (@title, @gameName, @startDate, @endDate, @status, @isActive)
    `);

  return result.recordset[0] || null;
}

async function createTeam({ teamName }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("teamName", sql.NVarChar(100), teamName)
    .query(`
      INSERT INTO dbo.TEAM (TEAM_NAME)
      OUTPUT INSERTED.TEAM_ID AS teamId, INSERTED.TEAM_NAME AS teamName
      VALUES (@teamName)
    `);

  return result.recordset[0] || null;
}

async function addTournamentTeam({ tournamentId, teamId, seed }) {
  await poolConnect;

  await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId)
    .input("teamId", sql.Int, teamId)
    .input("seed", sql.Int, seed || null)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM dbo.TOURNAMENT_TEAM
        WHERE TOURNAMENT_ID = @tournamentId AND TEAM_ID = @teamId
      )
        INSERT INTO dbo.TOURNAMENT_TEAM (TOURNAMENT_ID, TEAM_ID, SEED)
        VALUES (@tournamentId, @teamId, @seed);
    `);
}

async function listTeamsByTournamentId(tournamentId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId).query(`
      SELECT DISTINCT t.TEAM_ID AS teamId, t.TEAM_NAME AS teamName
      FROM dbo.TEAM t
      WHERE t.TEAM_ID IN (
        SELECT tt.TEAM_ID FROM dbo.TOURNAMENT_TEAM tt WHERE tt.TOURNAMENT_ID = @tournamentId
        UNION
        SELECT m.TEAM_A_ID FROM dbo.MATCH m WHERE m.TOURNAMENT_ID = @tournamentId
        UNION
        SELECT m.TEAM_B_ID FROM dbo.MATCH m WHERE m.TOURNAMENT_ID = @tournamentId
      )
      ORDER BY t.TEAM_NAME
    `);

  return result.recordset;
}

async function listLeaderboardEntries(tournamentId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId).query(`
      SELECT
        le.ENTRY_ID AS entryId,
        le.TOURNAMENT_ID AS tournamentId,
        le.TEAM_ID AS teamId,
        COALESCE(t.TEAM_NAME, CONCAT('Team ', le.TEAM_ID)) AS teamName,
        le.WINS AS wins,
        le.LOSSES AS losses,
        le.UPDATED_AT AS updatedAt
      FROM dbo.LEADERBOARD_ENTRY le
      LEFT JOIN dbo.TEAM t ON t.TEAM_ID = le.TEAM_ID
      WHERE le.TOURNAMENT_ID = @tournamentId
      ORDER BY le.WINS DESC, le.LOSSES ASC, le.UPDATED_AT ASC
    `);

  return result.recordset;
}

async function upsertLeaderboardEntry({ tournamentId, teamId, wins, losses }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId)
    .input("teamId", sql.Int, teamId)
    .input("wins", sql.Int, wins)
    .input("losses", sql.Int, losses).query(`
      IF EXISTS (
        SELECT 1 FROM dbo.LEADERBOARD_ENTRY
        WHERE TOURNAMENT_ID = @tournamentId AND TEAM_ID = @teamId
      )
        UPDATE dbo.LEADERBOARD_ENTRY
        SET WINS = @wins, LOSSES = @losses, UPDATED_AT = SYSUTCDATETIME()
        WHERE TOURNAMENT_ID = @tournamentId AND TEAM_ID = @teamId;
      ELSE
        INSERT INTO dbo.LEADERBOARD_ENTRY (TOURNAMENT_ID, TEAM_ID, WINS, LOSSES)
        VALUES (@tournamentId, @teamId, @wins, @losses);

      SELECT
        ENTRY_ID AS entryId,
        TOURNAMENT_ID AS tournamentId,
        TEAM_ID AS teamId,
        WINS AS wins,
        LOSSES AS losses,
        UPDATED_AT AS updatedAt
      FROM dbo.LEADERBOARD_ENTRY
      WHERE TOURNAMENT_ID = @tournamentId AND TEAM_ID = @teamId;
    `);

  return result.recordset[0] || null;
}

async function createMatch({ tournamentId, teamAId, teamBId, matchDate, matchTime }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId)
    .input("teamAId", sql.Int, teamAId)
    .input("teamBId", sql.Int, teamBId)
    .input("matchDate", sql.NVarChar(10), matchDate || null)
    .input("matchTime", sql.NVarChar(8), matchTime || null).query(`
      INSERT INTO dbo.MATCH (TOURNAMENT_ID, TEAM_A_ID, TEAM_B_ID, MATCH_DATE, MATCH_TIME)
      OUTPUT
        INSERTED.MATCH_ID AS matchId,
        INSERTED.TOURNAMENT_ID AS tournamentId,
        INSERTED.TEAM_A_ID AS teamAId,
        INSERTED.TEAM_B_ID AS teamBId,
        CONVERT(varchar(10), INSERTED.MATCH_DATE, 23) AS matchDate,
        CONVERT(varchar(8), INSERTED.MATCH_TIME, 108) AS matchTime
      VALUES (
        @tournamentId, @teamAId, @teamBId,
        TRY_CAST(@matchDate AS date),
        TRY_CAST(@matchTime AS time)
      )
    `);

  return result.recordset[0] || null;
}

async function updateMatch({ matchId, teamAScore, teamBScore, matchDate, matchTime }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("matchId", sql.Int, matchId)
    .input("teamAScore", sql.Int, teamAScore == null ? null : Number(teamAScore))
    .input("teamBScore", sql.Int, teamBScore == null ? null : Number(teamBScore))
    .input("matchDate", sql.NVarChar(10), matchDate || null)
    .input("matchTime", sql.NVarChar(8), matchTime || null).query(`
      UPDATE dbo.MATCH
      SET
        TEAM_A_SCORE = @teamAScore,
        TEAM_B_SCORE = @teamBScore,
        MATCH_DATE = TRY_CAST(@matchDate AS date),
        MATCH_TIME = TRY_CAST(@matchTime AS time)
      WHERE MATCH_ID = @matchId;

      SELECT
        m.MATCH_ID AS matchId,
        m.TOURNAMENT_ID AS tournamentId,
        m.TEAM_A_ID AS teamAId,
        COALESCE(teamA.TEAM_NAME, CONCAT('Team ', m.TEAM_A_ID)) AS teamAName,
        m.TEAM_B_ID AS teamBId,
        COALESCE(teamB.TEAM_NAME, CONCAT('Team ', m.TEAM_B_ID)) AS teamBName,
        m.TEAM_A_SCORE AS teamAScore,
        m.TEAM_B_SCORE AS teamBScore,
        CONVERT(varchar(10), m.MATCH_DATE, 23) AS matchDate,
        CONVERT(varchar(8), m.MATCH_TIME, 108) AS matchTime
      FROM dbo.MATCH m
      LEFT JOIN dbo.TEAM teamA ON teamA.TEAM_ID = m.TEAM_A_ID
      LEFT JOIN dbo.TEAM teamB ON teamB.TEAM_ID = m.TEAM_B_ID
      WHERE m.MATCH_ID = @matchId;
    `);

  return result.recordset[0] || null;
}

module.exports = {
  listTournaments,
  findTournamentById,
  listScheduleByTournamentId,
  listLeaderboardByTournamentId,
  createTournament,
  createTeam,
  addTournamentTeam,
  listTeamsByTournamentId,
  listLeaderboardEntries,
  upsertLeaderboardEntry,
  createMatch,
  updateMatch,
};
