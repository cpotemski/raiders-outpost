# AGENTS.md — Raiders Outpost

## Project Overview
- Next.js + Tailwind companion app that tracks needed items in an Arc Raiders‑style HUD.
- Core flows: auth sync/operator menu, project selection & item progress, community roster/invite/remove, expedition selection.
- API routes + Prisma back the data; client hooks manage state and updates.

## Guidelines
- Build only what’s explicitly requested; no extra pages, features, libraries, or animations.
- UI must stay Arc HUD/Blueprint: use existing tokens/classes (`bg-arc-grid`, `arc-panel`, `arc-panel-header`, `hud-label`, `arc-corners`).
- No pill buttons, no colorful gradients, no SaaS card look, no playful illustrations.
- Keep components small and reusable; extract shared UI, move logic into hooks/helpers (`hooks/`, `lib/`).
- Separate logic from presentation and avoid copy/paste duplication.
- Testing: cover critical user flows with Playwright using stable `data-testid` hooks; avoid low‑value layout tests.
- Include at least one lightweight screenshot in Playwright for visual sanity.
- If something is unclear, choose the simplest conservative option.
