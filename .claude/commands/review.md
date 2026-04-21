# Review Command

When asked to review code in GamersHub:

1. Start with bugs, regressions, and permission risks.
2. Check whether backend and frontend assumptions still match.
3. Look closely at:
   - auth flows
   - RBAC rules
   - SQL persistence behavior
   - redirect behavior by role
   - analytics/report payload stability
4. Call out missing validation or missing smoke coverage.
5. Keep findings concrete with file references when possible.

Special reminder:
- Superadmin-only role changes are high-risk and should always be reviewed carefully.
