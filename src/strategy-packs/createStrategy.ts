import { DEFAULT_STRATEGY_CONFIG } from '../data/defaults'
import type { StrategyConfig } from '../types'
import type { StrategyConfigField, StrategySkill } from './types'

export function withStrategyConfig(
  overrides: Partial<StrategyConfig> = {},
): StrategyConfig {
  return { ...DEFAULT_STRATEGY_CONFIG, ...overrides }
}

export function defineStrategy(
  skill: Omit<StrategySkill, 'defaultConfig' | 'configFields'> & {
    defaultConfig?: Partial<StrategyConfig>
    configFields?: StrategyConfigField[]
  },
): StrategySkill {
  return {
    ...skill,
    defaultConfig: withStrategyConfig(skill.defaultConfig),
    configFields: skill.configFields ?? [],
  }
}
