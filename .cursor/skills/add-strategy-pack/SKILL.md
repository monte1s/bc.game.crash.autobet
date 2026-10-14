---
name: add-strategy-pack
description: >-
  Add or extend Crash Auto Bet strategy packs under src/strategy-packs.
  Use when creating a new strategy, strategy pack, skill pack, or when the user
  asks to add Martingale-like systems without rewriting the Strategies UI.
---

# Add a Strategy Pack

Strategies live in isolated packs so they can be managed separately from UI code.

## Layout

```
src/strategy-packs/
  types.ts
  createStrategy.ts
  registry.ts
  index.ts                 # registers built-in packs
  classic/                 # example pack
    index.ts
    strategies/*.ts
  <your-pack>/
    index.ts
    strategies/<skill>.ts
```

## Add one strategy to an existing pack

1. Create `src/strategy-packs/<pack>/strategies/<name>.ts`
2. Use `defineStrategy({...})`
3. Export it from the pack's `index.ts` `strategies` array

```ts
import { defineStrategy } from '../../createStrategy'

export const labouchereStrategy = defineStrategy({
  id: 'labouchere',
  name: 'Labouchere',
  description: 'Cancel numbers from a betting sequence after wins.',
  accent: 'blue',
  icon: 'stairs',
  configFields: ['unitStep'],
  defaultConfig: {
    adjustmentMode: 'custom-progression',
    unitStep: 0.0001,
  },
})
```

## Add a new pack

1. Create `src/strategy-packs/<pack-id>/index.ts`
2. Export a `StrategyPack` object
3. Register it in `src/strategy-packs/index.ts` via `registerStrategyPack(...)`

```ts
import { registerStrategyPack } from './registry'
import { myPack } from './my-pack'

export function loadBuiltInStrategyPacks(): void {
  if (loaded) return
  registerStrategyPack(classicStrategyPack)
  registerStrategyPack(myPack)
  loaded = true
}
```

## Rules

- Keep strategy ids unique across all packs
- Put pack-specific config UI fields in `configFields`
- Do not hardcode strategy ids in React components
- Do not implement real betting logic unless the user asks
- UI reads packs from `listStrategyPacks()` / `listStrategySkills()`

## Verify

```bash
npm run build
npm run lint
```
