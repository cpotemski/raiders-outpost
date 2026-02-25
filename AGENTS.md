# AGENTS.md — Raiders Outpost

## Product Goal
Raiders Outpost is a companion app for ARC Raiders players.

Primary promise:
- Simple to understand.
- Fast to use.
- Focused on what matters.

User value:
- Track your progress.
- Share progress with friends.
- Help each other by seeing who needs what.

The app is a tactical HUD, not a generic SaaS dashboard.

## Core Domain (Must Stay Correct)

### Identity & access
- Users sign in/sync via auth code flow.
- One Raider identity maps to one user record (`User.token` unique).
- Public profile slug may exist and must remain unique.

### Projects & progress
- Projects contain ordered stages; stages contain required items.
- Per-user item ownership is stored in `UserProjectItem.quantityOwned`.
- Item progress must persist and survive reload/navigation.
- Users can toggle tracked projects off via `inactiveProjectSlugs`.

### Expedition rules
- Expedition projects are identified by slug prefix `expedition_project`.
- Expeditions are sequential and cumulative.
- A user can mark expeditions complete (`completedExpeditionSlugs`).
- The next available expedition is the first not yet completed.
- Only the currently available expedition is shown in normal project flow.
- Expedition tracking can be toggled like other projects.
- Reset/departure flow marks current expedition complete and unlocks next.

### Community collaboration
- Users can create/join communities via invite code.
- Multi-community membership is supported.
- Community roster supports member removal.
- Shared visibility must help coordination (who needs which items).

### Admin controls
- Global admin settings can disable projects/items.
- Disabled entities must not appear as normal selectable user content.

### Data source overrides
- Base data comes from `arcraiders-data`.
- Local overrides live in `data/arc-overrides` and patch base data.
- Override merges are partial and should remain additive/surgical.

## UX & UI Guardrails
- Preserve ARC HUD/Blueprint visual language.
- Reuse existing tokens/classes: `bg-arc-grid`, `arc-panel`, `arc-panel-header`, `hud-label`, `arc-corners`.
- No pill-button aesthetic, playful illustration style, or generic SaaS card styling.
- Prefer information-dense, low-friction screens over decorative UI.
- Prioritize fast interactions: minimal clicks, immediate feedback, stable layout.

## Engineering Principles
- Build only what is explicitly requested.
- Choose the simplest conservative solution when requirements are unclear.
- Keep logic separate from presentation.
- Avoid duplication; extract shared logic to `hooks/` and `lib/`.
- Keep components small, composable, and single-purpose.
- Do not introduce dependencies unless clearly justified by scope.

## Code Structure Guidelines

### Frontend (Next.js)
- Keep page-level files thin; delegate behavior to hooks/helpers.
- Prefer server/client boundaries that reduce unnecessary client work.
- Keep component APIs minimal and explicit (typed props, no hidden side effects).
- Use stable `data-testid` attributes for critical interactions.

### API routes
- Validate inputs and return predictable response shapes.
- Keep route handlers thin; move domain logic to `lib/` helpers.
- Enforce domain invariants at write points (especially expedition sequence).

### Prisma & persistence
- Treat Prisma schema constraints as source-of-truth guardrails.
- Use transactions for multi-write flows that must stay consistent.
- Favor additive migrations; avoid risky destructive changes unless required.

## Coding Standards
- Use TypeScript strictly; avoid `any` unless unavoidable and documented.
- Prefer clear naming over clever abstractions.
- Keep functions focused and short; extract complexity.
- Handle empty, loading, and error states explicitly.
- Surface domain intent in code (e.g., expedition/order semantics).
- Add concise comments only where intent is non-obvious.

## Performance & Reliability
- Keep the app responsive on common laptop/mobile devices.
- Avoid unnecessary re-renders and repeated data work.
- Batch and debounce writes where it improves UX without risking correctness.
- Never trade domain correctness for micro-optimizations.

## Testing Guidelines (High Priority)

### Test strategy
- Cover critical user journeys first, then edge cases.
- Prioritize behavior tests over implementation details.
- Avoid low-value visual/layout-only assertions.

### Required coverage areas
- Auth sync, login/logout, and account linking.
- Onboarding and expedition selection persistence.
- Project progress updates and persistence.
- Project tracking toggles (`inactiveProjectSlugs`) per user.
- Community join/invite/remove across multiple communities.
- Expedition reset/departure sequence behavior.
- Public profile accessibility.

### Playwright standards
- Use stable selectors, preferably `data-testid`.
- Keep tests deterministic (controlled seed/state, no timing flake).
- Include at least one lightweight screenshot assertion/capture in meaningful flow.
- Store screenshots under `test-results/`.
- Name tests by user outcome, not implementation.

## Delivery Checklist (for every meaningful change)
- Domain rules still hold (especially expedition sequence and progress persistence).
- UI still matches ARC HUD language and existing tokens.
- New/changed behavior is covered by Playwright where critical.
- No duplicate logic added where shared helper/hook fits better.
- No unrequested features, pages, or dependencies introduced.
