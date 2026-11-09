# UX and navigation simplification plan

Drafted November 8, 2026 from a walkthrough of the local app with the X309 reports (desktop 1440×900 and phone 375×812) and a read of `campaign-room.tsx`, `order-editor.tsx`, `analysis.tsx` and their children. No application code was changed.

## What the app is made of

The game loop is: a turn report arrives by email → import it → understand the position → write orders → export them into the order email. Allies add a second loop: import their reports → combine intelligence → test attacks → check everyone's proposed orders.

| Layer | Pieces today | Scope |
|---|---|---|
| Shell | Account/cloud status, campaign selector, Add campaign, Manage campaign (rename, archive, remove turn, backup), Import my reports, Reload cloud, Transfer browser campaigns, demo, notices, footer backup | Whole workspace |
| Turn context | **Report** and **Compare** selectors, big metric cards, Multipliers | Own reports; drives Map, Briefing, Ledger and the Order editor's base turn |
| Map & intelligence | Space list + filter, operations map, change categories, legend, space detail, Forces in range, connections | Own report |
| Turn briefing | Captures/losses, minor control changes, spies, declared allies, rejected orders, order echo | Own report |
| Forces ledger | Command table + CSV | Own report |
| Order editor | Planning reference (forces / full report / map), submission heading, draft box, cash summary, resource budget, checks, order builder, order-by-order review, order help, coverage, export dialog | Own report → next turn |
| Allied Reports | Import, per-player/turn browsing, source text, removal | Allies |
| Analysis | Combined intelligence (own "Intelligence turn" selector), Attack & defense scenarios, Coordinated orders (+ connected battles, uncommitted) | Own + allied |
| Shared | "Read my source report" dialog, space chips that jump to the map | Everywhere |

Two genuinely separate worlds: **my position** (one report, one turn) and **the alliance** (many reports, many players). Today they share one flat row of six buttons.

## Problems seen in the walkthrough

1. **Primary content starts below the fold.** Every own-report view repeats the campaign heading, five metric cards and eight multiplier cards (~550 px). At 1440×900 the map starts about three-quarters down the screen; the Order editor starts lower still. Friends see a dashboard of numbers, not the map.
2. **Four stacked control tiers.** Campaign bar (up to 6 buttons) → view row → campaign heading with Report/Compare → Analysis sub-tabs with a second turn selector. It is unclear which controls are global and which belong to the page.
3. **Two turn selectors that disagree.** Report/Compare disappear on Allied Reports and Analysis, and Analysis has its own "Intelligence turn". You can't tell at a glance which turn any page is showing.
4. **Analysis hides three features behind a vague word.** "Combined intelligence", "Attack & defense scenarios" and "Coordinated orders" are each full tools. Nobody looks for battle estimates under "Analysis".
5. **Order editor is 14 collapsed sections.** Checks and resource budget, the most valuable feedback, are folded shut below the text box. The builder is a closed `<details>` too.
6. **Duplicated or scattered actions.** Campaign backup appears in three places; own-report import lives in the campaign bar but allied import lives in a tab; "Read my source report" exists only on some views.
7. **No addresses.** Views are component state: browser Back leaves the app, refresh returns to the map, and nothing can be bookmarked or linked.
8. **Space links teleport.** Clicking a space chip in the Briefing or Ledger switches to the Map and loses your place.
9. **Banner stack.** Workspace mode, cloud status, unsaved-changes lock, archive notice and messages each take a full-width row.
10. **First run is thin.** A newcomer gets a notice, an empty dropdown and a one-country demo, so the map looks empty. Caveat paragraphs dominate every page.
11. **Phone.** The header and campaign controls fill the first screen; views hide behind "☰ Views".

## Recommendation: collapsible left sidebar

Choose a sidebar over top tabs. There are already nine destinations once Analysis is flattened, Campaign history is queued, and the campaign switcher needs a permanent home. Top tabs would overflow at that count and collapse badly on phones. The sidebar collapses to an icon rail on desktop and becomes a drawer plus a four-item bottom bar on phones.

```
┌──────────────────────┬──────────────────────────────────────────────────────┐
│ WWBP                 │ Map & intelligence     Report T3 ▾  vs T2 ▾   ● Saved │
│ ┌──────────────────┐ │──────────────────────────────────────────────────────│
│ │ X309 · P1      ▾ │ │                                                      │
│ └──────────────────┘ │   ┌─ spaces ─┐                         ┌─ detail ──┐ │
│ [+ Import report]    │   │ search   │        full-height       │ Algeria   │ │
│                      │   │ filter   │           map            │ forces    │ │
│ MY TURN              │   │ list…    │                          │ in range  │ │
│  ◉ Map & intel       │   └──────────┘  [changes][legend][±]    └───────────┘ │
│  ✎ Orders      T4    │                                                      │
│  ▤ Forces ledger     │                                                      │
│  ☰ Turn summary      │                                                      │
│                      │                                                      │
│ ALLIANCE      beta   │                                                      │
│  ⇄ Allied reports  2 │                                                      │
│  ◎ Combined intel    │                                                      │
│  ⚔ Battle planner    │                                                      │
│  ⛓ Coordinated orders│                                                      │
│                      │                                                      │
│ ─────────────────    │                                                      │
│  ⎙ Source report     │                                                      │
│  ? Help   ⚙ Account  │                                                      │
│  «  collapse         │                                                      │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### Sidebar contents

- **Campaign switcher** at the top: switch, Add campaign, Manage campaign, Export backup and Archive in one menu. It replaces the campaign bar.
- **Import report**, the one primary button in the sidebar. It opens a single dialog with a choice: *my report* or *an ally's report*. That puts both imports in one place.
- **My turn**
  - **Map & intelligence**, the default landing page.
  - **Orders**, with a badge for the draft's turn and red/amber dots for errors and warnings, plus a dot for unsaved changes.
  - **Forces ledger** stays separate as requested.
  - **Turn summary** merges the metric cards, Multipliers and the old Turn briefing. That is the right home for all three, and it removes the 550 px header from every other page.
- **Alliance** (marked *beta* until polished): Allied reports (count badge), Combined intel, Battle planner (today's scenarios), Coordinated orders. "Analysis" disappears as a label and its sub-tabs become real pages.
- **Footer:** Source report, Help (order syntax, checker coverage), Account (cloud status, reload, transfer browser campaigns, sign out), collapse toggle.

### Top bar (one row, every page)

Page title · **one global turn context** (`Report T3 ▾ vs T2 ▾`) · one status pill (`● Saved to cloud`, `● Unsaved orders`, `Demo`, `Archived`). Alliance pages use the same turn control instead of their own "Intelligence turn". Orders shows `Drafting turn 4 from report 3`. Transient messages become toasts, so the banner stack goes away.

## Visual identity: navy and gold

Replace the current green palette (`--green:#235b43` and related tokens in `globals.css`) with navy and gold. Use them sparingly so the map and data stay readable.

| Token | Value (starting point) | Use |
|---|---|---|
| `--navy` | `#14213d` | Sidebar and top bar background |
| `--navy-raised` | `#1f2f52` | Hovered nav items, the campaign switcher on navy |
| `--gold` | `#d4a72c` | Active nav indicator bar, focus rings on navy, badges, the "Six" in the byline |
| `--gold-ink` | `#8a6a12` | Gold used as text or icon on light backgrounds (plain gold fails contrast on white) |
| `--surface` / `--ink` | `#f7f8fb` / `#1b2333` | Content area stays light, with ink nudged toward navy |

Rules:
- Navy is only for chrome: the sidebar and the top bar. Pages stay light so tables, the map and order text keep full contrast.
- Gold marks "where you are" and "what to do next": the active page, the primary button (navy text on gold), unsaved/attention badges. Avoid gold for large fills or body text.
- Errors stay red and warnings stay amber. Make the warning amber clearly more orange than the gold so a warning never reads as a highlight.
- On the map, player 3 uses `#aa772b` and player 5 uses `#426bc4`, close to gold and navy. Keep the selected-space marker distinct from both, for example a white halo with a navy outline. Don't use the UI gold on the map.
- Check WCAG AA contrast: white on navy, navy on gold, and gold-ink on the light surface.

### "by PathSix Solutions" byline

Put a small byline at the bottom of the sidebar, under Account: `by PathSix Solutions`, with "Path" and "Solutions" in white and "Six" in gold, about 11–12 px, linking to https://pathsixsolutions.com in a new tab. Spelling: "PathSix" is one word with capital P and S. In the collapsed icon rail it shrinks to a tiny "P6" mark or is hidden. Don't put it next to the WWBP name in the top bar: it should read as "built by", not as owner of the game. The login page footer can carry the same line.

## Page-level changes

**Map & intelligence (primary).** The map fills the viewport height. The space list and space detail become collapsible side panels. Change categories become filter chips over the map, and the legend becomes a toggleable overlay. Add a compact one-line KPI strip (`10 countries · 184 industry · $72`) that links to Turn summary.

**Orders (biggest).** Make it a three-pane workspace that fits the screen:
- Left: planning reference (forces / report / map), collapsible and resizable, as today.
- Center: a toolbar with **Add order** (the builder as a popover, not a closed `<details>`), then the draft box at full height, then the submission heading as a one-line field with a ✓ once it is set.
- Right: an always-visible **checks rail**: cash available/allocated/remaining, error and warning counts, and a click-to-jump issue list. Resource budget and order-by-order review are tabs in this rail.
- Sticky actions: Save draft · Discard · **Review & export** (primary).
- Order help and checker coverage move to the Help drawer, linked contextually.

**Forces ledger.** Unchanged apart from a sticky header row and space names that open the space inspector instead of jumping to the map.

**Turn summary.** Metric cards and multipliers at the top, then captures/losses, rejected orders (highlighted when present), diplomacy and order echo.

**Alliance pages.** Each page gets a guiding empty state that names its prerequisite. For example, Coordinated orders says *"Import at least one ally's report"* with a button. Combined intel can reuse the map component later as a layer. These pages are still being finished; this plan only fixes where they live and how they share the turn context.

### Cross-cutting

- **Real URLs** (`/c/[campaign]/map`, `/orders`, `/allies/battles`… or `?view=` as a first step) so Back, refresh and bookmarks work.
- **Global space inspector:** any space code anywhere opens a slide-over with ownership, forces, changes, forces-in-range and connections, without leaving the page. It reuses the existing map detail panel.
- **Quick find (Ctrl+K):** jump to a space or page.
- **Copy diet:** collapse caveat paragraphs into ⓘ tooltips or a single "How this is calculated" link per page.
- **First run:** a three-step welcome (create campaign → paste report → see your map) and a richer fictional demo with enough countries that the map looks alive.
- **Phone:** bottom bar for Map / Orders / Summary / More, with the sidebar as a drawer.

## Constraints to preserve

- The Order editor and Analysis stay mounted while hidden so unsaved drafts survive view switches. With routing, keep them mounted in a shared layout or lift draft state. The unsaved-changes guard must also cover route changes and campaign/turn switches.
- Browser-only, demo and cloud modes, revision conflicts and transfer behavior are unchanged.
- No changes to parsing, checking or combat models.

## Phases

1. **Shell** (implemented November 8, 2026, not yet committed): navy/gold tokens and byline, sidebar, top bar with global turn context and status pill, Turn summary page (metrics + multipliers + briefing), import dialog with mine/ally choice, `?view=` URLs. Split `campaign-room.tsx` into `AppShell`, `Sidebar`, `TopBar` and per-page components. This is the biggest win and changes layout only.
2. **Orders workspace** (implemented November 8, 2026): three-pane layout, checks rail, builder popover, sticky export.
3. **Map** (implemented November 8, 2026): full-height map, overlay panels, global space inspector, quick find.
4. **Alliance polish** (first pass implemented November 8, 2026) (after Allied Reports and Analysis are finished): flatten into four pages, one shared turn control, guided empty states.
5. **Onboarding and phone** (implemented November 8, 2026): welcome flow, richer demo, bottom bar, copy diet.

Each phase ends with the existing tests, a typecheck, and a browser pass at desktop and phone widths.

## Open decisions

- Sidebar (recommended) or top tabs.
- Default landing page: Map (recommended) or Turn summary.
- Path routes now, or `?view=` first.
