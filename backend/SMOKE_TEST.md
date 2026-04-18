# GamersHub Smoke Test

This is the simple backend smoke pass for the current player-social slice.

## Before You Start
- Make sure SQL Server is running on `LAPTOP-VO6I66G0\\SQLEXPRESS`.
- Run the SQL scripts in `backend/sql/003` to `backend/sql/008`.
- Start the backend from `backend/` with `npm run dev` or `node src/app.js`.

## What To Verify
- Feed posts: text-only, image-only, text + image, video-only
- Post reactions: `like`, `love`, `wow`, then remove
- Post comments: create, reload list, confirm count persists
- Friends: remove, send request, accept request
- Notifications: list, mark one read, mark all read
- Profile: update, reload, confirm `dateOfBirth` does not shift
- Streams: empty state, seeded stream, stream comments
- Tournaments: empty state, seeded tournament, schedule, leaderboard

## Feed Checks
Create small temporary test files:

```powershell
$tmp = Join-Path $env:TEMP 'gh-smoke'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
[IO.File]::WriteAllBytes((Join-Path $tmp 'tiny.png'), [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8Z8AAAAASUVORK5CYII='))
[IO.File]::WriteAllBytes((Join-Path $tmp 'tiny.mp4'), [byte[]](0,0,0,24,102,116,121,112,105,115,111,109,0,0,2,0,105,115,111,109,105,115,111,50))
```

Create feed posts:

```powershell
curl.exe -s -X POST -F "userId=6" -F "content=smoke text only post" http://localhost:3000/api/feed
curl.exe -s -X POST -F "userId=6" -F "media=@$env:TEMP\\gh-smoke\\tiny.png;type=image/png" http://localhost:3000/api/feed
curl.exe -s -X POST -F "userId=6" -F "content=smoke text image post" -F "media=@$env:TEMP\\gh-smoke\\tiny.png;type=image/png" http://localhost:3000/api/feed
curl.exe -s -X POST -F "userId=6" -F "media=@$env:TEMP\\gh-smoke\\tiny.mp4;type=video/mp4" http://localhost:3000/api/feed
```

## Reaction And Comment Checks
Use one known post id and run requests one at a time:

```powershell
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/reactions/posts/7' -ContentType 'application/json' -Body (@{userId=6;reactionType='like'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/reactions/posts/7' -ContentType 'application/json' -Body (@{userId=6;reactionType='love'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/reactions/posts/7' -ContentType 'application/json' -Body (@{userId=6;reactionType='wow'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Delete -Uri 'http://localhost:3000/api/reactions/posts/7?userId=6'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/reactions/posts/7/comments' -ContentType 'application/json' -Body (@{userId=6;message='smoke post comment'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/reactions/posts/7/comments?limit=20'
```

## Friend, Notification, And Profile Checks
Use user ids `6` and `7`:

```powershell
Invoke-RestMethod -Method Delete -Uri 'http://localhost:3000/api/users/6/friends/7'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/users/6/friends/requests' -ContentType 'application/json' -Body (@{targetUserId=7} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/users/7/friends/requests/6' -ContentType 'application/json' -Body (@{action='accept'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/users/6/notifications'
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/users/6/notifications/read-all'
Invoke-RestMethod -Method Put -Uri 'http://localhost:3000/api/users/profile/6' -ContentType 'application/json' -Body (@{displayName='sabby123-smoke'; primaryGames=@('Mobile Legends','Valorant')} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/users/profile/6'
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/users/profile/7'
```

## Seeded Stream Check
Insert one temporary stream and comment:

```powershell
$streamId = sqlcmd -S "LAPTOP-VO6I66G0\SQLEXPRESS" -E -d GAMERSHUB_FEED -h -1 -W -Q "SET NOCOUNT ON; INSERT INTO dbo.STREAM (USER_ID, STREAM_TITLE, VIEW_COUNT, IS_LIVE, PLAYBACK_URL, THUMBNAIL_URL, GAME_NAME, STREAM_DESCRIPTION, STARTED_AT, ENDED_AT) VALUES (6, 'Smoke Stream', 42, 1, 'https://youtu.be/dQw4w9WgXcQ', 'https://example.com/thumb.jpg', 'Valorant', 'Smoke stream for API validation', SYSDATETIME(), NULL); SELECT CAST(SCOPE_IDENTITY() AS int);" | Select-Object -Last 1
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/streams?limit=12'
Invoke-RestMethod -Method Get -Uri ("http://localhost:3000/api/streams/{0}" -f $streamId)
Invoke-RestMethod -Method Post -Uri ("http://localhost:3000/api/streams/{0}/comments" -f $streamId) -ContentType 'application/json' -Body (@{userId=6;message='smoke stream comment'} | ConvertTo-Json -Compress)
Invoke-RestMethod -Method Get -Uri ("http://localhost:3000/api/streams/{0}/comments?limit=50" -f $streamId)
```

## Seeded Tournament Check
Insert one temporary tournament with two teams and one scored match:

```powershell
$tournamentId = sqlcmd -S "LAPTOP-VO6I66G0\SQLEXPRESS" -E -d GAMERSHUB_TOURNAMENT -h -1 -W -Q "SET NOCOUNT ON; INSERT INTO dbo.TOURNAMENT (TITLE, GAME_NAME, START_DATE, END_DATE, STATUS, IS_ACTIVE) VALUES ('Smoke Tournament', 'Valorant', CAST(GETDATE() AS date), DATEADD(day, 7, CAST(GETDATE() AS date)), 'Active', 1); SELECT CAST(SCOPE_IDENTITY() AS int);" | Select-Object -Last 1
Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/tournaments'
Invoke-RestMethod -Method Get -Uri ("http://localhost:3000/api/tournaments/{0}/schedule" -f $tournamentId)
Invoke-RestMethod -Method Get -Uri ("http://localhost:3000/api/tournaments/{0}/leaderboard" -f $tournamentId)
```
