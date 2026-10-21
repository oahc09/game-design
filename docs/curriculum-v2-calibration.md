# Curriculum v2: preregistered synthetic-profile calibration

## Recorded result: BLOCKED before final testing

All 56 contents were measured on 512 new training seeds, for **28,672 actual episodes**. The original target bands, unique-ID requirement and maximum +0.40 difficulty spike admit no complete campaign under these observed rates:

- Pressure has exactly one eligible two-box content: `double-reposition-moves-17`, difficulty 0.556640625.
- The maximum eligible single-box Rest difficulty is 0.21875, so Final Exam must be at most 0.61875 to satisfy the spike rule.
- That leaves the same single content as the only eligible Final Exam. It cannot be used twice.

This explicit contradiction is independent of beam width. It concerns the recorded estimates and fixed pool, not a theorem about unknown population probabilities. The frozen selection artifact contains an empty BLOCKED result. **No validation, final-test, new profile-control or new replay-witness episodes were run.** All three registered post-training seed sets remained unopened. The planned sections below describe the protocol, not results that occurred.

For the three original failed contents, new training difficulties were 0.2305 (Practice), 0.4297 (Twist) and 0.6797 (Mastery), versus old holdout 0.10, 0.20 and 0.40. Their 25 prespecified 20-trial cohorts missed the original bands 8, 7 and 5 times respectively. This illustrates model-seed variability, while the full-pool result exposes a separate content/sequence support gap. It does not retroactively repair v1.

The blocked package plus reusable example totals **5,212,088 bytes**. Seven focused tests pass. `blocked-diagnostics.mjs` is a disclosed post-run packaging/diagnosis script: it performs no simulation or selection and retains the hash-locked experiment unchanged. Its contradiction proof and cohort statistics recompute from actual retained rows.

To reproduce the blocked diagnosis after the registered run:

```sh
node evidence/curriculum-v2/blocked-diagnostics.mjs --out /tmp/curriculum-v2-reproduction
```

The next separately registered experiment may use this entire v2 training set as prior exploration; it must not describe those seeds as a fresh test.

## Purpose and scope

V1 remains unchanged. Its three independent-holdout difficulty misses are still failures of that experiment. Because those results were inspected while designing v2, **both v1 seed sets are now exploration only**, not a fresh test. V2 asks whether more actual runtime trials and uncertainty-aware content selection improve stability for the same explicitly synthetic player profile.

This is not human difficulty calibration, human learning measurement, a fit to human telemetry, or proof of enjoyment. The bot resets for every episode and never learns between campaign units.

## Protocol committed before simulation

`evidence/curriculum-v2/preregistration.json` commits the runner hash, executable source hashes, all v1 artifact hashes, complete disjoint seed lists, targets, configurations, budgets, selection rule, diagnostics and stopping rule before any v2 simulation.

- Same 56 candidate contents and eight authored Sokoban layouts as v1. No new levels or mechanic labels are tuned against outcomes.
- Same observation-only competent planner, depth 80 / budget 5,000, with a 0.25 chance per decision of replacing the action by a uniformly sampled currently legal action. Replacement can equal the intended action.
- 512 new training seeds for every candidate: 28,672 actual runtime episodes, including rejected contents.
- Exactly one training-selected 10-unit curriculum is frozen before validation.
- 256 separate validation trials per selected unit. Validation is diagnostic, with no retry or selection.
- 1,024 separate final-test trials per selected unit, opened only after the candidate freeze and validation. The same frozen candidate is tested once even if validation fails.
- 64 disjoint diagnostic seeds for each of eight fixed representative contents under random, noiseless competent, noiseless strong and noisy competent controls.
- At most 40 additional witness simulations; overall cap 44,000 calls. No external APIs or paid calls.
- Original difficulty targets `[0.10, 0.20, 0.20, 0.30, 0.35, 0.40, 0.55, 0.65, 0.30, 0.65]`, each ±0.10, remain unchanged. No fallback tolerance widening.

Seeds are deterministic SHA-256-derived 32-bit values with disjoint domain labels. The registration includes their values; no final outcomes exist until the frozen candidate is tested. This is a verifiable **procedural seal**, not an independent organization's cryptographic embargo. The ledger records registration, candidate freeze, validation completion and final-test opening in order. The runner refuses post-registration changes to itself or executable sources.

The same seed across candidates supplies common random numbers; it does not make comparisons independent across contents. Within-content sampling intervals assume the PRNG's separate trial streams are suitable model draws. None of these trials represents independent human participants.

## Bounded interval-margin selection

A tool-side selector leaves the core runtime, policies and campaign framework untouched. It uses a deterministic width-256 beam across the fixed ten-stage plan:

1. Introduce box-goal planning
2. Practice box-goal planning
3. Introduce multi-box goal tracking
4. Practice both
5. Combine
6. Twist
7. Pressure
8. Mastery
9. Rest
10. Final Exam

Ten units cover all eight stage types because two mechanics each require an introduction and practice. The hard constraints enforce original point-estimate difficulty bands, unique content IDs, prerequisite exposure, real map change at Twist, a genuinely lower move budget at Pressure, a maximum upward difficulty change of 0.40, and an easier one-box Rest.

The primary score minimizes shortfall from a 0.02 margin between the training 95% Wilson interval and the target edges. Secondary ranking minimizes distance to the original target center. A lexical content-ID path breaks ties. This prioritizes lower-uncertainty interior measurements while retaining unsupported uncertainty visibly. The 0.02 interval-margin goal is a scored preference, not an eligibility guarantee: if no supported interior candidate exists, the runner retains the best available point-valid choice and reports its interval crossing. It never substitutes confidence intervals for actual runtime rates. The bounded beam is not claimed to find a global optimum.

Mechanic names retain their narrow, checked meaning: every `box_goal_planning` level needs a push to a goal; `multi_box_goal_tracking` starts with two off-goal boxes. Winning strong-policy witnesses must push and switch boxes. The labels do not assert sophisticated box-order dependencies. Mastery and Final Exam are WIN-objective checks, not evidence that anyone learned a skill.

## How to interpret success and uncertainty

Three statuses are kept separate:

- Artifact integrity: hashes, seed splits, genuine outcomes, bounded episode counts and replay verification.
- Point-target success: the observed final difficulty `1 − wins / n` lies in the original band for each unit, and the unchanged campaign validator accepts the sequence.
- Uncertainty containment: every final unit's 99.5% Wilson interval lies inside its original band. The ten adjusted intervals are an approximate Bonferroni family-wise 95% diagnostic. Wilson coverage is approximate, and the diagnostic is conditional on the synthetic trial model.

A point-target pass alone is insufficient to claim all underlying model probabilities are safely inside the bands. Training intervals are selection-affected; final intervals are calculated only after freezing the candidate. All validation failures, final failures and interval crossings remain in the report.

## Practical diagnosis of the old misses and profile controls

At 20 trials, a single win changes measured difficulty by 0.05. Near 50% completion, a 95% Wilson interval spans roughly 0.30–0.70: wider than a ±0.10 target. Choosing one content among 56 on the same small sample makes the selected estimate particularly sensitive to seed noise. A selection/holdout shift cannot by itself separate chance variation from selection bias.

V2 therefore reports every original selected content on the new 512-trial training set, plus 25 prespecified disjoint cohorts of 20 trials from that set. Each cohort's target pass/fail is retained, as are the original three failures. These are descriptive diagnostics, not 25 new campaign-selection attempts.

The fixed controls make the mechanism visible:

- Random policy samples legal actions and can floor on tight, multi-box puzzles. A 0/64 win count is not proof of zero true success probability.
- Noiseless competent and strong use the planner on small layouts; saturation at 64/64 does not imply calibrated human ease or distinguish those skill labels. A 64/64 win count still has an interval below one.
- Noisy competent adds a specified execution-error stream to the planner. Graded outcomes reflect that arbitrary parameter, legal branching, recovery opportunities, deadlocks and actual move budgets. More steps can create more replacement opportunities.
- Profile IDs change private RNG stream derivation. Equal public seeds do not imply identical random action draws across different profile IDs. Identical competent/strong outcomes in these deterministic maps are a strategy ceiling, not statistical independence or human skill evidence.
- Integer move budgets can create outcome plateaus: an extra move need not permit another recoverable detour. This can leave no candidate near a target center even after sampling uncertainty shrinks.

## Reproduce and verify

From the project root:

```sh
node --test tests/curriculum-v2.test.mjs
```

To run a separate complete reproduction without overwriting published evidence:

```sh
node tools/calibrate-curriculum-v2.mjs --register --out /tmp/curriculum-v2-reproduction
node tools/calibrate-curriculum-v2.mjs --run --out /tmp/curriculum-v2-reproduction
```

Registration precedes the first simulation. A complete run refuses overwrite. Completed deterministic checkpoints can be reused after interruption and are checked against specs, profiles and seed lists. However, checkpoint writes and call-counter updates are not crash-transactional: a hard kill during a candidate, or between its file write and ledger event, can lose accounting for calls already executed. The published uninterrupted run has exact accounting; do not claim an interrupted/resumed run enforces an exact lifetime call cap. Retain such an interrupted attempt as a failed operational attempt and account for it separately. No new configuration or seed search is permitted. Registration/source timestamps and hashes will differ across separate reproductions where applicable; numerical episode outcomes remain reproducible with the same executable dependencies.

Evidence stores compressed per-seed tuples (seed, episode identity, terminal result and reason, steps, replacement draws, pushes, box switches, final-state hash and private player seed). Summaries recompute from those outcomes. The public example is consumed by `selectRobustCampaign`, not the older nearest-point `generateCampaign`; its input explicitly names the selector and contains every measured candidate.

The focused tests verify the original data remain untouched, every artifact digest, source/runner identity, chronological sealing, all 56 candidate summaries, independent splits, exact frozen-candidate regeneration, original target bands, stage and mechanic constraints, raw validation/final results, all stored replays, and fresh deterministic reruns of representative episodes. A passing test suite certifies those checks, not human calibration.

## Evidence navigation

- `preregistration.json`: immutable pre-simulation plan and hashes
- `run-ledger.json`: ordered events, the one attempt and actual simulation count
- `train/`, `validation/`, `final-test/`, `controls/`: all compact per-seed records, including unselected/failed outcomes
- `training-summary.json`: complete pool summary and bounded search audit
- `candidate-freeze.json`: selected campaign, exact input hash and candidate hash
- `blocked-report.json`: the recorded stop before any valid candidate or final test
- `postrun-diagnostics.json`: exact fixed-pool contradiction, old-failure cohort statistics and clearly labeled old reference controls
- `campaign-report.json`: would contain final results only if a valid candidate were selected; absent in this blocked run
- `replays.json.gz`: would contain selected witnesses after final testing; absent in this blocked run
- `source-provenance.json`: before/after executable and v1 hashes
- `manifest.json`: integrity and measured-result statuses separated, artifact byte totals
- `examples/measured-curriculum-v2-input.json`: full reusable training-derived selector input
