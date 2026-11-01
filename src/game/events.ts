import type { ToastKind } from './types'

export type GameEvent =
  | { type: 'toast'; kind: ToastKind; text: string }
  | { type: 'sound'; name: string }
  | { type: 'levelup'; level: number }
  | { type: 'stage'; stage: number }
  | { type: 'burst'; kind: 'heart' | 'star' | 'coin' | 'drop' | 'bubble' | 'note' | 'zzz' | 'leaf'; n: number }
  | { type: 'anim'; name: string }
  | { type: 'changed' }

type Listener = (e: GameEvent) => void
const listeners = new Set<Listener>()

export const bus = {
  on(fn: Listener) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  emit(e: GameEvent) {
    listeners.forEach((l) => l(e))
  },
}

export const toast = (kind: ToastKind, text: string) => bus.emit({ type: 'toast', kind, text })
export const sound = (name: string) => bus.emit({ type: 'sound', name })
