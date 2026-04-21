# GamersHub Testing Rules

## Current Reality
- There is no dependable automated test suite yet.
- `backend/SMOKE_TEST.md` is the current reference for backend validation.

## When Making Changes
- Verify only the paths impacted by the change.
- Prefer API-level checks for backend work.
- Prefer manual browser-flow checks for frontend work.
- When auth or permissions change, test both success and denial cases.
- When role logic changes, verify redirect behavior after login and session refresh.

## Minimum Validation By Area
- Auth changes:
  - register or login path still works
  - MFA flow still completes or fails correctly
  - redirect path matches role and school-verification state
- RBAC changes:
  - unauthorized roles are blocked
  - allowed roles can still complete the action
  - database updates are reflected on next fetch or login
- Analytics / reports / audit changes:
  - payload shape remains stable
  - empty-state behavior still returns sensible JSON
- Frontend changes:
  - affected page loads without console-breaking errors
  - API calls still match current backend routes

## Good Claude Behavior
- If no automated test exists, say what was validated manually.
- If validation could not be run, say exactly what remains unverified.
