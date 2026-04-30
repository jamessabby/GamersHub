-- Run against GAMERSHUB_TOURNAMENT
-- Adds a participant-username table to TOURNAMENT_REGISTRATION.
-- Each row records a GamersHub username submitted by the team captain.
-- USER_ID is resolved at insert time via a cross-DB lookup on GAMERSHUB_AUTH.dbo.USERS.
-- Participants whose username doesn't match any account are still stored (USER_ID = NULL).
USE GAMERSHUB_TOURNAMENT;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.tables
  WHERE name = 'TOURNAMENT_REGISTRATION_PARTICIPANT' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
  CREATE TABLE dbo.TOURNAMENT_REGISTRATION_PARTICIPANT (
    PARTICIPANT_ID  INT           IDENTITY(1,1) NOT NULL,
    REGISTRATION_ID INT           NOT NULL,
    USERNAME        NVARCHAR(100) NOT NULL,
    USER_ID         INT           NULL,
    CONSTRAINT PK_REG_PARTICIPANT PRIMARY KEY (PARTICIPANT_ID),
    CONSTRAINT FK_REG_PARTICIPANT_REG
      FOREIGN KEY (REGISTRATION_ID)
      REFERENCES dbo.TOURNAMENT_REGISTRATION(REGISTRATION_ID)
  );
END
GO
