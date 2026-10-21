# M3 empirical corpus and measured curriculum

## Result and limits

This executable extension replaces synthetic curriculum rates with **1,120 actual Sokoban episodes across 56 candidate contents**, selects a dependency-safe ten-unit campaign using all eight stage types, and evaluates that fixed selection on **200 additional episodes with disjoint holdout seeds**. A separate six-archetype reference corpus contains **180 long-horizon episodes**.

**Selection-seed campaign: valid. Held-out difficulty targets: not met. Human learning, human difficulty, and enjoyment: not verified.** The held-out campaign is not retuned to make its failures disappear. A passing artifact-integrity manifest does not mean held-out or human-quality certification.

Reproduce from the project root:

```sh
node tools/measure-curriculum.mjs
node --test tests/curriculum-evidence.test.mjs
```

The first command takes approximately two minutes on the recorded environment, depending on other work. It has finite candidate, episode, horizon, trace, and solver budgets. It uses only local deterministic runtime APIs and writes no external accounts or services.

## Evidence files

- `examples/measured-curriculum-input.json`: a fully populated input accepted by `generateCampaign`; all evaluation rates point to measured episode IDs.
- `evidence/curriculum/long-horizon.json`: full materialized reference specs, resolved profiles, options, per-seed results, summaries, censoring, difficulty, and skill-discrimination flags.
- `evidence/curriculum/content-measurements.json`: all 56 candidate measurements, including per-seed outcomes, metrics, event counts, decision metrics, private player seeds, and final-state hashes.
- `evidence/curriculum/campaign-report.json`: generated campaign, exact validation, targets, actual control error, held-out validation, matched-layout ordering, duplicate detection, and explicit limitations.
- `evidence/curriculum/replays.json.gz`: all 18 reference-policy witnesses, winning strong-policy witnesses for every selected unit, selected winning/failing execution-noise witnesses, and eight construction certificates. Each stored witness is replay-verified before writing.
- `evidence/curriculum/source-provenance.json`: SHA-256 hashes of executable core, archetype, and framework sources **before and after** the run, runner hash, Node version, timestamps, and episode counts.
- `evidence/curriculum/manifest.json`: artifact hashes, byte counts, and precisely scoped integrity checks. Evidence plus generator input totals about **6.61 MB**, below 10 MiB.

The source fingerprint deliberately excludes documentation and the independent M7 benchmark implementation: changing those files cannot make an unchanged execution dependency set appear unstable. A core/archetype/framework change does invalidate the evidence and requires a new run. The tests verify current hashes, not just a historical `source_unchanged` assertion.

## 1. Long horizons resolve the old 60-action ambiguity

Ten fixed seeds per policy are used for each bundled reference example. Policies are the actual resolved `random`, `competent`, and `strong` configurations; each episode stores its policy and archetype version. These are three configuration labels, not a promise of three distinct effective strategies. The realtime archetypes share their advanced policy path between competent and strong; their identical outcomes are reported plainly.

| Reference archetype | Action horizon | Random wins | Competent wins | Strong wins | Censored |
|---|---:|---:|---:|---:|---:|
| Sokoban | 500 | 0/10 | 10/10 | 10/10 | 0/30 |
| Falling Blocks | 6,000 | 0/10 | 10/10 | 10/10 | 0/30 |
| Arcade Shooter | 7,200 | 1/10 | 10/10 | 10/10 | 0/30 |
| Match-3 | 500 | 10/10 | 10/10 | 10/10 | 0/30 |
| 2048 | 1,500 | 0/10 | 0/10 | 0/10 | 0/30 |
| Block Puzzle | 300 | 5/10 | 10/10 | 10/10 | 0/30 |

“Horizon” is the action-loop cap, not an invented game duration. Games stop on a real terminal outcome, including their configured lifetime limit. For example, 2048 retains its authored 1,000-move limit. No episode in this sample reaches the external cap unfinished.

This is meaningful additional evidence: realtime competent/strong failures in the prior 60-action smoke test were horizon-limited rather than terminal losses. On this larger-horizon sample, Falling Blocks competent/strong win in a mean 165.1 actions, and Shooter in 118 actions.

2048 completion remains tied at zero, but these are terminal losses, not horizon-censored outcomes. Mean scores are 1,024.4 / 7,117.2 / 11,338.8 for random / competent / strong, and mean maximum tiles are 96 / 537.6 / 793.6. This supports an observed score/survival difference without inventing a completion advantage. Both 2048 and Match-3 retain `LOW_SKILL_EXPRESSION_OBSERVED` on completion. Match-3's ceiling and ten seeds do not establish strategic richness.

This corpus covers six reference examples, not six broad generated content distributions. Different configured lifetimes and episode lengths prevent treating raw cross-archetype scores or survival as a universal quality scale. Within-profile Wilson intervals are included; no pooled cross-policy independence is assumed.

## 2. Real content pool and explicit model assumptions

The pool comprises eight authored Sokoban layouts, each evaluated at seven actual move limits, for 56 valid contents:

- Three one-box layouts: adjacent goal, approach from another row, and a longer push.
- Five two-box layouts: separated goals, repositioning around boxes, offset/open approaches, and different push directions.
- Each family has a replayed solver witness. Move limits are the solver's minimum move cost plus `[0, 1, 2, 3, 5, 8, 12]`.
- Twenty fixed selection seeds are evaluated for **every candidate**, including candidates that are never selected. No rejected or inconvenient rates are omitted.

The custom profile is **`competent-execution-error-025-v1`**: the existing observation-only competent Sokoban planner, with its resolved 80-depth / 5,000-node budget, plus an explicit 0.25 probability of replacing each chosen action with a uniformly sampled currently legal action. A replacement can equal the intended action. The runtime and policy are unmodified. Counts of replacement draws are captured from real decision diagnostics.

This probability is an arbitrary, documented test-persona assumption chosen to create controlled execution variability. It is **not measured human error**, and it does not model learning, fatigue, risk preference, or player improvement. Noiseless competent/strong planning solves these small layouts; graded completion here measures robustness to the declared execution-noise model and move constraints.

Sokoban contains no stochastic game-state generation in these authored maps. Different episode seeds drive different private player execution-error streams. Thus these are independent model trials under an assumed RNG, not different human participants or a human difficulty study.

### Truthful mechanic names

`box_goal_planning` means planning legal movement and pushes to place a box on a goal. Every one-box introduction requires pushing; none is mislabeled as a “movement-only” lesson.

`multi_box_goal_tracking` means completing at least two initially unplaced boxes while retaining the first mechanic. Every such content starts with exactly two `$` cells and two goals, with neither box already solved. Winning replay witnesses push both boxes and switch between boxes at least once. The name does not claim the layouts enforce sophisticated box-order dependencies.

The declared teaching dependency is:

```text
box_goal_planning → multi_box_goal_tracking
```

A human curriculum designer may reject or refine this dependency; it is exposed as an author assumption. The bot is reset for every episode and never learns from the prior level.

## 3. Measured campaign selection

The requested difficulty curve is `[0.10, 0.20, 0.20, 0.30, 0.35, 0.40, 0.55, 0.65, 0.30, 0.65]`, with a per-stage tolerance of ±0.10. Difficulty is exactly `1 − observed competent completion rate`, with the declared custom profile version and seed set. It is not derived from the stage number.

The existing generator selects this sequence without a fallback or altered measurements:

| Unit | Stage | Selected content | Selection wins | Observed difficulty |
|---:|---|---|---:|---:|
| 1 | Introduce | single-adjacent-moves-01 | 18/20 | 0.10 |
| 2 | Practice | single-approach-moves-05 | 15/20 | 0.25 |
| 3 | Introduce | double-reposition-moves-24 | 16/20 | 0.20 |
| 4 | Practice | double-open-approach-moves-11 | 14/20 | 0.30 |
| 5 | Combine | double-reposition-moves-20 | 12/20 | 0.40 |
| 6 | Twist | double-separated-moves-09 | 12/20 | 0.40 |
| 7 | Pressure | double-mixed-directions-moves-05 | 8/20 | 0.60 |
| 8 | Mastery | double-separated-moves-08 | 7/20 | 0.65 |
| 9 | Rest | single-approach-moves-03 | 14/20 | 0.30 |
| 10 | Final Exam | double-offset-approach-moves-07 | 6/20 | 0.70 |

Two mechanic introductions and two practice units are necessary, so **ten units implement eight stage types**. The second mechanic appears only after the prerequisite introduction/practice. Combine includes both. Twist changes the actual map. Pressure lowers the actual move limit from 9 to 5; that transition also changes layout, so it is not an isolated causal estimate of a timer knob. Mastery and Final Exam have real WIN witnesses that complete both initially unplaced boxes. Rest drops observed challenge from 0.65 to 0.30.

The sequence has full declared mechanic coverage, an introduction spacing of two units, a maximum upward difficulty change of 0.40, and mean absolute adjacent change of about 0.156. There is only one Rest, so **rest-spacing distribution is N/A**, not a fabricated zero-spacing success. The validator's `mastery_validation = 1` means declared assessment coverage; it does not certify human mastery.

## 4. Independent holdout: three target failures remain

The selected sequence is then evaluated on 20 disjoint seeds per unit, with no selection changes. The held-out difficulty curve is:

```text
0.15, 0.10, 0.20, 0.10, 0.25, 0.20, 0.55, 0.40, 0.30, 0.55
```

Three substantive target-band misses remain:

- Unit 4, Practice: 0.10 observed versus target minimum 0.20.
- Unit 6, Twist: 0.20 observed versus target minimum 0.30.
- Unit 8, Mastery: 0.40 observed versus target minimum 0.55.

The campaign is therefore **selection-valid but holdout-invalid**. Twenty-seed estimates are noisy and selecting among 56 candidates creates optimism. The holdout is reported as evidence against claiming stable calibration; it is not used to retune.

The original exact floating-point comparison also marked Unit 2's `1 − 0.9 = 0.09999999999999998` as below 0.1 by approximately `2.8e−17`. The framework comparison now uses an explicit numeric epsilon, and the regression test ensures this boundary does not obscure the three real failures. Raw computed numbers and separate band-error diagnostics remain in the report.

## 5. Difficulty ordering, control, diversity, and failure diagnostics

For each fixed layout, the report lists all seven move budgets and all paired-seed outcomes. Observed completion is nondecreasing across the sampled move limits for all eight families; this is a measured sampled property, not a universal causal or human claim. The pool spans rates from 0.10 to 1.00 and has substantially more than five distinct observed rates.

Every selected unit retains the requested target, actual difficulty, and numeric error. An additional deliberately unavailable request, an introductory difficulty of `0.99 ± 0.001`, returns `BLOCKED` with `NO_ELIGIBLE_MEASURED_CONTENT`. Missing target support is not filled with invented outcomes.

Diversity uses actual layout symbols, structural features, and declared mechanic sets. The 56 candidates have zero exact feature duplicates, but only eight authored layout families; the other variants change their true move limit. Mean pairwise structural distance is about 0.116 and mean layout-symbol distance about 0.375. Those are interpretable feature distances, not visual novelty, strategic novelty, or fun scores. Reusing a family at a different budget is disclosed rather than counted as a new visual layout.

## 6. Verification and what remains open

The focused suite checks:

1. Current executable source hashes, before/after stability, runner identity, artifact digests, and size.
2. All six archetypes, ten seeds per profile, explicit horizons, raw censoring, and completion-tie flags.
3. Every pool rate against actual per-seed outcomes, full profile versions, and initial box/mechanic correspondence.
4. Exact campaign regeneration, eight stage types, real Twist/Pressure changes, dependency order, easier Rest, and blocked unsupported targets.
5. Disjoint holdout seeds, no retuning, and preservation of the three substantive target misses.
6. Every stored replay witness against action acceptance, ordered events, every step hash, and terminal state.
7. Fresh reruns of six reference-policy episodes plus selected candidate and held-out episodes, comparing episode identities, outcomes, metrics, events, and final hashes.

Still unverified: human difficulty and learning, robust holdout calibration, broader content populations, proof of enjoyment, strategic richness at ceiling/floor completion, and telemetry-inferred human mastery. This work closes the missing **real measurement and reproducible curriculum artifact** gap; it does not erase those remaining M3 limitations.
