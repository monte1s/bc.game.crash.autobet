export interface BetUiStatus {
  foundAmount: boolean
  foundCashout: boolean
  foundBetButton: boolean
  amountValue: string | null
  cashoutValue: string | null
  betButtonText: string | null
  bettingOpen: boolean
  lastGameId: string | null
}

export interface PlaceCrashBetResult {
  success: boolean
  amount?: number
  target?: number
  reason?: string
  error?: string
  status?: BetUiStatus
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}

export async function getCrashBetUiStatus(): Promise<{
  success: boolean
  status?: BetUiStatus
  error?: string
}> {
  if (!hasChromeRuntime()) {
    return { success: false, error: 'Extension runtime unavailable' }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'get-bet-ui-status' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message })
        return
      }
      resolve({
        success: Boolean(response?.success),
        status: response?.status as BetUiStatus | undefined,
        error: typeof response?.error === 'string' ? response.error : undefined,
      })
    })
  })
}

/** Set Amount + Auto cash out on the Crash page and click Bet. */
export async function placeCrashBet(options: {
  amount: number
  target: number
  force?: boolean
}): Promise<PlaceCrashBetResult> {
  if (!hasChromeRuntime()) {
    return { success: false, error: 'Extension runtime unavailable' }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'place-crash-bet',
        amount: options.amount,
        target: options.target,
        force: options.force,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message })
          return
        }
        resolve({
          success: Boolean(response?.success),
          amount:
            typeof response?.amount === 'number' ? response.amount : undefined,
          target:
            typeof response?.target === 'number' ? response.target : undefined,
          reason:
            typeof response?.reason === 'string' ? response.reason : undefined,
          error:
            typeof response?.error === 'string' ? response.error : undefined,
          status: response?.status as BetUiStatus | undefined,
        })
      },
    )
  })
}
