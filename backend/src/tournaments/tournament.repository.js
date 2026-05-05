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
      COALESCE(t.REGISTRATION_FEE_AMOUNT, 0) AS registrationFeeAmount,
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
      t.IS_ACTIVE,
      t.REGISTRATION_FEE_AMOUNT
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
        CAST(IS_ACTIVE AS bit) AS isActive,
        COALESCE(REGISTRATION_FEE_AMOUNT, 0) AS registrationFeeAmount
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

async function createTournament({ title, gameName, startDate, endDate, status, isActive, registrationFeeAmount = 0 }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("title", sql.NVarChar(200), title)
    .input("gameName", sql.NVarChar(100), gameName || null)
    .input("startDate", sql.Date, startDate || null)
    .input("endDate", sql.Date, endDate || null)
    .input("status", sql.NVarChar(50), status || "Pending")
    .input("isActive", sql.Bit, isActive ? 1 : 0)
    .input("registrationFeeAmount", sql.Int, registrationFeeAmount || 0)
    .query(`
      INSERT INTO dbo.TOURNAMENT (TITLE, GAME_NAME, START_DATE, END_DATE, STATUS, IS_ACTIVE, REGISTRATION_FEE_AMOUNT)
      OUTPUT
        INSERTED.TOURNAMENT_ID AS tournamentId,
        INSERTED.TITLE AS title,
        INSERTED.GAME_NAME AS gameName,
        CONVERT(varchar(10), INSERTED.START_DATE, 23) AS startDate,
        CONVERT(varchar(10), INSERTED.END_DATE, 23) AS endDate,
        INSERTED.STATUS AS status,
        CAST(INSERTED.IS_ACTIVE AS bit) AS isActive,
        INSERTED.REGISTRATION_FEE_AMOUNT AS registrationFeeAmount
      VALUES (@title, @gameName, @startDate, @endDate, @status, @isActive, @registrationFeeAmount)
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

// ── MATCH STATS ──────────────────────────────────────────────────────────────

async function listMatchStats(matchId) {
  await poolConnect;
  const result = await pool
    .request()
    .input("matchId", sql.Int, matchId)
    .query(`
      SELECT
        STAT_ID     AS statId,
        MATCH_ID    AS matchId,
        TEAM_ID     AS teamId,
        PLAYER_NAME AS playerName,
        STAT_KEY    AS statKey,
        STAT_VALUE  AS statValue,
        ENTERED_BY  AS enteredBy,
        CREATED_AT  AS createdAt
      FROM dbo.MATCH_STATS
      WHERE MATCH_ID = @matchId
      ORDER BY TEAM_ID, PLAYER_NAME, STAT_KEY
    `);
  return result.recordset || [];
}

async function replaceMatchStats(matchId, stats, enteredBy) {
  await poolConnect;
  const request = pool.request().input("matchId", sql.Int, matchId);
  await request.query(`DELETE FROM dbo.MATCH_STATS WHERE MATCH_ID = @matchId`);

  if (!stats.length) return [];

  const inserted = [];
  for (const stat of stats) {
    const r = pool
      .request()
      .input("matchId", sql.Int, matchId)
      .input("teamId", sql.Int, Number(stat.teamId))
      .input("playerName", sql.NVarChar(255), String(stat.playerName || "").trim() || null)
      .input("statKey", sql.NVarChar(100), String(stat.statKey || "").trim())
      .input("statValue", sql.NVarChar(255), String(stat.statValue ?? "").trim())
      .input("enteredBy", sql.Int, enteredBy);
    const row = await r.query(`
      INSERT INTO dbo.MATCH_STATS (MATCH_ID, TEAM_ID, PLAYER_NAME, STAT_KEY, STAT_VALUE, ENTERED_BY)
      OUTPUT INSERTED.STAT_ID AS statId, INSERTED.TEAM_ID AS teamId,
             INSERTED.PLAYER_NAME AS playerName, INSERTED.STAT_KEY AS statKey,
             INSERTED.STAT_VALUE AS statValue
      VALUES (@matchId, @teamId, @playerName, @statKey, @statValue, @enteredBy)
    `);
    if (row.recordset[0]) inserted.push(row.recordset[0]);
  }
  return inserted;
}

// ── TOURNAMENT REGISTRATION ───────────────────────────────────────────────────

async function listRegistrations({ tournamentId = null, status = null } = {}) {
  await poolConnect;
  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId || null)
    .input("status", sql.NVarChar(20), status || null)
    .query(`
      SELECT
        r.REGISTRATION_ID   AS registrationId,
        r.PUBLIC_ID         AS publicId,
        r.TOURNAMENT_ID     AS tournamentId,
        t.TITLE             AS tournamentTitle,
        r.TEAM_NAME         AS teamName,
        r.CONTACT_NAME      AS contactName,
        r.CONTACT_EMAIL     AS contactEmail,
        r.CONTACT_PHONE     AS contactPhone,
        r.ROSTER_NOTES      AS rosterNotes,
        r.STATUS            AS status,
        r.REJECTION_REASON  AS rejectionReason,
        r.PAYMENT_STATUS    AS paymentStatus,
        r.FEE_AMOUNT        AS feeAmount,
        r.PAYMENT_PROOF_URL AS paymentProofUrl,
        r.JOIN_CODE         AS joinCode,
        r.JOIN_CODE_USED    AS joinCodeUsed,
        r.REVIEWED_BY       AS reviewedBy,
        r.REVIEWED_AT       AS reviewedAt,
        r.CREATED_AT        AS createdAt
      FROM dbo.TOURNAMENT_REGISTRATION r
      INNER JOIN dbo.TOURNAMENT t ON t.TOURNAMENT_ID = r.TOURNAMENT_ID
      WHERE (@tournamentId IS NULL OR r.TOURNAMENT_ID = @tournamentId)
        AND (@status IS NULL OR r.STATUS = @status)
      ORDER BY r.CREATED_AT DESC
    `);
  return result.recordset || [];
}

async function findRegistrationByPublicId(publicId) {
  await poolConnect;
  const result = await pool
    .request()
    .input("publicId", sql.NVarChar(36), publicId)
    .query(`
      SELECT
        r.REGISTRATION_ID   AS registrationId,
        r.PUBLIC_ID         AS publicId,
        r.TOURNAMENT_ID     AS tournamentId,
        t.TITLE             AS tournamentTitle,
        r.TEAM_NAME         AS teamName,
        r.CONTACT_NAME      AS contactName,
        r.CONTACT_EMAIL     AS contactEmail,
        r.CONTACT_PHONE     AS contactPhone,
        r.ROSTER_NOTES      AS rosterNotes,
        r.STATUS            AS status,
        r.REJECTION_REASON  AS rejectionReason,
        r.PAYMENT_STATUS    AS paymentStatus,
        r.FEE_AMOUNT        AS feeAmount,
        r.PAYMENT_PROOF_URL AS paymentProofUrl,
        r.JOIN_CODE         AS joinCode,
        r.JOIN_CODE_USED    AS joinCodeUsed,
        r.REVIEWED_BY       AS reviewedBy,
        r.REVIEWED_AT       AS reviewedAt,
        r.CREATED_AT        AS createdAt
      FROM dbo.TOURNAMENT_REGISTRATION r
      INNER JOIN dbo.TOURNAMENT t ON t.TOURNAMENT_ID = r.TOURNAMENT_ID
      WHERE r.PUBLIC_ID = @publicId
    `);
  return result.recordset[0] || null;
}

async function createRegistration({ tournamentId, teamName, contactName, contactEmail, contactPhone, rosterNotes, paymentProofUrl, feeAmount = 0, paymentStatus = "unpaid" }) {
  await poolConnect;
  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId)
    .input("teamName", sql.NVarChar(255), teamName)
    .input("contactName", sql.NVarChar(255), contactName)
    .input("contactEmail", sql.NVarChar(255), contactEmail)
    .input("contactPhone", sql.NVarChar(50), contactPhone || null)
    .input("rosterNotes", sql.NVarChar(sql.MAX), rosterNotes || null)
    .input("paymentProofUrl", sql.NVarChar(1000), paymentProofUrl || null)
    .input("feeAmount", sql.Int, feeAmount || 0)
    .input("paymentStatus", sql.NVarChar(20), paymentStatus || "unpaid")
    .query(`
      INSERT INTO dbo.TOURNAMENT_REGISTRATION
        (TOURNAMENT_ID, TEAM_NAME, CONTACT_NAME, CONTACT_EMAIL, CONTACT_PHONE, ROSTER_NOTES, PAYMENT_PROOF_URL, FEE_AMOUNT, PAYMENT_STATUS)
      OUTPUT
        INSERTED.REGISTRATION_ID AS registrationId,
        INSERTED.PUBLIC_ID       AS publicId,
        INSERTED.TOURNAMENT_ID   AS tournamentId,
        INSERTED.TEAM_NAME       AS teamName,
        INSERTED.STATUS          AS status,
        INSERTED.FEE_AMOUNT      AS feeAmount,
        INSERTED.PAYMENT_STATUS  AS paymentStatus,
        INSERTED.CREATED_AT      AS createdAt
      VALUES
        (@tournamentId, @teamName, @contactName, @contactEmail, @contactPhone, @rosterNotes, @paymentProofUrl, @feeAmount, @paymentStatus)
    `);
  return result.recordset[0] || null;
}

async function updateRegistrationStatus({ registrationId, status, rejectionReason, joinCode, reviewedBy }) {
  await poolConnect;
  const result = await pool
    .request()
    .input("registrationId", sql.Int, registrationId)
    .input("status", sql.NVarChar(20), status)
    .input("rejectionReason", sql.NVarChar(500), rejectionReason || null)
    .input("joinCode", sql.NVarChar(20), joinCode || null)
    .input("reviewedBy", sql.Int, reviewedBy)
    .query(`
      UPDATE dbo.TOURNAMENT_REGISTRATION
      SET
        STATUS           = @status,
        REJECTION_REASON = @rejectionReason,
        JOIN_CODE        = CASE WHEN @status = 'rejected' THEN NULL ELSE COALESCE(@joinCode, JOIN_CODE) END,
        JOIN_CODE_USED   = CASE WHEN @status = 'rejected' THEN 0 ELSE JOIN_CODE_USED END,
        REVIEWED_BY      = @reviewedBy,
        REVIEWED_AT      = SYSUTCDATETIME(),
        UPDATED_AT       = SYSUTCDATETIME()
      OUTPUT
        INSERTED.REGISTRATION_ID AS registrationId,
        INSERTED.PUBLIC_ID       AS publicId,
        INSERTED.STATUS          AS status,
        INSERTED.JOIN_CODE       AS joinCode,
        INSERTED.CONTACT_EMAIL   AS contactEmail,
        INSERTED.TEAM_NAME       AS teamName,
        INSERTED.TOURNAMENT_ID   AS tournamentId
      WHERE REGISTRATION_ID = @registrationId
    `);
  return result.recordset[0] || null;
}

async function updateRegistrationPayment({ registrationId, paymentStatus, paymentProofUrl }) {
  await poolConnect;
  await pool
    .request()
    .input("registrationId", sql.Int, registrationId)
    .input("paymentStatus", sql.NVarChar(20), paymentStatus)
    .input("paymentProofUrl", sql.NVarChar(1000), paymentProofUrl || null)
    .query(`
      UPDATE dbo.TOURNAMENT_REGISTRATION
      SET PAYMENT_STATUS    = @paymentStatus,
          PAYMENT_PROOF_URL = COALESCE(@paymentProofUrl, PAYMENT_PROOF_URL),
          UPDATED_AT        = SYSUTCDATETIME()
      WHERE REGISTRATION_ID = @registrationId
    `);
}

async function findRegistrationByJoinCode(joinCode) {
  await poolConnect;
  const result = await pool
    .request()
    .input("joinCode", sql.NVarChar(20), joinCode)
    .query(`
      SELECT
        r.REGISTRATION_ID AS registrationId,
        r.PUBLIC_ID       AS publicId,
        r.TOURNAMENT_ID   AS tournamentId,
        t.TITLE           AS tournamentTitle,
        r.TEAM_NAME       AS teamName,
        r.STATUS          AS status,
        r.JOIN_CODE       AS joinCode,
        r.JOIN_CODE_USED  AS joinCodeUsed,
        r.FEE_AMOUNT      AS feeAmount
      FROM dbo.TOURNAMENT_REGISTRATION r
      INNER JOIN dbo.TOURNAMENT t ON t.TOURNAMENT_ID = r.TOURNAMENT_ID
      WHERE r.JOIN_CODE = @joinCode
    `);
  return result.recordset[0] || null;
}

async function updateRegistrationPaymongoLink(registrationId, linkId) {
  await poolConnect;
  await pool
    .request()
    .input("registrationId", sql.Int, registrationId)
    .input("linkId", sql.NVarChar(255), linkId)
    .query(`
      UPDATE dbo.TOURNAMENT_REGISTRATION
      SET PAYMONGO_LINK_ID = @linkId, UPDATED_AT = SYSUTCDATETIME()
      WHERE REGISTRATION_ID = @registrationId
    `);
}

async function markRegistrationPaid(paymongoLinkId) {
  await poolConnect;
  const result = await pool
    .request()
    .input("linkId", sql.NVarChar(255), paymongoLinkId)
    .query(`
      UPDATE dbo.TOURNAMENT_REGISTRATION
      SET PAYMENT_STATUS = 'paid', UPDATED_AT = SYSUTCDATETIME()
      WHERE PAYMONGO_LINK_ID = @linkId
        AND PAYMENT_STATUS != 'paid'
    `);
  return result.rowsAffected?.[0] || 0;
}

async function consumeJoinCode(registrationId) {
  await poolConnect;
  const result = await pool
    .request()
    .input("registrationId", sql.Int, registrationId)
    .query(`
      UPDATE dbo.TOURNAMENT_REGISTRATION
      SET JOIN_CODE_USED = 1, UPDATED_AT = SYSUTCDATETIME()
      WHERE REGISTRATION_ID = @registrationId
        AND JOIN_CODE_USED = 0
    `);
  return (result.rowsAffected?.[0] || 0) > 0;
}

async function consumeJoinCodeAndAddTeam({ registrationId, tournamentId, teamName }) {
  await poolConnect;
  const transaction = new sql.Transaction(pool);

  await transaction.begin();
  try {
    const consumeResult = await new sql.Request(transaction)
      .input("registrationId", sql.Int, registrationId)
      .query(`
        UPDATE dbo.TOURNAMENT_REGISTRATION
        SET JOIN_CODE_USED = 1, UPDATED_AT = SYSUTCDATETIME()
        WHERE REGISTRATION_ID = @registrationId
          AND JOIN_CODE_USED = 0
      `);

    if ((consumeResult.rowsAffected?.[0] || 0) !== 1) {
      await transaction.rollback();
      return { joined: false };
    }

    const teamResult = await new sql.Request(transaction)
      .input("teamName", sql.NVarChar(100), teamName)
      .query(`
        INSERT INTO dbo.TEAM (TEAM_NAME)
        OUTPUT INSERTED.TEAM_ID AS teamId, INSERTED.TEAM_NAME AS teamName
        VALUES (@teamName)
      `);
    const team = teamResult.recordset[0];

    await new sql.Request(transaction)
      .input("tournamentId", sql.Int, tournamentId)
      .input("teamId", sql.Int, team.teamId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM dbo.TOURNAMENT_TEAM
          WHERE TOURNAMENT_ID = @tournamentId AND TEAM_ID = @teamId
        )
          INSERT INTO dbo.TOURNAMENT_TEAM (TOURNAMENT_ID, TEAM_ID)
          VALUES (@tournamentId, @teamId);
      `);

    await transaction.commit();
    return { joined: true, team };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch {}
    throw error;
  }
}

// ── REGISTRATION PARTICIPANTS ─────────────────────────────────────────────────

async function createRegistrationParticipants(registrationId, usernames) {
  await poolConnect;
  const inserted = [];
  for (const raw of usernames) {
    const username = String(raw || "").trim();
    if (!username) continue;

    // Resolve userId from GAMERSHUB_AUTH on the same instance (cross-DB)
    const lookupResult = await pool
      .request()
      .input("username", sql.NVarChar(100), username)
      .query(`
        SELECT USERID AS userId
        FROM GAMERSHUB_AUTH.dbo.USERS
        WHERE LOWER(USERNAME) = LOWER(@username)
      `);
    const userId = lookupResult.recordset[0]?.userId || null;

    const insertResult = await pool
      .request()
      .input("registrationId", sql.Int, registrationId)
      .input("username", sql.NVarChar(100), username)
      .input("userId", sql.Int, userId)
      .query(`
        INSERT INTO dbo.TOURNAMENT_REGISTRATION_PARTICIPANT
          (REGISTRATION_ID, USERNAME, USER_ID)
        OUTPUT INSERTED.PARTICIPANT_ID AS participantId,
               INSERTED.USERNAME       AS username,
               INSERTED.USER_ID        AS userId
        VALUES (@registrationId, @username, @userId)
      `);
    if (insertResult.recordset[0]) inserted.push(insertResult.recordset[0]);
  }
  return inserted;
}

async function listParticipantsByRegistrationId(registrationId) {
  await poolConnect;
  const result = await pool
    .request()
    .input("registrationId", sql.Int, registrationId)
    .query(`
      SELECT
        PARTICIPANT_ID  AS participantId,
        REGISTRATION_ID AS registrationId,
        USERNAME        AS username,
        USER_ID         AS userId
      FROM dbo.TOURNAMENT_REGISTRATION_PARTICIPANT
      WHERE REGISTRATION_ID = @registrationId
    `);
  return result.recordset || [];
}

async function updateTournamentStatus({ tournamentId, status, isActive }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tournamentId", sql.Int, tournamentId)
    .input("status", sql.NVarChar(50), status)
    .input("isActive", sql.Bit, isActive ? 1 : 0)
    .query(`
      UPDATE dbo.TOURNAMENT
      SET STATUS = @status, IS_ACTIVE = @isActive
      WHERE TOURNAMENT_ID = @tournamentId;

      SELECT
        TOURNAMENT_ID AS tournamentId,
        TITLE         AS title,
        GAME_NAME     AS gameName,
        CONVERT(varchar(10), START_DATE, 23) AS startDate,
        CONVERT(varchar(10), END_DATE,   23) AS endDate,
        STATUS        AS status,
        CAST(IS_ACTIVE AS bit) AS isActive,
        COALESCE(REGISTRATION_FEE_AMOUNT, 0) AS registrationFeeAmount
      FROM dbo.TOURNAMENT
      WHERE TOURNAMENT_ID = @tournamentId;
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
  listMatchStats,
  replaceMatchStats,
  listRegistrations,
  findRegistrationByPublicId,
  createRegistration,
  updateRegistrationStatus,
  updateRegistrationPayment,
  findRegistrationByJoinCode,
  consumeJoinCode,
  consumeJoinCodeAndAddTeam,
  createRegistrationParticipants,
  listParticipantsByRegistrationId,
  updateRegistrationPaymongoLink,
  markRegistrationPaid,
  updateTournamentStatus,
};
