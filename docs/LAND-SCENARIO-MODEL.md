# Land scenario estimates

Milestone 2 models one isolated standard-rules land engagement. Attack and defense are two planning perspectives on the same calculation: select a target, specify both sides, compare alternatives, and inspect the stages. Results are estimates, not victory probabilities or a guarantee of holding the country.

The rules reference is the supplied `G:/Personal/wwbp/battleplan_rules.pdf`, sections 1B, 4C–4G, 5F.4, 9, and 12. Model version: `land-estimate-1`.

## Inputs and intelligence

Scenarios use the same combined intelligence reconciler as the intelligence browser. Countries count once by location, fleets once by location/player. Current reports only supply allocatable forces; earlier observations cannot silently fill gaps, and future reports are excluded. Each selected location exposes its original source records. Conflicts require a complete source choice. Those choices are saved with the scenario, independently of temporary choices in the intelligence browser.

Commitments have a source, player, role, and whole-unit quantity. Conquer and bombard allocations share one army budget; suppression and unbuilt fractions are excluded. Target-local forces are included only in the target defense, not as incoming support. Hypothetical forces and target overrides are labeled assumptions and still obey source terrain, range, minor, and side restrictions. A reported resource cannot also be entered as a hypothetical copy from the same source/player.

The target's army, active air, coastal navy, and ABMs describe its pre-combat defense after movement, building, and recovery but before selected supporting forces arrive. Blank fields use current resolved intelligence. Unknown relevant fields require explicit assumptions. Unknown historical ownership also requires an ownership assumption. Suppressed target air requires an explicit active-air override that accounts for recovery under 5F.4. No actual or standing ORDERS are executed here; the user must confirm that these pre-combat values include their effects.

## Processing stages

| Stage | Rule | Implemented behavior |
| --- | --- | --- |
| Assemble defense | 9.1–3b | Add selected supporting army, air and navy once to the supplied local defense. |
| Missiles | 4F–4G, 9.3c–d | One ABM intercepts one missile. Each remaining army-targeted missile destroys up to ten defending armies. All launched missiles are expended. |
| Air combat | 9.3e | Approximate combined air losses are half the smaller initial air pool, divided equally between sides in this model. |
| Excess air | 9.3f | Initial attacking air exceeding defending air attacks army. Excess defending air attacks attacking army, then navy, then air. The central estimate uses 0.5 hits per excess air unit. |
| Naval exchange | 9.3g | Attacking and defending navy simultaneously cause approximately 0.5 hits per unit, after air effects. |
| Coastal fire | 4D.4, 9.3h | Remaining defending navy causes approximately 0.5 hits per unit against armies arriving from sea. Land approaches are unaffected. |
| Army combat | 4C.6 | The smaller army is eliminated. The larger loses smaller² ÷ larger. Equal forces favor the defender with zero or one army remaining; the displayed midpoint is 0.5. |
| Capture | 4C.1, 9.3k | Capture requires all defending armies eliminated and at least one eligible conquering army surviving. Bombard, air, missiles and navy alone cannot capture. |

Fractional outputs represent expected losses, not fractional orders. Individual commitment losses are distributed proportionally for display, whereas actual group losses are randomized. The capture stage therefore also reports a conservative allocation range for conquering survivors at the estimated total army losses. If that range straddles one surviving conqueror, capture is uncertain. Multiple conquering players do not establish which player gets the country.

For sensitivity, the same estimate is repeated with approximate air/naval hit rates of 0.25, 0.5, and 0.75. The endpoints are illustrative assumptions, not calibrated confidence limits or best/worst bounds. Army-loss and missile formulas do not change across those cases.

## Worked checks

- With no air, missiles, or coastal effects, 20 conquering armies against 10 defenders lose 10² ÷ 20 = 5 armies and leave 15 conquering armies.
- Ten attackers against 20 defenders are eliminated; 15 defenders remain. A 10-against-10 tie does not capture.
- Two army-targeted missiles against one ABM and 15 defending armies leave five defending armies. Ten attacking armies then lose 5² ÷ 10 = 2.5, leaving an estimated 7.5.
- Ten attacking air against four defending air lose approximately one air each. Six excess attacking air cause approximately three defending army losses.
- A sea landing with 20 armies and ten attacking navy against ten defending navy and ten armies first leaves five navy on each side. Coastal fire reduces the landing to 17.5 armies, then the army formula applies. Those coastal losses do not apply to a land approach.
- One conquering army plus 19 bombarding armies defeats ten defenders, but random allocation can remove the only conqueror. The result is capture uncertainty, not an unconditional conquest.

These examples and source/persistence boundaries are covered by `tests/battle-scenarios.test.ts`.

## Boundaries

This model does not handle crossing attacks, hostile attackers fighting one another, diplomatic combat disadvantages, conditional canal routes, air attacks on navy, air or missile attacks on industry/air bases, sea combat, returning forces, evacuation, or counterattacks. Known hostile co-attackers and known ally-related defensive disadvantages block calculation. Other connected interactions must be excluded explicitly by the isolated-engagement assumption; leave it unchecked when they affect the scenario. Sea-source survivors shown here stop at the end of land combat.

The model checks occupation separately from minor control: a player cannot attack their own occupied country, but can attack a controlled minor under 12A, with a popularity warning. Minor armies can bombard or support but cannot conquer. Opposing attack/support commitments from the same player are rejected for this bounded model.

## Saving and revision changes

Saved campaign scenarios contain inputs, source choices, excluded reporters, assumptions, notes, the model version, and a SHA-256 fingerprint of eligible original report revisions. Results are derived. Importing, replacing, or removing eligible intelligence invalidates the estimate until the user chooses **Use current intelligence**, resolves sources again, and reviews assumptions. Later-turn reports do not invalidate an earlier scenario. Source deletion preserves the plan for review rather than deleting it silently.

Scenarios survive browser/cloud decoding, campaign backup export, and browser-to-cloud transfer. Transfers reject conflicting scenario IDs rather than overwriting. Existing account isolation, workspace revision checks, and cloud size limits apply. No database migration or account-to-account sharing was added.
