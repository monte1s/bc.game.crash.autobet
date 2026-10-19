export type TabId = 'strategies' | 'histories' | 'bets' | 'settings'

/** One auto-bet decision: placed wager or intentional skip. */
export interface BetHistoryEntry {
  id: string
  roundId: string
  strategyId: string
  strategyName: string
  stake: number
  target: number
  crash: number | null
  outcome: 'win' | 'loss' | 'skip'
  /** Why we bet or skipped (e.g. signal off: 3/11 under 1.3). */
  reason: string
  profitDelta: number
  placedAt: number
}

/** Strategy skill id from a registered strategy pack. */
export type PredefinedStrategyId = string

export type StrategyAccent =
  | 'green'
  | 'blue'
  | 'yellow'
  | 'pink'
  | 'cyan'
  | 'purple'
  | 'gray'

export type BetAdjustmentMode =
  | 'fixed'
  | 'increase-after-loss'
  | 'increase-after-win'
  | 'custom-progression'

export type StrategyKind = 'predefined' | 'custom'

export interface StrategyConfig {
  initialBet: number
  targetMultiplier: number
  maxBets: number
  maxBetAmount: number
  stopLoss: number
  takeProfit: number
  /** Martingale / increase-after-loss factor */
  lossMultiplier: number
  /** Anti-Martingale / increase-after-win factor */
  winMultiplier: number
  /** D'Alembert unit step */
  unitStep: number
  adjustmentMode: BetAdjustmentMode
  /** Generic increase/decrease multiplier for custom modes */
  adjustmentMultiplier: number
}

export interface PredefinedStrategyDefinition {
  id: PredefinedStrategyId
  name: string
  description: string
  accent: StrategyAccent
  icon: StrategyIconName
  defaultConfig: StrategyConfig
  /** Optional pack id when sourced from strategy-packs. */
  packId?: string
}

export type StrategyIconName =
  | 'trending-up'
  | 'stairs'
  | 'coins'
  | 'target'
  | 'scale'
  | 'spiral'
  | 'settings'

export interface CustomStrategy {
  id: string
  name: string
  config: StrategyConfig
  createdAt: number
  updatedAt: number
}

export type SelectedStrategyRef =
  | { kind: 'predefined'; id: PredefinedStrategyId }
  | { kind: 'custom'; id: string }

export interface AppSettings {
  defaultStartingBet: number
  defaultTargetMultiplier: number
  defaultMaxBets: number
  maxBetAmount: number
  stopLoss: number
  takeProfit: number
  compactMode: boolean
  confirmBeforeStarting: boolean
}

export interface DemoStats {
  balance: number
  totalBets: number
  totalProfit: number
  wins: number
  losses: number
  skips: number
  /** 0–1 win rate over resolved bets (wins + losses). */
  winRate: number
  lastOutcome: 'win' | 'loss' | 'skip' | null
  lastCrash: number | null
  lastTarget: number | null
  lastStake: number | null
  /** Human-readable last decision (bet/skip reason). */
  lastDecisionReason: string | null
}

export interface PersistedState {
  settings: AppSettings
  customStrategies: CustomStrategy[]
  selectedStrategy: SelectedStrategyRef
  predefinedConfigs: Record<PredefinedStrategyId, StrategyConfig>
}

export type EditorMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; strategyId: string }
  | { type: 'configure-predefined'; strategyId: PredefinedStrategyId }
  | { type: 'configure-custom'; strategyId: string }
