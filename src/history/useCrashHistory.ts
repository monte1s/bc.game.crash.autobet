import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adaptCrashHistoryEntries,
  adaptCrashHistoryEntry,
  mergeCrashRounds,
} from './crashHistoryAdapter'
import {
  connectHistoryPort,
  fetchStoredHistory,
  isExtensionRuntimeAvailable,
  isHistoryEntryMessage,
  isHistorySnapshotMessage,
  isHistoryStatusMessage,
  pingCrashContentScript,
  refreshHistorySnapshot,
  startHistoryCapture,
  stopHistoryCapture,
} from './crashHistoryService'
import type { CrashRound, HistoryConnectionStatus } from './types'
import { HISTORY_MAX_ROWS } from './types'

function offlineReasonFromPing(ping: {
  reason?: string
  error?: string
  tabUrl?: string
}): string {
  if (ping.reason === 'no-crash-tab') {
    return 'No Crash tab detected. Open https://bc.game/game/crash, then click Refresh.'
  }
  if (ping.reason === 'content-script-unavailable') {
    return `Crash tab found${ping.tabUrl ? ` (${ping.tabUrl})` : ''}, but the page script is not attached. Reload this extension, then refresh the Crash page. ${ping.error ?? ''}`.trim()
  }
  if (ping.reason === 'no-extension-runtime') {
    return 'Open this UI as a Chrome extension side panel.'
  }
  if (ping.reason === 'runtime-error') {
    return `Extension messaging failed: ${ping.error ?? 'unknown error'}. Reload the extension.`
  }
  if (ping.error) {
    return ping.error
  }
  return 'Waiting for the BC.GAME Crash page…'
}

interface UseCrashHistoryResult {
  rounds: CrashRound[]
  status: HistoryConnectionStatus
  statusReason: string | null
  newestHighlightIds: Set<string>
  isRefreshing: boolean
  refresh: () => Promise<void>
}

export function useCrashHistory(enabled: boolean): UseCrashHistoryResult {
  const [rounds, setRounds] = useState<CrashRound[]>([])
  const [status, setStatus] = useState<HistoryConnectionStatus>('offline')
  const [statusReason, setStatusReason] = useState<string | null>(null)
  const [newestHighlightIds, setNewestHighlightIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [isRefreshing, setIsRefreshing] = useState(false)

  const enabledRef = useRef(enabled)
  const statusRef = useRef(status)
  const highlightTimers = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const markHighlights = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setNewestHighlightIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.add(id)
      return next
    })

    for (const id of ids) {
      const existing = highlightTimers.current.get(id)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setNewestHighlightIds((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
        highlightTimers.current.delete(id)
      }, 1600)
      highlightTimers.current.set(id, timer)
    }
  }, [])

  const ingestRawEntries = useCallback(
    (rawEntries: Parameters<typeof adaptCrashHistoryEntries>[0], highlightNew: boolean) => {
      const adapted = adaptCrashHistoryEntries(rawEntries)
      setRounds((current) => {
        const { rounds: next, addedIds } = mergeCrashRounds(
          current,
          adapted,
          HISTORY_MAX_ROWS,
        )
        if (highlightNew && addedIds.length > 0) {
          markHighlights(addedIds)
        }
        return next
      })
    },
    [markHighlights],
  )

  const ingestRawEntry = useCallback(
    (raw: Parameters<typeof adaptCrashHistoryEntry>[0], highlightNew: boolean) => {
      const adapted = adaptCrashHistoryEntry(raw)
      if (!adapted) return
      setRounds((current) => {
        const { rounds: next, addedIds } = mergeCrashRounds(
          current,
          [adapted],
          HISTORY_MAX_ROWS,
        )
        if (highlightNew && addedIds.length > 0) {
          markHighlights(addedIds)
        }
        return next
      })
    },
    [markHighlights],
  )

  const refresh = useCallback(async () => {
    if (!isExtensionRuntimeAvailable()) {
      setStatus('offline')
      setStatusReason('Open this UI as a Chrome extension side panel.')
      return
    }

    setIsRefreshing(true)
    setStatus((current) => (current === 'live' ? 'live' : 'connecting'))
    try {
      const ping = await pingCrashContentScript()
      if (!ping.ready) {
        setStatus('offline')
        setStatusReason(offlineReasonFromPing(ping))
        return
      }

      const result = await refreshHistorySnapshot()
      if (!result.success) {
        setStatus('offline')
        setStatusReason(result.error ?? 'Could not refresh crash history.')
        return
      }

      const stored = await fetchStoredHistory()
      ingestRawEntries(stored, false)
      setStatus('live')
      setStatusReason(null)
    } finally {
      setIsRefreshing(false)
    }
  }, [ingestRawEntries])

  useEffect(() => {
    if (!enabled) {
      void stopHistoryCapture()
      return
    }

    let cancelled = false
    let port: chrome.runtime.Port | null = null
    let reconnectAttempts = 0
    let reconnectTimer: number | null = null
    let pingTimer: number | null = null
    let isCleaningUp = false
    const timersMap = highlightTimers.current

    const clearReconnect = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const handlePortMessage = (message: unknown) => {
      if (cancelled) return
      if (isHistorySnapshotMessage(message)) {
        ingestRawEntries(message.entries, false)
        setStatus('live')
        setStatusReason(null)
        return
      }
      if (isHistoryEntryMessage(message)) {
        ingestRawEntry(message.entry, true)
        setStatus('live')
        setStatusReason(null)
        return
      }
      if (isHistoryStatusMessage(message)) {
        setStatus(message.status)
        setStatusReason(message.reason ?? null)
      }
    }

    const setupPort = () => {
      if (cancelled || isCleaningUp) return
      port = connectHistoryPort()
      if (!port) {
        setStatus('offline')
        setStatusReason('Could not connect to the extension background.')
        return
      }

      port.onMessage.addListener(handlePortMessage)
      port.onDisconnect.addListener(() => {
        if (isCleaningUp || cancelled) return
        setStatus('reconnecting')
        setStatusReason('Reconnecting to history feed…')
        if (reconnectAttempts >= 8) {
          setStatus('offline')
          setStatusReason('History feed disconnected.')
          return
        }
        reconnectAttempts += 1
        const delay = Math.min(1000 * reconnectAttempts, 5000)
        clearReconnect()
        reconnectTimer = window.setTimeout(setupPort, delay)
      })
    }

    const bootstrap = async () => {
      if (!isExtensionRuntimeAvailable()) {
        if (!cancelled) {
          setStatus('offline')
          setStatusReason('Open this UI as a Chrome extension side panel.')
        }
        return
      }

      if (!cancelled) {
        setStatus('connecting')
        setStatusReason('Connecting to BC.GAME Crash history…')
      }

      setupPort()

      const stored = await fetchStoredHistory()
      if (!cancelled && stored.length > 0) {
        ingestRawEntries(stored, false)
      }

      const ping = await pingCrashContentScript()
      if (cancelled) return

      if (!ping.ready) {
        setStatus('offline')
        setStatusReason(offlineReasonFromPing(ping))
        return
      }

      const started = await startHistoryCapture()
      if (cancelled) return

      if (!started.success) {
        setStatus('offline')
        setStatusReason(
          started.error ??
            'Could not start history capture on the Crash page.',
        )
        return
      }

      reconnectAttempts = 0
      setStatus('live')
      setStatusReason(null)
    }

    void bootstrap()

    pingTimer = window.setInterval(async () => {
      if (cancelled || !enabledRef.current) return
      if (!isExtensionRuntimeAvailable()) return
      const ping = await pingCrashContentScript()
      if (!ping.ready) {
        setStatus((current) =>
          current === 'offline' ? current : 'reconnecting',
        )
        setStatusReason(offlineReasonFromPing(ping))
        return
      }
      if (statusRef.current !== 'live') {
        const started = await startHistoryCapture()
        if (started.success) {
          setStatus('live')
          setStatusReason(null)
        }
      }
    }, 2500)

    return () => {
      cancelled = true
      isCleaningUp = true
      clearReconnect()
      if (pingTimer !== null) window.clearInterval(pingTimer)
      try {
        port?.disconnect()
      } catch {
        // ignore
      }
      void stopHistoryCapture()
      for (const timer of timersMap.values()) {
        window.clearTimeout(timer)
      }
      timersMap.clear()
    }
  }, [enabled, ingestRawEntries, ingestRawEntry])

  return {
    rounds,
    status,
    statusReason,
    newestHighlightIds,
    isRefreshing,
    refresh,
  }
}
