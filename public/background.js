const STORAGE_KEY = 'crashAutobetHistoryEntries'
const MAX_LOGS = 80
const CRASH_GAME_URL = 'https://bc.game/game/crash'

/** @type {Set<chrome.runtime.Port>} */
const sidePanelPorts = new Set()

/** @type {Map<number, { port: chrome.runtime.Port, url: string, lastSeen: number }>} */
const crashPagePorts = new Map()

function isBcGameHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return host === 'bc.game' || host.endsWith('.bc.game')
}

function isCrashUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    if (!isBcGameHost(parsed.hostname)) return false
    return /\/game\/crash/i.test(parsed.pathname)
  } catch {
    return /bc\.game.*\/game\/crash/i.test(url)
  }
}

async function getStoredLogs() {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []
}

async function saveLogs(logs) {
  await chrome.storage.local.set({ [STORAGE_KEY]: logs })
}

function broadcast(message) {
  for (const port of sidePanelPorts) {
    try {
      port.postMessage(message)
    } catch (error) {
      console.debug('[Crash Auto Bet] Port send failed', error)
    }
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const gameId = String(entry.gameId ?? '').trim()
  const value = String(entry.value ?? '').trim()
  if (!gameId || !value) return null
  return {
    gameId,
    value,
    hash: typeof entry.hash === 'string' ? entry.hash : undefined,
    capturedAt:
      typeof entry.capturedAt === 'number' ? entry.capturedAt : Date.now(),
  }
}

async function appendEntry(rawEntry) {
  const entry = normalizeEntry(rawEntry)
  if (!entry) return null

  const logs = await getStoredLogs()
  if (logs[0]?.gameId === entry.gameId) return null

  const updated = [
    entry,
    ...logs.filter((item) => item.gameId !== entry.gameId),
  ].slice(0, MAX_LOGS)
  await saveLogs(updated)
  broadcast({ type: 'history-entry', entry })
  return entry
}

async function mergeSnapshot(rawEntries) {
  const incoming = (Array.isArray(rawEntries) ? rawEntries : [])
    .map(normalizeEntry)
    .filter(Boolean)

  if (incoming.length === 0) return []

  const existing = await getStoredLogs()
  const map = new Map()
  for (const item of existing) map.set(item.gameId, item)
  for (const item of incoming) map.set(item.gameId, item)

  const updated = Array.from(map.values())
    .sort((a, b) => Number(b.gameId) - Number(a.gameId))
    .slice(0, MAX_LOGS)

  await saveLogs(updated)
  broadcast({ type: 'history-snapshot', entries: updated })
  return updated
}

function rememberCrashPage(tabId, url, port) {
  if (tabId == null) return
  crashPagePorts.set(tabId, {
    port,
    url: url || CRASH_GAME_URL,
    lastSeen: Date.now(),
  })
  broadcast({
    type: 'history-status',
    status: 'live',
    reason: undefined,
    tabId,
    tabUrl: url,
  })
  void syncSidePanelForTab(tabId, url || CRASH_GAME_URL)
}

function forgetCrashPage(tabId) {
  if (tabId == null) return
  crashPagePorts.delete(tabId)
  if (crashPagePorts.size === 0) {
    broadcast({
      type: 'history-status',
      status: 'offline',
      reason: 'Crash page disconnected. Keep https://bc.game/game/crash open.',
    })
  }
}

async function queryAllTabsSafe() {
  try {
    return await chrome.tabs.query({})
  } catch {
    return []
  }
}

async function queryCrashTabs() {
  const tabs = await queryAllTabsSafe()
  return tabs.filter((tab) => tab.id != null && isCrashUrl(tab.url))
}

function pingTab(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ready: false, error: chrome.runtime.lastError.message })
          return
        }
        resolve({
          ready: Boolean(response?.ready),
          url: response?.url,
        })
      })
    } catch (error) {
      resolve({
        ready: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js'],
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensureContentScript(tabId) {
  const first = await pingTab(tabId)
  if (first.ready) return { ready: true, url: first.url }

  const injected = await injectContentScript(tabId)
  if (!injected.ok) {
    return { ready: false, error: injected.error || 'inject-failed' }
  }

  await new Promise((resolve) => setTimeout(resolve, 120))
  const second = await pingTab(tabId)
  if (second.ready) return { ready: true, url: second.url }
  return {
    ready: false,
    error: second.error || 'Content script did not respond after injection',
  }
}

async function getPreferredCrashTab() {
  // 1) Prefer a live content-script connection.
  for (const [tabId, info] of crashPagePorts.entries()) {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab?.id != null && isCrashUrl(tab.url)) {
        return tab
      }
    } catch {
      crashPagePorts.delete(tabId)
    }
  }

  // 2) Prefer the focused window's active tab when it is Crash.
  const [focusedActive] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })
  if (focusedActive?.id != null && isCrashUrl(focusedActive.url)) {
    return focusedActive
  }

  // 3) Any Crash tab we can see.
  const crashTabs = await queryCrashTabs()
  return crashTabs[0] || null
}

async function sendToCrashTab(message) {
  try {
    const tab = await getPreferredCrashTab()
    if (!tab?.id) {
      return {
        success: false,
        error:
          'No BC.GAME Crash tab found. Open https://bc.game/game/crash and reload the extension.',
      }
    }

    const ensured = await ensureContentScript(tab.id)
    if (!ensured.ready) {
      return {
        success: false,
        error:
          ensured.error ||
          'Content script not available. Reload the extension, then refresh the Crash page.',
      }
    }

    return await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message,
          })
          return
        }
        resolve(response || { success: true })
      })
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function syncSidePanelForTab(tabId, url) {
  if (tabId == null) return
  try {
    if (isCrashUrl(url)) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'index.html',
        enabled: true,
      })
    } else if (url) {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })
    }
  } catch (error) {
    console.debug('[Crash Auto Bet] Failed to sync side panel', error)
  }
}

async function syncAllTabs() {
  const tabs = await queryAllTabsSafe()
  await Promise.all(
    tabs.map((tab) =>
      tab.id != null ? syncSidePanelForTab(tab.id, tab.url) : Promise.resolve(),
    ),
  )
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidePanel') {
    sidePanelPorts.add(port)
    port.onDisconnect.addListener(() => {
      sidePanelPorts.delete(port)
    })
    // Push current connection snapshot immediately.
    const first = crashPagePorts.entries().next().value
    if (first) {
      const [tabId, info] = first
      port.postMessage({
        type: 'history-status',
        status: 'live',
        tabId,
        tabUrl: info.url,
      })
    }
    return
  }

  if (port.name === 'crashPage') {
    const tabId = port.sender?.tab?.id
    const url = port.sender?.tab?.url || ''
    if (tabId != null && isCrashUrl(url)) {
      rememberCrashPage(tabId, url, port)
    }
    port.onMessage.addListener((message) => {
      if (message?.type === 'crash-page-hello' && tabId != null) {
        rememberCrashPage(tabId, message.url || url, port)
      }
    })
    port.onDisconnect.addListener(() => {
      forgetCrashPage(tabId)
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'crash-page-hello') {
    const tabId = sender.tab?.id
    const url = message.url || sender.tab?.url || ''
    if (tabId != null && isCrashUrl(url)) {
      // No port here; still mark as recently seen via a lightweight inject ping later.
      void syncSidePanelForTab(tabId, url)
      broadcast({
        type: 'history-status',
        status: 'live',
        tabId,
        tabUrl: url,
      })
    }
    sendResponse({ success: true })
    return true
  }

  if (message?.type === 'history-entry' && message.entry) {
    appendEntry(message.entry).then(() => sendResponse({ success: true }))
    return true
  }

  if (message?.type === 'history-snapshot' && Array.isArray(message.entries)) {
    mergeSnapshot(message.entries).then(() => sendResponse({ success: true }))
    return true
  }

  if (message?.type === 'get-history') {
    getStoredLogs().then((logs) => sendResponse({ logs }))
    return true
  }

  if (message?.type === 'ping-content-script') {
    ;(async () => {
      const connectedIds = Array.from(crashPagePorts.keys())
      if (connectedIds.length > 0) {
        const tabId = connectedIds[0]
        const info = crashPagePorts.get(tabId)
        sendResponse({
          ready: true,
          reason: 'crash-page-port',
          tabId,
          tabUrl: info?.url,
        })
        return
      }

      const tab = await getPreferredCrashTab()
      if (!tab?.id) {
        const all = await queryAllTabsSafe()
        const sample = all
          .filter((item) => item.url)
          .slice(0, 8)
          .map((item) => item.url)
        sendResponse({
          ready: false,
          reason: 'no-crash-tab',
          diagnostics: { tabCount: all.length, sampleUrls: sample },
        })
        return
      }

      const ensured = await ensureContentScript(tab.id)
      sendResponse({
        ready: ensured.ready,
        reason: ensured.ready ? 'injected' : 'content-script-unavailable',
        error: ensured.error,
        tabId: tab.id,
        tabUrl: tab.url,
      })
    })()
    return true
  }

  if (message?.type === 'start-history-capture') {
    sendToCrashTab({ type: 'start-history-capture' }).then((result) => {
      broadcast({
        type: 'history-status',
        status: result.success ? 'live' : 'offline',
        reason: result.success
          ? undefined
          : result.error || 'Could not start history capture.',
      })
      sendResponse(result)
    })
    return true
  }

  if (message?.type === 'stop-history-capture') {
    sendToCrashTab({ type: 'stop-history-capture' }).then((result) => {
      sendResponse(result)
    })
    return true
  }

  if (message?.type === 'refresh-history') {
    sendToCrashTab({ type: 'refresh-history' }).then((result) => {
      sendResponse(result)
    })
    return true
  }

  return false
})

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  } catch {
    // ignore
  }
  await chrome.sidePanel
    .setOptions({ path: 'index.html', enabled: false })
    .catch(() => {})
  await syncAllTabs()
})

chrome.runtime.onStartup.addListener(async () => {
  await syncAllTabs()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    const url = tab.url || changeInfo.url
    void syncSidePanelForTab(tabId, url)
    if (isCrashUrl(url)) {
      void ensureContentScript(tabId)
    } else {
      crashPagePorts.delete(tabId)
    }
  }
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId)
    await syncSidePanelForTab(tabId, tab.url)
    if (isCrashUrl(tab.url)) {
      await ensureContentScript(tabId)
    }
  } catch {
    // Tab may have closed.
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  forgetCrashPage(tabId)
})

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab?.id
  if (tabId == null) return

  // sidePanel.open() must run in the same synchronous turn as the user gesture.
  // Any await before open() causes: "may only be called in response to a user gesture".
  void chrome.sidePanel.setOptions({
    tabId,
    path: 'index.html',
    enabled: true,
  })
  void chrome.sidePanel.open({ tabId }).catch((error) => {
    console.error('[Crash Auto Bet] Failed to open side panel:', error)
  })

  void (async () => {
    try {
      if (isCrashUrl(tab.url)) {
        await ensureContentScript(tabId)
        return
      }

      const existing = await getPreferredCrashTab()
      if (existing?.id && existing.id !== tabId) {
        await chrome.tabs.update(existing.id, { active: true })
        if (existing.windowId != null) {
          await chrome.windows.update(existing.windowId, { focused: true })
        }
        await syncSidePanelForTab(existing.id, existing.url)
        await ensureContentScript(existing.id)
        return
      }

      // Navigate the current tab to Crash so the already-opened side panel stays valid.
      await chrome.tabs.update(tabId, { url: CRASH_GAME_URL })
    } catch (error) {
      console.error('[Crash Auto Bet] Post-open setup failed:', error)
    }
  })()
})
