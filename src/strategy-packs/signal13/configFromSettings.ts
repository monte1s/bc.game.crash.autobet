import type { StrategyConfig } from '../../types'
import {
  DEFAULT_SIGNAL13_CONFIG,
  SIGNAL13_TARGET,
  type Signal13Config,
  type Signal13Mode,
} from './signal13'

/**
 * Map the extension's shared StrategyConfig into Signal13Config.
 * Mode / window / minUnder are not in the UI yet — pass via overrides.
 */
export function signal13ConfigFromStrategyConfig(
  strategy: StrategyConfig,
  overrides: Partial<Signal13Config> & { mode?: Signal13Mode } = {},
): Signal13Config {
  const { target: _ignoredTarget, ...restOverrides } = overrides
  void _ignoredTarget
  return {
    ...DEFAULT_SIGNAL13_CONFIG,
    baseBet: strategy.initialBet,
    betMultiplier: strategy.lossMultiplier,
    maxBet: strategy.maxBetAmount,
    maxLossStreak: strategy.maxBets,
    mode: overrides.mode ?? DEFAULT_SIGNAL13_CONFIG.mode,
    window: overrides.window ?? DEFAULT_SIGNAL13_CONFIG.window,
    minUnder: overrides.minUnder ?? DEFAULT_SIGNAL13_CONFIG.minUnder,
    ...restOverrides,
    target: SIGNAL13_TARGET,
  }
}
