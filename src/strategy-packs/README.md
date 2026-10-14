# Strategy Packs

Modular strategy “skill packs” for Crash Auto Bet.

## Why

- Each strategy is a separate file
- Related strategies are grouped in a pack
- UI discovers packs through the registry — no card list hardcoding required
- Future engine hooks can attach to the same skill objects

## Add a strategy quickly

1. Add a file under `classic/strategies/` (or a new pack folder)
2. Export it with `defineStrategy(...)`
3. Include it in the pack’s `strategies` array
4. If it is a new pack, register it in `src/strategy-packs/index.ts`

See `.cursor/skills/add-strategy-pack/SKILL.md` for agent guidance.
