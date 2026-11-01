import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ITEMS } from '../game/items'
import {
  danceReward,
  decorScore,
  flipItem,
  moodOf,
  ownedCount,
  setSleep,
  tintItem,
  toggleLamp,
} from '../game/logic'
import { ROOMS, xpNeeded } from '../game/progression'
import { act, useGame } from '../game/store'
import { NEED_KEYS, NEED_LABEL, ROOM_ORDER, type Category, type GameState, type RoomId } from '../game/types'
import { PHASE_LABEL, SEASON_LABEL, WEATHER_LABEL, clockOf, weatherAt } from '../game/world'
import { sound, toast } from '../game/events'
import { iconUrl } from '../render/icons'
import { patchSceneUi, scene, useSceneUi } from '../render/scene'
import { Coin, Ep, Ico, NeedIcon } from './Icons'
import { openPanel, useUi } from './uiStore'

export function ItemIcon({ id, size = 64 }: { id: string; size?: number }) {
  return <img src={iconUrl(id, size)} width={size} height={size} alt="" draggable={false} />
}

export function Hud() {
  const s = useGame()
  const need = xpNeeded(s.level)
  return (
    <header className="hud">
      <button className="lvl" style={{ background: 'none', border: 0, color: 'inherit', padding: 0, textAlign: 'left' }} onClick={() => openPanel('profile')} aria-label="Profil">
        <span className="lvl-badge">{s.level}</span>
        <span className="lvl-info">
          <div className="lvl-name">{s.pet.name}</div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={s.xp} aria-label="Deneyim">
            <i style={{ width: `${Math.min(100, (s.xp / need) * 100)}%`, background: 'var(--gold)' }} />
          </div>
          <div className="lvl-sub">
            {s.xp} / {need} XP
          </div>
        </span>
      </button>
      <span className="pill" title="Coin">
        <Coin />
        <span key={s.coins} className="bump">
          {s.coins}
        </span>
      </span>
      {s.epCycle && (
        <span className="pill" title="Etkinlik puanı">
          <Ep />
          <span key={s.ep} className="bump">
            {s.ep}
          </span>
        </span>
      )}
      <button className="iconbtn" onClick={() => openPanel('settings')} aria-label="Ayarlar">
        {Ico.gear}
      </button>
    </header>
  )
}

function NeedBar({ s, k }: { s: GameState; k: (typeof NEED_KEYS)[number] }) {
  const v = Math.round(s.pet.needs[k])
  return (
    <div className={`need${v < 25 ? ' low' : ''}`} style={{ '--c': `var(--need-${k})` } as CSSProperties} title={`${NEED_LABEL[k]}: ${v}`} role="img" aria-label={`${NEED_LABEL[k]} yüzde ${v}`}>
      <NeedIcon k={k} />
      <b className="rail-label">{NEED_LABEL[k]}</b>
      <div className="bar">
        <i style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function NeedsStrip() {
  const s = useGame()
  return (
    <div className="needs-strip" aria-label="İhtiyaçlar">
      {NEED_KEYS.map((k) => (
        <NeedBar key={k} s={s} k={k} />
      ))}
    </div>
  )
}

export function NeedsRail() {
  const s = useGame()
  return (
    <aside className="needs-rail" aria-label="İhtiyaçlar">
      {NEED_KEYS.map((k) => (
        <NeedBar key={k} s={s} k={k} />
      ))}
    </aside>
  )
}

function statusLine(s: GameState): string | null {
  const n = s.pet.name
  switch (moodOf(s)) {
    case 'sleeping':
      return `${n} uyuyor.`
    case 'sick':
      return `${n} hasta. İlaç ver ve dinlendir.`
    case 'sleepy':
      return `${n} çok yorgun. Uyutmayı dene.`
    case 'hungry':
      return `${n} acıktı.`
    case 'thirsty':
      return `${n} susadı.`
    case 'dirty':
      return `${n} kirlendi. Banyoya götür.`
    case 'sad':
      return `${n} biraz üzgün. Biraz ilgi iyi gelir.`
    default:
      return null
  }
}

export function Stage() {
  const s = useGame()
  const ref = useRef<HTMLCanvasElement>(null)
  const su = useSceneUi()
  const ui = useUi()

  useEffect(() => {
    const cv = ref.current!
    scene.attach(cv)
    scene.start()
    const ro = new ResizeObserver(() => scene.resize())
    ro.observe(cv)
    return () => {
      ro.disconnect()
      scene.detach()
    }
  }, [])

  useEffect(() => {
    scene.resize()
  }, [s.settings.lowGfx])

  useEffect(() => {
    scene.setBath(s.currentRoom === 'bathroom')
    if (s.currentRoom !== 'bathroom') return
    return () => scene.setBath(false)
  }, [s.currentRoom])

  const unlocked = ROOM_ORDER.filter((r) => s.unlockedRooms.includes(r))
  const idx = unlocked.indexOf(s.currentRoom)
  const go = (d: number) => {
    const next = unlocked[(idx + d + unlocked.length) % unlocked.length]
    sound('room')
    act((g) => {
      g.currentRoom = next
    })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.panel || ui.game || ui.confirm || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const clock = clockOf(s.worldMinutes)
  const w = weatherAt(s.worldMinutes)
  const line = statusLine(s)
  const hh = String(clock.hour).padStart(2, '0')
  const mm = String(clock.minute).padStart(2, '0')

  return (
    <div className="stage-wrap">
      <div className={`stage${su.decorOn ? ' contain' : ''}`}>
        <canvas ref={ref} aria-label={`${ROOMS[s.currentRoom].name}. ${s.pet.name} burada.`} role="img" />
        <div className="room-bar">
          <button className="arrow" onClick={() => go(-1)} aria-label="Önceki oda" disabled={unlocked.length < 2}>
            {Ico.left}
          </button>
          <div className="room-title">
            {ROOMS[s.currentRoom].name}
            <small>
              {hh}:{mm}
              <span className="more"> {PHASE_LABEL[clock.phase]} · {SEASON_LABEL[clock.season]} · {WEATHER_LABEL[w]}</span>
            </small>
          </div>
          <button className="arrow" onClick={() => go(1)} aria-label="Sonraki oda" disabled={unlocked.length < 2}>
            {Ico.right}
          </button>
        </div>
        {su.bathOn && su.bathHint ? <div className="hintbar">{su.bathHint}</div> : line && !su.decorOn ? <div className="mood-chip">{line}</div> : null}
        {su.decorOn && <div className="hintbar">Düzenleme: eşyaya dokun, sürükle, aşağıdan çevir veya kaldır.</div>}
      </div>
    </div>
  )
}

// ---------- Alt çubuk ----------

interface TrayProps {
  cats: Category[]
}

function useTrayItems(s: GameState, cats: Category[]) {
  return Object.keys(ITEMS)
    .filter((id) => cats.includes(ITEMS[id].cat))
    .filter((id) => ownedCount(s, id) > 0)
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name, 'tr'))
}

function TrayItem({ id, count }: { id: string; count: number }) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const st = useRef({ x: 0, y: 0, down: false, moved: false })
  const onDown = (e: React.PointerEvent) => {
    st.current = { x: e.clientX, y: e.clientY, down: true, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const t = st.current
    if (!t.down) return
    const d = Math.hypot(e.clientX - t.x, e.clientY - t.y)
    if (d > 10) t.moved = true
    if (t.moved && e.pointerType !== 'touch') setDrag({ x: e.clientX, y: e.clientY })
    else if (t.moved && Math.abs(e.clientY - t.y) > 14) setDrag({ x: e.clientX, y: e.clientY })
  }
  const onUp = (e: React.PointerEvent) => {
    const t = st.current
    t.down = false
    const wasDrag = drag !== null
    setDrag(null)
    if (wasDrag) {
      if (scene.hitPet(e.clientX, e.clientY)) {
        const p = scene.toScene(e.clientX, e.clientY)
        scene.feed(id, p)
      }
      return
    }
    if (!t.moved) scene.feed(id)
  }
  const it = ITEMS[id]
  return (
    <>
      <button className="tray-item" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} aria-label={`${it.name}, ${count} adet. Kullan`} title={it.name}>
        <ItemIcon id={id} size={46} />
        {it.cat !== 'toy' && <span className="cnt">{count}</span>}
      </button>
      {drag && (
        <div className="ghost" style={{ left: drag.x, top: drag.y }}>
          <ItemIcon id={id} size={64} />
        </div>
      )}
    </>
  )
}

function Tray({ cats, empty }: TrayProps & { empty: string }) {
  const s = useGame()
  const ids = useTrayItems(s, cats)
  return (
    <div className="tray" role="list">
      {ids.length === 0 && <span className="tray-empty">{empty}</span>}
      {ids.map((id) => (
        <TrayItem key={id} id={id} count={ownedCount(s, id)} />
      ))}
    </div>
  )
}

const BATH_TOOLS: { id: 'soap' | 'sponge' | 'shower' | 'towel'; label: string; icon: ReactNode }[] = [
  {
    id: 'soap',
    label: 'Sabun',
    icon: (
      <svg viewBox="0 0 40 40" width="34" height="34">
        <rect x="5" y="12" width="30" height="18" rx="6" fill="#8fd0e8" stroke="#0f2123" strokeWidth="2.4" />
        <path d="M11 18h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'sponge',
    label: 'Sünger',
    icon: (
      <svg viewBox="0 0 40 40" width="34" height="34">
        <rect x="6" y="11" width="28" height="20" rx="7" fill="#f2cf4a" stroke="#0f2123" strokeWidth="2.4" />
        <circle cx="15" cy="18" r="2" fill="#c9a444" />
        <circle cx="25" cy="23" r="2.4" fill="#c9a444" />
        <circle cx="21" cy="16" r="1.5" fill="#c9a444" />
      </svg>
    ),
  },
  {
    id: 'shower',
    label: 'Duş',
    icon: (
      <svg viewBox="0 0 40 40" width="34" height="34">
        <path d="M6 14h22a6 6 0 0 0-6-6H12a6 6 0 0 0-6 6z" fill="#9aa5ad" stroke="#0f2123" strokeWidth="2.4" />
        <path d="M10 20v4M16 20v6M22 20v4M28 20v6" stroke="#6db3d9" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'towel',
    label: 'Havlu',
    icon: (
      <svg viewBox="0 0 40 40" width="34" height="34">
        <rect x="6" y="8" width="28" height="24" rx="4" fill="#e8746a" stroke="#0f2123" strokeWidth="2.4" />
        <path d="M6 16h28M6 24h28" stroke="#fff" strokeWidth="2" opacity="0.7" />
      </svg>
    ),
  },
]

function BathTools() {
  const su = useSceneUi()
  return (
    <div className="tray" role="toolbar" aria-label="Banyo araçları">
      {BATH_TOOLS.map((t) => (
        <button key={t.id} className={`btn small${su.bathTool === t.id ? ' gold' : ''}`} style={{ flexDirection: 'column', gap: 0, minHeight: 58, minWidth: 64 }} onClick={() => scene.setBathTool(t.id)} aria-pressed={su.bathTool === t.id}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

let lastDance = 0

function SleepControls() {
  const s = useGame()
  const lampLabel = s.pet.lampOn ? 'Lamba kapat' : 'Lamba aç'
  return (
    <div className="tray">
      {s.pet.asleep ? (
        <button
          className="btn gold"
          onClick={() => {
            act((g) => setSleep(g, false))
            sound('wake')
          }}
        >
          {Ico.sun} Uyandır
        </button>
      ) : (
        <button
          className="btn mint"
          onClick={() => {
            const r = act((g) => setSleep(g, true))
            if (!r.ok) toast('warn', r.reason ?? 'Olmadı.')
            else sound('close')
          }}
        >
          {Ico.moon} Uyut
        </button>
      )}
      <button
        className="btn"
        onClick={() => {
          act((g) => toggleLamp(g))
          sound('click')
        }}
      >
        {Ico.bulb} {lampLabel}
      </button>
      <Tray cats={['medicine']} empty="" />
    </div>
  )
}

function DecorBar({ s }: { s: GameState }) {
  const su = useSceneUi()
  const sel = s.rooms[s.currentRoom].placed.find((p) => p.uid === su.selected)
  return (
    <div className="ctx">
      <div className="tray" role="toolbar" aria-label="Dekor araçları">
        <button className="btn gold" onClick={() => patchSceneUi({ decorOn: false, placing: null, selected: null })}>
          Bitti
        </button>
        <button className="btn" onClick={() => openPanel('bag', 'decor')}>
          {Ico.bag} Ekle
        </button>
        <button
          className="btn"
          disabled={!sel}
          onClick={() => {
            act((g) => flipItem(g, g.currentRoom, su.selected!))
            sound('click')
          }}
        >
          {Ico.rotate} Çevir
        </button>
        <button
          className="btn"
          disabled={!sel}
          onClick={() => {
            act((g) => tintItem(g, g.currentRoom, su.selected!))
            sound('click')
          }}
        >
          {Ico.palette} Renk
        </button>
        <button className="btn danger" disabled={!sel} onClick={() => scene.removeSelected()}>
          {Ico.trash} Kaldır
        </button>
        <span className="tray-empty">{sel ? ITEMS[sel.item].name : su.placing ? `${ITEMS[su.placing].name}: yerleştirmek için sahneye dokun.` : 'Bir eşya seç.'}</span>
      </div>
    </div>
  )
}

export function Dock() {
  const s = useGame()
  const su = useSceneUi()
  const room: RoomId = s.currentRoom
  let ctx: ReactNode = null

  if (su.decorOn) ctx = <DecorBar s={s} />
  else {
    switch (room) {
      case 'kitchen':
        ctx = <Tray cats={['food', 'drink']} empty="Yiyecek yok. Mağazadan al." />
        break
      case 'living':
        ctx = (
          <>
            <Tray cats={['toy', 'medicine']} empty="Oyuncak veya ilaç yok." />
            <button
              className="btn mint"
              onClick={() => {
                const now = performance.now()
                if (now - lastDance < 5000) return
                lastDance = now
                scene.anim.play('dancing', { loop: true })
                window.setTimeout(() => scene.anim.release('dancing'), 4500)
                scene.burst('note', 6)
                sound('happy')
                act((g) => danceReward(g))
              }}
            >
              Dans
            </button>
          </>
        )
        break
      case 'bathroom':
        ctx = <BathTools />
        break
      case 'bedroom':
        ctx = <SleepControls />
        break
      case 'playroom':
        ctx = (
          <>
            <button className="btn primary" onClick={() => openPanel('games')}>
              {Ico.games} Mini oyunlar
            </button>
            <Tray cats={['toy']} empty="" />
          </>
        )
        break
      case 'garden':
        ctx = (
          <>
            <button className="btn primary" onClick={() => openPanel('craft', 'explore')}>
              Keşfe çık
            </button>
            <span className="tray-empty">{decorScore(s, room)} dekor puanı</span>
          </>
        )
        break
      case 'study':
        ctx = (
          <>
            <button className="btn primary" onClick={() => openPanel('craft', 'craft')}>
              {Ico.hammer} Üretim
            </button>
            <button className="btn" onClick={() => openPanel('craft', 'explore')}>
              Keşif
            </button>
          </>
        )
        break
      case 'vault':
        ctx = (
          <button className="btn gold" onClick={() => openPanel('profile', 'collection')}>
            Koleksiyonu aç
          </button>
        )
        break
    }
  }

  const claimable = [...s.daily.quests, ...s.weekly.quests].some((q) => !q.claimed && s.stats[q.stat] - q.base >= q.target)
  return (
    <footer className="dock">
      {!su.decorOn && <div className="ctx">{ctx}</div>}
      {su.decorOn && ctx}
      <nav className="nav" aria-label="Ana menü">
        <button className="nav-btn" onClick={() => openPanel('shop')}>
          {Ico.shop}
          Mağaza
        </button>
        <button className="nav-btn" onClick={() => openPanel('bag')}>
          {Ico.bag}
          Çanta
        </button>
        <button className="nav-btn" onClick={() => openPanel('games')}>
          {Ico.games}
          Oyunlar
        </button>
        <button className="nav-btn" onClick={() => openPanel('quests')}>
          {Ico.quest}
          Görevler
          {claimable && <span className="dot" />}
        </button>
        <button className="nav-btn" onClick={() => openPanel('wardrobe')}>
          {Ico.shirt}
          Nova
        </button>
        <button className="nav-btn" onClick={() => openPanel('rooms')}>
          {Ico.home}
          Evim
        </button>
      </nav>
    </footer>
  )
}
