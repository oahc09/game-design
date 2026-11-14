# Repair findings: gd-107

- The model supported numeric tube selection but not the public `{type:'pour',from,to}` alias, and the UI's keyboard/pointer actions were not logged through a shared native transition boundary. Numeric selection could clear its selected source before discovering a rejected pour.
- Added the public pour action and mutation-safe rejection path; both numeric keyboard selection and pointer selection now call the same game step and transition recorder. The acceptance pointer helper derives tube centers from rendered elements and the canvas design transform. Liquid rendering remains a direct projection of authoritative tube arrays.
- Assumptions: same-color maximal top-run pours; arrays are bottom-to-top; empty/full single-color tubes satisfy win; state transfers atomically and visuals never mutate model liquid. Source/usage budgets are unverified; no certification claim is made.
- Verification: `node --check` passed for both submission modules. Browser input-parity replay, pointer geometry and visual review remain pending supervisor capture.
- Follow-up: number-key tube selection and pointer selection both call the same native numeric selection action and are recorded as transitions.
- Follow-up: visible instructions and artifact controls now advertise numeric tube selection alongside pointer input.
- Follow-up guard: after terminal, all ordinary actions including otherwise legal pours reject without state/event changes; restart remains accepted and is handled first.
- Follow-up: numeric tube selection and explicit `from`/`to` require integer indices in `[0,tubes.length)`; invalid indices reject with empty events and unchanged state. Existing terminal guard, restart, and maximal-pour rules are unchanged.
