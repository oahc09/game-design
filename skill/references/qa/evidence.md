# QA and completion evidence

Every material defect should have spec/rules version, seed, exact ticked actions, expected and actual behavior, relevant before/after state or hashes, events, and a reproduction command. Reduce traces while preserving the same failure predicate, then rerun the reduced case.

Distinguish gameplay/rule defects, generator failures, solver errors, observation leakage, metric errors, and engine divergence. Broken benchmark fixtures or unavailable base infrastructure are infrastructure failures; generated code failing to compile, crashing runtimes, incorrect rules, or wrong routing remain system failures.

Re-run old golden replays and metric baselines after changes. Do not accept changed expected hashes without explicit rules-version intent. A screenshot cannot override a divergent authoritative replay. Report PASS, FAIL, NOT_RUN, or NOT_APPLICABLE per gate, with limitations. Toolkit routing tests do not prove LLM effectiveness. Human ratings must come from real participants, never simulated stand-ins.
