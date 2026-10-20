# Siege Stats — design and motion

Approved visual source: the HTML mockup (dark esports, gold / silver / bronze). This file is the short spec the app implements. On-screen mockup notes are designer instructions, not product copy, so they are not rendered.

## Tokens

Defined in `src/styles/tokens.css` and consumed by `src/styles/siege.css`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0f16` | Page background |
| `--card` / `--card2` | `#141a25` / `#1a2130` | Surfaces |
| `--line` | `#263044` | Hairline borders |
| `--tx` / `--mut` | `#e8ebf2` / `#8b95a8` | Text / secondary |
| `--gold` `--silver` `--bronze` | `#f5c451` `#c9d1dc` `#d08a55` | 1st / 2nd / 3rd |
| `--kill` / `--death` | `#3ddc97` / `#ff6b6b` | Kills / deaths |
| `--acc` | `#7c8cff` | Focus, links, chart fallback |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | Most motion |
| `--spring` | `cubic-bezier(.3,1.6,.5,1)` | Success check |

Guild series colors, in standings order: gold, `#7c8cff`, `#3ddc97`, `#ff8a65`, `#c084fc`, `#4dd0e1`, `#f472b6`, `#a3e635`, `#94a3b8`, then `--mut`.

## Type

- Self-hosted Inter variable (cv08 serif capital I, cv05 tailed l — the Google subset drops those glyphs) with Noto Sans Thai as fallback, so Thai tone marks and Cyrillic letters still draw.
- `font-variant-numeric: tabular-nums` on stats.
- Player names render every stored character. A trailing ` #` plus id is only visually de-emphasized. Guild `OracIe` stays `OracIe`. `Wazabz` and `Wazabz่` stay separate guilds.
- Search may fold case, accents, and lookalikes (I/l/1, Cyrillic у/y, Thai tone marks) for matching. Folding never changes what is displayed or how stats are grouped.

## Layout

Mobile-first. Content column max 1180px. Sticky header. Tabs stick under the header and scroll sideways on small screens. At `max-width: 760px` the primary nav collapses into a bottom bar (Home, Sieges, Upload, Ranks) and the player timeline becomes a bottom sheet with a drag handle.

The podium is the gold / silver / bronze rank treatment on standings and top players (the approved mockup). The old three-block pastel podium is not part of this design.

## Motion

Every duration below is the running animation. `prefers-reduced-motion: reduce` sets animation and transition to none, shows final values (bars full, lines drawn, badges visible, count-up numbers final), and keeps color changes.

| Moment | Duration | Easing | Reduced motion |
|---|---|---|---|
| Page / panel enter | 300ms, 6px rise | ease | visible immediately. The route wrapper does not use a forwards fill, so the rise does not leave a transform and dialogs stay fixed to the viewport. |
| Tab underline | 350ms | `--ease` | jump to the selected tab |
| KPI count-up | 900ms | easeOutCubic | final number |
| Standings bars | 800ms, 50ms stagger | `--ease` | full width |
| Sorted bars (replaces pies) | 700ms, 40ms stagger | `--ease` | full width |
| Kills-over-time lines | 1.4s, 60ms stagger per guild | `--ease` | drawn instantly |
| Rivalry bars | 600ms, grow from the centre | `--ease` | full width |
| Heatmap cells | 400ms fade, 25ms diagonal stagger | ease | opaque |
| Badge cards | 450ms rise, 50ms stagger | `--ease` | visible |
| Momentum blocks | 450ms rise, 50ms stagger | `--ease` | visible |
| Row hover | 150ms | ease | color only |
| Row expand + chevron | 300ms / 250ms | `--ease` | open instantly |
| Life bars | 600ms scaleY, 40ms stagger | `--ease` | full height |
| Dialog | backdrop 200ms; panel 280ms scale .97→1 + 12px | `--ease` | fade only |
| Bottom sheet | 320ms translateY | `--ease` | fade only |
| Skeleton shimmer | 1.2s linear loop | linear | static blocks |
| Drop zone drag-over | 200ms | ease | gold border only |
| Upload progress | 200ms linear per tick | linear | width still updates |
| Parse indeterminate | 1.1s loop | ease-in-out | static bar + text |
| Error alert | 200ms in + one 6px shake 300ms | ease | no shake |
| Success check | 450ms | `--spring` | no pop |
| Home cards / list rows | 450ms stagger 60ms / 200ms stagger 30ms | `--ease` | visible |
| ⌘K palette | backdrop 150ms, panel 200ms | `--ease` | fade only |
| Copy toast | 300ms | `--ease` | visible |

## Charts

Pies are gone. Kill and death breakdowns are horizontal bars sorted by count. Kills over time is one line per guild (cumulative kills, one point per minute). Head-to-head is a pair of rivalry bars plus a guild×guild heatmap ("row killed column").

## Settled product choices

- Duplicate upload is the same server and calendar date. The UI offers the existing siege and still allows "upload anyway". No schema change, no silent delete.
- Cross-siege search, profiles, and leaderboards are read-only aggregates of `LogEntry.parsedData`. No new tables.
- Season filters, class filters, player compare, POVs, and Thai/English i18n are deferred. `class` is empty in current data and is shown only when a non-empty class is stored.
- Client preview uses the existing `parseAndProcessLog` function. Its return shape is unchanged.
