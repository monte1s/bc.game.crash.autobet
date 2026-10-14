export type HistoryConnectionStatus =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline'

/** Raw entry as published by the content script / background. */
export interface RawCrashHistoryEntry {
  gameId: string
  value: string
  hash?: string
  capturedAt?: number
}

/** Normalized round for the Histories UI. */
export interface CrashRound {
  roundId: string
  multiplier: number
  timestamp: number
  receivedAt: number
  hash?: string
}

export const HISTORY_MAX_ROWS = 60
export const CRASH_GAME_URL_MATCH = 'https://bc.game/game/crash'
