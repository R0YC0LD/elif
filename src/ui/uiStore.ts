import { useSyncExternalStore } from 'react'
import type { OfflineReport } from '../game/logic'
import type { ToastKind } from '../game/types'

export type PanelId = 'shop' | 'bag' | 'quests' | 'profile' | 'games' | 'settings' | 'wardrobe' | 'craft' | 'rooms' | null

export interface ToastItem {
  id: number
  kind: ToastKind
  text: string
  amount?: number
  at: number
}

export interface UiState {
  panel: PanelId
  panelTab: string
  game: string | null
  toasts: ToastItem[]
  offline: OfflineReport | null
  levelUp: { level: number; stage: number | null; unlocks: string[] } | null
  pending: { level: number; stage: number | null; unlocks: string[] } | null
  tutorial: number
  confirm: { title: string; text: string; ok: string; danger?: boolean; run: () => void } | null
  version: number
}

export const ui: UiState = {
  panel: null,
  panelTab: '',
  game: null,
  toasts: [],
  offline: null,
  levelUp: null,
  pending: null,
  tutorial: -1,
  confirm: null,
  version: 0,
}

const listeners = new Set<() => void>()

export function patchUi(p: Partial<UiState>) {
  Object.assign(ui, p)
  ui.version++
  listeners.forEach((l) => l())
}

export function useUi(): UiState {
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => ui.version,
  )
  return ui
}

let toastId = 1
export function pushToast(kind: ToastKind, text: string) {
  const now = performance.now()
  const num = /^\+(\d+)\s/.exec(text)
  const last = ui.toasts[ui.toasts.length - 1]
  if ((kind === 'coin' || kind === 'xp') && num && last && last.kind === kind && now - last.at < 1500 && last.amount !== undefined) {
    last.amount += Number(num[1])
    last.text = `+${last.amount} ${kind === 'coin' ? 'coin' : 'XP'}`
    last.at = now
    patchUi({ toasts: [...ui.toasts] })
    return
  }
  const t: ToastItem = { id: toastId++, kind, text, at: now, amount: num ? Number(num[1]) : undefined }
  const list = [...ui.toasts, t].slice(-4)
  patchUi({ toasts: list })
  window.setTimeout(() => patchUi({ toasts: ui.toasts.filter((x) => x.id !== t.id) }), kind === 'level' || kind === 'achievement' ? 3400 : 2400)
}

export function openPanel(panel: PanelId, tab = '') {
  patchUi({ panel, panelTab: tab })
}

export function closePanel() {
  patchUi({ panel: null })
}

export function ask(c: NonNullable<UiState['confirm']>) {
  patchUi({ confirm: c })
}
