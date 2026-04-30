-- Run against GAMERSHUB_AUTH
-- Adds an immutable, externally-safe PUBLIC_ID to the USERS table.
-- Existing rows get a random GUID automatically via the column DEFAULT.
USE GAMERSHUB_AUTH;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'PUBLIC_ID'
)
BEGIN
  ALTER TABLE dbo.USERS
    ADD PUBLIC_ID NVARCHAR(36) NOT NULL
      CONSTRAINT DF_USERS_PUBLIC_ID DEFAULT (LOWER(NEWID()));

  ALTER TABLE dbo.USERS
    ADD CONSTRAINT UQ_USERS_PUBLIC_ID UNIQUE (PUBLIC_ID);
END
GO
