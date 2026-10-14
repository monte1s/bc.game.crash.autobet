import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { getStrategySkill } from '../strategy-packs'
import type { StrategyConfigField } from '../strategy-packs'
import type { PredefinedStrategyId, StrategyConfig } from '../types'
import {
  configToFormValues,
  validateStrategyForm,
  type StrategyFormValues,
} from '../utils/validation'
import { FormField, NumberInput, SelectInput } from './FormField'
import './FormField.css'
import './StrategyEditor.css'
import { IconChevronLeft } from './icons'

interface StrategyConfigurationProps {
  title: string
  initialConfig: StrategyConfig
  strategyId?: PredefinedStrategyId | 'custom'
  showAdjustmentMode?: boolean
  onCancel: () => void
  onSave: (config: StrategyConfig) => void
}

export function StrategyConfiguration({
  title,
  initialConfig,
  strategyId = 'custom',
  showAdjustmentMode = false,
  onCancel,
  onSave,
}: StrategyConfigurationProps) {
  const [values, setValues] = useState<StrategyFormValues>(() =>
    configToFormValues(initialConfig),
  )
  const [errors, setErrors] = useState<Partial<Record<keyof StrategyFormValues, string>>>(
    {},
  )

  const specificFields = useMemo(() => {
    const fields = new Set<StrategyConfigField>()
    const skill =
      strategyId && strategyId !== 'custom'
        ? getStrategySkill(strategyId)
        : undefined

    for (const field of skill?.configFields ?? []) {
      fields.add(field)
    }

    if (showAdjustmentMode) {
      fields.add('adjustmentMode')
      if (values.adjustmentMode === 'increase-after-loss') {
        fields.add('lossMultiplier')
        fields.add('adjustmentMultiplier')
      } else if (values.adjustmentMode === 'increase-after-win') {
        fields.add('winMultiplier')
        fields.add('adjustmentMultiplier')
      } else if (values.adjustmentMode === 'custom-progression') {
        fields.add('unitStep')
        fields.add('adjustmentMultiplier')
      }
    }

    return Array.from(fields)
  }, [strategyId, showAdjustmentMode, values.adjustmentMode])

  const update =
    (key: keyof StrategyFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateStrategyForm(values, { requireName: false })
    if (!result.config) {
      setErrors(result.errors)
      return
    }
    onSave(result.config)
  }

  return (
    <form className="editor-sheet" onSubmit={handleSubmit}>
      <div className="editor-sheet__header">
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Back"
        >
          <IconChevronLeft size={16} />
        </button>
        <h2 className="editor-sheet__title">{title}</h2>
      </div>

      <div className="editor-sheet__body">
        <p className="editor-sheet__note">
          These settings prepare the future strategy engine. They do not place bets
          yet.
        </p>
        <div className="form-grid">
          <div className="form-grid form-grid--2">
            <FormField label="Initial bet" htmlFor="cfg-initialBet" error={errors.initialBet}>
              <NumberInput
                id="cfg-initialBet"
                value={values.initialBet}
                onChange={update('initialBet')}
                placeholder="0.00010000"
              />
            </FormField>
            <FormField
              label="Target multiplier"
              htmlFor="cfg-targetMultiplier"
              error={errors.targetMultiplier}
            >
              <NumberInput
                id="cfg-targetMultiplier"
                value={values.targetMultiplier}
                onChange={update('targetMultiplier')}
                placeholder="2.00"
              />
            </FormField>
          </div>

          <div className="form-grid form-grid--2">
            <FormField label="Maximum bets" htmlFor="cfg-maxBets" error={errors.maxBets}>
              <NumberInput
                id="cfg-maxBets"
                value={values.maxBets}
                onChange={update('maxBets')}
                placeholder="10"
              />
            </FormField>
            <FormField
              label="Maximum bet amount"
              htmlFor="cfg-maxBetAmount"
              error={errors.maxBetAmount}
            >
              <NumberInput
                id="cfg-maxBetAmount"
                value={values.maxBetAmount}
                onChange={update('maxBetAmount')}
                placeholder="0.01000000"
              />
            </FormField>
          </div>

          <div className="form-grid form-grid--2">
            <FormField label="Stop-loss" htmlFor="cfg-stopLoss" error={errors.stopLoss}>
              <NumberInput
                id="cfg-stopLoss"
                value={values.stopLoss}
                onChange={update('stopLoss')}
                placeholder="0.00100000"
              />
            </FormField>
            <FormField label="Take-profit" htmlFor="cfg-takeProfit" error={errors.takeProfit}>
              <NumberInput
                id="cfg-takeProfit"
                value={values.takeProfit}
                onChange={update('takeProfit')}
                placeholder="0.00200000"
              />
            </FormField>
          </div>

          {(showAdjustmentMode || specificFields.includes('adjustmentMode')) && (
            <FormField label="Bet adjustment mode" htmlFor="cfg-adjustmentMode">
              <SelectInput
                id="cfg-adjustmentMode"
                value={values.adjustmentMode}
                onChange={update('adjustmentMode')}
              >
                <option value="fixed">Fixed amount</option>
                <option value="increase-after-loss">Increase after loss</option>
                <option value="increase-after-win">Increase after win</option>
                <option value="custom-progression">Custom progression</option>
              </SelectInput>
            </FormField>
          )}

          {specificFields.includes('lossMultiplier') && (
            <FormField
              label="Loss progression factor"
              htmlFor="cfg-lossMultiplier"
              error={errors.lossMultiplier}
              hint="Bet is multiplied by this factor after a loss."
            >
              <NumberInput
                id="cfg-lossMultiplier"
                value={values.lossMultiplier}
                onChange={update('lossMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}

          {specificFields.includes('winMultiplier') && (
            <FormField
              label="Win progression factor"
              htmlFor="cfg-winMultiplier"
              error={errors.winMultiplier}
              hint="Bet is multiplied by this factor after a win."
            >
              <NumberInput
                id="cfg-winMultiplier"
                value={values.winMultiplier}
                onChange={update('winMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}

          {specificFields.includes('unitStep') && (
            <FormField
              label="Unit step"
              htmlFor="cfg-unitStep"
              error={errors.unitStep}
              hint="Amount added or subtracted after each result."
            >
              <NumberInput
                id="cfg-unitStep"
                value={values.unitStep}
                onChange={update('unitStep')}
                placeholder="0.00010000"
              />
            </FormField>
          )}

          {specificFields.includes('adjustmentMultiplier') && (
            <FormField
              label="Adjustment multiplier"
              htmlFor="cfg-adjustmentMultiplier"
              error={errors.adjustmentMultiplier}
            >
              <NumberInput
                id="cfg-adjustmentMultiplier"
                value={values.adjustmentMultiplier}
                onChange={update('adjustmentMultiplier')}
                placeholder="2"
              />
            </FormField>
          )}
        </div>
      </div>

      <div className="editor-sheet__footer">
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </form>
  )
}
