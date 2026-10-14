import { classicStrategyPack } from './classic'
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
  loaded = true
}

// Auto-load built-ins when this module is imported.
loadBuiltInStrategyPacks()

export {
  classicStrategyPack,
  createDefaultStrategyConfigs,
  getStrategyPack,
  getStrategySkill,
  hasStrategySkill,
  listStrategyPacks,
  listStrategySkills,
  registerStrategyPack,
  toPredefinedStrategyDefinition,
}

export type {
  RegisteredStrategySkill,
  StrategyConfigField,
  StrategyPack,
  StrategySkill,
} from './types'
