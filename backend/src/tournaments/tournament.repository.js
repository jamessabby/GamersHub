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
        SELECT COUNT(*)
        FROM (
          SELECT mx.TEAM_A_ID AS TEAM_ID
          FROM dbo.MATCH mx
          WHERE mx.TOURNAMENT_ID = t.TOURNAMENT_ID
          UNION
          SELECT mx.TEAM_B_ID AS TEAM_ID
          FROM dbo.MATCH mx
          WHERE mx.TOURNAMENT_ID = t.TOURNAMENT_ID
        ) tournamentTeams
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
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL
                AND TEAM_B_SCORE IS NOT NULL
                AND TEAM_A_SCORE > TEAM_B_SCORE
              THEN 1
              ELSE 0
            END
          ) AS wins,
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL
                AND TEAM_B_SCORE IS NOT NULL
                AND TEAM_A_SCORE < TEAM_B_SCORE
              THEN 1
              ELSE 0
            END
          ) AS losses,
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL THEN 1
              ELSE 0
            END
          ) AS played
        FROM dbo.MATCH
        WHERE TOURNAMENT_ID = @tournamentId
        GROUP BY TEAM_A_ID

        UNION ALL

        SELECT
          TEAM_B_ID AS teamId,
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL
                AND TEAM_B_SCORE IS NOT NULL
                AND TEAM_B_SCORE > TEAM_A_SCORE
              THEN 1
              ELSE 0
            END
          ) AS wins,
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL
                AND TEAM_B_SCORE IS NOT NULL
                AND TEAM_B_SCORE < TEAM_A_SCORE
              THEN 1
              ELSE 0
            END
          ) AS losses,
          SUM(
            CASE
              WHEN TEAM_A_SCORE IS NOT NULL AND TEAM_B_SCORE IS NOT NULL THEN 1
              ELSE 0
            END
          ) AS played
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
      LEFT JOIN team_stats ts
        ON ts.teamId = te.teamId
      LEFT JOIN dbo.TEAM team
        ON team.TEAM_ID = te.teamId
      GROUP BY te.teamId, team.TEAM_NAME
      ORDER BY
        COALESCE(SUM(ts.wins), 0) DESC,
        COALESCE(SUM(ts.losses), 0) ASC,
        COALESCE(SUM(ts.played), 0) DESC,
        team.TEAM_NAME ASC
    `);

  return result.recordset;
}

module.exports = {
  listTournaments,
  findTournamentById,
  listScheduleByTournamentId,
  listLeaderboardByTournamentId,
};
