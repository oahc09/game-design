# Public submission and observation contract

This document is identical in both experimental arms. It describes evaluation I/O only, not gameplay algorithms, reference answers or hidden fixtures. Honor each task's requested scope; an ideas-only task does not require a runtime.

Submit the task's public artifact.json/evidence.json/limitations.md. A gameplay artifact may be engine-native code plus its entrypoint/file digest. A treatment-internal GameSpec is not mandatory for an engine-native baseline. State assumptions and unavailable evidence rather than invent passing flags.

For tasks explicitly requiring instrumented runtime or engine parity, provide a thin adapter around the candidate engine:

```
createGame({content, seed}) => {
  snapshot(): JSONState,
  step({action, tick}): {accepted: boolean, events: JSONEvent[], terminal},
  reset?({content, seed}),
  restore?(JSONState)
}
```

The supervisor supplies the task-public content/action format and may normalize engine-native coordinate/state fields. Snapshot must expose authoritative gameplay state, a nonnegative integer tick and terminal outcome. Rejected actions leave state unchanged. Fixed-step tasks use simulation ticks independently of rendering. No private reference-runtime object is passed to candidate code.

Events and state are observed by an independent process, not accepted as model-authored PASS assertions. For a rule change, independently authored task-frozen assertions define allowed changes. Do not require the same RNG stream or hidden rule detail unless it is specified in the public task; underdefined rules need assumption review. A correct engine-native output must not fail solely for omitting a treatment-private schema.

For quantitative tasks, evaluation freezes seeds, player policy identities, stopping budgets, target ranges and all-attempt denominators. Include failed attempts and uncertainty. Human readability, fairness, novelty, and willingness to continue require actual blind observations; numeric output cannot self-award those criteria.

The supplied native-output normalization implementation belongs to the evaluator, outside both model sandboxes. Its existence does not certify OS isolation, untrusted-code safety, or complete semantic equivalence; those boundaries must be audited before formal runs.
