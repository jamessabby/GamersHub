# Skill: Frontend Flow Work

Use this skill when the task touches `frontend/`.

## Workflow
1. Identify the affected page HTML, page JS, and any shared helper files.
2. Check whether the page relies on `window.GamersHubAuth` or another shared utility.
3. Keep the implementation framework-free and consistent with the existing static-page architecture.
4. Preserve role-based redirects and auth guards.
5. Make sure backend route usage still matches the current API.

## GamersHub Priorities
- auth and redirect clarity
- consistent dashboard behavior by role
- clean empty states and status messaging
- admin/superadmin workflows that are obvious to users

## Validation
- Load the affected page and verify there are no obvious runtime mismatches.
- If the page depends on backend data, verify the expected endpoint and payload shape.
