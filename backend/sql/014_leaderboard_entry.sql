USE GAMERSHUB_TOURNAMENT;

-- Manual leaderboard entries per team per tournament.
-- When entries exist for a tournament, the leaderboard endpoint uses these
-- instead of calculating wins/losses from MATCH scores.
-- Timestamp-based tiebreak: earlier UPDATED_AT ranks higher at equal W/L.
CREATE TABLE dbo.LEADERBOARD_ENTRY (
  ENTRY_ID      INT           IDENTITY(1,1) NOT NULL,
  TOURNAMENT_ID INT           NOT NULL,
  TEAM_ID       INT           NOT NULL,
  WINS          INT           NOT NULL CONSTRAINT DF_LB_WINS    DEFAULT 0,
  LOSSES        INT           NOT NULL CONSTRAINT DF_LB_LOSSES  DEFAULT 0,
  UPDATED_AT    DATETIME2     NOT NULL CONSTRAINT DF_LB_UPDATED DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_LEADERBOARD_ENTRY PRIMARY KEY (ENTRY_ID),
  CONSTRAINT UQ_LEADERBOARD_ENTRY UNIQUE (TOURNAMENT_ID, TEAM_ID)
);
