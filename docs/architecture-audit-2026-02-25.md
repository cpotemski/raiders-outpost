# Raiders Outpost Architektur-Audit (offene TODOs)

Stand: 2026-02-25

## TODO 1 (P2): Community UI-Komplexität reduzieren
- Bereich: `components/community/CommunityRoster.tsx`
- Problem: Eine Komponente bündelt viel Darstellungs- und Interaktionslogik (Filter, Manage/Needs-Kontext, Aktionen, Dialogzustände).
- Impact:
  - User: mittel (Regressionsrisiko bei Änderungen)
  - Dev: hoch (Review-/Änderungskosten)
- Nächster Schritt:
  - In kleinere, klar abgegrenzte Teilkomponenten/Hooks schneiden (`member-list`, `invite-panel`, `removal-flow`, `community-filters`).

## TODO 2 (P2): Duplizierte Needs-Berechnung in Server-Schicht konsolidieren
- Bereich:
  - `lib/server/projects/community-needs.ts`
  - `lib/server/projects/public-profile-needs.ts`
- Problem: Mapping/Anreicherung von Projektitems und Needs-Aggregation sind teilweise dupliziert.
- Impact:
  - User: indirekt (Inkonsistenzrisiko)
  - Dev: mittel (Wartungsaufwand)
- Nächster Schritt:
  - Gemeinsame Helper in `lib/server/projects/shared.ts` extrahieren (Item-Mapping, Expedition-Filterregeln, Needs-Aggregation).

## TODO 3 (P3): Onboarding-Edge-Cases mit gezielten Tests absichern
- Bereich: `tests/auth.spec.ts`
- Problem: Expedition-only Onboarding ist abgedeckt, aber Randfälle fehlen.
- Offene Fälle:
  - Keine Expeditionen verfügbar (`/api/onboarding/projects` liefert leer)
  - Alle Expeditionen bereits abgeschlossen -> erwartete nächste Expedition `null`
  - Persistenz nach Reload in nicht-default Locale
- Impact:
  - User: niedrig-mittel
  - Dev: mittel
- Nächster Schritt:
  - 2-3 zusätzliche deterministische Playwright-Tests ergänzen.
