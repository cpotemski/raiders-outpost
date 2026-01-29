# AGENTS.md — Raiders Outpost

## Agent Rails (keep it minimal)

- Baue nur das, was explizit gefordert ist. Keine zusätzlichen Seiten, Features, Libraries, Animationen oder “nice to have”.
- UI strikt im Arc-HUD/Blueprint Stil: nutze vorhandene Tokens/Klassen (`bg-arc-grid`, `arc-panel`, `arc-panel-header`, `hud-label`, `arc-corners`). Keine pill buttons, keine bunten Gradients, keine SaaS-Card-Optik.
- Wenn etwas unklar ist: konservativ entscheiden und die einfachste Lösung wählen.

## Ziel
Baue eine Web-App (Companion App) die sich visuell wie “Arc Raiders” anfühlt: gritty sci-fi, minimal, UI wie ein In-Game Terminal/HUD. Kein “Startup-Dashboard”. User pflegen dort welche Items sie **brauchen**

## Stack
next.js + tailwind

## Look & Feel

Jede Seite muss sofort nach Arc Raiders wirken, auch ohne Logo.

1) Art Direction (Wörter, die du strikt umsetzt)
	•	Stimmung: utilitarian, industrial, “field gear”, leicht dystopisch, hochwertig aber rau
	•	UI-Metapher: HUD / Scanner / Terminal, keine runden Bubble-Apps
	•	Formen: eckig, harte Kanten, keine pill buttons, keine großen Rundungen
	•	Textur: subtil (noise/grain), leichte Vignette, feine Scanlines optional (sehr dezent)
	•	Kontrast: dunkel dominiert, Akzente sparsam und “warnend”

2) Farb- und Typo-Regeln (keine Fantasie-Farben)
	•	Background: sehr dunkles Anthrazit/near-black, nicht reines #000
	•	Surfaces: 1–2 Stufen heller als Background (Panels)
	•	Borders: dünn, low-contrast, manchmal “hazard”-Akzent (sparsam!)
	•	Akzentfarben: max. 1 primär + 1 warn (z.B. kaltes Cyan/Teal + Amber/Orange)
	•	Typography: Condensed/technical feeling (falls Webfonts: Inter Tight / DIN / Rajdhani / Space Grotesk; ansonsten system-ui aber mit tight tracking und UPPERCASE labels)
	•	Text-Hierarchie: viel kleine Labels (12–13px), Headlines eher “section titles”, nicht Marketing-H1.

3) Layout & Spacing (damit’s sofort “dazu gehört”)
	•	Raster: 12-col oder 8px spacing system
	•	Panels statt Cards: Jede Sektion ist ein Panel mit Header-Leiste (Titel links, Status/Action rechts)
	•	Trennlinien: horizontale rules, kleine corner marks, dünne Frames
	•	Navigation: links als “module list” oder oben als “tab strip” im HUD-Stil
	•	Empty States: immer “scanning…” / “no signal” / “data not found” statt “Nothing here”

4) Komponenten-Styleguide (konkret)

Buttons
	•	Primary: rechteckig, dünner Border, leichte Glow-Line beim Hover (nicht Neon)
	•	Secondary: nur Outline
	•	Danger/Warn: Amber/Orange, aber nur wenn wirklich nötig
	•	Button-Text: UPPERCASE, leicht condensed

Inputs
	•	Monospace optional für IDs/Trade-Codes
	•	Outline + kleiner left icon slot
	•	Fokus: dünne Akzentlinie, keine fette Shadow

Cards/Panels
	•	Hintergrund: dunkler Panel-Fill
	•	Border: 1px, leicht transparent
	•	Optional: kleine “corner ticks” (2–4px) an 2 Ecken
	•	Panel-Header: Titel + “status chip”

Chips/Tags
	•	eckig, klein, mit Border
	•	Statusfarben nur für: online/offline, common/rare/epic, danger

Tables/Lists
	•	bevorzugt listenartig mit Spalten
	•	Zebra nur extrem subtil (2–3% Unterschied)
	•	row hover: scanline/highlight bar

5) Iconography & Microdetails
	•	Icons: line icons, technisch (kein Cartoon)
	•	Kleine “system” Elemente: Signal-Stärke, Koordinaten, Zeitstempel, “ARC//” Prefixes
	•	Copy: kurze, knackige Systemtexte (“SYNCED”, “UPLINK LOST”, “SCANNING CACHE”)

6) Was du NICHT tust (harte Verbote)
	•	Keine Pastellfarben, keine bunten Gradients
	•	Keine großen runden Cards, keine pill toggles
	•	Keine neumorphic shadows
	•	Keine verspielten Illustrationen
	•	Keine “Material You”-Optik
