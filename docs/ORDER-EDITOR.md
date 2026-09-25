# Order editor and checker — first release

Each campaign has an Order editor view. Select the report to plan from; the draft targets the following turn. Paste the full order syntax or use Add a space order. The builder offers source, action, quantity, and a searchable target-code list. Historical order echoes are never copied automatically.

Save draft stores text against the campaign and base report turn through the existing private, revision-checked workspace save. Drafts are included in campaign backups and browser-to-cloud transfers. Conflicting transfers stop instead of overwriting. Save failures preserve the current editor text. Unsaved changes survive view switching; campaign/report changes, imports, management and sign-out are disabled until saved. A browser exit warning protects unsaved edits. Demo saves remain temporary.

## Checked rules

- Full player and space syntax from rule 8, plus standing slot syntax from rule 11.
- Known source and target codes; source present in the report's command table.
- Explicit combined resource use: whole usable army/navy/air/missiles/ABMs, industry, dollars, spies and counterspies. No credit for new construction, incoming moves, or training.
- Minor forces cannot transfer or conquer. Navy coast/land restrictions. Missiles and ABMs cannot move to sea. Missile attacks target land at global range.
- Surface, supplied explicit air, and canal connections. Unconfirmed surface canal permissions warn.
- Own occupied-country attacks, duplicate country orders, and common same-source/target attack/support or transfer conflicts.
- Gifts, controlled-minor popularity consequences, sea combat declarations, and persistent default proportions produce review warnings.

## Deliberate limits

This is an assistant to the official order-check service, not a replacement processor. Standing orders are syntax/range checked but their execution, priority, trimming and inherited orders are NOT simulated or counted in explicit budgets. Existing standing source records and defaults are shown for review. Default production, research outcomes, combat, incoming transfers, game-specific rules and alternate shorthand order syntax are not simulated. Standard WWBP is assumed; not the 1939 variant. Quantities use whole-number full syntax.

The editor reports errors and review warnings rather than certifying legality. Export is blocked on detected errors. The ORDERS/END block has one token per line, preserving context and the 76-character line limit. The UI shows the order count, excluding context markers. Players copy/download the block, add the required identity/security heading in their email, verify the turn number, and submit themselves. No orders or email are sent automatically.

## Validation

53 automated tests pass, including 11 new rule, export, draft round-trip, and transfer-conflict tests. Production build and TypeScript check pass. Fictional browser preview exercised a resource error, correction, draft save, and export preview; desktop and 390px phone layouts inspected. Live authenticated draft save still needs pilot confirmation.
