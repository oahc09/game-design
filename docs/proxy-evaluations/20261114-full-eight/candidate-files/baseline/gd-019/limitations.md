# gd-019 v3 status

- Snapshot exposes exactly one `preview` item containing the next shape matrix. It is derived from the same private deterministic spawn index used by the next native spawn and does not advance that index. No additional future piece data or bag/RNG state is exposed.
- The renderer shows one `Next` piece preview alongside the live board. Gameplay, sequence, gravity, lock, input, and fixed-clock behavior are unchanged.
- `node --check` passed for both submission modules. A local native sequence smoke verified count one, repeated snapshot stability, and equality between the preview and the piece spawned after a lock.
- Browser visual review, evaluator replay, FPS acceptance, and certification remain `NOT_RUN`.
