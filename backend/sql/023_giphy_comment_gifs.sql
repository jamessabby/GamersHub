/*
  Adds optional GIF support to post comments.
  Run this in SSMS if GAMERSHUB_REACTION was already created before
  GIF comments were added.
*/

USE GAMERSHUB_REACTION;
GO

IF OBJECT_ID('dbo.POST_COMMENT', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.POST_COMMENT', 'GIF_URL') IS NULL
BEGIN
  ALTER TABLE dbo.POST_COMMENT
  ADD GIF_URL NVARCHAR(1000) NULL;
END;
GO
