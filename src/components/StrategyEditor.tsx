import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { StrategyConfig } from '../types'
import { DEFAULT_STRATEGY_CONFIG } from '../data/defaults'
import {
  configToFormValues,
  validateStrategyForm,
  type StrategyFormValues,
} from '../utils/validation'
import { FormField, NumberInput, SelectInput, TextInput } from './FormField'
import './StrategyEditor.css'
import './FormField.css'
import { IconChevronLeft } from './icons'

interface StrategyEditorProps {
  mode: 'create' | 'edit'
  initialName?: string
  initialConfig?: StrategyConfig
  onCancel: () => void
  onSave: (name: string, config: StrategyConfig) => void
}

export function StrategyEditor({
  mode,
  initialName = '',
  initialConfig = DEFAULT_STRATEGY_CONFIG,
  onCancel,
  onSave,
}: StrategyEditorProps) {
  const [values, setValues] = useState<StrategyFormValues>(() =>
    configToFormValues(initialConfig, initialName),
  )
  const [errors, setErrors] = useState<Partial<Record<keyof StrategyFormValues, string>>>(
    {},
  )

  const update =
    (key: keyof StrategyFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateStrategyForm(values, { requireName: true })
    if (!result.config || !result.name) {
      setErrors(result.errors)
      return
    }
    onSave(result.name, result.config)
  }

  const showLossFields = values.adjustmentMode === 'increase-after-loss'
  const showWinFields = values.adjustmentMode === 'increase-after-win'
  const showCustomFields = values.adjustmentMode === 'custom-progression'
  const showAdjustmentMultiplier =
    values.adjustmentMode === 'increase-after-loss' ||
    values.adjustmentMode === 'increase-after-win' ||
    values.adjustmentMode === 'custom-progression'

  return (
    <form className="editor-sheet" onSubmit={handleSubmit}>
      <div className="editor-sheet__header">
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Back to strategies"
        >
          <IconChevronLeft size={16} />
        </button>
        <h2 className="editor-sheet__title">
          {mode === 'create' ? 'Custom Strategy' : 'Edit Strategy'}
        </h2>
      </div>

      <div className="editor-sheet__body">
        <div className="form-grid">
          <FormField label="Strategy name" htmlFor="custom-name" error={errors.name}>
            <TextInput
              id="custom-name"
              value={values.name}
              onChange={update('name')}
              placeholder="My Strategy"
              maxLength={40}
              autoFocus
            />
          </FormField>

          <div className="form-grid form-grid--2">
            <FormField
              label="Initial bet amount"
              htmlFor="custom-initialBet"
              error={errors.initialBet}
            >
              <NumberInput
                id="custom-initialBet"
                value={values.initialBet}
                onChange={update('initialBet')}
                placeholder="0.00010000"
              />
            </FormField>
            <FormField
              label="Target cash-out multiplier"
              htmlFor="custom-targetMultiplier"
              error={errors.targetMultiplier}
            >
              <NumberInput
                id="custom-targetMultiplier"
                value={values.targetMultiplier}
                onChange={update('targetMultiplier')}
                placeholder="2.00"
              />
            </FormField>
          </div>

          <div className="form-grid form-grid--2">
            <FormField
              label="Maximum number of bets"
              htmlFor="custom-maxBets"
              error={errors.maxBets}
            >
              <NumberInput
                id="custom-maxBets"
                value={values.maxBets}
                onChange={update('maxBets')}
                placeholder="10"
              />
            </FormField>
            <FormField
              label="Maximum bet amount"
              htmlFor="custom-maxBetAmount"
              error={errors.maxBetAmount}
            >
              <NumberInput
                id="custom-maxBetAmount"
                value={values.maxBetAmount}
                onChange={update('maxBetAmount')}
                placeholder="0.01000000"
              />
            </FormField>
          </div>

          <FormField label="Bet adjustment mode" htmlFor="custom-adjustmentMode">
            <SelectInput
              id="custom-adjustmentMode"
              value={values.adjustmentMode}
              onChange={update('adjustmentMode')}
            >
              <option value="fixed">Fixed amount</option>
              <option value="increase-after-loss">Increase after loss</option>
              <option value="increase-after-win">Increase after win</option>
              <option value="custom-progression">Custom progression</option>
            </SelectInput>
          </FormField>

          {showLossFields && (
            <FormField
              label="Loss multiplier"
              htmlFor="custom-lossMultiplier"
              error={errors.lossMultiplier}
            >
              <NumberInput
                id="custom-lossMultiplier"
                value={values.lossMultiplier}
                onChange={update('lossMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}

          {showWinFields && (
            <FormField
              label="Win multiplier"
              htmlFor="custom-winMultiplier"
              error={errors.winMultiplier}
            >
              <NumberInput
                id="custom-winMultiplier"
                value={values.winMultiplier}
                onChange={update('winMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}

          {showCustomFields && (
            <FormField
              label="Unit step"
              htmlFor="custom-unitStep"
              error={errors.unitStep}
            >
              <NumberInput
                id="custom-unitStep"
                value={values.unitStep}
                onChange={update('unitStep')}
                placeholder="0.00010000"
              />
            </FormField>
          )}

          {showAdjustmentMultiplier && (
            <FormField
              label="Multiplier for increasing or decreasing the bet"
              htmlFor="custom-adjustmentMultiplier"
              error={errors.adjustmentMultiplier}
            >
              <NumberInput
                id="custom-adjustmentMultiplier"
                value={values.adjustmentMultiplier}
                onChange={update('adjustmentMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}

          <div className="form-grid form-grid--2">
            <FormField
              label="Stop-loss limit"
              htmlFor="custom-stopLoss"
              error={errors.stopLoss}
            >
              <NumberInput
                id="custom-stopLoss"
                value={values.stopLoss}
                onChange={update('stopLoss')}
                placeholder="0.00100000"
              />
            </FormField>
            <FormField
              label="Take-profit target"
              htmlFor="custom-takeProfit"
              error={errors.takeProfit}
            >
              <NumberInput
                id="custom-takeProfit"
                value={values.takeProfit}
                onChange={update('takeProfit')}
                placeholder="0.00200000"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="editor-sheet__footer">
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Strategy
          </button>
        </div>
      </div>
    </form>
  )
}
