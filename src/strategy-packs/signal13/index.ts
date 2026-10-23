import type { StrategyPack } from '../types'
import { signal13Strategy } from './strategies/signal13Skill'

export {
  SIGNAL13_TARGET,
  DEFAULT_SIGNAL13_CONFIG,
  countUnderInWindow,
  createSignal13State,
  decide,
  isSignalOn,
  onRoundResult,
} from './signal13'

export { signal13ConfigFromStrategyConfig } from './configFromSettings'

export type {
  CrashPoint,
  Decision,
  Signal13Config,
  Signal13Mode,
  StrategyState,
} from './signal13'

/** Signal-based Crash strategies (entry filters + optional session martingale). */
export const signal13StrategyPack: StrategyPack = {
  id: 'signal13',
  name: 'Signal 1.3x',
  description: 'Bet 1.3x only after a cluster of low crashes (2/10 under 1.3).',
  version: '1.0.0',
  strategies: [signal13Strategy],
}
