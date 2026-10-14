;(function () {
  const BOOT_FLAG = '__crashAutobetHistoryInitialized'

  function announceReady() {
    try {
      chrome.runtime.sendMessage({
        type: 'crash-page-hello',
        url: location.href,
      })
    } catch {
      // Extension context may be unavailable during reload.
    }
  }

  function connectPort() {
    try {
      const port = chrome.runtime.connect({ name: 'crashPage' })
      port.postMessage({ type: 'crash-page-hello', url: location.href })
      port.onDisconnect.addListener(() => {
        // Service worker may sleep; retry shortly.
        setTimeout(connectPort, 1500)
      })
      return port
    } catch {
      setTimeout(connectPort, 2000)
      return null
    }
  }

  if (window[BOOT_FLAG]) {
    // Already booted in this page; just re-announce for a fresh service worker.
    announceReady()
    connectPort()
    return
  }
  window[BOOT_FLAG] = true

  const state = {
    lastGameId: null,
    observer: null,
    intervalId: null,
    tabObserver: null,
    observedList: null,
    isCapturing: false,
    port: null,
  }

  const SELECTORS = {
    historyTabButton: 'button.tabs-btn.btn-like',
    historyButton: 'button.button-second',
  }

  function findHistoryTabButton() {
    const buttons = Array.from(
      document.querySelectorAll(SELECTORS.historyTabButton),
    )
    return buttons.find(
      (btn) => btn.textContent?.trim().toLowerCase() === 'history',
    )
  }

  function ensureHistoryTabActive() {
    const btn = findHistoryTabButton()
    if (!btn) return
    if (btn.getAttribute('aria-selected') !== 'true') {
      btn.click()
    }
  }

  function findInnerHistoryButton() {
    const buttons = Array.from(
      document.querySelectorAll(SELECTORS.historyButton),
    )
    return buttons.find(
      (btn) => btn.textContent?.trim().toLowerCase() === 'history',
    )
  }

  function ensureInnerHistoryButtonActive() {
    const btn = findInnerHistoryButton()
    if (!btn) return
    const isActive =
      btn.classList.contains('!text-brand') ||
      btn.classList.contains('text-brand') ||
      btn.getAttribute('aria-pressed') === 'true'
    if (!isActive) {
      btn.click()
    }
  }

  // History is a div grid:
  //   <div header>Game ID | Result | Hash</div>
  //   <div list> <div row>...</div> ... </div>
  // Newest round first.
  function findHistoryList() {
    const headers = Array.from(document.querySelectorAll('div')).filter(
      (el) =>
        el.children.length === 3 &&
        el.children[0].textContent?.trim() === 'Game ID' &&
        el.children[2].textContent?.trim() === 'Hash',
    )
    for (const header of headers) {
      const list = header.nextElementSibling
      if (list && list.children.length > 0) return list
    }
    return null
  }

  function extractRow(row) {
    const cells = Array.from(row.children)
    if (cells.length < 3) return null

    const gameId = cells[0].textContent?.trim() ?? ''
    const value = cells[1].textContent?.trim() ?? ''
    const hash = cells[2].textContent?.trim() ?? ''

    if (!gameId || !value) return null
    if (hash && !/^[0-9a-f]{64}$/i.test(hash)) return null

    return {
      gameId,
      value,
      hash: hash || undefined,
      capturedAt: Date.now(),
    }
  }

  function extractLatestRow(list) {
    const firstRow = list.firstElementChild
    if (!firstRow) return null
    return extractRow(firstRow)
  }

  function extractRows(list, limit = 40) {
    const entries = []
    const rows = Array.from(list.children).slice(0, limit)
    for (const row of rows) {
      const entry = extractRow(row)
      if (entry) entries.push(entry)
    }
    return entries
  }

  function publishEntry(entry) {
    try {
      chrome.runtime.sendMessage({ type: 'history-entry', entry })
    } catch (error) {
      console.debug('[Crash Auto Bet] Failed to publish history entry', error)
    }
  }

  function publishSnapshot(entries) {
    try {
      chrome.runtime.sendMessage({ type: 'history-snapshot', entries })
    } catch (error) {
      console.debug('[Crash Auto Bet] Failed to publish history snapshot', error)
    }
  }

  function handleChange(publishSnapshotToo = false) {
    const list =
      state.observedList && state.observedList.isConnected
        ? state.observedList
        : findHistoryList()
    if (!list) return false

    if (publishSnapshotToo) {
      const entries = extractRows(list)
      if (entries.length > 0) {
        state.lastGameId = entries[0].gameId
        publishSnapshot(entries)
        return true
      }
      return false
    }

    const entry = extractLatestRow(list)
    if (!entry) return false
    if (entry.gameId === state.lastGameId) return true

    state.lastGameId = entry.gameId
    publishEntry(entry)
    return true
  }

  function setupObserver() {
    if (!state.isCapturing) return

    const list = findHistoryList()
    if (!list) {
      setTimeout(() => {
        if (state.isCapturing) setupObserver()
      }, 1000)
      return
    }

    handleChange(true)

    if (state.observer) {
      state.observer.disconnect()
    }

    state.observer = new MutationObserver(() => {
      if (!state.isCapturing) return
      handleChange(false)
    })

    state.observer.observe(list, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    state.observedList = list
  }

  function watchTabButton() {
    const btn = findHistoryTabButton()
    if (!btn) return

    if (state.tabObserver) {
      state.tabObserver.disconnect()
    }

    state.tabObserver = new MutationObserver(() => {
      if (!state.isCapturing) return
      if (btn.getAttribute('aria-selected') === 'true') {
        setTimeout(() => setupObserver(), 200)
      }
    })

    state.tabObserver.observe(btn, {
      attributes: true,
      attributeFilter: ['aria-selected', 'class'],
    })
  }

  function stopCapturing() {
    state.isCapturing = false

    if (state.observer) {
      state.observer.disconnect()
      state.observer = null
    }
    state.observedList = null

    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.intervalId = null
    }

    if (state.tabObserver) {
      state.tabObserver.disconnect()
      state.tabObserver = null
    }
  }

  function startKeepAlive() {
    if (state.intervalId) clearInterval(state.intervalId)
    state.intervalId = setInterval(() => {
      if (!state.isCapturing) {
        clearInterval(state.intervalId)
        state.intervalId = null
        return
      }
      ensureHistoryTabActive()
      ensureInnerHistoryButtonActive()
      if (!state.observedList || !state.observedList.isConnected) {
        setupObserver()
      } else {
        handleChange(false)
      }
    }, 2000)
  }

  function startCapturing() {
    state.isCapturing = true
    ensureHistoryTabActive()
    ensureInnerHistoryButtonActive()
    watchTabButton()
    setupObserver()
    startKeepAlive()
  }

  function refreshSnapshot() {
    ensureHistoryTabActive()
    ensureInnerHistoryButtonActive()
    const ok = handleChange(true)
    if (!ok) {
      setupObserver()
      return Boolean(findHistoryList())
    }
    return true
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'PING') {
      sendResponse({
        ready: true,
        capturing: state.isCapturing,
        url: location.href,
      })
      return true
    }

    if (message?.type === 'start-history-capture') {
      startCapturing()
      sendResponse({ success: true, url: location.href })
      return true
    }

    if (message?.type === 'stop-history-capture') {
      stopCapturing()
      sendResponse({ success: true })
      return true
    }

    if (message?.type === 'refresh-history') {
      const success = refreshSnapshot()
      sendResponse({
        success,
        error: success
          ? undefined
          : 'Crash history list not found on the page. Open the History tab inside Crash.',
        url: location.href,
      })
      return true
    }

    return false
  })

  announceReady()
  state.port = connectPort()

  // Auto-start capture once the page is ready so the side panel can go Live
  // without waiting for a perfect tabs.query match.
  setTimeout(() => {
    startCapturing()
  }, 800)
})()
