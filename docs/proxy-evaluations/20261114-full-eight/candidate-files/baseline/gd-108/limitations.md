# gd-108 v13 limitations and status

## Current model and visibility

The game has two alternating players (`player1` and `player2`), each with a private hand and separate deck. By default each deck is a copy of `cards`, shuffled independently from deterministic seeds `seed` and `seed+1`; an explicit `content.zones.deck` array supplies player1's exact order. The default opening hand size is 3 and starting mana is 3 for each player. Only the active player's hand is rendered or returned by the current-player helper. Public snapshots expose the active player's hand count and own public zones, never the opponent hand or future deck order.

Passing emits PASS, switches `active_player`, and restores the incoming player's mana to the existing value 3. It does not damage either player and does not draw. Each successful card play costs 1 and draws one card from that player's own deck when available. Scout, Guard and Bolt deal 2 damage; Strike deals 3; Mend heals 2 up to that player's configured maximum health. No effect values were changed. REVEAL is not emitted because there is no separate reveal action or event; which hand is visible follows `active_player`.

A terminal state is created when either health reaches 0 and includes `status` (`won` or `lost`), `reason` (`player_health_zero`), and `winner` (`player1` or `player2`).

## Evidence status

Local native smoke covered pass/switch, incoming mana reset, play/draw, opponent health change, and the current-player public observation boundary. `node --check` passed for both submission modules. Browser runtime, paired seed episodes, controller replay, metric validation and human comparison remain `NOT_RUN`. Human participants and ratings are 0; the blinded comparison plan is prepared only, not executed; recruitment is not planned. Agent validation is not human evidence. No game or extension success certification is claimed. Source/usage budgets and provider claims remain unverified.
