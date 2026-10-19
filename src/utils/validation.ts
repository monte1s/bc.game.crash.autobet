import type { BetAdjustmentMode, StrategyConfig } from '../types'

export type StrategyFormValues = {
  name: string
  initialBet: string
  targetMultiplier: string
  maxBets: string
  maxBetAmount: string
  stopLoss: string
  takeProfit: string
  lossMultiplier: string
  winMultiplier: string
  unitStep: string
  adjustmentMode: BetAdjustmentMode
  adjustmentMultiplier: string
}

export type FieldErrors = Partial<Record<keyof StrategyFormValues, string>>

function parsePositiveNumber(value: string, label: string): number | string {
  const trimmed = value.trim()
  if (!trimmed) {
    return `${label} is required`
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return `${label} must be a valid number`
  }
  if (parsed <= 0) {
    return `${label} must be greater than 0`
  }
  return parsed
}

function parseNonNegativeNumber(value: string, label: string): number | string {
  const trimmed = value.trim()
  if (!trimmed) {
    return `${label} is required`
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return `${label} must be a valid number`
  }
  if (parsed < 0) {
    return `${label} cannot be negative`
  }
  return parsed
}

export function configToFormValues(
  config: StrategyConfig,
  name = '',
): StrategyFormValues {
  return {
    name,
    initialBet: String(config.initialBet),
    targetMultiplier: String(config.targetMultiplier),
    maxBets: String(config.maxBets),
    maxBetAmount: String(config.maxBetAmount),
    stopLoss: String(config.stopLoss),
    takeProfit: String(config.takeProfit),
    lossMultiplier: String(config.lossMultiplier),
    winMultiplier: String(config.winMultiplier),
    unitStep: String(config.unitStep),
    adjustmentMode: config.adjustmentMode,
    adjustmentMultiplier: String(config.adjustmentMultiplier),
  }
}

export function validateStrategyForm(
  values: StrategyFormValues,
  options: { requireName?: boolean } = {},
): { errors: FieldErrors; config?: StrategyConfig; name?: string } {
  const errors: FieldErrors = {}
  const requireName = options.requireName ?? false

  if (requireName) {
    const name = values.name.trim()
    if (!name) {
      errors.name = 'Strategy name is required'
    } else if (name.length > 40) {
      errors.name = 'Name must be 40 characters or fewer'
    }
  }

  // 0 bet is allowed — BC.GAME Crash accepts 0 for paper testing without money.
  const initialBet = parseNonNegativeNumber(values.initialBet, 'Initial bet')
  if (typeof initialBet === 'string') errors.initialBet = initialBet

  const targetMultiplier = parsePositiveNumber(
    values.targetMultiplier,
    'Target multiplier',
  )
  if (typeof targetMultiplier === 'string') {
    errors.targetMultiplier = targetMultiplier
  } else if (targetMultiplier < 1.01) {
    errors.targetMultiplier = 'Target multiplier must be at least 1.01'
  }

  const maxBets = parsePositiveNumber(values.maxBets, 'Maximum bets')
  if (typeof maxBets === 'string') {
    errors.maxBets = maxBets
  } else if (!Number.isInteger(maxBets)) {
    errors.maxBets = 'Maximum bets must be a whole number'
  }

  // 0 max bet = unlimited for paper tests / uncapped progression display
  const maxBetAmount = parseNonNegativeNumber(values.maxBetAmount, 'Maximum bet')
  if (typeof maxBetAmount === 'string') errors.maxBetAmount = maxBetAmount

  const stopLoss = parseNonNegativeNumber(values.stopLoss, 'Stop-loss')
  if (typeof stopLoss === 'string') errors.stopLoss = stopLoss

  const takeProfit = parseNonNegativeNumber(values.takeProfit, 'Take-profit')
  if (typeof takeProfit === 'string') errors.takeProfit = takeProfit

  const lossMultiplier = parsePositiveNumber(
    values.lossMultiplier,
    'Loss multiplier',
  )
  if (typeof lossMultiplier === 'string') errors.lossMultiplier = lossMultiplier

  const winMultiplier = parsePositiveNumber(
    values.winMultiplier,
    'Win multiplier',
  )
  if (typeof winMultiplier === 'string') errors.winMultiplier = winMultiplier

  // 0 unit step allowed for 0-bet paper tests (D'Alembert stays flat at 0)
  const unitStep = parseNonNegativeNumber(values.unitStep, 'Unit step')
  if (typeof unitStep === 'string') errors.unitStep = unitStep

  const adjustmentMultiplier = parsePositiveNumber(
    values.adjustmentMultiplier,
    'Adjustment multiplier',
  )
  if (typeof adjustmentMultiplier === 'string') {
    errors.adjustmentMultiplier = adjustmentMultiplier
  }

  if (
    typeof initialBet === 'number' &&
    typeof maxBetAmount === 'number' &&
    maxBetAmount > 0 &&
    initialBet > maxBetAmount
  ) {
    errors.initialBet = 'Initial bet cannot exceed maximum bet amount'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    errors: {},
    name: values.name.trim(),
    config: {
      initialBet: initialBet as number,
      targetMultiplier: targetMultiplier as number,
      maxBets: maxBets as number,
      maxBetAmount: maxBetAmount as number,
      stopLoss: stopLoss as number,
      takeProfit: takeProfit as number,
      lossMultiplier: lossMultiplier as number,
      winMultiplier: winMultiplier as number,
      unitStep: unitStep as number,
      adjustmentMode: values.adjustmentMode,
      adjustmentMultiplier: adjustmentMultiplier as number,
    },
  }
}
