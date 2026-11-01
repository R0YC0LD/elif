import { useEffect, useRef, useState } from 'react'
import { perf } from '../engine/perf'
import { addCoins } from '../game/logic'
import { ITEM_LIST } from '../game/items'
import { AREAS, RECIPES, ROOMS, STAGES } from '../game/progression'
import { act, store, useGame } from '../game/store'
import { NEED_KEYS, NEED_LABEL, ROOM_ORDER } from '../game/types'
import { sound } from '../game/events'
import { Ico } from './Icons'
import { patchUi, useUi } from './uiStore'

const HUES = [160, 20, 340, 45, 210, 275, 100, 0]

export function Toasts() {
  const ui = useUi()
  return (
    <div className="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} className="toast" data-k={t.kind}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function FpsMeter() {
  const s = useGame()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 400)
    return () => clearInterval(id)
  }, [])
  if (!s.settings.showFps && !s.settings.devPanel) return null
  const p = perf.snapshot()
  const dev = s.settings.devPanel
  const lines = [`FPS ${p.fps.toFixed(0)}  ort ${p.avgFps.toFixed(0)}  1% ${p.low1.toFixed(0)}`]
  if (dev) {
    lines.push(`kare ${p.frameMs.toFixed(2)} ms  çizim ${p.renderMs.toFixed(2)} ms`)
    lines.push(`nesne ${p.drawn}  parçacık ${p.particles}`)
    lines.push(`tahmini ekran ${p.refreshHz} Hz${p.heapMb ? `  bellek ${p.heapMb.toFixed(0)} MB` : ''}`)
  }
  return <div className="fps">{lines.join('\n')}</div>
}

export function ConfirmModal() {
  const ui = useUi()
  const c = ui.confirm
  if (!c) return null
  const close = () => patchUi({ confirm: null })
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-label={c.title} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-card">
        <h2>{c.title}</h2>
        <p>{c.text}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={close} autoFocus>
            Vazgeç
          </button>
          <button
            className={`btn ${c.danger ? 'danger' : 'primary'}`}
            onClick={() => {
              close()
              c.run()
            }}
          >
            {c.ok}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OfflineModal() {
  const ui = useUi()
  const o = ui.offline
  if (!o) return null
  const g = store.state
  const mins = Math.round(o.seconds / 60)
  const away = mins >= 120 ? `${Math.floor(mins / 60)} saat ${mins % 60} dakika` : `${mins} dakika`
  const diffs = NEED_KEYS.map((k) => ({ k, d: Math.round(o.after[k] - o.before[k]) })).filter((x) => Math.abs(x.d) >= 3)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Geri döndün">
      <div className="modal-card">
        <h2>Tekrar hoş geldin</h2>
        <p>
          {g.pet.name} {away} boyunca seni bekledi.
          {o.capped ? ' Hesap en fazla 8 saat geriye gider.' : ''}
          {o.woke ? ' Bu sırada uyandı.' : ''}
        </p>
        {diffs.length > 0 && (
          <div className="stat-grid">
            {diffs.map(({ k, d }) => (
              <div key={k} className="stat">
                <b>{d > 0 ? `+${d}` : d}</b>
                <span>{NEED_LABEL[k]}</span>
              </div>
            ))}
          </div>
        )}
        <p className="muted">Ödülün ve eşyaların aynen duruyor.</p>
        <button className="btn primary" onClick={() => patchUi({ offline: null })} autoFocus>
          Devam
        </button>
      </div>
    </div>
  )
}

export function LevelUpModal() {
  const ui = useUi()
  const l = ui.levelUp
  useEffect(() => {
    if (!l) return
    const id = window.setTimeout(() => patchUi({ levelUp: null }), l.stage !== null ? 6000 : 3800)
    return () => clearTimeout(id)
  }, [l])
  if (!l) return null
  const g = store.state
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Seviye atladın" onPointerDown={() => patchUi({ levelUp: null })} style={{ pointerEvents: 'auto', background: 'rgba(10,22,24,0.45)' }}>
      <div className="modal-card levelup">
        {l.stage !== null ? (
          <>
            <h2>{g.pet.name} büyüdü</h2>
            <div className="big">{STAGES[l.stage].name}</div>
            <p>Yeni evre, yeni görünüm. Kıyafetlerin ve oyun tarzın değişmeden kalır.</p>
          </>
        ) : (
          <>
            <h2>Seviye atladın</h2>
            <div className="big">{l.level}</div>
          </>
        )}
        {l.unlocks.length > 0 && (
          <div className="card" style={{ textAlign: 'left' }}>
            <h3>Açılanlar</h3>
            {l.unlocks.map((u) => (
              <p key={u} style={{ color: 'var(--text)' }}>
                {u}
              </p>
            ))}
          </div>
        )}
        <button className="btn gold" onClick={() => patchUi({ levelUp: null })} autoFocus>
          Devam
        </button>
      </div>
    </div>
  )
}

export function unlocksAt(level: number): string[] {
  const out: string[] = []
  for (const r of ROOM_ORDER) if (ROOMS[r].unlock === level) out.push(`Oda: ${ROOMS[r].name}`)
  for (const a of AREAS) if (a.unlock === level) out.push(`Keşif bölgesi: ${a.name}`)
  for (const rc of RECIPES) if (rc.minLevel === level) out.push(`Tarif: ${rc.name}`)
  const n = ITEM_LIST.filter((i) => (i.minLevel ?? 1) === level && !i.shopHidden).length
  if (n > 0) out.push(`Mağazada ${n} yeni ürün`)
  return out
}

// ---------- Eğitim ----------

let base = { pets: 0, feeds: 0, room: 'living' as string }

export function Tutorial() {
  const ui = useUi()
  const s = useGame()
  const step = ui.tutorial
  const [name, setName] = useState('Nova')
  const [hue, setHue] = useState(160)
  const adv = useRef(false)

  useEffect(() => {
    adv.current = false
  }, [step])

  useEffect(() => {
    if (step === 1 && s.stats.pets > base.pets) go(2)
    if (step === 2 && s.stats.feeds > base.feeds) go(3)
    if (step === 3 && s.currentRoom !== base.room) go(4)
  })

  function go(n: number) {
    if (adv.current) return
    adv.current = true
    const st = store.state
    base = { pets: st.stats.pets, feeds: st.stats.feeds, room: st.currentRoom }
    if (n === 2) {
      act((g) => {
        g.currentRoom = 'kitchen'
        g.inventory.apple = Math.max(g.inventory.apple ?? 0, 2)
      })
      base.room = 'kitchen'
    }
    patchUi({ tutorial: n })
  }

  const finish = () => {
    act((g) => {
      g.tutorialDone = true
      addCoins(g, 50)
    })
    sound('achievement')
    patchUi({ tutorial: -1 })
  }

  if (step < 0) return null

  if (step === 0) {
    return (
      <div className="modal" role="dialog" aria-modal="true" aria-label="Karşılama">
        <div className="modal-card">
          <h2>Merhaba, bu senin yeni arkadaşın</h2>
          <p>Küçük, meraklı ve biraz aç. Ona bir isim ver, rengini seç. Bunları sonra Nova panelinden değiştirebilirsin.</p>
          <label className="field">
            İsim
            <input className="input" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <div className="swatches" role="radiogroup" aria-label="Renk">
            {HUES.map((h) => (
              <button
                key={h}
                role="radio"
                aria-checked={hue === h}
                aria-label={`Renk ${h}`}
                className={`swatch${hue === h ? ' on' : ''}`}
                style={{ background: `hsl(${h}, 52%, 72%)` }}
                onClick={() => {
                  setHue(h)
                  act((g) => {
                    g.pet.hue = h
                  })
                }}
              />
            ))}
          </div>
          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => {
              act((g) => {
                g.pet.name = name.trim().slice(0, 16)
                g.pet.hue = hue
                g.currentRoom = 'living'
              })
              base = { pets: store.state.stats.pets, feeds: store.state.stats.feeds, room: 'living' }
              patchUi({ tutorial: 1 })
              sound('happy')
            }}
          >
            Tanıştır
          </button>
          <button className="btn small" onClick={() => { act((g) => { g.tutorialDone = true }); patchUi({ tutorial: -1 }) }}>
            Eğitimi atla
          </button>
        </div>
      </div>
    )
  }

  const texts: Record<number, { t: string; b: string; skip?: string }> = {
    1: { t: 'Önce selam ver', b: `${s.pet.name}'a dokun. Başına dokunmak ile karnına dokunmak farklı tepki verir. Parmağını üzerinde gezdirerek de sevebilirsin.` },
    2: { t: 'Karnı acıkmış', b: 'Mutfaktasın. Alttaki elmaya dokun veya sürükleyip Nova\'ya bırak.' },
    3: { t: 'Evin başka odaları da var', b: 'Sahnenin üstündeki oklarla başka bir odaya geç. Banyo, yatak odası ve daha fazlası var. Yeni odalar seviye atladıkça açılır.' },
    4: { t: 'Hazırsın', b: 'Mağazadan eşya al, mini oyunlarla coin kazan, görevleri tamamla. Nova\'nın ihtiyaçlarına ara sıra bak. İhmal etsen de kaybolmaz, ama hüzünlenir.' },
  }
  const t = texts[step]
  return (
    <div className="tutorial" role="status">
      <div className="modal-card">
        <h2>{t.t}</h2>
        <p>{t.b}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn small" onClick={finish}>
            Atla
          </button>
          {step === 3 && (
            <button className="btn small" onClick={() => go(4)}>
              Devam {Ico.right}
            </button>
          )}
          {step === 4 && (
            <button className="btn primary" onClick={finish}>
              Oyuna başla (+50 coin)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
