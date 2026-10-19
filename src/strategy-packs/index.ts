import { classicStrategyPack } from './classic'
import { signal13StrategyPack } from './signal13'
import {
  createDefaultStrategyConfigs,
  getStrategyPack,
  getStrategySkill,
  hasStrategySkill,
  listStrategyPacks,
  listStrategySkills,
  registerStrategyPack,
  toPredefinedStrategyDefinition,
} from './registry'

let loaded = false

/** Load built-in packs once. Call from app bootstrap or module import. */
export function loadBuiltInStrategyPacks(): void {
  if (loaded) return
  registerStrategyPack(classicStrategyPack)
  registerStrategyPack(signal13StrategyPack)
  loaded = true
}

// Auto-load built-ins when this module is imported.
loadBuiltInStrategyPacks()

export {
  classicStrategyPack,
  signal13StrategyPack,
  createDefaultStrategyConfigs,
  getStrategyPack,
  getStrategySkill,
  hasStrategySkill,
  listStrategyPacks,
  listStrategySkills,
  registerStrategyPack,
  toPredefinedStrategyDefinition,
}

export {
  SIGNAL13_TARGET,
  DEFAULT_SIGNAL13_CONFIG,
  createSignal13State,
  decide,
  onRoundResult,
  isSignalOn,
  countUnderInWindow,
  signal13ConfigFromStrategyConfig,
} from './signal13'

export type {
  CrashPoint,
  Decision,
  Signal13Config,
  Signal13Mode,
  StrategyState as Signal13StrategyState,
} from './signal13'

export type {
  RegisteredStrategySkill,
  StrategyConfigField,
  StrategyPack,
  StrategySkill,
} from './types'
