import type { NeedKey } from '../game/types'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function Coin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f2b630" stroke="#0f2123" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.3" fill="none" stroke="#c98a12" strokeWidth="1.6" />
      <path d="M12 8v8M9.6 10.2c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.5-.9 1.2-2.4 1.5-2.4.7-2.4 1.6 1 1.6 2.4 1.6 2.4-.6 2.4-1.6" fill="none" stroke="#7a5208" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Ep() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#6db3d9" stroke="#0f2123" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function NeedIcon({ k }: { k: NeedKey }) {
  const c = `var(--need-${k})`
  switch (k) {
    case 'hunger':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7c-4-3-8 0-8 5 0 4 3 8 6 8 1 0 1.4-.5 2-.5s1 .5 2 .5c3 0 6-4 6-8 0-5-4-8-8-5z" fill={c} stroke="#0f2123" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 7c0-2 1-3.4 3-4" fill="none" stroke="#0f2123" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'thirst':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.8c3.2 4 6 7 6 10.4a6 6 0 0 1-12 0C6 9.800 8.800 6.800 12 2.800z" fill={c} stroke="#0f2123" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 14a3 3 0 0 0 2.200 3" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'happiness':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9.500" fill={c} stroke="#0f2123" strokeWidth="1.8" />
          <circle cx="8.800" cy="10" r="1.300" fill="#0f2123" />
          <circle cx="15.200" cy="10" r="1.300" fill="#0f2123" />
          <path d="M7.800 14c1.200 2.200 6.200 2.200 8.400 0" fill="none" stroke="#0f2123" strokeWidth="1.800" strokeLinecap="round" />
        </svg>
      )
    case 'health':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.500" y="3.500" width="17" height="17" rx="4.500" fill="#fff" stroke="#0f2123" strokeWidth="1.800" />
          <path d="M12 7v10M7 12h10" stroke={c} strokeWidth="3.600" strokeLinecap="round" />
        </svg>
      )
    case 'hygiene':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="14" r="5.500" fill={c} fillOpacity="0.55" stroke="#0f2123" strokeWidth="1.800" />
          <circle cx="16.500" cy="8.500" r="3.800" fill={c} fillOpacity="0.55" stroke="#0f2123" strokeWidth="1.800" />
          <circle cx="17" cy="17.500" r="2.200" fill={c} fillOpacity="0.55" stroke="#0f2123" strokeWidth="1.600" />
        </svg>
      )
    case 'energy':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.500 2.500L5 13.500h6l-1.500 8L19 10h-6.200z" fill={c} stroke="#0f2123" strokeWidth="1.800" strokeLinejoin="round" />
        </svg>
      )
    case 'fun':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill={c} stroke="#0f2123" strokeWidth="1.800" />
          <path d="M3.500 10c5 2 12 2 17 0M5 17c4-2 10-2 14 0" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinecap="round" />
        </svg>
      )
    case 'social':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20c-6-4.200-8.500-7-8.500-10.200A4.600 4.600 0 0 1 12 7.600a4.600 4.600 0 0 1 8.500 2.200C20.500 13 18 15.800 12 20z" fill={c} stroke="#0f2123" strokeWidth="1.800" strokeLinejoin="round" />
        </svg>
      )
    case 'comfort':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="5" fill={c} stroke="#0f2123" strokeWidth="1.800" />
          <path d="M8 6c0 4 0 8 0 12M16 6c0 4 0 8 0 12" fill="none" stroke="#0f2123" strokeOpacity="0.4" strokeWidth="1.400" />
        </svg>
      )
  }
}

export const Ico = {
  shop: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 9l1.500-5h13L20 9M4 9h16v3a2.500 2.500 0 0 1-5 0 2.500 2.500 0 0 1-5 0 2.500 2.500 0 0 1-5 0zM5 14v6h14v-6M10 20v-4h4v4" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2M9.500 13h5" />
    </svg>
  ),
  games: (
    <svg viewBox="0 0 24 24" {...S}>
      <rect x="2.500" y="7" width="19" height="11" rx="5" />
      <path d="M7 10.500v4M5 12.500h4M15.500 11.500h.01M18 13.500h.01" />
    </svg>
  ),
  quest: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M6 3h12v18l-6-3.500L6 21zM9.500 9l1.800 1.800L15 7.500" />
    </svg>
  ),
  shirt: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M8.500 3.500L3 7l2.500 4 2-1V20h9V10l2 1L21 7l-5.500-3.500a3.500 3.500 0 0 1-7 0z" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3.500 11.500L12 4l8.500 7.500M6 10v10h12V10M10 20v-5h4v5" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" {...S}>
      <rect x="5" y="10.500" width="14" height="10" rx="2.500" />
      <path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" />
    </svg>
  ),
  hammer: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M14 4l6 6-2.500 2.500-6-6zM12 8L4 16l4 4 8-8M3 21l3-3" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600L7 7M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M7 4.500l12 7.500-12 7.500z" />
    </svg>
  ),
  rotate: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 12a8 8 0 0 1 14-5.300M20 4v4h-4M20 12a8 8 0 0 1-14 5.300M4 20v-4h4" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M12 3a9 9 0 1 0 0 18c1.500 0 2-1 1.500-2.200S13 17 15 17h2a4 4 0 0 0 4-4c0-5-4-10-9-10z" />
      <circle cx="7.500" cy="11" r="1" />
      <circle cx="11" cy="7.500" r="1" />
      <circle cx="16" cy="8.500" r="1" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.500h.01" />
    </svg>
  ),
  bulb: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.700.600 1 1.200 1 2.100h5c0-.9.300-1.500 1-2.100A6 6 0 0 0 12 3z" />
    </svg>
  ),
}
