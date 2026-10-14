import type { TabId } from '../types'
import './SidebarNavigation.css'
import { IconActivity, IconList, IconSettings } from './icons'

interface SidebarNavigationProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
  disabled?: boolean
}

export function SidebarNavigation({
  activeTab,
  onChange,
  disabled = false,
}: SidebarNavigationProps) {
  return (
    <nav className="sidebar-nav" aria-label="Sidebar sections">
      <button
        type="button"
        className={`sidebar-nav__tab ${activeTab === 'strategies' ? 'is-active' : ''}`}
        onClick={() => onChange('strategies')}
        aria-current={activeTab === 'strategies' ? 'page' : undefined}
        disabled={disabled}
      >
        <IconList size={14} />
        Strategies
      </button>
      <button
        type="button"
        className={`sidebar-nav__tab ${activeTab === 'histories' ? 'is-active' : ''}`}
        onClick={() => onChange('histories')}
        aria-current={activeTab === 'histories' ? 'page' : undefined}
        disabled={disabled}
      >
        <IconActivity size={14} />
        Histories
      </button>
      <button
        type="button"
        className={`sidebar-nav__tab ${activeTab === 'settings' ? 'is-active' : ''}`}
        onClick={() => onChange('settings')}
        aria-current={activeTab === 'settings' ? 'page' : undefined}
        disabled={disabled}
      >
        <IconSettings size={14} />
        Settings
      </button>
    </nav>
  )
}
