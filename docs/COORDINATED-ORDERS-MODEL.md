# Coordinated proposed ORDERS — model 1

Implemented October 10, 2026. Model identifier: `coordinated-orders-1`. Uses the existing `land-estimate-1` combat calculation described in [LAND-SCENARIO-MODEL.md](LAND-SCENARIO-MODEL.md).

## Inputs and separation

Analysis → Coordinated orders stores named plans for one game, base report turn, and intended next order turn. Each participating player has one proposed order block tied to that player's report turn. Original text, newlines, and checker line numbers remain available. Empty input is missing input; `ORDERS` followed by `END` explicitly proposes no new orders. Historical report echoes are never executed or copied automatically.

An explicit button can copy the campaign player's saved draft into an empty proposal, recording its timestamp. Later changes on either side do not synchronize. The ordinary order editor is never overwritten. Plans can be copied as alternatives, saved, discarded, and deleted. Independent dirty-state guards prevent campaign/report changes while either scenario or coordinated-plan edits are unsaved.

Expected contributions identify player, source, destination, role, and minimum quantity. They only check intentions against valid explicit orders; they do not allocate extra units. A wrong destination, defensive support in place of bombardment, insufficient quantity, invalid order, or absent player produces a coordination finding even if each player's other orders are legal.

Specified threats are explicitly hypothetical enemy commitments for testing home defense. A player cannot simultaneously supply proposed orders and hypothetical threats. Threats do not establish that an enemy actually issued an order or owns the assumed forces.

## Validation and phases

1. Check game/report identity, matching base turns, report revisions, and model version. Reuse the existing order checker for syntax, context, aggregate source-resource budgets, cash/spies, duplicate orders, incompatible orders, terrain, and range. Invalid player input blocks plan estimates rather than quietly omitting an illegal contribution. Repeated/conflicting player instructions also block estimation until resolved.
2. Reconcile combined intelligence by country and by sea/player contingent. An affected conflict requires a whole-source choice. Historical and unknown values do not become current zeroes. A source choice must still establish the submitting player's control.
3. Explicit movement departs first and arrives at the destination before combat (rule 9.1). Land gifts become part of the receiving garrison. Outgoing attack/support commitments also leave the local garrison. The outgoing-order budget uses the base report, so new builds or incoming units cannot be spent again.
4. Local explicit builds use Industry × reported multiplier / 100 (4B). Unused industry follows the report's default proportions, amended by explicit player default orders. Defaults omit explicitly built items, navy at noncoastal countries, and dollars in minors. Process I/A/N/F/M/X/D in order, rounding each share of the remaining industry and remaining proportion as specified by rule 10. Any residual industry uses the standard occupied-country dollar / minor army default. New industry does not build again in this cycle. Fractions carry into the garrison and are floored once to determine whole usable units.
5. Suppressed AirF recovers 25%, rounded up and capped at the suppressed amount, for local defense (5F.4). It cannot fund outgoing orders. Supported local defense is assembled before incoming combat support; support is added exactly once by the land model.
6. Group actual AC/AB/FA/NN/MA/AS/FS/NS commitments by land target, then apply the existing missile, air, naval/coastal, army, and initial capture calculation. Proposed ally/neutral/enemy declarations replace prior report relations for diplomatic checks. Randomized phases remain approximate; 25/50/75% hit-rate sensitivity cases are not probabilities or outcome bounds.

The parser represents a missing Defaults header as no configured defaults, using rule 4B's standard fallback. Unrecognized default text or a missing required multiplier leaves an affected automatic defense incomplete. A research order affecting a required build multiplier is not simulated.

## Unknown orders and unsupported interactions

If the defender has no proposed order set, require all four local defense values (Army/AirF/Navy/ABMs), an explanation of the assumed enemy behavior, and explicit acknowledgment. These values represent defense after assumed movement, builds and recovery, before the plan's support. Label the result conditional. A reported garrison is never silently treated as the next turn's defense. If the defender does have orders, calculate supported changes and ignore manual overrides, so an assumption cannot conceal a known unsupported command.

Every participant must review standing orders. Current location records are checked for active slots, and submitted cancellations can remove them. Active commands require the priority/trimming/legality resolver planned for broader operations; they block the source, their destination, and dependent engagements. The review checkbox cannot override a detected active standing order. Standing commands are not expanded into invented explicit quantities.

Unsupported roles (FN/FF/FI/MF/MI), sea combat, unverified conditional canal movement, suppressed-industry recovery, relevant research, and proposed propaganda affecting minor control are identified. Outgoing combat from an attacked home creates crossing/return/counterattack dependencies and blocks connected results. Relevant missing intelligence and known diplomatic penalties also block estimates. Omitted enemy support and declarations remain explicit isolated-engagement assumptions, even when a local defender's orders are supplied. Sea-source survivors are only estimated through the initial land engagement; their safe return is not predicted.

The existing land engine stops before sea combat, returns, counterattacks, and evacuation. Those phases remain milestone 4. A retained garrison with no specified incoming threat is not labeled safe.

## Traceability and alternatives

Findings distinguish order errors, coordination checks, incomplete results, combat estimates, and assumptions. Order links open the relevant player and line in the interpretation table. Battle details expose affected order lines, pre-combat changes, combat stages, sensitivity, surviving commitments, and source records. Remaining home defense is a separate collapsible section.

The quantity preview changes one combat token in a cloned plan and reruns all checks. It compares results without changing the proposal or saved plan. An oversized preview is blocked by the same shared source budget. Changes must be kept explicitly by editing a proposal or copying a saved plan.

## Persistence and limits

Optional `Campaign.turnPlans` is validated and reconstructed by workspace decoding, cloud validation, campaign backup export, and browser-to-cloud transfer. Merge conflicts preserve both workspaces. Inputs are persisted; estimates are derived. No database migration or new access grants are needed; existing private workspace RLS and revision protection remain in force.

SHA-256 fingerprints cover actual eligible source report revisions, including player, turn, filename, and normalized raw text. Replacement, removal, or an additional eligible report invalidates review. Future intelligence does not affect an earlier plan. Re-review clears source choices and standing/isolation acknowledgments while preserving proposed text and assumption values for inspection. Saved text itself records the proposed revision; derived results recalculate on edits.

Limits: 50 plans per campaign, 50 players per plan, 100,000 characters per order set, checker limit 2,000 tokens per player, 100 expected contributions and 100 specified threats per plan. The shared land engine allows 100 commitments per engagement. Existing cloud size limits still apply. Campaign JSON export includes plans; the application still has no campaign JSON restore UI.

## Worked checks

- P1 orders 20 conquering army and P2 orders 10 bombarders against 24 army, with no air or navy effects: 30 attack, 24² / 30 = 19.2 losses, 10.8 attacking army survive. Capture remains uncertain because all but 0.8 of the original conquering force could be among the randomized losses. The model does not equate surviving bombarders with capture.
- Change P2 to defensive support: both orders can be individually legal, yet the expected bombardment is missing and the defense rises to 34. The attack fails in the central calculation.
- A defender with 6 Industry and BA50/BN25/BF25 defaults builds 3 Army, 2 Navy, 1 AirF at 100% multipliers when coastal. An explicit BA1 removes army from default eligibility: the other 5 Industry build 3 Navy and 2 AirF.
- A country with 20 army sends 15 away and faces a specified attack of 12. Its pre-build garrison is 5; the defense estimate uses that reduced strength. Without a specified attack, the same garrison is reported as remaining defense, not proof of safety.
