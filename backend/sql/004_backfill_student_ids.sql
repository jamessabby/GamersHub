/*
  Run this once after the profile-service fix if you already have rows in
  GAMERSHUB_USER.dbo.USER_PROFILE with missing STUDENT_ID values.

  It preserves existing student IDs and only fills blank or NULL rows.
*/

USE GAMERSHUB_USER;
GO

UPDATE dbo.USER_PROFILE
SET STUDENT_ID = CONCAT('TEMP-', USERID)
WHERE STUDENT_ID IS NULL
   OR LTRIM(RTRIM(STUDENT_ID)) = '';
GO
