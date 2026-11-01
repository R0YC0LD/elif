import { ITEMS } from './items'
import { newGame, defaultSettings, defaultNeeds, validRoom } from './logic'
import { GRID, ROOMS } from './progression'
import { clamp } from './rng'
import {
  NEED_KEYS,
  ROOM_ORDER,
  SAVE_VERSION,
  SLOTS,
  STAT_KEYS,
  TRAITS,
  type GameState,
  type PlacedItem,
  type QuestInst,
  type RoomId,
  type Settings,
} from './types'

export const SAVE_KEY = 'nova.save'
export const BACKUP_KEY = 'nova.save.bak'

type Raw = Record<string, unknown>
const isObj = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (x: unknown, def: number, lo = -Infinity, hi = Infinity) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def)
const str = (x: unknown, def: string, max = 60) => (typeof x === 'string' ? x.slice(0, max) : def)
const bool = (x: unknown, def: boolean) => (typeof x === 'boolean' ? x : def)
const strList = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string').slice(0, 2000) : [])

function sanitizeQuests(x: unknown): QuestInst[] {
  if (!Array.isArray(x)) return []
  const out: QuestInst[] = []
  for (const q of x.slice(0, 12)) {
    if (!isObj(q)) continue
    const stat = str(q.stat, '')
    if (!(STAT_KEYS as string[]).includes(stat)) continue
    out.push({
      id: str(q.id, 'q'),
      title: str(q.title, 'Görev', 120),
      stat: stat as QuestInst['stat'],
      target: num(q.target, 1, 1, 1e6),
      base: num(q.base, 0, 0, 1e9),
      coins: num(q.coins, 0, 0, 1e5),
      xp: num(q.xp, 0, 0, 1e5),
      ep: num(q.ep, 0, 0, 1e5),
      claimed: bool(q.claimed, false),
    })
  }
  return out
}

function sanitizeSettings(x: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(x)) return d
  return {
    music: bool(x.music, d.music),
    sfx: bool(x.sfx, d.sfx),
    musicVol: num(x.musicVol, d.musicVol, 0, 1),
    sfxVol: num(x.sfxVol, d.sfxVol, 0, 1),
    reduceMotion: bool(x.reduceMotion, d.reduceMotion),
    shake: bool(x.shake, d.shake),
    showFps: bool(x.showFps, d.showFps),
    devPanel: bool(x.devPanel, d.devPanel),
    lowGfx: bool(x.lowGfx, d.lowGfx),
    sensitivity: num(x.sensitivity, d.sensitivity, 0.5, 2),
    fontScale: num(x.fontScale, d.fontScale, 0.85, 1.4),
    highContrast: bool(x.highContrast, d.highContrast),
  }
}

export function sanitize(raw: unknown): GameState | null {
  if (!isObj(raw)) return null
  const petRaw = isObj(raw.pet) ? raw.pet : null
  if (!petRaw) return null
  const s = newGame('Nova', num(raw.created, Date.now()))
  s.v = SAVE_VERSION
  s.pet.name = str(petRaw.name, 'Nova', 16).trim() || 'Nova'
  s.pet.hue = num(petRaw.hue, 160, 0, 360)
  s.pet.eyeHue = num(petRaw.eyeHue, 200, 0, 360)
  s.pet.sick = bool(petRaw.sick, false)
  s.pet.asleep = bool(petRaw.asleep, false)
  s.pet.lampOn = bool(petRaw.lampOn, true)
  s.pet.bornAt = num(petRaw.bornAt, s.created)
  s.pet.lastPetAt = num(petRaw.lastPetAt, 0)
  s.pet.lastSeenMood = str(petRaw.lastSeenMood, 'content')
  const needs = isObj(petRaw.needs) ? petRaw.needs : {}
  const dn = defaultNeeds()
  for (const k of NEED_KEYS) s.pet.needs[k] = clamp(num(needs[k], dn[k], 0, 100))
  const tr = isObj(petRaw.traits) ? petRaw.traits : {}
  for (const t of TRAITS) s.pet.traits[t] = clamp(num(tr[t], 40, 0, 100))
  const eq = isObj(petRaw.equipped) ? petRaw.equipped : {}
  for (const sl of SLOTS) {
    const id = eq[sl]
    s.pet.equipped[sl] = typeof id === 'string' && ITEMS[id]?.slot === sl ? id : null
  }

  s.coins = Math.floor(num(raw.coins, 0, 0, 1e9))
  s.ep = Math.floor(num(raw.ep, 0, 0, 1e9))
  s.epCycle = str(raw.epCycle, '', 24)
  s.xp = Math.floor(num(raw.xp, 0, 0, 1e9))
  s.level = Math.floor(num(raw.level, 1, 1, 50))

  s.inventory = {}
  if (isObj(raw.inventory)) for (const [k, v] of Object.entries(raw.inventory)) if (ITEMS[k] && typeof v === 'number' && v > 0) s.inventory[k] = Math.min(9999, Math.floor(v))
  s.materials = {}
  if (isObj(raw.materials)) for (const [k, v] of Object.entries(raw.materials)) if (typeof v === 'number' && v > 0) s.materials[k] = Math.min(9999, Math.floor(v))

  s.unlockedRooms = strList(raw.unlockedRooms).filter(validRoom) as RoomId[]
  for (const r of ROOM_ORDER) if (ROOMS[r].unlock <= s.level && !s.unlockedRooms.includes(r)) s.unlockedRooms.push(r)
  if (!s.unlockedRooms.length) s.unlockedRooms = ['living', 'kitchen', 'bathroom', 'bedroom']
  const cur = str(raw.currentRoom, 'living')
  s.currentRoom = validRoom(cur) && s.unlockedRooms.includes(cur) ? cur : 'living'

  const rooms = isObj(raw.rooms) ? raw.rooms : {}
  for (const r of ROOM_ORDER) {
    const rr = isObj(rooms[r]) ? (rooms[r] as Raw) : null
    if (!rr) continue
    const wp = str(rr.wallpaper, s.rooms[r].wallpaper)
    const fl = str(rr.floor, s.rooms[r].floor)
    if (ITEMS[wp]?.cat === 'wallpaper') s.rooms[r].wallpaper = wp
    if (ITEMS[fl]?.cat === 'floor') s.rooms[r].floor = fl
    if (Array.isArray(rr.placed)) {
      const list: PlacedItem[] = []
      for (const p of rr.placed.slice(0, 120)) {
        if (!isObj(p)) continue
        const id = str(p.item, '')
        const it = ITEMS[id]
        if (!it?.furn) continue
        list.push({
          uid: str(p.uid, `u${list.length}${Math.random().toString(36).slice(2, 7)}`),
          item: id,
          x: Math.floor(num(p.x, 0, 0, GRID.cols - 1)),
          y: Math.floor(num(p.y, 0, 0, GRID.rows - 1)),
          flip: bool(p.flip, false),
          tint: Math.floor(num(p.tint, 0, 0, 5)),
          on: bool(p.on, false),
          growth: num(p.growth, 0, 0, 100),
        })
      }
      s.rooms[r].placed = list
    }
  }

  const d = isObj(raw.daily) ? raw.daily : {}
  s.daily = { key: str(d.key, ''), quests: sanitizeQuests(d.quests) }
  const w = isObj(raw.weekly) ? raw.weekly : {}
  s.weekly = { key: str(w.key, ''), quests: sanitizeQuests(w.quests) }

  s.achievements = {}
  if (isObj(raw.achievements)) for (const [k, v] of Object.entries(raw.achievements)) if (typeof v === 'number') s.achievements[k] = v
  const st = isObj(raw.stats) ? raw.stats : {}
  for (const k of STAT_KEYS) s.stats[k] = Math.floor(num(st[k], 0, 0, 1e12))
  s.records = {}
  if (isObj(raw.records))
    for (const [k, v] of Object.entries(raw.records))
      if (isObj(v)) s.records[k] = { best: num(v.best, 0, 0, 1e9), plays: num(v.plays, 0, 0, 1e9), last: num(v.last, 0, 0, 1e9), total: num(v.total, 0, 0, 1e12) }

  s.collection = strList(raw.collection).filter((id) => !!ITEMS[id])
  s.recipes = strList(raw.recipes)
  s.discoveries = strList(raw.discoveries)
  s.exploreProg = {}
  if (isObj(raw.exploreProg)) for (const [k, v] of Object.entries(raw.exploreProg)) if (typeof v === 'number') s.exploreProg[k] = Math.floor(v)
  s.eventClaims = strList(raw.eventClaims)
  s.favFood = {}
  if (isObj(raw.favFood)) for (const [k, v] of Object.entries(raw.favFood)) if (typeof v === 'number') s.favFood[k] = Math.floor(v)
  s.stageHistory = Array.isArray(raw.stageHistory)
    ? raw.stageHistory.filter(isObj).map((h) => ({ stage: Math.floor(num(h.stage, 0, 0, 3)), at: num(h.at, s.created) })).slice(0, 8)
    : []
  if (!s.stageHistory.length) s.stageHistory = [{ stage: 0, at: s.created }]

  s.loginDays = Math.floor(num(raw.loginDays, 0, 0, 1e5))
  s.loginLast = str(raw.loginLast, '', 12)
  s.playSeconds = num(raw.playSeconds, 0, 0, 1e10)
  s.worldMinutes = num(raw.worldMinutes, s.worldMinutes, 0, 1e9)
  s.lastSave = num(raw.lastSave, Date.now())
  s.lastSeen = num(raw.lastSeen, s.lastSave)
  s.tutorialDone = bool(raw.tutorialDone, false)
  s.settings = sanitizeSettings(raw.settings)
  return s
}

const migrations: Record<number, (raw: Raw) => Raw> = {}

export function migrate(raw: Raw): Raw {
  let v = num(raw.v, 1)
  let cur = raw
  while (v < SAVE_VERSION) {
    const m = migrations[v]
    if (m) cur = m(cur)
    v += 1
  }
  return cur
}

export interface ParseResult {
  ok: boolean
  state?: GameState
  error?: string
}

export function parseSave(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Dosya geçerli JSON değil.' }
  }
  if (!isObj(parsed)) return { ok: false, error: 'Kayıt biçimi tanınmadı.' }
  const payload = isObj(parsed.data) ? parsed.data : parsed
  if (num(payload.v, 1) > SAVE_VERSION) return { ok: false, error: 'Kayıt daha yeni bir sürümden.' }
  const state = sanitize(migrate(payload))
  if (!state) return { ok: false, error: 'Kayıtta karakter bilgisi yok.' }
  return { ok: true, state }
}

export function serialize(s: GameState): string {
  s.lastSave = Date.now()
  return JSON.stringify({ app: 'project-nova', v: SAVE_VERSION, savedAt: s.lastSave, data: s })
}

export function writeSave(s: GameState): boolean {
  try {
    const text = serialize(s)
    const prev = localStorage.getItem(SAVE_KEY)
    if (prev) localStorage.setItem(BACKUP_KEY, prev)
    localStorage.setItem(SAVE_KEY, text)
    return true
  } catch {
    return false
  }
}

export function readSave(): { state: GameState | null; recovered: boolean; error?: string } {
  let text: string | null = null
  try {
    text = localStorage.getItem(SAVE_KEY)
  } catch {
    return { state: null, recovered: false, error: 'Tarayıcı depolaması kapalı.' }
  }
  if (!text) return { state: null, recovered: false }
  const main = parseSave(text)
  if (main.ok && main.state) return { state: main.state, recovered: false }
  try {
    const bak = localStorage.getItem(BACKUP_KEY)
    if (bak) {
      const b = parseSave(bak)
      if (b.ok && b.state) return { state: b.state, recovered: true }
    }
  } catch {
    // yedek de okunamadı
  }
  return { state: null, recovered: false, error: main.error ?? 'Kayıt bozuk.' }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
    localStorage.removeItem(BACKUP_KEY)
  } catch {
    // depolama kapalıysa silinecek bir şey yok
  }
}

const DB = 'nova-db'
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('snapshots')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSnapshot(text: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite')
      tx.objectStore('snapshots').put(text, 'latest')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB yoksa localStorage yeterli
  }
}

export async function idbRestore(): Promise<string | null> {
  try {
    const db = await openDb()
    const v = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly')
      const r = tx.objectStore('snapshots').get('latest')
      r.onsuccess = () => resolve((r.result as string) ?? null)
      r.onerror = () => reject(r.error)
    })
    db.close()
    return v
  } catch {
    return null
  }
}
