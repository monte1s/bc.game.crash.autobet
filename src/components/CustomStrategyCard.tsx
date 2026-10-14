import { useEffect, useRef, useState } from 'react'
import type { CustomStrategy } from '../types'
import { formatBet, formatMultiplier } from '../data/defaults'
import './CustomStrategyCard.css'
import { IconMoreVertical, IconSettings } from './icons'

interface CustomStrategyCardProps {
  strategy: CustomStrategy
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  onConfigure: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function CustomStrategyCard({
  strategy,
  selected,
  disabled = false,
  onSelect,
  onConfigure,
  onEdit,
  onDuplicate,
  onDelete,
}: CustomStrategyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <div className={`custom-card ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="custom-card__main"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
      >
        <div className="strategy-card__icon accent-gray">
          <IconSettings size={15} />
        </div>
        <div className="custom-card__meta">
          <p className="custom-card__name">{strategy.name}</p>
          <p className="custom-card__summary">
            Bet: {formatBet(strategy.config.initialBet)} | Multiplier:{' '}
            {formatMultiplier(strategy.config.targetMultiplier)} | Max:{' '}
            {strategy.config.maxBets}
          </p>
        </div>
      </button>

      <div className="custom-card__menu" ref={menuRef}>
        <button
          type="button"
          className="icon-button"
          aria-label={`Actions for ${strategy.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <IconMoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="custom-card__menu-panel" role="menu">
            <button
              type="button"
              className="custom-card__menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onConfigure()
              }}
            >
              Configure
            </button>
            <button
              type="button"
              className="custom-card__menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onEdit()
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="custom-card__menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onDuplicate()
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="custom-card__menu-item is-danger"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
