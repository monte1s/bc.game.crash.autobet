import type { CrashRound, RawCrashHistoryEntry } from './types'

function parseMultiplier(value: string): number | null {
  const match = value.trim().match(/([0-9]+(?:\.[0-9]+)?)\s*x?/i)
  if (!match) return null
  const parsed = Number(match[1])
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

export function adaptCrashHistoryEntry(
  raw: RawCrashHistoryEntry,
  receivedAt = Date.now(),
): CrashRound | null {
  if (!raw || typeof raw !== 'object') return null

  const roundId = String(raw.gameId ?? '').trim()
  if (!roundId) return null

  const multiplier = parseMultiplier(String(raw.value ?? ''))
  if (multiplier === null) return null

  const timestamp =
    typeof raw.capturedAt === 'number' && Number.isFinite(raw.capturedAt)
      ? raw.capturedAt
      : receivedAt

  return {
    roundId,
    multiplier,
    timestamp,
    receivedAt,
    hash:
      typeof raw.hash === 'string' && /^[0-9a-f]{64}$/i.test(raw.hash)
        ? raw.hash
        : undefined,
  }
}

export function adaptCrashHistoryEntries(
  entries: RawCrashHistoryEntry[],
): CrashRound[] {
  const rounds: CrashRound[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const round = adaptCrashHistoryEntry(entry)
    if (!round || seen.has(round.roundId)) continue
    seen.add(round.roundId)
    rounds.push(round)
  }

  return rounds.sort((a, b) => {
    const idDiff = Number(b.roundId) - Number(a.roundId)
    if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff
    return b.timestamp - a.timestamp
  })
}

export function mergeCrashRounds(
  existing: CrashRound[],
  incoming: CrashRound[],
  maxRows: number,
): { rounds: CrashRound[]; addedIds: string[] } {
  const map = new Map<string, CrashRound>()
  for (const round of existing) {
    map.set(round.roundId, round)
  }

  const addedIds: string[] = []
  for (const round of incoming) {
    if (!map.has(round.roundId)) {
      addedIds.push(round.roundId)
    }
    map.set(round.roundId, round)
  }

  const rounds = Array.from(map.values()).sort((a, b) => {
    const idDiff = Number(b.roundId) - Number(a.roundId)
    if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff
    return b.timestamp - a.timestamp
  })

  return {
    rounds: rounds.slice(0, maxRows),
    addedIds,
  }
}

export function getMultiplierTone(
  multiplier: number,
): 'low' | 'mid' | 'high' {
  if (multiplier < 2) return 'low'
  if (multiplier < 10) return 'mid'
  return 'high'
}

export function formatRoundTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp))
  } catch {
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
}

export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`
}
