# M3 — Gameplay design quality framework

> Historical v0.1 stage report. Current curriculum status is superseded by [v3 calibration](curriculum-v3-calibration.md) and [v0.2 independent review](v0.2-independent-review.md): all ten final target bands and adjusted intervals passed for the frozen synthetic profile. The v1 three held-out misses and v2 finite-pool infeasibility remain historical evidence. Human learning/difficulty and generalization to unseen layouts remain unverified. See [current execution status](remaining-work-execution.zh-CN.md).

## Status

**Metric, tuning, and curriculum infrastructure is executable. Gameplay-quality certification and human calibration remain unverified.** No single fun score is defined.

## Completed

### Evidence-bearing quality vector

`qualityVector` emits eight distinct dimensions: Validity, Solvability, Difficulty, SkillDiscrimination, DecisionQuality, Interaction, Diversity, Robustness. Each contains applicability, its metric set, evidence, and confidence. Missing solver results, multiple contents, action-value estimates, or seeds stay N/A. They do not become invented zeros or successes.

### Difficulty and profile comparisons

- Actual episode outcomes, step/score distributions, structural context, sample counts, censoring, and within-profile Wilson intervals
- Explicit intro/easy/medium/hard/expert bands defined by competent-policy completion ranges
- Bot-performance labeling and human calibration marked NOT_VERIFIED
- Weak/competent/strong completion, score, and survival-step gaps
- Equal random/strong completion rates produce LOW_SKILL_EXPRESSION_OBSERVED, with a caveat about other metrics and small samples
- Correlated cross-profile/repeated-seed pooled confidence intervals are not emitted

### Decision and interaction measurements

Observed legal-choice counts, forced-move ratio, decision density, action-frequency entropy, dominant-action ratio, and gameplay-event counts are measured from actual episodes. Best-versus-median value spread is available only when real action-value evaluations are supplied. Frequent action use is explicitly not proof of a dominant strategy.

### Diversity and controllability

Structural features include dimensions, occupancy, symbol entropy, neighbor relationships, symmetry, counts, targets, and move limits. Layout distance compares actual spatial symbols. Mechanic-set distance uses declared mechanic sets. Optional solution/state/policy feature evidence is separate and remains N/A when absent. ID/hash differences alone do not count as diversity. Changing only a content ID is tested as a feature duplicate.

`controllability` preserves requested ranges, actual values, out-of-band error, and missing-evidence status. The generator uses it to reject unverified or out-of-range candidates.

### Seeded balance optimization

`balance.mjs` implements bounded grid search and seeded random search over declared numeric parameters, evaluated on explicit common seed and player-profile sets. Results contain:

- Recommended parameters and full materialized spec
- All evaluated and invalid candidates, measured metrics, target errors, and episode IDs/final hashes
- Pareto candidates across target-error dimensions and explicit trade-offs
- Matched-background finite-difference sensitivity, sampled dead/oversensitive/cliff findings, and two-parameter endpoint interaction effects
- An exploratory or sampled confidence label, never human-quality certification

Bayesian and evolutionary optimizers are explicitly unsupported. Target-error sum only breaks Pareto ties for the user's declared objectives; it is not a fun score.

### Dependency-aware curriculum

`campaign.mjs` implements a mechanic dependency graph and validates all eight stages: Introduce, Practice, Combine, Twist, Pressure, Mastery, Rest, Final Exam.

The generator selects supplied, measured content. It never fabricates missing content or evaluations. Dependencies must precede introduction, practice must precede advanced use, Combine requires multiple mechanics, mastery/final assessments must cover their mechanics, the final exam must cover the campaign, and Rest must reduce measured challenge relative to the preceding unit. Difficulty evidence requires a competent-policy completion rate, seed set, and player-profile version.

Twist requires a named content field that actually changes from the previous unit. Pressure requires a named structural metric to actually change in the specified direction. Merely adding a stage label or prose description cannot pass these checks.

For multiple mechanics, a dependency-safe sequence needs separate Introduce/Practice units before the other six stages. Two mechanics therefore normally need at least ten content units, while still using exactly the eight stage types. Requested shorter sequences fail explicitly.

Validation reports mechanic coverage/repetition, introduction spacing, measured difficulty changes/spikes, content similarity, mastery coverage, and rest spacing. Exposed mechanics and objectives are still author declarations; runtime telemetry is not used to infer human mastery.

## Executed evidence

Focused tests: `node --test tests/framework.test.mjs`.

The machine-readable smoke artifact is `reports/framework-evidence.json`; accept its measurements only when `pass` and `provenance.source_unchanged` are true. A final rerun is required after concurrent source edits finish. The last stable snapshot produced the outcomes below. For five seeds per profile and a 60-action horizon, measured completion rates were:

| Archetype | Random | Greedy | Competent | Strong |
|---|---:|---:|---:|---:|
| Sokoban | 0/5 | 0/5 | 5/5 | 5/5 |
| Falling Blocks | 0/5 | 0/5 | 0/5 | 0/5 |
| Arcade Shooter | 0/5 | 0/5 | 0/5 | 0/5 |
| Match-3 | 5/5 | 5/5 | 5/5 | 5/5 |
| 2048 | 0/5 | 0/5 | 0/5 | 0/5 |
| Block Puzzle | 3/5 | 5/5 | 5/5 | 5/5 |

This deliberately exposes limits. A short fixed horizon censors many unfinished games; the all-zero realtime/2048 completion rows do not establish extreme human difficulty. Match-3 ceiling performance cannot establish strategic richness. Score distributions and censoring counts are retained, and ties receive low-observed-skill flags rather than an unsupported positive conclusion. Five trials produce wide intervals.

The focused tests independently check numeric target misses, absent metrics, structural duplicates, profile ties, difficulty ordering from observed outcomes, actual grid/random tuning, matched interaction effects, dependency cycles, missing practice, unverifiable curriculum labels, missing evaluations, and blocked content selection.

The curriculum contract tests use explicitly constructed evaluation fixtures to isolate validator behavior. They are not a ten-level human study or an empirically tuned production campaign.

## Failed

No unresolved failures in the executed focused test suite. Gameplay-quality conclusions are deliberately withheld where evidence is insufficient.

## Not Verified

- Human difficulty/learning calibration or evidence that these reference games are enjoyable
- Strong statistical policy ordering across broad content families
- Long-horizon realtime and 2048 completion behavior in the short smoke sample
- Perceived visual novelty, strategic novelty, or exhaustive solution diversity
- A runtime-telemetry-derived mechanic mastery model
- A production campaign tuned and played end-to-end by humans
- Full advanced metric packs such as exact minimum pushes, forced-death horizons, safe-path reachability, or all weapon-dominance analyses; archetype reports define their own implemented subset

## Known limitations

- Structural features are deliberately simple and interpretable. They are not perceptual embeddings, and distinct designs can share a feature vector. Layout symbol differences also do not establish human novelty.
- Initial object-count semantics are archetype-specific: Sokoban boxes, initial shooter enemies, or occupied numeric board cells. Dynamic spawns are not counted as initial objects.
- Randomness controls need an implemented measurable metric. Arbitrary scalar randomness requests are rejected.
- Balance sensitivity comes from sampled matched parameter cells; missing cells are not imputed and large endpoint differences cannot be extrapolated safely.
- An apparent cliff/dead parameter is a finding on the sampled seed/profile interval, not universal causality.
- Campaign difficulty is an observed-policy completion index with explicit seed provenance. Declared stage objectives and mechanic exposure still require design review and human learning validation.

## API examples

```js
import { tuneBalance, generateCampaign, validateCampaign } from '../src/framework/index.mjs';

const tuning = await tuneBalance(spec, {
  algorithm: 'grid',
  parameters: { maxMoves: [20, 30, 40] },
  targets: { competent_completion_rate: { min: 0.45, max: 0.7 } },
  seeds: [7, 11, 23, 47, 83], profiles: ['random', 'competent', 'strong'],
  maxCandidates: 16, maxSteps: 200, workers: 3,
});

const campaign = generateCampaign({
  mechanics: ['single_box_planning', 'multi_box_ordering'],
  dependencies: { multi_box_ordering: ['single_box_planning'] },
  contents: measuredContentPool,
  targetLength: 10,
  learningAssumptions: ['A successfully practiced mechanic may be combined later; human verification pending.'],
});
const validation = validateCampaign(campaign);
```

Each pool unit contains `id`, `content`, `mechanics`, and `evaluation: { competent_completion_rate, seeds, profile_version }`. Twist units additionally use `twist: { field: 'extensions.sokoban.map' }`; Pressure uses a measurable constraint such as `pressure: { metric: 'move_limit', direction: 'lower' }`; Mastery/Final Exam use `assessment: { outcome: 'WIN', mechanics: [...] }`.

## Next gate

Independently review metric definitions, build a broad measured content corpus, evaluate longer horizons and additional seeds, collect human calibration, and run the curriculum against actual learning outcomes before claiming complete M3 gameplay-design intelligence or proceeding to effectiveness claims.


## Additional actual long-horizon and curriculum evidence

The earlier60-action table above is retained as a bounded smoke sample, not a broad difficulty conclusion. `docs/measured-curriculum.md` and `evidence/curriculum/` now provide180actual long-horizon episodes (six domains ×10seeds ×3profiles, zero censored),56content variants with1,120selection episodes, and200disjoint holdout episodes. Falling Blocks/Shooter competent+strong reach10/10wins in the longer runs;2048 retains0/10completion but strong score materially exceeds random.

The selected ten-unit/eight-stage curriculum passes its selection-seed targets and truthful mechanic/dependency checks. It fails three held-out target bands; those failures remain in the delivered artifacts, with no holdout retuning. Floating subtraction at0.1 was separately fixed using explicit1e-12 rate epsilon in campaign1.0.1; material misses remain. This is measured design evidence, not human learning calibration or production campaign certification.
