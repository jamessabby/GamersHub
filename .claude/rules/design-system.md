# GamersHub Design System Rules

## Source Of Truth
- Treat the GamersHub Figma as the main visual reference.
- If Figma and current code differ, prefer matching Figma for new UI work unless the user says the implementation has become the newer source of truth.

## What To Preserve
- Dark esports visual identity
- Consistent role-based navigation patterns
- Shared card and panel styling across dashboards
- Existing auth-page composition patterns
- Existing player/admin/superadmin page family resemblance

## Figma-Informed Page Families
- Authentication:
  - landing
  - login
  - signup
  - MFA verification
  - school / DLSUD verification
- Player:
  - dashboard
  - livestream explorer
  - events
  - profile
  - tournaments
  - schedule
  - leaderboards
- Admin:
  - dashboard
  - user management
  - operations / analytics / moderation
- Superadmin:
  - governance
  - audit
  - reporting
  - higher-privilege management surfaces

## When A Page Does Not Exist Yet
- Start from the closest existing page in the same role area.
- Reuse the same navigation shell first.
- Reuse the same visual density level first.
- Reuse the same card, table, form, and dashboard patterns first.
- Add only the minimum new UI structure needed for the new feature.

## Good AI Design Behavior For This Project
- Extend GamersHub's current design language.
- Keep new pages believable as part of the same Figma file.
- Prefer continuity over novelty.
- If inventing a missing section, explain which existing page pattern it was derived from.

## Bad AI Design Behavior For This Project
- creating a totally new design language for one page
- switching to a generic SaaS look
- flattening everything into plain white cards
- introducing random accent colors not seen in GamersHub
- changing nav structure without strong reason
