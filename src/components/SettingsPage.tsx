import { useAppState } from '../state/useAppState'
import { FormField, NumberInput } from './FormField'
import { SettingsSection, SettingsToggle } from './SettingsSection'
import './SettingsPage.css'
import './FormField.css'

export function SettingsPage() {
  const { state, updateSettings } = useAppState()
  const { settings, isRunning } = state

  return (
    <div className="settings-page">
      <h2 className="settings-page__heading">Settings</h2>

      <SettingsSection title="Betting Defaults">
        <FormField label="Default starting bet" htmlFor="settings-defaultStartingBet">
          <NumberInput
            id="settings-defaultStartingBet"
            value={String(settings.defaultStartingBet)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0) {
                updateSettings({ defaultStartingBet: value })
              }
            }}
          />
        </FormField>
        <FormField
          label="Default target multiplier"
          htmlFor="settings-defaultTargetMultiplier"
        >
          <NumberInput
            id="settings-defaultTargetMultiplier"
            value={String(settings.defaultTargetMultiplier)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value >= 1.01) {
                updateSettings({ defaultTargetMultiplier: value })
              }
            }}
          />
        </FormField>
        <FormField label="Default maximum bets" htmlFor="settings-defaultMaxBets">
          <NumberInput
            id="settings-defaultMaxBets"
            value={String(settings.defaultMaxBets)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0 && Number.isInteger(value)) {
                updateSettings({ defaultMaxBets: value })
              }
            }}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection title="Safety Limits">
        <FormField label="Maximum bet amount" htmlFor="settings-maxBetAmount">
          <NumberInput
            id="settings-maxBetAmount"
            value={String(settings.maxBetAmount)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0) {
                updateSettings({ maxBetAmount: value })
              }
            }}
          />
        </FormField>
        <FormField label="Stop-loss limit" htmlFor="settings-stopLoss">
          <NumberInput
            id="settings-stopLoss"
            value={String(settings.stopLoss)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value >= 0) {
                updateSettings({ stopLoss: value })
              }
            }}
          />
        </FormField>
        <FormField label="Take-profit target" htmlFor="settings-takeProfit">
          <NumberInput
            id="settings-takeProfit"
            value={String(settings.takeProfit)}
            disabled={isRunning}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value >= 0) {
                updateSettings({ takeProfit: value })
              }
            }}
          />
        </FormField>
      </SettingsSection>

      <SettingsSection title="Interface">
        <SettingsToggle
          id="settings-compactMode"
          label="Compact mode"
          hint="Hide strategy descriptions to fit more cards on screen."
          checked={settings.compactMode}
          onChange={(compactMode) => updateSettings({ compactMode })}
        />
        <SettingsToggle
          id="settings-confirmBeforeStarting"
          label="Confirm before starting"
          hint="Ask for confirmation before entering the simulated running state."
          checked={settings.confirmBeforeStarting}
          disabled={isRunning}
          onChange={(confirmBeforeStarting) =>
            updateSettings({ confirmBeforeStarting })
          }
        />
      </SettingsSection>

      <p className="settings-page__disclaimer">
        These are configuration preferences for the sidebar UI. They do not guarantee
        any betting outcome, and this build does not execute real auto-bets on
        BC.GAME.
      </p>
    </div>
  )
}
