import type {
  StrategyAccent,
  StrategyConfig,
  StrategyIconName,
} from '../types'

/** Extra config fields a strategy can expose in the settings UI. */
export type StrategyConfigField =
  | 'lossMultiplier'
  | 'winMultiplier'
  | 'unitStep'
  | 'adjustmentMultiplier'
  | 'adjustmentMode'

/**
 * One installable strategy skill.
 * Keep UI metadata and future engine hooks together so packs stay self-contained.
 */
export interface StrategySkill {
  id: string
  name: string
  description: string
  accent: StrategyAccent
  icon: StrategyIconName
  defaultConfig: StrategyConfig
  /** Strategy-specific fields shown in the configuration sheet. */
  configFields?: StrategyConfigField[]
  /**
   * Reserved for the future strategy engine.
   * Packs can implement this later without UI changes.
   */
  // decideNext?: (ctx: unknown) => unknown
}

/** A versioned group of related strategy skills. */
export interface StrategyPack {
  id: string
  name: string
  description: string
  version: string
  strategies: StrategySkill[]
}

export interface RegisteredStrategySkill extends StrategySkill {
  packId: string
  packName: string
}
