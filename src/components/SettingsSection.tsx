import type { ReactNode } from 'react'
import './SettingsSection.css'

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <h3 className="settings-section__title">{title}</h3>
      <div className="settings-section__stack">{children}</div>
    </section>
  )
}

interface SettingsToggleProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function SettingsToggle({
  id,
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: SettingsToggleProps) {
  return (
    <div className="settings-toggle">
      <div className="settings-toggle__copy">
        <p className="settings-toggle__label" id={`${id}-label`}>
          {label}
        </p>
        {hint ? <p className="settings-toggle__hint">{hint}</p> : null}
      </div>
      <label className="toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-labelledby={`${id}-label`}
        />
        <span className="toggle__track">
          <span className="toggle__thumb" />
        </span>
      </label>
    </div>
  )
}
