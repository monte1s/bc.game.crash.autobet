import './SidebarHeader.css'
import { IconSettings, IconShieldCheck, IconX } from './icons'

interface SidebarHeaderProps {
  onOpenSettings: () => void
  onClose: () => void
}

export function SidebarHeader({ onOpenSettings, onClose }: SidebarHeaderProps) {
  return (
    <header className="sidebar-header">
      <div className="sidebar-header__brand">
        <div className="sidebar-header__logo" aria-hidden="true">
          <IconShieldCheck size={16} />
        </div>
        <div className="sidebar-header__title-wrap">
          <h1 className="sidebar-header__title">Crash Auto Bet</h1>
          <span className="sidebar-header__badge">BC.GAME</span>
        </div>
      </div>
      <div className="sidebar-header__actions">
        <button
          type="button"
          className="icon-button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <IconSettings size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close"
        >
          <IconX size={16} />
        </button>
      </div>
    </header>
  )
}
