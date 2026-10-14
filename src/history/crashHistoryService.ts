import type { RawCrashHistoryEntry } from './types'

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}

export function isExtensionRuntimeAvailable(): boolean {
  return hasChromeRuntime()
}

export function connectHistoryPort(): chrome.runtime.Port | null {
  if (!hasChromeRuntime()) return null
  try {
    return chrome.runtime.connect({ name: 'sidePanel' })
  } catch {
    return null
  }
}

export async function pingCrashContentScript(): Promise<{
  ready: boolean
  reason?: string
  error?: string
  tabUrl?: string
}> {
  if (!hasChromeRuntime()) {
    return { ready: false, reason: 'no-extension-runtime' }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'ping-content-script' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          ready: false,
          reason: 'runtime-error',
          error: chrome.runtime.lastError.message,
        })
        return
      }
      resolve({
        ready: Boolean(response?.ready),
        reason:
          typeof response?.reason === 'string' ? response.reason : undefined,
        error: typeof response?.error === 'string' ? response.error : undefined,
        tabUrl:
          typeof response?.tabUrl === 'string' ? response.tabUrl : undefined,
      })
    })
  })
}

export async function startHistoryCapture(): Promise<{
  success: boolean
  error?: string
}> {
  if (!hasChromeRuntime()) {
    return { success: false, error: 'Extension runtime unavailable' }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'start-history-capture' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message })
        return
      }
      resolve({
        success: Boolean(response?.success),
        error: response?.error,
      })
    })
  })
}

export async function stopHistoryCapture(): Promise<void> {
  if (!hasChromeRuntime()) return
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'stop-history-capture' }, () => {
      resolve()
    })
  })
}

export async function refreshHistorySnapshot(): Promise<{
  success: boolean
  error?: string
}> {
  if (!hasChromeRuntime()) {
    return { success: false, error: 'Extension runtime unavailable' }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'refresh-history' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message })
        return
      }
      resolve({
        success: Boolean(response?.success),
        error: response?.error,
      })
    })
  })
}

export async function fetchStoredHistory(): Promise<RawCrashHistoryEntry[]> {
  if (!hasChromeRuntime()) return []
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'get-history' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve([])
        return
      }
      const logs = response?.logs
      resolve(Array.isArray(logs) ? (logs as RawCrashHistoryEntry[]) : [])
    })
  })
}

export function isHistoryEntryMessage(
  message: unknown,
): message is { type: 'history-entry'; entry: RawCrashHistoryEntry } {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: string }).type === 'history-entry' &&
    typeof (message as { entry?: unknown }).entry === 'object' &&
    (message as { entry?: unknown }).entry !== null
  )
}

export function isHistorySnapshotMessage(
  message: unknown,
): message is { type: 'history-snapshot'; entries: RawCrashHistoryEntry[] } {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: string }).type === 'history-snapshot' &&
    Array.isArray((message as { entries?: unknown }).entries)
  )
}

export function isHistoryStatusMessage(
  message: unknown,
): message is {
  type: 'history-status'
  status: 'live' | 'offline' | 'connecting' | 'reconnecting'
  reason?: string
} {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: string }).type === 'history-status' &&
    typeof (message as { status?: unknown }).status === 'string'
  )
}
