export { fibFactorAt, nextFibIndex } from './fibonacci'
export { profitDelta, resolveOutcome } from './outcome'
export { sampleCrashMultiplier, generateCrashSeries } from './sampleCrash'
export {
  createEngineSession,
  decideRound,
  applyRoundResult,
  progressionKind,
} from './session'
export { simulateStrategy, computeWinRate } from './simulate'
export type {
  CreateSessionOptions,
  EngineDecision,
  EngineSession,
  RoundOutcome,
  RoundRecord,
  SimulationReport,
} from './types'
