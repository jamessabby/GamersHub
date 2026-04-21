# Skill: Backend Feature Work

Use this skill when the task touches `backend/`.

## Workflow
1. Identify the owning domain module.
2. Read the matching route, controller, service, and repository files before changing behavior.
3. Keep logic in the service layer unless the current module already uses a different pattern.
4. Preserve existing response shapes unless the task explicitly changes the contract.
5. For permission-sensitive changes, make the allowed roles explicit.
6. For SQL-backed changes, confirm whether a migration or script update is needed under `backend/sql/`.

## GamersHub Priorities
- auth correctness
- RBAC clarity
- analytics/report consistency
- audit readiness
- SQL data integrity

## Validation
- Use targeted endpoint checks or the patterns in `backend/SMOKE_TEST.md`.
- If no validation was run, say so clearly.
