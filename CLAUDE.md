# GamersHub Claude Context

## Project Identity
- GamersHub is a web-based university esports management and social engagement platform.
- The product combines authentication, community feed interaction, livestream discovery, tournament viewing, analytics, reporting, and audit visibility.
- This project is for a software lab / thesis context, so correctness, explainability, and requirements coverage matter as much as feature speed.

## Product Goals
- Give student gamers one platform for login, role-based access, tournament browsing, livestream exploration, and social interaction.
- Support community engagement through posts, comments, reactions, and friend relationships.
- Support university operations through admin and superadmin workflows such as analytics, reporting, stream moderation, audit logging, and role management.

## Academic / Lab Requirements
- Multi-factor authentication
- Role-based access control
- Data analytics
- Report generation
- Audit report
- RESTful API design
- Database-per-service mindset where possible

## Key Domain Rules
- Roles are `user`, `admin`, and `superadmin`.
- Only `superadmin` can promote a regular user to `admin` or demote an `admin` back to `user`.
- When a role changes, the backend must persist it in SQL Server and the frontend must redirect that user to the correct dashboard on next authenticated load.
- `admin` users still share much of the regular user experience, but they gain access to admin-only pages such as user management, stream moderation, analytics, reports, and audit-oriented views.
- School verification matters in the auth flow. Users missing school data should be redirected to `frontend/auth/school-verification.html`.

## Current Repository Layout
- `backend/`: Express-based API server, SQL Server access, service/repository layering
- `frontend/`: static HTML/CSS/JS pages for auth, player, admin, and superadmin views
- `backend/sql/`: ordered SQL migrations / setup scripts

## Backend Architecture
- Entry point: `backend/src/app.js`
- Route pattern: `*.routes.js`
- Controller pattern: `*.controller.js`
- Business logic pattern: `*.service.js`
- Database access pattern: `*.repository.js`
- Config / DB pools live under `backend/src/config/`
- Current backend domains include:
  - `auth`
  - `users`
  - `feed`
  - `reactions`
  - `stream`
  - `tournaments`
  - `admin`
  - `audit`

## Frontend Architecture
- Frontend is plain HTML/CSS/JavaScript, not React or a SPA framework.
- Shared browser utilities live under `frontend/shared/`.
- Auth/session helpers are especially important in `frontend/shared/js/auth-state.js`.
- Role landing pages:
  - `frontend/player/dashboard.html`
  - `frontend/admin/dashboard.html`
  - `frontend/superadmin/dashboard.html`

## Figma And UI Source Of Truth
- The Figma design should be treated as the primary visual reference for layout, hierarchy, and styling decisions.
- If a requested page already exists in Figma, follow that design closely before inventing anything new.
- If a requested page does not exist in Figma yet, extend the closest existing GamersHub page pattern rather than introducing a brand-new visual language.
- New pages should feel like they belong to the same product family as the existing auth, player, admin, and superadmin screens.
- Prefer adapting adjacent page types by role:
  - auth-related pages should inherit from the existing landing, login, signup, MFA, and school-verification designs
  - player pages should inherit from existing dashboard, livestream, events, profile, tournaments, schedule, and leaderboard designs
  - admin pages should inherit from existing management and analytics layouts
  - superadmin pages should inherit from governance, reporting, audit, and higher-privilege admin layouts

## Figma Context Currently Known
- The visible Figma workspace includes:
  - `GamersHub App`
  - `Role Diagram`
  - `Database Diagram`
  - `Cover`
  - `Style Guide`
- The design file appears organized by product sections:
  - Authentication
  - Player/User Interface
  - Admin Portal (Management & Operations)
  - Superadmin Portal (Security & System Governance)
- The visible authentication set includes:
  - Landing Page
  - Login Page
  - Sign up page
  - MFA Verification Screen
  - DLSUD Verification
- The visible player/user set includes:
  - User Dashboard
  - Livestreams / Livestream Explorer
  - Events page
  - User profile / Account
  - Tournaments Page
  - Game Schedule
  - Leaderboards
- The visible admin set includes:
  - Admin Dashboard
  - User Management (Moderator Level)

## Figma Visual Language To Preserve
- Dark esports-style interface with navy / deep-indigo surfaces
- High-contrast card layouts and dashboard panels
- Sidebar-based navigation for authenticated areas
- Top-bar or header areas for page actions and summary information
- Bold gaming visuals in auth and discovery screens
- Dense but structured admin surfaces for operational data

## Design Extension Rules
- When building a new page with no exact Figma screen, reuse:
  - existing sidebar structure
  - spacing rhythm
  - card treatment
  - button style
  - typography hierarchy
  - form layout style
- Use the Figma `Style Guide` page as the first styling reference when available.
- Avoid mixing unrelated design ideas from generic templates.
- Do not make a new page look more modern, minimal, or colorful than the rest of GamersHub unless explicitly requested.
- If there is uncertainty, prefer consistency with the nearest existing GamersHub screen over generic UI best practices.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQL Server / SSMS
- Auth helpers: bcrypt, signed tokens, session repository, email MFA
- File upload handling: multer
- Mail: nodemailer

## Current Auth Direction
- Local username/password auth exists.
- MFA currently uses an email verification-code flow.
- Google OAuth is implemented.
- Microsoft OAuth support is being added now.
- Do not break the session token flow, `requireAuth` middleware expectations, or the frontend redirect logic.

## Microservices Framing
- Treat the system as a microservices-inspired modular backend, not as a fully distributed deployment unless explicitly requested.
- Respect database boundaries and service ownership in code organization.
- Avoid introducing unnecessary message brokers, containers, or service splits unless the task explicitly asks for them.

## Working Conventions
- Prefer focused changes that fit the existing module and file patterns.
- Preserve vanilla frontend patterns unless there is a clear reason to introduce a library.
- Keep API responses consistent and user-facing error messages actionable.
- Favor incremental improvements over sweeping rewrites.
- Preserve active work already in progress, especially around auth and OAuth.

## Commands Claude Should Know
- Backend install: `cd backend && npm install`
- Backend dev server: `cd backend && npm run dev`
- Backend smoke reference: `backend/SMOKE_TEST.md`
- SQL setup: run scripts in `backend/sql/` in numeric order

## Testing Reality
- There is currently no real automated test suite.
- When changing behavior, validate with targeted endpoint checks or the smoke-test flows in `backend/SMOKE_TEST.md`.
- If you add logic with meaningful regression risk, suggest or add lightweight validation steps.

## High-Value Areas For Claude
- Tighten RBAC and redirect logic
- Keep admin and superadmin permissions explicit
- Maintain SQL-backed data integrity
- Improve analytics, reports, and audit readiness
- Keep frontend and backend behavior aligned for auth, feed, stream, and tournament flows

## Non-Goals Unless Asked
- Do not rewrite the app into a new framework.
- Do not convert the frontend to React/Vue.
- Do not redesign the database from scratch.
- Do not turn the repo into distributed runtime services just because the class theme is microservices.

## Extra Project Context From Notes
- The thesis framing emphasizes esports management, livestream engagement, and social interaction for university communities.
- The lab brief requires these service areas at minimum: Authentication Service, User Profile Service, Post Service, Feed Service, Reaction Service, plus architecture and API documentation.
- The current codebase already covers more than the minimum; align enhancements with the existing implementation rather than shrinking scope.
