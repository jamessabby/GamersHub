-- Allow multiple accounts to share the same email address.
-- Login remains username-based so this does not affect authentication.
IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_USERS_EMAIL'
    AND object_id = OBJECT_ID('dbo.USERS')
)
BEGIN
  DROP INDEX UX_USERS_EMAIL ON dbo.USERS;
END
GO
