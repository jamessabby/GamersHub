/*
  Run this in SSMS so media chosen from the file picker can be stored safely.

  We currently store the selected image/video payload in MEDIA_URL as a data URL
  for the school-project upload flow, so NVARCHAR(500) is too small.
*/

USE GAMERSHUB_FEED;
GO

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'POST'
    AND COLUMN_NAME = 'MEDIA_URL'
    AND DATA_TYPE = 'nvarchar'
    AND CHARACTER_MAXIMUM_LENGTH <> -1
)
BEGIN
  ALTER TABLE dbo.POST
  ALTER COLUMN MEDIA_URL NVARCHAR(MAX) NULL;
END;
GO
