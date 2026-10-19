import type {
  AppSettings,
  DemoStats,
  PredefinedStrategyId,
  StrategyConfig,
} from '../types'

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  initialBet: 0.0001,
  targetMultiplier: 2,
  maxBets: 10,
  maxBetAmount: 0.01,
  stopLoss: 0.001,
  takeProfit: 0.002,
  lossMultiplier: 2,
  winMultiplier: 2,
  unitStep: 0.0001,
  adjustmentMode: 'fixed',
  adjustmentMultiplier: 2,
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultStartingBet: 0.0001,
  defaultTargetMultiplier: 2,
  defaultMaxBets: 10,
  maxBetAmount: 0.01,
  stopLoss: 0.001,
  takeProfit: 0.002,
  compactMode: false,
  confirmBeforeStarting: false,
}

export const DEFAULT_SELECTED_STRATEGY: {
  kind: 'predefined'
  id: PredefinedStrategyId
} = {
  kind: 'predefined',
  id: 'fixed-amount',
}

export const DEMO_STATS: DemoStats = {
  balance: 0,
  totalBets: 0,
  totalProfit: 0,
  wins: 0,
  losses: 0,
  skips: 0,
  winRate: 0,
  lastOutcome: null,
  lastCrash: null,
  lastTarget: null,
  lastStake: null,
  lastDecisionReason: null,
}

export const STORAGE_KEY = 'crash-autobet-state-v1'

export function createId(prefix = 'strategy'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatBet(value: number): string {
  return value.toFixed(8)
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`
}
