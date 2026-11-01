import { useEffect, useState } from 'react'
import { audio } from '../audio/audio'
import { bus, toast } from '../game/events'
import { GameShell, GamesPanel } from '../minigames/GameHub'
import * as logic from '../game/logic'
import { act, store, useGame } from '../game/store'
import { clockOf } from '../game/world'
import { Dock, Hud, NeedsRail, NeedsStrip, Stage } from './Chrome'
import { ConfirmModal, FpsMeter, LevelUpModal, OfflineModal, Toasts, Tutorial, unlocksAt } from './Overlays'
import { BagPanel, CraftPanel, ProfilePanel, QuestsPanel, RoomsPanel, ShopPanel, WardrobePanel } from './Panels'
import { SettingsPanel, applySettings } from './Settings'
import { closePanel, patchUi, pushToast, useUi } from './uiStore'
import { patchSceneUi, sceneUi } from '../render/scene'

function SidePanel() {
  const s = useGame()
  return (
    <aside className="side" aria-label="Özet">
      <div className="card">
        <h3>Bugünün görevleri</h3>
        {s.daily.quests.map((q) => {
          const p = Math.min(q.target, s.stats[q.stat] - q.base)
          return (
            <div key={q.id} style={{ marginTop: 6 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{q.title}</div>
              <div className="progress">
                <i style={{ width: `${(Math.max(0, p) / q.target) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const ui = useUi()

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __nova: unknown }).__nova = { store, act, logic }
    const r = store.load()
    applySettings(store.state.settings)
    if (r.recovered) toast('warn', 'Ana kayıt okunamadı, yedekten yüklendi.')
    if (r.fresh && r.error) {
      void store.tryIdbRecovery().then((ok) => {
        if (ok) {
          applySettings(store.state.settings)
          toast('warn', 'Kayıt tarayıcı yedeğinden geri yüklendi.')
        }
      })
    }
    if (!store.state.tutorialDone) patchUi({ tutorial: 0 })
    if (r.offline && r.offline.seconds >= 60) patchUi({ offline: r.offline })
    setReady(true)

    const off = bus.on((e) => {
      if (e.type === 'toast') pushToast(e.kind, e.text)
      else if (e.type === 'sound') audio.play(e.name)
      else if (e.type === 'levelup') patchUi({ levelUp: { level: e.level, stage: null, unlocks: unlocksAt(e.level) } })
      else if (e.type === 'stage' && ui.levelUp) patchUi({ levelUp: { ...ui.levelUp, stage: e.stage } })
      else if (e.type === 'stage') patchUi({ levelUp: { level: store.state.level, stage: e.stage, unlocks: [] } })
    })

    const unlock = () => {
      audio.unlock()
      audio.configure({ music: store.state.settings.music, sfx: store.state.settings.sfx, musicVol: store.state.settings.musicVol, sfxVol: store.state.settings.sfxVol })
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    const save = () => store.saveNow()
    const vis = () => {
      if (document.hidden) {
        save()
        audio.suspend(true)
      } else audio.suspend(false)
    }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', save)
    window.addEventListener('beforeunload', save)

    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ui.confirm) patchUi({ confirm: null })
        else if (ui.panel) closePanel()
        else if (sceneUi.decorOn) patchSceneUi({ decorOn: false, placing: null, selected: null })
      }
    }
    window.addEventListener('keydown', key)

    const mood = window.setInterval(() => {
      const c = clockOf(store.state.worldMinutes)
      audio.setMood(c.daylight < 0.3 ? 'night' : 'day')
    }, 5000)

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined)
    }

    return () => {
      off()
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', save)
      window.removeEventListener('beforeunload', save)
      window.removeEventListener('keydown', key)
      clearInterval(mood)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const s = useGame()
  useEffect(() => {
    if (ready) applySettings(s.settings)
  }, [ready, s.settings.fontScale, s.settings.highContrast, s.settings.reduceMotion, s.settings.music, s.settings.sfx, s.settings.musicVol, s.settings.sfxVol, s.settings])

  if (!ready) return null

  return (
    <div className="app">
      <Hud />
      <div className="main">
        <NeedsRail />
        <div className="stage-col">
          <Stage />
          <NeedsStrip />
        </div>
        <SidePanel />
      </div>
      <Dock />
      <Toasts />
      <FpsMeter />
      {ui.panel === 'shop' && <ShopPanel />}
      {ui.panel === 'bag' && <BagPanel />}
      {ui.panel === 'quests' && <QuestsPanel />}
      {ui.panel === 'profile' && <ProfilePanel />}
      {ui.panel === 'games' && <GamesPanel />}
      {ui.panel === 'settings' && <SettingsPanel />}
      {ui.panel === 'wardrobe' && <WardrobePanel />}
      {ui.panel === 'craft' && <CraftPanel />}
      {ui.panel === 'rooms' && <RoomsPanel />}
      {ui.game && <GameShell />}
      <OfflineModal />
      <LevelUpModal />
      <Tutorial />
      <ConfirmModal />
    </div>
  )
}
