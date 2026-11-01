import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sound, toast } from '../game/events'
import { ITEM_LIST, ITEMS, MATERIALS } from '../game/items'
import {
  achievementProgress,
  applyRoomSkin,
  buy,
  buyMaterial,
  canCraft,
  claimEvent,
  claimQuest,
  craft,
  equip,
  explore,
  ownedCount,
  placedCount,
  questProgress,
  unequip,
  type ExploreResult,
} from '../game/logic'
import { ACHIEVEMENTS, AREAS, EXPLORE_COST, MATERIAL_PRICE, RECIPES, ROOMS, SECRETS, STAGES, stageOfLevel } from '../game/progression'
import { act, useGame } from '../game/store'
import {
  CATEGORY_LABEL,
  NEED_LABEL,
  RARITY_LABEL,
  ROOM_ORDER,
  SLOTS,
  SLOT_LABEL,
  TRAITS,
  TRAIT_LABEL,
  type Category,
  type GameState,
  type Item,
  type QuestInst,
  type Slot,
} from '../game/types'
import { EVENTS, activeEvent, clockOf, eventKey } from '../game/world'
import { artUrl } from '../render/icons'
import { Animator, drawPet } from '../render/pet'
import { patchSceneUi, scene } from '../render/scene'
import { ItemIcon } from './Chrome'
import { Coin, Ep, Ico } from './Icons'
import { closePanel, openPanel, ui } from './uiStore'

export function Sheet({ title, children, wide, onClose }: { title: string; children: ReactNode; wide?: boolean; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = onClose ?? closePanel
  useEffect(() => {
    sound('open')
    ref.current?.querySelector<HTMLElement>('button, input')?.focus()
  }, [])
  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <section className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="iconbtn" onClick={close} aria-label="Kapat">
            {Ico.close}
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  )
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={`tab${value === id ? ' on' : ''}`} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}

const RAR_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3 }

// ---------- Mağaza ----------

const SHOP_CATS: Category[] = ['food', 'drink', 'medicine', 'toy', 'hat', 'glasses', 'clothes', 'shoes', 'accessory', 'special', 'furniture', 'wallpaper', 'floor']

export function ShopPanel() {
  const s = useGame()
  const [cat, setCat] = useState<Category>('food')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const items = useMemo(
    () =>
      ITEM_LIST.filter((i) => i.cat === cat && !i.shopHidden && i.price > 0 && i.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))).sort(
        (a, b) => a.price - b.price,
      ),
    [cat, q],
  )
  const it = sel ? ITEMS[sel] : null
  return (
    <Sheet title="Mağaza" wide>
      <div className="row">
        <span className="pill" style={{ color: 'var(--ink)', background: 'var(--paper-2)' }}>
          <Coin />
          {s.coins}
        </span>
        <input className="input grow" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ürün ara" />
      </div>
      <Tabs tabs={SHOP_CATS.map((c) => [c, CATEGORY_LABEL[c]] as [Category, string])} value={cat} onChange={(c) => { setCat(c); setSel(null); setQty(1) }} />
      <div className="grid">
        {items.map((i) => {
          const locked = (i.minLevel ?? 1) > s.level
          const own = ownedCount(s, i.id)
          return (
            <button key={i.id} className={`cell${sel === i.id ? ' sel' : ''}${locked ? ' lock' : ''}`} data-r={i.rarity} onClick={() => { setSel(i.id); setQty(1); sound('click') }} aria-label={`${i.name}, ${i.price} coin`}>
              <ItemIcon id={i.id} size={64} />
              <span className="nm">{i.name}</span>
              {locked ? (
                <span className="pr">{Ico.lock} Sv. {i.minLevel}</span>
              ) : (
                <span className="pr">
                  <Coin />
                  {i.price}
                </span>
              )}
              {own > 0 && <span className="tag">{i.cat === 'furniture' || i.cat === 'food' || i.cat === 'drink' || i.cat === 'medicine' ? `Sende ${own}` : 'Sende'}</span>}
            </button>
          )
        })}
        {items.length === 0 && <p className="muted">Bu kategoride ürün yok.</p>}
      </div>
      {it && <ItemDetail item={it} s={s} qty={qty} setQty={setQty} />}
    </Sheet>
  )
}

function ItemDetail({ item: it, s, qty, setQty }: { item: Item; s: GameState; qty: number; setQty: (n: number) => void }) {
  const stackable = it.cat === 'food' || it.cat === 'drink' || it.cat === 'medicine' || it.cat === 'furniture'
  const total = it.price * (stackable ? qty : 1)
  const locked = (it.minLevel ?? 1) > s.level
  const owned = !stackable && ownedCount(s, it.id) > 0
  const fx = it.fx ? Object.entries(it.fx).filter(([, v]) => v) : []
  return (
    <div className="card" style={{ position: 'sticky', bottom: 0 }}>
      <div className="row">
        <ItemIcon id={it.id} size={64} />
        <div className="grow">
          <h3>
            {it.name} <span className="tag" data-r={it.rarity}>{RARITY_LABEL[it.rarity]}</span>
          </h3>
          <p>{it.desc}</p>
          {fx.length > 0 && (
            <p>
              {fx.map(([k, v]) => `${NEED_LABEL[k as keyof typeof NEED_LABEL]} ${(v as number) > 0 ? '+' : ''}${v}`).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <div className="row wrap" style={{ marginTop: 8 }}>
        {stackable && (
          <div className="row" style={{ gap: 6 }}>
            {[1, 5].map((n) => (
              <button key={n} className={`tab${qty === n ? ' on' : ''}`} onClick={() => setQty(n)}>
                x{n}
              </button>
            ))}
          </div>
        )}
        <span className="grow" />
        <button
          className="btn primary"
          disabled={locked || owned}
          onClick={() => {
            const r = act((g) => buy(g, it.id, stackable ? qty : 1))
            if (!r.ok) {
              toast('error', r.reason ?? 'Satın alınamadı.')
              sound('error')
            }
          }}
        >
          {locked ? `Seviye ${it.minLevel}` : owned ? 'Sende var' : (
            <>
              Satın al <Coin /> {total}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------- Çanta ----------

const BAG_CATS: [string, string][] = [
  ['all', 'Hepsi'],
  ['food', 'Yiyecek'],
  ['drink', 'İçecek'],
  ['medicine', 'İlaç'],
  ['wear', 'Kozmetik'],
  ['decor', 'Dekor'],
  ['toy', 'Oyuncak'],
  ['collectible', 'Koleksiyon'],
]

function bagCat(i: Item): string {
  if (i.cat === 'furniture' || i.cat === 'wallpaper' || i.cat === 'floor') return 'decor'
  if (i.slot) return 'wear'
  return i.cat
}

export function BagPanel() {
  const s = useGame()
  const [tab, setTab] = useState(ui.panelTab || 'all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'name' | 'rarity' | 'count'>('name')
  const owned = ITEM_LIST.filter((i) => ownedCount(s, i.id) > 0)
  const list = owned
    .filter((i) => (tab === 'all' ? true : bagCat(i) === tab))
    .filter((i) => i.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
    .sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name, 'tr') : sort === 'rarity' ? RAR_ORDER[b.rarity] - RAR_ORDER[a.rarity] : ownedCount(s, b.id) - ownedCount(s, a.id),
    )
  const mats = Object.entries(s.materials).filter(([, v]) => v > 0)
  return (
    <Sheet title="Çanta" wide>
      <div className="row">
        <input className="input grow" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Çantada ara" />
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sırala">
          <option value="name">Ada göre</option>
          <option value="rarity">Nadirliğe göre</option>
          <option value="count">Adede göre</option>
        </select>
      </div>
      <Tabs tabs={BAG_CATS as [string, string][]} value={tab} onChange={setTab} />
      <div className="grid">
        {list.map((i) => (
          <BagCell key={i.id} i={i} s={s} />
        ))}
        {list.length === 0 && <p className="muted">Burada bir şey yok.</p>}
      </div>
      {tab === 'all' && mats.length > 0 && (
        <div className="card">
          <h3>Malzemeler</h3>
          <div className="row wrap">
            {mats.map(([id, n]) => (
              <span key={id} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <img src={artUrl(MATERIALS[id]?.art ?? ['wood', '#a8743f'], 22)} width={22} height={22} alt="" />
                {MATERIALS[id]?.name ?? id} x{n}
              </span>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}

function BagCell({ i, s }: { i: Item; s: GameState }) {
  const n = ownedCount(s, i.id)
  const on = i.slot && s.pet.equipped[i.slot] === i.id
  const free = n - placedCount(s, i.id)
  let label = ''
  let action: (() => void) | null = null
  if (i.slot) {
    label = on ? 'Çıkar' : 'Tak'
    action = () => {
      act((g) => equip(g, i.id))
      sound('click')
    }
  } else if (i.cat === 'furniture') {
    label = `Yerleştir (${free})`
    action = () => {
      if (free < 1) return toast('warn', 'Hepsi yerleştirilmiş.')
      closePanel()
      patchSceneUi({ decorOn: true, placing: i.id, selected: null })
    }
  } else if (i.cat === 'wallpaper' || i.cat === 'floor') {
    const cur = i.cat === 'wallpaper' ? s.rooms[s.currentRoom].wallpaper : s.rooms[s.currentRoom].floor
    label = cur === i.id ? 'Uygulandı' : 'Bu odaya uygula'
    action = cur === i.id ? null : () => {
      act((g) => applyRoomSkin(g, g.currentRoom, i.id))
      sound('place')
    }
  } else if (i.cat === 'food' || i.cat === 'drink' || i.cat === 'medicine' || i.cat === 'toy') {
    label = 'Ver'
    action = () => {
      closePanel()
      window.setTimeout(() => scene.feed(i.id), 250)
    }
  }
  return (
    <div className="cell" data-r={i.rarity}>
      <ItemIcon id={i.id} size={64} />
      <span className="nm">{i.name}</span>
      <span className="tag">{i.cat === 'furniture' || i.cat === 'food' || i.cat === 'drink' || i.cat === 'medicine' ? `x${n}` : RARITY_LABEL[i.rarity]}</span>
      {action ? (
        <button className={`btn small${on ? ' gold' : ''}`} onClick={action}>
          {label}
        </button>
      ) : label ? (
        <span className="muted">{label}</span>
      ) : null}
    </div>
  )
}

// ---------- Karakter ----------

function PetPreview({ s }: { s: GameState }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const c = cv.getContext('2d')!
    const an = new Animator()
    an.traits = s.pet.traits
    an.mood = 'happy'
    let raf = 0
    let last = performance.now()
    let t = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      an.update(dt)
      const st = useGameSnapshot()
      c.setTransform(2, 0, 0, 2, 0, 0)
      c.clearRect(0, 0, 220, 220)
      c.save()
      c.translate(110, 196)
      c.scale(1.35, 1.35)
      c.fillStyle = 'rgba(20,25,35,0.22)'
      c.beginPath()
      c.ellipse(0, 2, 56, 10, 0, 0, 7)
      c.fill()
      drawPet(c, { hue: st.pet.hue, eyeHue: st.pet.eyeHue, stage: stageOfLevel(st.level), equipped: st.pet.equipped, time: t }, an.pose, { n: 0 })
      c.restore()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [s.pet.traits])
  return <canvas ref={ref} width={440} height={440} style={{ width: 220, height: 220, background: 'var(--paper-2)', borderRadius: 12, border: '2.5px solid var(--ink)' }} aria-label="Karakter önizleme" />
}

import { store } from '../game/store'
function useGameSnapshot() {
  return store.state
}

const HUES = [160, 20, 340, 45, 210, 275, 100, 0]

export function WardrobePanel() {
  const s = useGame()
  const [slot, setSlot] = useState<Slot>('head')
  const [name, setName] = useState(s.pet.name)
  const owned = ITEM_LIST.filter((i) => i.slot === slot && ownedCount(s, i.id) > 0)
  const stage = STAGES[stageOfLevel(s.level)]
  return (
    <Sheet title={s.pet.name} wide>
      <div className="row wrap" style={{ alignItems: 'flex-start' }}>
        <PetPreview s={s} />
        <div className="grow" style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="field">
            İsim
            <div className="row">
              <input className="input grow" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
              <button
                className="btn small"
                disabled={!name.trim() || name.trim() === s.pet.name}
                onClick={() => {
                  act((g) => {
                    g.pet.name = name.trim().slice(0, 16)
                  })
                  sound('click')
                }}
              >
                Kaydet
              </button>
            </div>
          </label>
          <div className="field">
            Renk
            <div className="swatches">
              {HUES.map((h) => (
                <button key={h} className={`swatch${s.pet.hue === h ? ' on' : ''}`} style={{ background: `hsl(${h}, 52%, 72%)` }} aria-label={`Renk ${h}`} onClick={() => act((g) => { g.pet.hue = h })} />
              ))}
            </div>
            <input type="range" min={0} max={360} value={s.pet.hue} onChange={(e) => act((g) => { g.pet.hue = Number(e.target.value) })} aria-label="Ton" />
          </div>
          <div className="field">
            Göz rengi
            <input type="range" min={0} max={360} value={s.pet.eyeHue} onChange={(e) => act((g) => { g.pet.eyeHue = Number(e.target.value) })} aria-label="Göz tonu" />
          </div>
          <p className="muted">
            Evre: <b>{stage.name}</b>. Sonraki evre seviye {STAGES[Math.min(3, stage.id + 1)].from}.
          </p>
        </div>
      </div>
      <div className="card">
        <h3>Kişilik</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
          {TRAITS.map((t) => (
            <div key={t}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{TRAIT_LABEL[t]}</span>
                <span className="muted">{Math.round(s.pet.traits[t])}</span>
              </div>
              <div className="progress">
                <i style={{ width: `${s.pet.traits[t]}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Nova oynama biçimine göre şekillenir. Beslemek sevecenliği, oyun oynamak oyunculuğu, keşif merakı artırır.
        </p>
      </div>
      <Tabs tabs={SLOTS.map((sl) => [sl, SLOT_LABEL[sl]] as [Slot, string])} value={slot} onChange={setSlot} />
      <div className="grid">
        {owned.map((i) => {
          const on = s.pet.equipped[slot] === i.id
          return (
            <button key={i.id} className={`cell${on ? ' sel' : ''}`} data-r={i.rarity} onClick={() => { act((g) => equip(g, i.id)); sound('click') }} aria-pressed={on}>
              <ItemIcon id={i.id} size={64} />
              <span className="nm">{i.name}</span>
              <span className="tag">{on ? 'Takılı' : 'Tak'}</span>
            </button>
          )
        })}
        {owned.length === 0 && (
          <p className="muted">
            Bu yuva için bir şeyin yok.{' '}
            <button className="btn small" onClick={() => openPanel('shop')}>
              Mağaza
            </button>
          </p>
        )}
      </div>
      {s.pet.equipped[slot] && (
        <button className="btn" onClick={() => act((g) => unequip(g, slot))}>
          {SLOT_LABEL[slot]} yuvasını boşalt
        </button>
      )}
    </Sheet>
  )
}

// ---------- Evim ----------

export function RoomsPanel() {
  const s = useGame()
  const clock = clockOf(s.worldMinutes)
  return (
    <Sheet title="Evim">
      <div className="row wrap">
        <button
          className="btn primary"
          onClick={() => {
            closePanel()
            patchSceneUi({ decorOn: true, placing: null, selected: null })
          }}
        >
          {Ico.hammer} Bu odayı düzenle
        </button>
        <button className="btn" onClick={() => openPanel('bag', 'decor')}>
          Dekor çantası
        </button>
        <button className="btn" onClick={() => openPanel('profile')}>
          Profil
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
        {ROOM_ORDER.map((r) => {
          const open = s.unlockedRooms.includes(r)
          return (
            <button
              key={r}
              className={`cell${s.currentRoom === r ? ' sel' : ''}${open ? '' : ' lock'}`}
              disabled={!open}
              onClick={() => {
                act((g) => {
                  g.currentRoom = r
                })
                sound('room')
                closePanel()
              }}
            >
              <span className="nm" style={{ fontSize: '0.95rem' }}>
                {ROOMS[r].name}
              </span>
              <span className="muted">{open ? ROOMS[r].blurb : `Seviye ${ROOMS[r].unlock} gerekir`}</span>
              {!open && Ico.lock}
              {open && <span className="tag">{s.rooms[r].placed.length} eşya</span>}
            </button>
          )
        })}
      </div>
      <p className="muted">
        Oyun günü {clock.day + 1}. Her oyun saati gerçek bir dakikaya denk gelir. Mevsimler yedi günde bir değişir.
      </p>
    </Sheet>
  )
}

// ---------- Görevler ----------

function QuestRow({ q, kind, s }: { q: QuestInst; kind: 'daily' | 'weekly'; s: GameState }) {
  const p = questProgress(s, q)
  const done = p >= q.target
  return (
    <div className="card">
      <div className="row">
        <div className="grow">
          <h3>{q.title}</h3>
          <div className="progress">
            <i style={{ width: `${(p / q.target) * 100}%` }} />
          </div>
          <p>
            {p} / {q.target} · <Coin /> {q.coins} · {q.xp} XP · <Ep /> {q.ep}
          </p>
        </div>
        <button
          className={`btn small ${done && !q.claimed ? 'gold' : ''}`}
          disabled={!done || q.claimed}
          onClick={() => {
            act((g) => claimQuest(g, kind, q.id))
          }}
        >
          {q.claimed ? 'Alındı' : done ? 'Ödülü al' : 'Sürüyor'}
        </button>
      </div>
    </div>
  )
}

export function QuestsPanel() {
  const s = useGame()
  const clock = clockOf(s.worldMinutes)
  const ev = activeEvent(clock)
  return (
    <Sheet title="Görevler" wide>
      <h3 style={{ margin: 0 }}>Günlük</h3>
      {s.daily.quests.map((q) => (
        <QuestRow key={q.id} q={q} kind="daily" s={s} />
      ))}
      <h3 style={{ margin: 0 }}>Haftalık</h3>
      {s.weekly.quests.map((q) => (
        <QuestRow key={q.id} q={q} kind="weekly" s={s} />
      ))}
      <h3 style={{ margin: 0 }}>Etkinlik</h3>
      {ev ? (
        <div className="card">
          <h3>{ev.name}</h3>
          <p>{ev.blurb}</p>
          <p>
            Etkinlik puanın: <b>{s.ep}</b>. Puan kazanmak için görev tamamla ve mini oyun oyna.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {ev.rewards.map((r) => {
              const claimed = s.eventClaims.includes(eventKey(ev.id, clock.year, r.at))
              return (
                <div key={r.at} className="row">
                  <ItemIcon id={r.item} size={40} />
                  <div className="grow">
                    <b>{ITEMS[r.item].name}</b>
                    <div className="muted">
                      {r.at} puan · {r.coins} coin
                    </div>
                  </div>
                  <button className="btn small" disabled={claimed || s.ep < r.at} onClick={() => act((g) => claimEvent(g, ev.id, r.at))}>
                    {claimed ? 'Alındı' : s.ep < r.at ? `${r.at - s.ep} puan kaldı` : 'Al'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card">
          <p>
            Şu an etkinlik yok. Her mevsimin son günlerinde ({EVENTS.map((e) => e.name).join(', ')}) etkinliği açılır. Oyun günü {clock.day + 1}, mevsimin {clock.seasonDay + 1}. günü.
          </p>
        </div>
      )}
    </Sheet>
  )
}

// ---------- Profil ----------

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`
}

const GAME_NAMES: Record<string, string> = { coinrush: 'Coin Rush', memory: 'Memory Master', reaction: 'Reaction Arena', runner: 'Pet Runner', stack: 'Stack Tower', colormatch: 'Color Match' }

export function ProfilePanel() {
  const s = useGame()
  const [tab, setTab] = useState(ui.panelTab || 'stats')
  const [cat, setCat] = useState('all')
  const collectibles = ITEM_LIST.filter((i) => i.cat === 'collectible' || i.rarity === 'epic' || i.cat === 'furniture' || i.slot)
  const owned = new Set(s.collection)
  const achs = ACHIEVEMENTS.filter((a) => cat === 'all' || a.cat === cat)
  const CAT_LABEL: Record<string, string> = { bakim: 'Bakım', oyun: 'Oyun', ekonomi: 'Ekonomi', ev: 'Ev', ilerleme: 'İlerleme', gizli: 'Gizli' }
  return (
    <Sheet title="Profil" wide>
      <Tabs
        tabs={[['stats', 'İstatistik'], ['ach', `Başarımlar ${Object.keys(s.achievements).length}/${ACHIEVEMENTS.length}`], ['collection', 'Koleksiyon'], ['secrets', 'Keşifler']]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'stats' && (
        <>
          <div className="stat-grid">
            <Stat l="Toplam oyun süresi" v={fmtTime(s.playSeconds)} />
            <Stat l="Toplam coin kazanımı" v={String(s.stats.coinsEarned)} />
            <Stat l="Besleme" v={String(s.stats.feeds)} />
            <Stat l="İçecek" v={String(s.stats.drinks)} />
            <Stat l="Banyo" v={String(s.stats.baths)} />
            <Stat l="Uyku" v={String(s.stats.sleeps)} />
            <Stat l="Sevme" v={String(s.stats.pets)} />
            <Stat l="Mini oyun" v={String(s.stats.plays)} />
            <Stat l="Açılan oda" v={`${s.unlockedRooms.length}/8`} />
            <Stat l="Satın alınan ürün" v={String(s.stats.purchases)} />
            <Stat l="Üretilen eşya" v={String(s.stats.crafts)} />
            <Stat l="Giriş yapılan gün" v={String(s.loginDays)} />
          </div>
          <div className="card">
            <h3>Mini oyun rekorları</h3>
            {Object.keys(GAME_NAMES).map((g) => {
              const r = s.records[g]
              return (
                <div key={g} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{GAME_NAMES[g]}</span>
                  <span className="muted">{r ? `Rekor ${r.best} · ${r.plays} oyun` : 'Oynanmadı'}</span>
                </div>
              )
            })}
          </div>
          <div className="card">
            <h3>Gelişim geçmişi</h3>
            {s.stageHistory.map((h, i) => (
              <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{STAGES[h.stage].name}</span>
                <span className="muted">{new Date(h.at).toLocaleDateString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === 'ach' && (
        <>
          <Tabs tabs={[['all', 'Hepsi'], ...Object.entries(CAT_LABEL)] as [string, string][]} value={cat} onChange={setCat} />
          {achs.map((a) => {
            const got = !!s.achievements[a.id]
            const pr = achievementProgress(s, a.id)
            const hide = a.hidden && !got
            return (
              <div key={a.id} className={`ach${got ? '' : ' locked'}`}>
                <span className="medal">{got ? '✓' : '?'}</span>
                <div className="grow">
                  <b>{hide ? 'Gizli başarım' : a.name}</b>
                  <div className="muted">{hide ? 'Oynadıkça ortaya çıkar.' : a.desc}</div>
                  {!got && !hide && (
                    <div className="progress" style={{ marginTop: 4 }}>
                      <i style={{ width: `${(pr.value / pr.target) * 100}%` }} />
                    </div>
                  )}
                </div>
                <span className="tag">{a.coins} coin</span>
              </div>
            )
          })}
        </>
      )}
      {tab === 'collection' && (
        <>
          <p className="muted">
            {collectibles.filter((i) => owned.has(i.id)).length} / {collectibles.length} parça toplandı.
          </p>
          <div className="grid">
            {collectibles.map((i) => {
              const has = owned.has(i.id)
              return (
                <div key={i.id} className="cell" data-r={has ? i.rarity : 'common'} style={{ minHeight: 110 }}>
                  <div style={{ filter: has ? 'none' : 'brightness(0) opacity(0.25)' }}>
                    <ItemIcon id={i.id} size={56} />
                  </div>
                  <span className="nm">{has ? i.name : '???'}</span>
                  <span className="tag" data-r={has ? i.rarity : 'common'}>
                    {has ? RARITY_LABEL[i.rarity] : 'Keşfedilmedi'}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
      {tab === 'secrets' && (
        <>
          <p className="muted">
            {s.discoveries.length} / {SECRETS.length} gizli keşif bulundu. Bulunanların ipucu açılır.
          </p>
          {SECRETS.map((d) => {
            const got = s.discoveries.includes(d.id)
            return (
              <div key={d.id} className={`ach${got ? '' : ' locked'}`}>
                <span className="medal">{got ? '✓' : '?'}</span>
                <div className="grow">
                  <b>{got ? d.name : 'Gizli keşif'}</b>
                  <div className="muted">{got ? d.hint : 'Henüz bulunmadı.'}</div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </Sheet>
  )
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="stat">
      <b>{v}</b>
      <span>{l}</span>
    </div>
  )
}

// ---------- Üretim ve keşif ----------

export function CraftPanel() {
  const s = useGame()
  const [tab, setTab] = useState(ui.panelTab || 'craft')
  const [making, setMaking] = useState<{ id: string; p: number } | null>(null)
  const [loot, setLoot] = useState<ExploreResult | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) cancelAnimationFrame(timer.current)
    },
    [],
  )

  const start = (id: string) => {
    if (making) return
    const rc = RECIPES.find((r) => r.id === id)!
    const t0 = performance.now()
    setMaking({ id, p: 0 })
    sound('click')
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / (rc.seconds * 1000))
      setMaking({ id, p })
      if (p < 1) timer.current = requestAnimationFrame(step)
      else {
        const r = act((g) => craft(g, id))
        if (!r.ok) toast('error', r.reason ?? 'Üretilemedi.')
        setMaking(null)
      }
    }
    timer.current = requestAnimationFrame(step)
  }

  return (
    <Sheet title="Üretim ve keşif" wide>
      <Tabs tabs={[['craft', 'Üretim'], ['explore', 'Keşif'], ['market', 'Malzeme pazarı']]} value={tab} onChange={setTab} />
      <div className="row wrap">
        {Object.entries(MATERIALS).map(([id, m]) => (
          <span key={id} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <img src={artUrl(m.art, 20)} width={20} height={20} alt="" />
            {m.name} {s.materials[id] ?? 0}
          </span>
        ))}
      </div>
      {tab === 'craft' &&
        RECIPES.map((rc) => {
          const known = s.recipes.includes(rc.id)
          const can = canCraft(s, rc.id)
          const out = ITEMS[rc.out]
          const busy = making?.id === rc.id
          return (
            <div key={rc.id} className={`card${known ? '' : ' lock'}`} style={{ opacity: known ? 1 : 0.6 }}>
              <div className="row">
                <ItemIcon id={rc.out} size={52} />
                <div className="grow">
                  <h3>{out.name}</h3>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {Object.entries(rc.need).map(([m, q]) => {
                      const have = s.materials[m] ?? 0
                      return (
                        <span key={m} className="tag" style={{ background: have >= q ? '#d7efe3' : '#ffd9cf' }}>
                          {MATERIALS[m].name} {have}/{q}
                        </span>
                      )
                    })}
                  </div>
                  {busy && (
                    <div className="progress" style={{ marginTop: 6 }}>
                      <i style={{ width: `${(making?.p ?? 0) * 100}%` }} />
                    </div>
                  )}
                </div>
                <button className="btn small primary" disabled={!known || !can.ok || !!making} onClick={() => start(rc.id)}>
                  {!known ? `Sv. ${rc.minLevel}` : busy ? 'Üretiliyor' : can.ok ? `Üret (${rc.seconds} sn)` : can.reason}
                </button>
              </div>
            </div>
          )
        })}
      {tab === 'explore' && (
        <>
          <p className="muted">
            Her keşif {EXPLORE_COST} enerji harcar. Üçüncü, altıncı ve onuncu keşifte garantili bir koleksiyon parçası bulunur. Diğer keşiflerde malzeme toplanır.
          </p>
          {AREAS.map((a) => {
            const open = s.level >= a.unlock
            const trips = s.exploreProg[a.id] ?? 0
            return (
              <div key={a.id} className="card" style={{ opacity: open ? 1 : 0.6 }}>
                <div className="row">
                  <div className="grow">
                    <h3>{a.name}</h3>
                    <p>{open ? a.blurb : `Seviye ${a.unlock} gerekir.`}</p>
                    <p>
                      Keşif sayısı: {trips} · Sonraki garanti: {[3, 6, 10].find((n) => n > trips) ? `${[3, 6, 10].find((n) => n > trips)}. keşif` : 'hepsi alındı'}
                    </p>
                  </div>
                  <button
                    className="btn small primary"
                    disabled={!open}
                    onClick={() => {
                      const r = act((g) => explore(g, a.id))
                      if (!r.ok) {
                        toast('warn', r.reason ?? 'Olmadı.')
                        sound('error')
                      } else setLoot(r)
                    }}
                  >
                    Keşfe çık
                  </button>
                </div>
              </div>
            )
          })}
          {loot?.loot && (
            <div className="card">
              <h3>Bulunanlar</h3>
              <div className="row wrap">
                {loot.loot.materials.map(([m, q], i) => (
                  <span key={i} className="tag">
                    {MATERIALS[m].name} x{q}
                  </span>
                ))}
                {loot.loot.items.map((id) => (
                  <span key={id} className="tag" data-r={ITEMS[id].rarity}>
                    {ITEMS[id].name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {tab === 'market' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
          {Object.entries(MATERIAL_PRICE).map(([id, price]) => (
            <div key={id} className="cell">
              <img src={artUrl(MATERIALS[id].art, 56)} width={56} height={56} alt="" />
              <span className="nm">{MATERIALS[id].name}</span>
              <button
                className="btn small"
                disabled={s.coins < price}
                onClick={() => {
                  const r = act((g) => buyMaterial(g, id, 1))
                  if (!r.ok) toast('error', r.reason ?? 'Olmadı.')
                }}
              >
                <Coin /> {price}
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

