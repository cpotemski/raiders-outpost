# Expeditions Domain Rules

Expeditions are regular projects (`kind: "project"`) with expedition-specific behavior.

## Core rules

- Expedition projects are identified by slug prefix `expedition_project`.
- Expeditions are sequential and build on each other.
- A user can mark expeditions as completed (`completedExpeditionSlugs`).
- The next available expedition is the first expedition in sequence that is not completed.
- The available expedition can be tracked or untracked like other projects via `inactiveProjectSlugs`.

## User flow

- During onboarding, users state which expeditions they already completed.
- The app computes their available expedition from that history.
- On the projects page, only that available expedition is shown in the projects category.
- Users can toggle tracking for that expedition on/off like `trophy_display_project`.
- When an expedition departure/reset is confirmed, the current expedition becomes completed and the next one becomes available.
