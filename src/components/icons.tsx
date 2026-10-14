import type { ReactElement, ReactNode, SVGProps } from 'react'
import type { StrategyIconName } from '../types'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function BaseIcon({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconShieldCheck(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </BaseIcon>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </BaseIcon>
  )
}

export function IconX(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  )
}

export function IconList(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </BaseIcon>
  )
}

export function IconActivity(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </BaseIcon>
  )
}

export function IconRefresh(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </BaseIcon>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </BaseIcon>
  )
}

export function IconChevronLeft(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </BaseIcon>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function IconSquare(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function IconWallet(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
      <path d="M16 12h.01" />
      <path d="M2 9V6a2 2 0 0 1 2-2h13" />
    </BaseIcon>
  )
}

export function IconCoins(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </BaseIcon>
  )
}

export function IconPiggy(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4v2h3v-2h4v2h3v-2c3 0 4-1.2 4-4 0-1-.2-1.7-.7-2.3.5-.7.7-1.5.7-2.2C21 6.2 20.2 5 19 5Z" />
      <path d="M2 12h2" />
      <path d="M16 11h.01" />
    </BaseIcon>
  )
}

export function IconMoreVertical(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function IconTrendingUp(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 7h5v5" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </BaseIcon>
  )
}

export function IconStairs(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 20h4v-4h4v-4h4V8h4V4h4" />
    </BaseIcon>
  )
}

export function IconTarget(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </BaseIcon>
  )
}

export function IconScale(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </BaseIcon>
  )
}

export function IconSpiral(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 7a5 5 0 1 0 5 5" />
      <path d="M12 11a1 1 0 1 0 1 1" />
    </BaseIcon>
  )
}

const strategyIconMap: Record<StrategyIconName, (props: IconProps) => ReactElement> = {
  'trending-up': IconTrendingUp,
  stairs: IconStairs,
  coins: IconCoins,
  target: IconTarget,
  scale: IconScale,
  spiral: IconSpiral,
  settings: IconSettings,
}

export function StrategyIcon({
  name,
  ...props
}: IconProps & { name: StrategyIconName }) {
  const Icon = strategyIconMap[name]
  return <Icon {...props} />
}
