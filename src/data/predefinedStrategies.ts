/**
 * Compatibility facade over strategy packs.
 * Prefer importing from `../strategy-packs` for new code.
 */
import {
  createDefaultStrategyConfigs,
  getStrategySkill,
  listStrategySkills,
  toPredefinedStrategyDefinition,
} from '../strategy-packs'
import type { PredefinedStrategyDefinition, StrategyConfig } from '../types'

export const PREDEFINED_STRATEGIES: PredefinedStrategyDefinition[] =
  listStrategySkills().map(toPredefinedStrategyDefinition)

export function getPredefinedStrategy(id: string) {
  const skill = getStrategySkill(id)
  return skill ? toPredefinedStrategyDefinition(skill) : undefined
}

export function createDefaultPredefinedConfigs(): Record<string, StrategyConfig> {
  return createDefaultStrategyConfigs()
}
