/*
  Expand STREAM_TITLE column from its original narrow size to NVARCHAR(500)
  to support long tournament stream titles.

  This script is idempotent — it only widens the column if it is currently
  narrower than 500 characters.
*/

USE GAMERSHUB_FEED;
GO

IF COL_LENGTH('dbo.STREAM', 'STREAM_TITLE') < 1000
BEGIN
  ALTER TABLE dbo.STREAM
  ALTER COLUMN STREAM_TITLE NVARCHAR(500) NOT NULL;
END;
GO
