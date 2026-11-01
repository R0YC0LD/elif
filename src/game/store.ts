import { useSyncExternalStore } from 'react'
import { bus } from './events'
import { loginTick, newGame, simulateOffline, type OfflineReport } from './logic'
import { idbRestore, idbSnapshot, parseSave, readSave, serialize, writeSave } from './save'
import type { GameState } from './types'

type Listener = () => void

class Store {
  state: GameState = newGame()
  version = 0
  private listeners = new Set<Listener>()
  private dirty = false
  private lastWrite = 0
  private lastUi = 0
  private lastIdb = 0

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  getVersion = () => this.version

  private notify() {
    this.version++
    this.listeners.forEach((l) => l())
  }

  mutate<T>(fn: (s: GameState) => T): T {
    const r = fn(this.state)
    this.dirty = true
    this.notify()
    if (performance.now() - this.lastWrite > 2500) this.saveNow()
    return r
  }

  // simülasyon adımları için: arayüzü saniyede en fazla dört kez uyandırır
  quiet(fn: (s: GameState) => void) {
    fn(this.state)
    this.dirty = true
    const now = performance.now()
    if (now - this.lastUi > 250) {
      this.lastUi = now
      this.notify()
    }
  }

  replace(s: GameState) {
    this.state = s
    this.dirty = true
    this.notify()
    this.saveNow()
  }

  tickSave() {
    if (this.dirty && performance.now() - this.lastWrite > 15000) this.saveNow()
  }

  saveNow() {
    this.state.lastSeen = Date.now()
    if (writeSave(this.state)) {
      this.dirty = false
      this.lastWrite = performance.now()
      if (performance.now() - this.lastIdb > 120000) {
        this.lastIdb = performance.now()
        void idbSnapshot(serialize(this.state))
      }
    }
  }

  load(): { fresh: boolean; offline: OfflineReport | null; recovered: boolean; error?: string } {
    const { state, recovered, error } = readSave()
    if (!state) {
      this.state = newGame()
      loginTick(this.state)
      this.notify()
      return { fresh: true, offline: null, recovered: false, error }
    }
    this.state = state
    const elapsed = (Date.now() - state.lastSeen) / 1000
    let offline: OfflineReport | null = null
    if (elapsed > 60) offline = simulateOffline(state, elapsed)
    loginTick(state)
    this.dirty = true
    this.notify()
    return { fresh: false, offline, recovered }
  }

  async tryIdbRecovery(): Promise<boolean> {
    const text = await idbRestore()
    if (!text) return false
    const r = parseSave(text)
    if (!r.ok || !r.state) return false
    this.replace(r.state)
    return true
  }
}

export const store = new Store()

export function useGame(): GameState {
  useSyncExternalStore(store.subscribe, store.getVersion)
  return store.state
}

export function act<T>(fn: (s: GameState) => T): T {
  const r = store.mutate(fn)
  bus.emit({ type: 'changed' })
  return r
}
