# Curriculum v3: bounded content repair and fresh test

## Recorded result: all final targets and sequence checks pass

The once-tested frozen candidate passes all four reported checks: training selection, final point bands, all ten adjusted interval containments, and the full unchanged curriculum validator. Validation also had zero point-target misses and passed the full validator, but its Combine 95% interval crossed the band; that uncertainty is retained. All final adjusted intervals passed. No selection changed after validation or final testing.

| Unit | Stage | Content | Final wins / 1,024 | Difficulty | Original band | Adjusted interval |
|---:|---|---|---:|---:|---|---|
| 1 | Introduce | `single-adjacent-moves-03` | 970 | 0.0527 | 0.00–0.20 | 0.0363–0.0760 |
| 2 | Practice | `single-approach-moves-05` | 882 | 0.1387 | 0.10–0.30 | 0.1111–0.1718 |
| 3 | Introduce | `double-offset-approach-moves-12` | 813 | 0.2061 | 0.10–0.30 | 0.1729–0.2437 |
| 4 | Practice | `v3-four-decision-turn-moves-06` | 736 | 0.2812 | 0.20–0.40 | 0.2436–0.3222 |
| 5 | Combine | `double-offset-approach-moves-09` | 646 | 0.3691 | 0.25–0.45 | 0.3280–0.4123 |
| 6 | Twist | `double-open-approach-moves-08` | 637 | 0.3779 | 0.30–0.50 | 0.3365–0.4212 |
| 7 | Pressure | `v3-four-decision-turn-moves-04` | 488 | 0.5234 | 0.45–0.65 | 0.4796–0.5669 |
| 8 | Mastery | `v3-five-decision-turn-moves-05` | 371 | 0.6377 | 0.55–0.75 | 0.5946–0.6787 |
| 9 | Rest | `v3-two-push-rest-moves-02` | 728 | 0.2891 | 0.20–0.40 | 0.2510–0.3303 |
| 10 | Final Exam | `v3-five-decision-turn-moves-06` | 371 | 0.6377 | 0.55–0.75 | 0.5946–0.6787 |

The maximum upward jump is **0.3486328125**, below 0.40. The smallest adjusted interval margin is about **0.0111**, at the first Practice unit. This remains finite-sample, approximate synthetic-model evidence rather than a universal guarantee.

The successful run used **30,238 simulation calls**: 14,848 training, 2,560 validation, 10,240 final test, 2,560 controls and 30 replay-witness reruns. All 30 selected WIN/LOSE/strong witnesses and ten construction certificates verify. No invalid or horizon-censored episodes occurred. The fixed run finished in about four minutes on the recorded environment.

The v3 artifact package plus reusable example totals **4,239,119 bytes** by the manifest accounting. V2 and v3 manifest-accounted packages together total **9,451,207 bytes**, retaining the unsuccessful attempt below 10 MB. Fifteen combined v2/v3 focused tests pass; including the unchanged v1 suite, all 22 curriculum tests pass. The actual two evidence trees including manifests and both external example inputs occupy **9,481,067 bytes**, also below 10 MB.

**Repeated-family limitation:** Mastery uses the new five-decision layout at five moves, and Final Exam uses that same layout at six moves. These are distinct real map/budget configurations, not ID-only duplicates, but they produced identical outcomes in every split. The paired outcomes match on all 1,792 training/validation/final seeds: every win finishes in five moves, while failed episodes end at the respective five- or six-move budget. The final stage is a repeated-family objective check; it does not test transfer to an unseen layout. Practice and Pressure also reuse the four-decision family at different actual budgets. No perceived novelty or human transfer claim is made.

### Measured diagnostic controls

Every representative is evaluated at its solver minimum +2 moves, which can differ from the selected campaign budget. The new Rest control below is therefore four moves, while the selected Rest is two moves. Do not substitute these control rates for campaign rates.

| Family | Random wins | Competent wins | Strong wins | Noisy competent wins |
|---|---:|---:|---:|---:|
| single-adjacent | 21/64 | 64/64 | 64/64 | 62/64 |
| single-approach | 7/64 | 64/64 | 64/64 | 53/64 |
| single-long-push | 2/64 | 64/64 | 64/64 | 55/64 |
| double-separated | 0/64 | 64/64 | 64/64 | 39/64 |
| double-offset-approach | 0/64 | 64/64 | 64/64 | 39/64 |
| double-open-approach | 0/64 | 64/64 | 64/64 | 39/64 |
| double-mixed-directions | 0/64 | 64/64 | 64/64 | 41/64 |
| v3-two-push-rest | 13/64 | 64/64 | 64/64 | 58/64 |
| v3-four-decision-turn | 0/64 | 64/64 | 64/64 | 47/64 |
| v3-five-decision-turn | 0/64 | 64/64 | 64/64 | 42/64 |

Both noiseless planners win 64/64 on all ten family representatives. Random wins 0/64 on all six two-box representatives. These floor/ceiling conditions provide little intermediate-band discrimination; the explicitly noisy profile supplies graded completion, with intervals that remain model-dependent. The last two stage rates being identical also illustrates why an extra integer move does not necessarily create a difficulty step.

## Why a third experiment

V1's three original holdout failures are preserved. V2 then measured all original 56 contents on 512 new training trials each, but could not select a complete campaign. Under those recorded rates, the only Pressure candidate was also the only Final Exam candidate compatible with any eligible Rest and the unchanged +0.40 spike limit. Uniqueness made that impossible. V2 stopped before opening validation, final-test or new diagnostic outcomes.

V3 is a separately preregistered content-pool repair. All v1 data and all v2 training results are prior exploration. V2's unopened seed sets are also excluded from every v3 split. V3 never repairs the v2 record or presents it as a successful calibration.

## Frozen design and budget

Registration SHA-256: `7d3ecd499bacde19d83310e91016e6bc81bff4854e9f7e4820cb92e0f0837a15`.

The registration pins the runner, executable runtime/framework sources, every v1 artifact, and the complete preserved v2 package. Maps, seeds, selection rules, count limits and stopping conditions were written before v3 simulation.

- Exactly **29 candidates**: 20 explicitly listed existing configurations selected using prior exploratory evidence, plus three new layouts at solver-minimum moves + `[0, 1, 2]`.
- **512 new training trials** for all 29 candidates: 14,848 episodes, including every rejected configuration.
- One training-only, width-256 interval-margin selector; one frozen ten-unit candidate.
- **256 disjoint validation trials per selected unit**; no retuning from validation.
- **1,024 disjoint final-test trials per selected unit**, opened once after freezing and validation.
- Ten fixed family representatives, four actual profiles each, and 64 additional diagnostic seeds: 2,560 control episodes.
- At most 40 witness simulations. Total cap **31,000**; one attempt, no additional layouts, seed searches, profile changes or tolerance fallback.

The original targets `[0.10, 0.20, 0.20, 0.30, 0.35, 0.40, 0.55, 0.65, 0.30, 0.65]`, ±0.10 bands, +0.40 spike rule and unique-content requirement are unchanged. The persona remains the original observation-only competent Sokoban planner, depth 80 / 5,000 nodes, plus arbitrary 0.25 per-decision legal-action replacement. Its parameters were not fitted to humans.

The three construction hypotheses are intentionally simple:

1. A two-push one-box layout at the upper wall, with several legal choices along the shortest route, may support the missing Rest range.
2. A four-decision approach followed by perpendicular pushes may support Pressure.
3. A five-decision variation may support a distinct two-box assessment.

These predictions did not supply any evaluation rates. Each map has a concrete A* winning witness and replay verification; all performance rates come from actual runtime trials. The new min-move hypotheses are checked against solver results. Map/budget pairs are unique independently of content IDs. Different move budgets can share a layout or observed rate; that is not claimed to create a new visual family.

## Selection and claims

The unchanged v2 selector ranks a 95% Wilson interval's margin from the original band boundaries first, then distance to the original target center, with a fixed lexical tie break. A 0.02 interior margin is a scored goal rather than an eligibility guarantee. Hard constraints still enforce point bands, real Twist and Pressure changes, dependencies, unique content, a genuinely easier one-box Rest and the +0.40 maximum rise. The bounded beam is not an exhaustive optimizer.

Reports distinguish four separate results:

1. Training-selection feasibility.
2. Final-test point-band compliance for all ten units.
3. Containment of all ten final 99.5% Wilson intervals in their original bands, an approximate Bonferroni-adjusted family-wise 95% diagnostic.
4. Full unchanged curriculum-validator status, including sequence constraints beyond bands.

A procedural seal records the candidate hash before validation and any final-test outcomes. The seeds themselves are committed and readable; this is not an external cryptographic embargo. All candidate rows, unsuccessful controls and intermediate outputs remain stored.

Common seeds correlate different contents; they do not require independence across units for a Bonferroni union bound. Within-content interval interpretation still assumes the separate PRNG trials are suitable model draws. Selection-affected training intervals are not post-selection coverage guarantees. Adjusted Wilson coverage is approximate.

## Practical profile diagnosis

The fixed control conditions are random, noiseless competent, noiseless strong and the original noisy competent. Controls are run on the same family representative and move budget, rather than comparing unrelated content. Equal public seed labels do not ensure equal action draws across profile IDs because the private RNG seed includes profile ID.

Random play can floor on tight multi-box tasks. Noiseless competent and strong can both saturate on small planner-solvable layouts. Those labels then do not define three distinct empirical difficulty levels. Intermediate noisy-competent rates describe robustness to the stated action-error model, legal branching, recoverable detours, deadlocks and move limits. A replacement may equal the intended action. With only 20 trials, rate quantization and broad intervals can easily obscure original target bands; larger samples reduce sampling uncertainty but cannot create missing content support.

The old three failures remain available in the v1 report and v2's complete independent-training/cohort diagnosis. V3's old-unit comparison includes only old units retained in the v3 pool and marks excluded units explicitly. It does not substitute different contents' rates into old records.

## Mechanic and learning limits

Ten units implement all eight stage types because the two mechanics each get Introduce and Practice. `box_goal_planning` requires an actual push toward a goal. `multi_box_goal_tracking` starts with two off-goal boxes; every selected strong WIN witness must switch between boxes. The names do not assert sophisticated ordering skills.

Twist changes the actual map. Pressure reduces the actual move budget, and may also change the map; this transition is not an isolated causal estimate of a timer parameter. Mastery and Final Exam check runtime WIN and declared coverage. The bot resets each episode and does not learn. No human difficulty, human mastery, enjoyment, perceived novelty or generalization to arbitrary layouts has been established.

## Reproduction

```sh
node --test tests/curriculum-v2.test.mjs tests/curriculum-v3.test.mjs
node tools/calibrate-curriculum-v3.mjs --register --out /tmp/curriculum-v3-reproduction
node tools/calibrate-curriculum-v3.mjs --run --out /tmp/curriculum-v3-reproduction
```

A new registration precedes simulation, uses the same deterministic seed plan and requires the pinned prior evidence. Completed experiments refuse overwrite. The inherited checkpoint mechanism is not crash-transactional for lifetime call accounting; exact episode-cap claims apply to this uninterrupted completed run. A hard interruption must be retained and separately accounted for, rather than silently treating re-executed calls as free.

The report, training input, candidate freeze, all compressed per-seed outcomes, profile-control results and selected verified replays are under `evidence/curriculum-v3/`. The reusable example is `examples/measured-curriculum-v3-input.json`, consumed by `selectRobustCampaign` in the v3 tool. The manifest separates integrity, final point validity and adjusted interval containment. Tests recompute actual outcomes, verify every artifact/source/prior-evidence hash, regenerate selection, verify all stored replays and independently rerun representative episodes.

## Independent read-only audit

A separate audit recomputed final rates and adjusted intervals, verified all 3,752 public and private competent seed identities across v1/v2/v3 partitions, checked freeze chronology and every pinned source/evidence hash, and checked all 30,208 measured rows. No blocking integrity issue was found. It performed no new simulations, selection or edits. The repeated-family assessment and validation-only interval caveats above remain material limitations.
