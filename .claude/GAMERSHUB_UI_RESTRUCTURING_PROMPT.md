# GamersHub Admin UI Restructuring & Admin Profile Requirements

## Overview
This prompt defines enhancements to GamersHub's admin console to improve UX by separating crowded pages and adding admin-specific capabilities.

---

## Requirement 1: Separate Admin Tournament & Moderation Pages

### Current State
- **File:** `frontend/admin/tournaments.html`
- **Issue:** Currently handles Tournaments, Streams, Leaderboards, and Matches creation/moderation all on one page
- **Navigation label:** "Tournaments" (misleading)

### Desired State
Split into 4 separate admin pages:

#### 1.1 Tournaments Management Page
- **Route:** `/frontend/admin/tournaments.html` (rename to be explicit or keep as primary)
- **Title:** "Tournaments"
- **Subtitle:** "Create and manage esports tournaments"
- **Features:**
  - Create new tournament
  - View tournament overview table (title, game, status, teams, matches count)
  - Edit tournament details
  - Delete tournaments

#### 1.2 Streams Management Page
- **Route:** `/frontend/admin/streams.html` (NEW)
- **Title:** "Publish Livestream"
- **Subtitle:** "Manage live stream publications and visibility"
- **Features:**
  - Create new stream
  - Stream moderation table (stream title, author, game, live status, views, likes, visibility)
  - Edit stream properties
  - Toggle stream visibility (Visible/Hidden)
  - View stream URL

#### 1.3 Leaderboards Management Page
- **Route:** `/frontend/admin/leaderboards.html` (NEW)
- **Title:** "Leaderboards"
- **Subtitle:** "Create and manage competitive leaderboards"
- **Features:**
  - Create new leaderboard
  - View leaderboard entries (player rank, name, game, score)
  - Associate leaderboards with tournaments
  - Edit leaderboard settings

#### 1.4 Matches Management Page
- **Route:** `/frontend/admin/matches.html` (NEW)
- **Title:** "Matches"
- **Subtitle:** "Organize and track tournament matches"
- **Features:**
  - Create new match
  - View matches table (match ID, tournament, teams, status, score)
  - Update match status (scheduled, in-progress, completed)
  - Update match scores

### Implementation Approach
- Reuse the admin console template styling from `frontend/shared/css/admin-console.css`
- Update `frontend/shared/js/admin-console.js` sidebar navigation to include new pages
- Each page should follow the same card-based layout pattern currently used
- Keep form patterns consistent with existing admin UX

---

## Requirement 2: Admin Profile Settings Page

### Current State
- Admin users can only edit profile settings via `/frontend/player/profile.html`
- No admin-specific profile page exists
- Inconvenient UX: requires context switching to player mode

### Desired State
- **New route:** `/frontend/admin/profile.html`
- **Access:** Available in admin console sidebar (likely under "Account" or similar)
- **Features:** Mirror player profile functionality
  - Edit personal information (name, email, DOB)
  - Upload/change profile picture
  - Edit about section / bio
  - Link social media (Instagram, Facebook, TikTok, etc.)
  - School information (DLSUD, course)
  - Primary games / interests
  - Privacy settings if applicable

### Implementation Approach
- Extract profile editing form from `frontend/player/profile.html`
- Adapt styling to match admin console dark theme
- Reuse backend API endpoints that already handle profile updates
- Keep the console shell layout consistent with other admin pages

---

## Requirement 3: Admin Events Creation Page

### Current State
- No admin events creation capability exists
- Player `/frontend/player/events.html` only displays events (read-only)

### Desired State
- **New route:** `/frontend/admin/events.html`
- **Title:** "Create Events"
- **Subtitle:** "Manage tournaments, ceremonies, and gaming events"
- **Features:**
  - Create new event (title, description, date/time, category)
  - Event categories: Tournament, Ceremony, Meetup, Competition, Other
  - Attach game info to event
  - Set event visibility (Draft, Published, Hidden)
  - View all created events in a table
  - Edit event details
  - Delete events
  - Mark events as active/inactive

### Player Side Integration
- Events created here automatically appear in `/frontend/player/events.html`
- Player event page queries `/api/events` or similar endpoint
- Filters by visible/published events only

### Implementation Approach
- Create new backend endpoint: `POST /api/admin/events` to handle event creation
- Update `GET /api/events` to include admin-created events
- Use consistent form patterns from tournaments/streams pages
- Store events in database (add migration if needed to event schema)

---

## Page Navigation Structure (Updated Admin Sidebar)

```
Admin Console Navigation:
├── Dashboard (Summary)
├── Users (Directory)
├── Analytics (Metrics)
├── Tournaments & Streams (OLD - TO REPLACE WITH BELOW)
│   └── Tournaments ✓ (Separate)
│   └── Streams ✓ (NEW - Separate)
│   └── Leaderboards ✓ (NEW - Separate)
│   └── Matches ✓ (NEW - Separate)
├── Events ✓ (NEW)
├── Profile ✓ (NEW)
└── Logout
```

---

## UI/UX Consistency Requirements

### Design Language
- Dark esports theme (maintain existing admin console aesthetic)
- Card-based layouts for data display
- Form patterns consistent with existing tournaments page
- Sidebar navigation mirroring current structure
- Top bar with title and user chip (consistent)

### Form Patterns
- Action buttons: "Show form" / "Hide form" toggle pattern
- Data tables with Edit/Delete/Hide actions
- Status badges (Active, Open, Live, Hidden, etc.)
- Consistent spacing and card styling

### Error Handling
- Flash messages for success/error feedback
- Validation on form submission
- Graceful handling of failed API calls

---

## Backend Requirements

### New/Modified Endpoints Needed

#### Events Service
```
POST   /api/admin/events          - Create event
GET    /api/admin/events          - List admin events
GET    /api/admin/events/:id      - Get event details
PUT    /api/admin/events/:id      - Update event
DELETE /api/admin/events/:id      - Delete event
GET    /api/events                - Get visible events (for player feed)
```

#### Stream Visibility
```
PATCH  /api/admin/streams/:id/visibility  - Toggle stream visibility
```

#### Leaderboard Management
```
POST   /api/admin/leaderboards    - Create leaderboard
PUT    /api/admin/leaderboards/:id - Update leaderboard
```

### Database Considerations
- If `events` table doesn't exist, create migration
- Add `isVisible` or `visibility` field to events
- Ensure tournament, stream, leaderboard, match tables support required fields
- Consider `createdAt`, `updatedAt` for audit trail

---

## Testing Checklist

### Admin Pages Creation
- [ ] Tournaments page loads without errors
- [ ] Streams page loads without errors
- [ ] Leaderboards page loads without errors
- [ ] Matches page loads without errors
- [ ] Sidebar navigation updates to reflect new pages
- [ ] Mobile responsive layout works on new pages

### Profile Page
- [ ] Admin can access profile settings from admin console
- [ ] Profile data loads correctly
- [ ] Form submissions update profile data
- [ ] Changes persist in database
- [ ] Frontend reflects updated profile information

### Events Page
- [ ] Admin can create new event
- [ ] New events appear in admin event list
- [ ] New events appear in player events page
- [ ] Events can be edited by admin
- [ ] Events can be deleted by admin
- [ ] Visibility settings work correctly

### RBAC
- [ ] Only admin+ users can access admin pages
- [ ] Non-authenticated users redirected to login
- [ ] Player users cannot access admin pages

---

## Acceptance Criteria

✅ All 4 separate moderation pages exist and render without error  
✅ Admin profile page accessible and editable from admin console  
✅ Events creation page allows admin to create events  
✅ Created events visible in player events page  
✅ UI maintains consistent dark esports theme  
✅ Sidebar navigation clearly shows all new sections  
✅ Backend endpoints tested and functional  
✅ No console errors or security vulnerabilities  

---

## Notes for Claude
- Preserve existing backend auth middleware and validation
- Do not break current player or superadmin dashboards
- Keep API responses consistent with current patterns
- Maintain database integrity constraints
- Test role-based access before deployment
- Ensure mobile responsiveness on all new pages
