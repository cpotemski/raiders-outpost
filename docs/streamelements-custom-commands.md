# StreamElements Custom Commands

Verifizierte Regeln fuer Raiders Outpost Script-Endpoints.

Diese Datei dokumentiert nur Patterns, die mit StreamElements gegen die produktiven `/scripts/*`-Endpoints tatsaechlich getestet wurden.

## Kernregel

Wenn ein StreamElements-Command ueber `$(customapi ...)` einen optionalen Parameter unterstuetzen soll, verwende fuer genau ein optionales Wort dieses Muster:

```text
$(1|fallback)
```

Fuer Raiders Outpost bedeutet das:

```text
!command add !item $(customapi "https://arc.nodedev.de/scripts/item?rarity=$(queryescape $(1|all))")
```

## Warum dieses Pattern

- `$(customapi ...)` funktioniert stabil mit einer komplett gequoteten URL.
- `$(1|fallback)` liefert das erste Wort nach dem Command oder den Fallback, wenn kein Argument uebergeben wurde.
- `$(queryescape ...)` macht den uebergebenen Wert URL-sicher.
- Der Server behandelt `all` absichtlich als "kein Filter".

Damit funktioniert beides mit einem einzigen Command:

```text
!item
!item rare
```

## Verifizierte Regeln

1. Fuer `$(customapi ...)` die komplette URL in doppelte Anfuehrungszeichen setzen, sobald verschachtelte Variablen in der URL stecken.
2. Fuer einen optionalen einwortigen Parameter `$(1|fallback)` verwenden.
3. Fuer Query-Parameter immer `$(queryescape ...)` verwenden.
4. Bei StreamElements nur mit einem Wort nach dem Command planen, wenn `$(1...)` verwendet wird.

## Nicht verlaessliche Patterns

Die folgenden Patterns wurden gegen StreamElements getestet und sollen fuer Raiders Outpost nicht mehr verwendet werden:

```text
$(queryescape $(args))
$(queryescape ${args})
$(queryescape ${1:})
$(queryescape {input})
```

Gruende:

- `$(args)` und `${args}` wurden im `customapi`-Kontext woertlich an den Server weitergereicht.
- `{input}` wurde woertlich an den Server weitergereicht.
- `${1:}` war fuer diesen Use-Case nicht stabil genug.
- `$(1|)` ohne Fallback erzeugte bei leerem Input keinen verlaesslichen Request.

## Reichweite der Regel

Dieses Pattern ist die richtige Wahl, wenn alle folgenden Bedingungen gelten:

- StreamElements `$(customapi ...)`
- optionaler Parameter
- genau ein relevantes Wort nach dem Command
- Server kann einen bekannten Fallbackwert wie `all` als "kein Filter" interpretieren

## Wenn mehrere Woerter benoetigt werden

`$(1|fallback)` nimmt nur das erste Wort.

Beispiel:

```text
!item very rare
```

wird zu:

```text
rarity=very
```

Wenn ein Command mehrere Woerter sauber transportieren muss, reicht dieses Pattern nicht aus. Dann ist eine andere Command-Struktur oder ein anderer Server-Vertrag noetig.
