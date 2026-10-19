;(function () {
  const API_KEY = '__crashAutobetApi'

  // Extension reload leaves a dead content-script world but keeps window flags.
  // Always tear down any previous instance, then re-bind listeners in THIS world.
  try {
    window[API_KEY]?.dispose?.()
  } catch {
    // ignore stale dispose errors
  }

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
        if (state.disposed) return
        // Service worker may sleep; retry shortly.
        setTimeout(connectPort, 1500)
      })
      return port
    } catch {
      if (!state.disposed) setTimeout(connectPort, 2000)
      return null
    }
  }

  const state = {
    disposed: false,
    lastGameId: null,
    observer: null,
    intervalId: null,
    tabObserver: null,
    observedList: null,
    isCapturing: false,
    port: null,
    lastBetRoundKey: null,
    lastBetAt: 0,
    onMessage: null,
  }

  const SELECTORS = {
    historyTabButton: 'button.tabs-btn.btn-like',
    historyButton: 'button.button-second',
  }

  // --- Live bet controls (Amount / Auto cash out / Bet) ---

  function normalizeLabelText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  function findNumberFieldGroup(labelMatch) {
    const groups = Array.from(document.querySelectorAll('[role="group"]'))
    for (const group of groups) {
      const label = group.querySelector('label')
      const labelText = normalizeLabelText(label?.textContent)
      if (labelText.includes(labelMatch)) return group
    }
    // Fallback: any label, then walk up to a container with an input
    const labels = Array.from(document.querySelectorAll('label'))
    for (const label of labels) {
      if (!normalizeLabelText(label.textContent).includes(labelMatch)) continue
      const group =
        label.closest('[role="group"]') ||
        label.closest('div.relative') ||
        label.parentElement
      if (group?.querySelector('input')) return group
    }
    return null
  }

  function findAmountInput() {
    const group = findNumberFieldGroup('amount')
    return group?.querySelector('input[inputmode="decimal"], input') || null
  }

  function findCashoutInput() {
    const group = findNumberFieldGroup('auto cash out')
    return group?.querySelector('input[inputmode="decimal"], input') || null
  }

  function ensureManualTabActive() {
    const tabs = Array.from(
      document.querySelectorAll('button.tabs-btn, button[role="tab"], button'),
    )
    const manual = tabs.find(
      (btn) => normalizeLabelText(btn.textContent) === 'manual',
    )
    if (!manual) return
    const selected =
      manual.getAttribute('aria-selected') === 'true' ||
      manual.classList.contains('text-brand') ||
      manual.classList.contains('!text-brand')
    if (!selected) manual.click()
  }

  function findBetButton() {
    const buttons = Array.from(
      document.querySelectorAll('button.button-brand, button'),
    )
    return (
      buttons.find((btn) => {
        const text = normalizeLabelText(btn.textContent)
        if (!text.includes('bet')) return false
        if (text.includes('auto bet')) return false
        if (text.includes('autobet')) return false
        // Prefer the main action that places a wager
        return (
          text === 'bet' ||
          text.includes('next round') ||
          text.includes('bet (next') ||
          text.includes('bet(next') ||
          /^bet\b/.test(text)
        )
      }) || null
    )
  }

  function setReactInputValue(input, value) {
    if (!input) return false
    const str = String(value)
    input.focus()

    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    if (setter) {
      setter.call(input, str)
    } else {
      input.value = str
    }

    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertReplacementText',
        data: str,
      }),
    )
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.blur()
    return true
  }

  function isBettingWindowOpen(betButton) {
    if (!betButton) return false
    if (betButton.disabled) return false
    if (betButton.getAttribute('aria-disabled') === 'true') return false
    if (betButton.classList.contains('opacity-40')) return false
    const text = normalizeLabelText(betButton.textContent)
    // After placing, UI often shows Cancel / Cash out
    if (text.includes('cancel')) return false
    if (text.includes('cash out') && !text.includes('auto cash out')) return false
    return text.includes('bet')
  }

  function readBetUiStatus() {
    const amountInput = findAmountInput()
    const cashoutInput = findCashoutInput()
    const betButton = findBetButton()
    return {
      foundAmount: Boolean(amountInput),
      foundCashout: Boolean(cashoutInput),
      foundBetButton: Boolean(betButton),
      amountValue: amountInput?.value ?? null,
      cashoutValue: cashoutInput?.value ?? null,
      betButtonText: betButton
        ? normalizeLabelText(betButton.textContent)
        : null,
      bettingOpen: isBettingWindowOpen(betButton),
      lastGameId: state.lastGameId,
    }
  }

  function placeCrashBet(payload) {
    const amount = Number(payload?.amount)
    const target = Number(payload?.target ?? payload?.cashout)
    const force = Boolean(payload?.force)

    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, error: 'Invalid bet amount' }
    }
    if (!Number.isFinite(target) || target < 1.01) {
      return { success: false, error: 'Invalid cashout target (min 1.01)' }
    }

    const amountInput = findAmountInput()
    const cashoutInput = findCashoutInput()
    const betButton = findBetButton()

    if (!amountInput || !cashoutInput || !betButton) {
      return {
        success: false,
        error:
          'Could not find Amount / Auto cash out / Bet controls. Open Manual bet panel on Crash.',
        status: readBetUiStatus(),
      }
    }

    if (!force && !isBettingWindowOpen(betButton)) {
      return {
        success: false,
        reason: 'not-betting-window',
        error: 'Betting window is closed (Bet button not available).',
        status: readBetUiStatus(),
      }
    }

    // Debounce: avoid double-clicking the same open window
    const roundKey = `${state.lastGameId || 'none'}:${amount}:${target}`
    const now = Date.now()
    if (
      !force &&
      state.lastBetRoundKey === roundKey &&
      now - state.lastBetAt < 4000
    ) {
      return {
        success: false,
        reason: 'already-placed',
        error: 'Bet already placed for this round.',
        status: readBetUiStatus(),
      }
    }

    const amountOk = setReactInputValue(amountInput, amount)
    const cashoutOk = setReactInputValue(cashoutInput, target)
    if (!amountOk || !cashoutOk) {
      return {
        success: false,
        error: 'Failed to write Amount / Auto cash out values.',
        status: readBetUiStatus(),
      }
    }

    // Small delay so React state commits before click
    betButton.click()

    state.lastBetRoundKey = roundKey
    state.lastBetAt = now

    return {
      success: true,
      amount,
      target,
      status: readBetUiStatus(),
    }
  }

  async function placeCrashBetAsync(payload) {
    const amount = Number(payload?.amount)
    const target = Number(payload?.target ?? payload?.cashout)

    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, error: 'Invalid bet amount' }
    }
    if (!Number.isFinite(target) || target < 1.01) {
      return { success: false, error: 'Invalid cashout target (min 1.01)' }
    }

    ensureManualTabActive()
    await new Promise((r) => setTimeout(r, 80))

    let amountInput = findAmountInput()
    let cashoutInput = findCashoutInput()
    let betButton = findBetButton()

    if (!amountInput || !cashoutInput || !betButton) {
      return {
        success: false,
        error:
          'Could not find Amount / Auto cash out / Bet controls. Open Manual bet panel on Crash.',
        status: readBetUiStatus(),
      }
    }

    if (!isBettingWindowOpen(betButton)) {
      return {
        success: false,
        reason: 'not-betting-window',
        error: 'Betting window is closed (Bet button not available).',
        status: readBetUiStatus(),
      }
    }

    setReactInputValue(amountInput, amount)
    await new Promise((r) => setTimeout(r, 50))
    // Re-query after React re-render
    cashoutInput = findCashoutInput() || cashoutInput
    setReactInputValue(cashoutInput, target)
    await new Promise((r) => setTimeout(r, 80))

    // Re-read button in case UI re-rendered
    const button = findBetButton()
    if (!button || !isBettingWindowOpen(button)) {
      return {
        success: false,
        reason: 'not-betting-window',
        error: 'Betting window closed before click.',
        status: readBetUiStatus(),
      }
    }

    const roundKey = `${state.lastGameId || 'none'}:${amount}:${target}`
    const now = Date.now()
    if (state.lastBetRoundKey === roundKey && now - state.lastBetAt < 4000) {
      return {
        success: false,
        reason: 'already-placed',
        error: 'Bet already placed for this round.',
        status: readBetUiStatus(),
      }
    }

    button.click()
    state.lastBetRoundKey = roundKey
    state.lastBetAt = now

    return {
      success: true,
      amount,
      target,
      status: readBetUiStatus(),
    }
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

  function reply(sendResponse, payload) {
    try {
      sendResponse(payload)
    } catch {
      // Channel may already be closed (extension reload / navigated away).
    }
  }

  state.onMessage = (message, _sender, sendResponse) => {
    if (state.disposed) return false

    try {
      if (message?.type === 'PING') {
        reply(sendResponse, {
          ready: true,
          capturing: state.isCapturing,
          url: location.href,
          betUi: readBetUiStatus(),
        })
        return true
      }

      if (message?.type === 'start-history-capture') {
        startCapturing()
        reply(sendResponse, { success: true, url: location.href })
        return true
      }

      if (message?.type === 'stop-history-capture') {
        stopCapturing()
        reply(sendResponse, { success: true })
        return true
      }

      if (message?.type === 'refresh-history') {
        const success = refreshSnapshot()
        reply(sendResponse, {
          success,
          error: success
            ? undefined
            : 'Crash history list not found on the page. Open the History tab inside Crash.',
          url: location.href,
        })
        return true
      }

      if (message?.type === 'get-bet-ui-status') {
        reply(sendResponse, {
          success: true,
          status: readBetUiStatus(),
          url: location.href,
        })
        return true
      }

      if (message?.type === 'place-crash-bet') {
        placeCrashBetAsync({
          amount: message.amount,
          target: message.target ?? message.cashout,
          force: message.force,
        })
          .then((result) => reply(sendResponse, result))
          .catch((error) =>
            reply(sendResponse, {
              success: false,
              error:
                error instanceof Error ? error.message : String(error),
            }),
          )
        // Keep the message channel open for the async reply.
        return true
      }

      if (message?.type === 'place-crash-bet-sync') {
        reply(
          sendResponse,
          placeCrashBet({
            amount: message.amount,
            target: message.target ?? message.cashout,
            force: message.force,
          }),
        )
        return true
      }
    } catch (error) {
      reply(sendResponse, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      return true
    }

    return false
  }

  chrome.runtime.onMessage.addListener(state.onMessage)

  const generation = Date.now()

  function dispose() {
    if (state.disposed) return
    state.disposed = true
    stopCapturing()
    try {
      if (state.onMessage) {
        chrome.runtime.onMessage.removeListener(state.onMessage)
      }
    } catch {
      // ignore
    }
    try {
      state.port?.disconnect()
    } catch {
      // ignore
    }
    state.port = null
    if (window[API_KEY]?.generation === generation) {
      delete window[API_KEY]
    }
  }

  window[API_KEY] = {
    generation,
    dispose,
    placeBet: placeCrashBetAsync,
    getStatus: readBetUiStatus,
  }

  announceReady()
  state.port = connectPort()

  // Auto-start capture once the page is ready so the side panel can go Live
  // without waiting for a perfect tabs.query match.
  setTimeout(() => {
    if (!state.disposed) startCapturing()
  }, 800)
})()
