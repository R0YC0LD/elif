import { bus, sound, toast } from './events'
import { DEFAULT_FLOOR, DEFAULT_WALL, ITEMS, item } from './items'
import {
  ACHIEVEMENTS,
  AREAS,
  DAILY_POOL,
  EXPLORE_COST,
  GRID,
  MATERIAL_PRICE,
  MAX_LEVEL,
  RECIPES,
  ROOMS,
  SECRETS,
  STAGES,
  WEEKLY_POOL,
  stageOfLevel,
  xpNeeded,
} from './progression'
import { clamp, hashString, seeded } from './rng'
import {
  NEED_KEYS,
  ROOM_ORDER,
  SAVE_VERSION,
  SLOTS,
  STAT_KEYS,
  TRAITS,
  type GameState,
  type NeedKey,
  type Needs,
  type PlacedItem,
  type QuestInst,
  type RoomId,
  type RoomState,
  type Settings,
  type Slot,
  type StatKey,
  type Trait,
} from './types'
import { EVENTS, START_MINUTES, activeEvent, clockOf, eventKey } from './world'

export const OFFLINE_CAP_SECONDS = 8 * 3600

export function defaultSettings(): Settings {
  return {
    music: true,
    sfx: true,
    musicVol: 0.5,
    sfxVol: 0.8,
    reduceMotion: false,
    shake: true,
    showFps: false,
    devPanel: false,
    lowGfx: false,
    sensitivity: 1,
    fontScale: 1,
    highContrast: false,
  }
}

export function defaultNeeds(): Needs {
  return { hunger: 80, thirst: 80, happiness: 75, health: 100, hygiene: 85, energy: 90, fun: 70, social: 70, comfort: 75 }
}

function emptyStats(): Record<StatKey, number> {
  const o = {} as Record<StatKey, number>
  for (const k of STAT_KEYS) o[k] = 0
  return o
}

function emptyRoom(): RoomState {
  return { wallpaper: DEFAULT_WALL, floor: DEFAULT_FLOOR, placed: [] }
}

let uidCounter = 0
export function makeUid(): string {
  uidCounter += 1
  return `p${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

function placedItem(id: string, x: number, y: number, extra: Partial<PlacedItem> = {}): PlacedItem {
  return { uid: makeUid(), item: id, x, y, flip: false, tint: 0, on: false, growth: 0, ...extra }
}

export function newGame(name = 'Nova', now = Date.now()): GameState {
  const rooms = {} as Record<RoomId, RoomState>
  for (const r of ROOM_ORDER) rooms[r] = emptyRoom()
  rooms.living.placed.push(placedItem('sofa_teal', 3, 9), placedItem('plant_pot', 17, 8, { growth: 20 }), placedItem('clock_wall', 9, 2))
  rooms.kitchen.placed.push(placedItem('table_wood', 12, 11), placedItem('frame_cat', 9, 2))
  rooms.bedroom.placed.push(placedItem('bed_blue', 2, 11), placedItem('lamp_table', 9, 12))
  rooms.playroom.placed.push(placedItem('rug_round', 7, 12), placedItem('toychest', 15, 11))
  rooms.garden.placed.push(placedItem('bench', 12, 11), placedItem('flowerbed', 2, 13))
  rooms.study.placed.push(placedItem('desk', 2, 10), placedItem('bookshelf', 8, 7))
  rooms.vault.wallpaper = 'wp_navy'

  const s: GameState = {
    v: SAVE_VERSION,
    pet: {
      name,
      hue: 160,
      eyeHue: 200,
      traits: { energetic: 40, calm: 40, curious: 40, playful: 40, affectionate: 40, shy: 25 },
      needs: defaultNeeds(),
      sick: false,
      asleep: false,
      lampOn: true,
      equipped: { head: null, eyes: null, neck: null, body: null, feet: null, fx: null },
      bornAt: now,
      lastSeenMood: 'content',
      lastPetAt: 0,
    },
    coins: 150,
    ep: 0,
    xp: 0,
    level: 1,
    inventory: { apple: 3, water: 3, bandage: 1, toy_ball: 1, wp_cream: 1, fl_oak: 1, sofa_teal: 1, plant_pot: 1, clock_wall: 1, table_wood: 1, frame_cat: 1, bed_blue: 1, lamp_table: 1, rug_round: 1, toychest: 1, bench: 1, flowerbed: 1, desk: 1, bookshelf: 1 },
    materials: { wood: 2, cloth: 2, thread: 1 },
    rooms,
    unlockedRooms: ['living', 'kitchen', 'bathroom', 'bedroom'],
    currentRoom: 'living',
    daily: { key: '', quests: [] },
    weekly: { key: '', quests: [] },
    achievements: {},
    stats: emptyStats(),
    records: {},
    collection: ['wp_cream', 'fl_oak', 'apple', 'water'],
    recipes: [],
    discoveries: [],
    exploreProg: {},
    eventClaims: [],
    favFood: {},
    stageHistory: [{ stage: 0, at: now }],
    loginDays: 0,
    loginLast: '',
    playSeconds: 0,
    worldMinutes: START_MINUTES,
    created: now,
    lastSave: now,
    lastSeen: now,
    tutorialDone: false,
    settings: defaultSettings(),
  }
  s.recipes = RECIPES.filter((r) => r.minLevel <= 1).map((r) => r.id)
  return s
}

// ---------- Ruh hali ve ihtiyaçlar ----------

export type Mood = 'sleeping' | 'sick' | 'sleepy' | 'hungry' | 'thirsty' | 'dirty' | 'sad' | 'happy' | 'content'

export function moodOf(s: GameState): Mood {
  const n = s.pet.needs
  if (s.pet.asleep) return 'sleeping'
  if (s.pet.sick) return 'sick'
  if (n.energy < 15) return 'sleepy'
  if (n.hunger < 20) return 'hungry'
  if (n.thirst < 20) return 'thirsty'
  if (n.hygiene < 20) return 'dirty'
  if (n.happiness < 30) return 'sad'
  if (n.happiness > 75) return 'happy'
  return 'content'
}

export function decorScore(s: GameState, room: RoomId): number {
  const r = s.rooms[room]
  let v = 0
  for (const p of r.placed) {
    const it = ITEMS[p.item]
    if (!it) continue
    v += it.rarity === 'common' ? 1 : it.rarity === 'uncommon' ? 2 : it.rarity === 'rare' ? 3 : 4
  }
  if (r.wallpaper !== DEFAULT_WALL) v += 2
  if (r.floor !== DEFAULT_FLOOR) v += 2
  return v
}

const approach = (cur: number, target: number, rate: number, dtH: number) => cur + (target - cur) * (1 - Math.exp(-rate * dtH))

export function stepNeeds(s: GameState, dtSec: number, mult = 1): void {
  const p = s.pet
  const n = p.needs
  const h = (dtSec / 3600) * mult
  if (h <= 0) return
  const asleep = p.asleep

  n.hunger -= (asleep ? 4 : 12) * h
  n.thirst -= (asleep ? 5 : 15) * h
  n.hygiene -= (asleep ? 2 : 8) * h
  n.social -= (asleep ? 3 : 9) * h
  const funDrain = n.energy < 20 ? 22 : 14
  n.fun -= (asleep ? 0 : funDrain) * h
  if (asleep) n.energy += (p.lampOn ? 200 : 260) * h
  else n.energy -= 7 * h

  const decor = decorScore(s, s.currentRoom)
  const comfortTarget = clamp(0.5 * n.hygiene + 0.3 * n.energy + 0.2 * Math.min(100, 40 + decor * 6) - (p.sick ? 15 : 0) + (asleep && !p.lampOn ? 10 : 0))
  n.comfort = approach(n.comfort, comfortTarget, 3, h)

  let target = (n.hunger + n.thirst + n.fun + n.social + n.comfort) / 5
  if (n.hunger < 25) target -= 15
  if (n.hygiene < 20) target -= 10
  if (p.sick) target -= 20
  if (n.energy < 15) target -= 10
  n.happiness = approach(n.happiness, clamp(target), 2, h)

  let healthRate = 0
  if (n.hunger < 15 || n.thirst < 15) healthRate -= 8
  if (n.hygiene < 15) healthRate -= 5
  if (n.energy < 10) healthRate -= 4
  if (p.sick) healthRate -= 3
  if (healthRate === 0 && n.hunger > 40 && n.thirst > 40 && n.hygiene > 40) healthRate = p.sick ? 3 : 5
  n.health += healthRate * h

  for (const k of NEED_KEYS) n[k] = clamp(n[k])

  if (!p.sick && n.health < 30) {
    p.sick = true
    toast('warn', `${p.name} hastalandı. İlaç ver ve dinlendir.`)
    sound('sick')
  } else if (p.sick && n.health >= 75) {
    p.sick = false
    toast('info', `${p.name} iyileşti.`)
    bus.emit({ type: 'anim', name: 'recovering' })
  }

  if (asleep && n.energy >= 98) {
    p.asleep = false
    toast('info', `${p.name} uyandı.`)
    bus.emit({ type: 'anim', name: 'wake' })
    sound('wake')
  }
}

export interface OfflineReport {
  seconds: number
  capped: boolean
  before: Needs
  after: Needs
  woke: boolean
}

export function simulateOffline(s: GameState, seconds: number): OfflineReport {
  const raw = Math.max(0, seconds)
  const eff = Math.min(raw, OFFLINE_CAP_SECONDS)
  const before = { ...s.pet.needs }
  const wasAsleep = s.pet.asleep
  if (eff >= 30) {
    const chunks = Math.min(48, Math.max(1, Math.ceil(eff / 600)))
    const dt = eff / chunks
    for (let i = 0; i < chunks; i++) stepNeeds(s, dt, 0.5)
    const n = s.pet.needs
    for (const k of ['hunger', 'thirst', 'hygiene', 'fun', 'social'] as NeedKey[]) n[k] = Math.max(n[k], Math.min(before[k], 15))
    n.health = Math.max(n.health, Math.min(before.health, 40))
    if (!s.pet.asleep) n.energy = Math.max(n.energy, Math.min(before.energy, 10))
    s.worldMinutes += eff
  }
  return { seconds: raw, capped: raw > OFFLINE_CAP_SECONDS, before, after: { ...s.pet.needs }, woke: wasAsleep && !s.pet.asleep }
}

// ---------- Kişilik ----------

export function nudgeTrait(s: GameState, t: Trait, amount: number) {
  const tr = s.pet.traits
  tr[t] = clamp(tr[t] + amount)
  for (const o of TRAITS) if (o !== t) tr[o] = clamp(tr[o] - amount * 0.1)
}

export function dominantTrait(s: GameState): Trait {
  let best: Trait = 'calm'
  let v = -1
  for (const t of TRAITS) {
    if (s.pet.traits[t] > v) {
      v = s.pet.traits[t]
      best = t
    }
  }
  return best
}

export type Taste = 'love' | 'like' | 'yuck'

export function tasteOf(petName: string, itemId: string): Taste {
  const r = hashString(`${petName}|${itemId}`) % 100
  const it = ITEMS[itemId]
  if (r < 12) return 'love'
  if (r > 92 && it && (it.fx?.happiness ?? 0) < 8) return 'yuck'
  return 'like'
}

// ---------- Ekonomi ----------

export function track(s: GameState, stat: StatKey, n = 1) {
  s.stats[stat] += n
  updateQuestToasts(s)
  checkAchievements(s)
}

export function addCoins(s: GameState, n: number, opts: { earned?: boolean; silent?: boolean } = {}) {
  if (n === 0) return
  s.coins = Math.max(0, s.coins + n)
  if (n > 0 && opts.earned !== false) {
    s.stats.coinsEarned += n
    if (!opts.silent) toast('coin', `+${n} coin`)
  }
}

export function addEp(s: GameState, n: number) {
  s.ep += n
}

export function addXp(s: GameState, n: number, opts: { silent?: boolean } = {}) {
  if (n <= 0 || s.level >= MAX_LEVEL) return
  s.xp += n
  s.stats.xpEarned += n
  if (!opts.silent) toast('xp', `+${n} XP`)
  while (s.level < MAX_LEVEL && s.xp >= xpNeeded(s.level)) {
    s.xp -= xpNeeded(s.level)
    levelUp(s)
  }
}

function levelUp(s: GameState) {
  const prevStage = stageOfLevel(s.level)
  s.level += 1
  toast('level', `Seviye ${s.level}`)
  sound('levelup')
  bus.emit({ type: 'levelup', level: s.level })
  for (const r of ROOM_ORDER) {
    if (ROOMS[r].unlock <= s.level && !s.unlockedRooms.includes(r)) {
      s.unlockedRooms.push(r)
      toast('info', `${ROOMS[r].name} açıldı.`)
    }
  }
  for (const rc of RECIPES) {
    if (rc.minLevel <= s.level && !s.recipes.includes(rc.id)) {
      s.recipes.push(rc.id)
      toast('info', `Yeni tarif: ${rc.name}`)
    }
  }
  addCoins(s, 25 + s.level * 5)
  const st = stageOfLevel(s.level)
  if (st !== prevStage) {
    s.stageHistory.push({ stage: st, at: Date.now() })
    toast('level', `${s.pet.name} büyüdü: ${STAGES[st].name}`)
    bus.emit({ type: 'stage', stage: st })
  }
  checkAchievements(s)
}

export function ownedCount(s: GameState, id: string): number {
  return s.inventory[id] ?? 0
}

export function placedCount(s: GameState, id: string): number {
  let n = 0
  for (const r of ROOM_ORDER) for (const p of s.rooms[r].placed) if (p.item === id) n++
  return n
}

export function isConsumable(id: string): boolean {
  const c = ITEMS[id]?.cat
  return c === 'food' || c === 'drink' || c === 'medicine'
}

export function isOwnershipOnly(id: string): boolean {
  const it = ITEMS[id]
  return !!it && !isConsumable(id) && it.cat !== 'furniture'
}

export function grant(s: GameState, id: string, n = 1, opts: { silent?: boolean } = {}) {
  const it = ITEMS[id]
  if (!it) return
  if (isOwnershipOnly(id)) s.inventory[id] = 1
  else s.inventory[id] = (s.inventory[id] ?? 0) + n
  if (!s.collection.includes(id)) {
    s.collection.push(id)
    if (!opts.silent) toast('info', `Koleksiyona eklendi: ${it.name}`)
  }
}

export function grantMaterial(s: GameState, id: string, n = 1) {
  s.materials[id] = (s.materials[id] ?? 0) + n
}

export interface Result {
  ok: boolean
  reason?: string
}

export function buy(s: GameState, id: string, qty = 1): Result {
  const it = ITEMS[id]
  if (!it) return { ok: false, reason: 'Ürün bulunamadı.' }
  if (it.shopHidden) return { ok: false, reason: 'Bu ürün mağazada satılmaz.' }
  if ((it.minLevel ?? 1) > s.level) return { ok: false, reason: `Seviye ${it.minLevel} gerekir.` }
  if (isOwnershipOnly(id) && ownedCount(s, id) > 0) return { ok: false, reason: 'Zaten sahipsin.' }
  const q = isOwnershipOnly(id) ? 1 : Math.max(1, Math.floor(qty))
  const cost = it.price * q
  if (s.coins < cost) return { ok: false, reason: 'Coin yetmiyor.' }
  s.coins -= cost
  grant(s, id, q)
  s.stats.purchases += q
  sound('buy')
  toast('buy', `${it.name} alındı`)
  updateQuestToasts(s)
  checkAchievements(s)
  return { ok: true }
}

export function buyMaterial(s: GameState, id: string, qty = 1): Result {
  const price = MATERIAL_PRICE[id]
  if (!price) return { ok: false, reason: 'Malzeme yok.' }
  if (s.coins < price * qty) return { ok: false, reason: 'Coin yetmiyor.' }
  s.coins -= price * qty
  grantMaterial(s, id, qty)
  sound('buy')
  return { ok: true }
}

// ---------- Bakım ----------

export interface UseOutcome extends Result {
  taste?: Taste
  kind?: 'food' | 'drink' | 'medicine' | 'toy'
  itemId?: string
}

function applyFx(s: GameState, fx: Partial<Record<NeedKey, number>>, mult = 1) {
  for (const k of NEED_KEYS) {
    const d = fx[k]
    if (d) s.pet.needs[k] = clamp(s.pet.needs[k] + d * mult)
  }
}

export function useItem(s: GameState, id: string): UseOutcome {
  const it = ITEMS[id]
  const p = s.pet
  const n = p.needs
  if (!it) return { ok: false, reason: 'Eşya yok.' }
  if (p.asleep) return { ok: false, reason: `${p.name} uyuyor.` }

  if (it.cat === 'food' || it.cat === 'drink') {
    if (ownedCount(s, id) < 1) return { ok: false, reason: 'Envanterde yok.' }
    const isDrink = it.cat === 'drink'
    if (!isDrink && n.hunger >= 95) return { ok: false, reason: `${p.name} tok.` }
    if (isDrink && n.thirst >= 95) return { ok: false, reason: `${p.name} susamadı.` }
    s.inventory[id] -= 1
    const taste = tasteOf(p.name, id)
    applyFx(s, it.fx ?? {})
    if (taste === 'love') applyFx(s, { happiness: 8 })
    if (taste === 'yuck') applyFx(s, { happiness: -4 })
    s.favFood[id] = (s.favFood[id] ?? 0) + 1
    nudgeTrait(s, 'affectionate', 0.4)
    if (it.fx?.energy && it.fx.energy > 0) nudgeTrait(s, 'energetic', 0.3)
    addXp(s, 3, { silent: true })
    addCoins(s, 1, { silent: true })
    track(s, isDrink ? 'drinks' : 'feeds')
    secretFeed(s, id)
    return { ok: true, taste, kind: isDrink ? 'drink' : 'food', itemId: id }
  }

  if (it.cat === 'medicine') {
    if (ownedCount(s, id) < 1) return { ok: false, reason: 'Envanterde yok.' }
    if (!p.sick && n.health >= 98) return { ok: false, reason: `${p.name} sağlıklı.` }
    s.inventory[id] -= 1
    applyFx(s, it.fx ?? {})
    if (it.cure && p.sick) {
      p.sick = false
      n.health = Math.max(n.health, 60)
      bus.emit({ type: 'anim', name: 'recovering' })
    }
    addXp(s, 4, { silent: true })
    track(s, 'meds')
    return { ok: true, kind: 'medicine', itemId: id }
  }

  if (it.cat === 'toy') {
    if (ownedCount(s, id) < 1) return { ok: false, reason: 'Oyuncağa sahip değilsin.' }
    if (n.energy < 12) return { ok: false, reason: `${p.name} çok yorgun.` }
    applyFx(s, it.fx ?? {})
    nudgeTrait(s, 'playful', 0.8)
    addXp(s, 4, { silent: true })
    track(s, 'toys')
    if (id === 'toy_duck' && s.currentRoom === 'bathroom') discover(s, 'duckbath')
    return { ok: true, kind: 'toy', itemId: id }
  }
  return { ok: false, reason: 'Bu eşya kullanılmaz.' }
}

const recentTreats: { id: string; t: number }[] = []
function secretFeed(s: GameState, id: string) {
  const now = Date.now()
  recentTreats.push({ id, t: now })
  while (recentTreats.length && now - recentTreats[0].t > 60000) recentTreats.shift()
  const ids = recentTreats.map((r) => r.id)
  if (ids.includes('icecream') && ids.includes('cocoa')) discover(s, 'hotcold')
}

export function petPet(s: GameState, zone: 'head' | 'body', strength = 1) {
  const n = s.pet.needs
  n.social = clamp(n.social + 0.8 * strength)
  n.happiness = clamp(n.happiness + 0.5 * strength)
  n.comfort = clamp(n.comfort + 0.3 * strength)
  nudgeTrait(s, 'affectionate', 0.05 * strength)
  s.pet.lastPetAt = Date.now()
  if (zone === 'head') nudgeTrait(s, 'shy', -0.02)
}

export function countPetTick(s: GameState) {
  track(s, 'pets')
}

export function setSleep(s: GameState, on: boolean): Result {
  const p = s.pet
  if (on === p.asleep) return { ok: true }
  if (on && p.needs.energy > 92) return { ok: false, reason: `${p.name} uykulu değil.` }
  p.asleep = on
  if (on) {
    s.stats.sleeps += 1
    nudgeTrait(s, 'calm', 0.5)
    addXp(s, 3, { silent: true })
    updateQuestToasts(s)
    checkAchievements(s)
  } else {
    bus.emit({ type: 'anim', name: 'wake' })
  }
  return { ok: true }
}

export function toggleLamp(s: GameState) {
  s.pet.lampOn = !s.pet.lampOn
}

export function finishBath(s: GameState) {
  const n = s.pet.needs
  n.hygiene = 100
  n.comfort = clamp(n.comfort + 12)
  n.happiness = clamp(n.happiness + 5)
  n.health = clamp(n.health + 2)
  nudgeTrait(s, 'calm', 0.4)
  addXp(s, 6, { silent: true })
  addCoins(s, 3, { silent: true })
  track(s, 'baths')
}

export function scrubGain(s: GameState, amount: number) {
  s.pet.needs.hygiene = clamp(s.pet.needs.hygiene + amount)
}

export function danceReward(s: GameState) {
  const n = s.pet.needs
  n.fun = clamp(n.fun + 14)
  n.happiness = clamp(n.happiness + 6)
  n.energy = clamp(n.energy - 4)
  nudgeTrait(s, 'energetic', 0.6)
  nudgeTrait(s, 'playful', 0.3)
  addXp(s, 2, { silent: true })
  track(s, 'dances')
}

// ---------- Kozmetik ----------

export function equip(s: GameState, id: string): Result {
  const it = ITEMS[id]
  if (!it || !it.slot) return { ok: false, reason: 'Takılamaz.' }
  if (ownedCount(s, id) < 1) return { ok: false, reason: 'Sahip değilsin.' }
  const slot = it.slot
  if (s.pet.equipped[slot] === id) {
    s.pet.equipped[slot] = null
    return { ok: true }
  }
  s.pet.equipped[slot] = id
  s.stats.dressUps += 1
  if (SLOTS.every((sl) => s.pet.equipped[sl])) discover(s, 'fulloutfit')
  updateQuestToasts(s)
  checkAchievements(s)
  return { ok: true }
}

export function unequip(s: GameState, slot: Slot) {
  s.pet.equipped[slot] = null
}

// ---------- Oda yerleştirme ----------

export function footprint(p: { item: string; x: number; y: number; flip?: boolean }): { x: number; y: number; w: number; h: number; flat: boolean; zone: 'floor' | 'wall' } {
  const f = item(p.item).furn!
  const flat = p.item.startsWith('rug')
  if (f.zone === 'wall') return { x: p.x, y: p.y, w: f.w, h: f.h, flat: false, zone: 'wall' }
  const depth = flat ? f.h : Math.min(f.h, 2)
  return { x: p.x, y: p.y + f.h - depth, w: f.w, h: depth, flat, zone: 'floor' }
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function canPlace(s: GameState, room: RoomId, id: string, x: number, y: number, ignoreUid?: string): Result {
  const it = ITEMS[id]
  if (!it?.furn) return { ok: false, reason: 'Yerleştirilemez.' }
  if (it.furn.rooms && !it.furn.rooms.includes(room)) return { ok: false, reason: 'Bu oda için uygun değil.' }
  const f = it.furn
  if (x < 0 || x + f.w > GRID.cols) return { ok: false, reason: 'Sahne dışı.' }
  if (f.zone === 'wall') {
    if (y < 0 || y + f.h > GRID.wallRows) return { ok: false, reason: 'Duvara uygun değil.' }
  } else {
    if (y + f.h < GRID.wallRows + 1 || y + f.h > GRID.rows) return { ok: false, reason: 'Zemine uygun değil.' }
    if (y < 0) return { ok: false, reason: 'Sahne dışı.' }
  }
  const fp = footprint({ item: id, x, y })
  if (f.zone === 'wall') {
    for (const fx of ROOMS[room].fixtures) if (overlap(fp, fx)) return { ok: false, reason: 'Pencere veya sabit eşya var.' }
  }
  for (const o of s.rooms[room].placed) {
    if (o.uid === ignoreUid) continue
    const ofp = footprint(o)
    if (ofp.zone !== fp.zone) continue
    if (ofp.flat !== fp.flat) continue
    if (overlap(fp, ofp)) return { ok: false, reason: 'Üst üste biniyor.' }
  }
  return { ok: true }
}

export function placeItem(s: GameState, room: RoomId, id: string, x: number, y: number): Result & { uid?: string } {
  if (ownedCount(s, id) - placedCount(s, id) < 1) return { ok: false, reason: 'Elinde boşta bu eşyadan yok.' }
  const c = canPlace(s, room, id, x, y)
  if (!c.ok) return c
  const p = placedItem(id, x, y)
  s.rooms[room].placed.push(p)
  s.stats.placed += 1
  addXp(s, 3, { silent: true })
  nudgeTrait(s, 'curious', 0.3)
  sound('place')
  updateQuestToasts(s)
  checkAchievements(s)
  return { ok: true, uid: p.uid }
}

export function moveItem(s: GameState, room: RoomId, uid: string, x: number, y: number): Result {
  const p = s.rooms[room].placed.find((o) => o.uid === uid)
  if (!p) return { ok: false, reason: 'Bulunamadı.' }
  const c = canPlace(s, room, p.item, x, y, uid)
  if (!c.ok) return c
  p.x = x
  p.y = y
  return { ok: true }
}

export function removeItem(s: GameState, room: RoomId, uid: string): Result {
  const i = s.rooms[room].placed.findIndex((o) => o.uid === uid)
  if (i < 0) return { ok: false, reason: 'Bulunamadı.' }
  s.rooms[room].placed.splice(i, 1)
  return { ok: true }
}

export function flipItem(s: GameState, room: RoomId, uid: string) {
  const p = s.rooms[room].placed.find((o) => o.uid === uid)
  if (p) p.flip = !p.flip
}

export function tintItem(s: GameState, room: RoomId, uid: string) {
  const p = s.rooms[room].placed.find((o) => o.uid === uid)
  if (p) p.tint = (p.tint + 1) % 6
}

export function applyRoomSkin(s: GameState, room: RoomId, id: string): Result {
  const it = ITEMS[id]
  if (!it || (it.cat !== 'wallpaper' && it.cat !== 'floor')) return { ok: false, reason: 'Uygulanamaz.' }
  if (ownedCount(s, id) < 1) return { ok: false, reason: 'Sahip değilsin.' }
  if (it.cat === 'wallpaper') s.rooms[room].wallpaper = id
  else s.rooms[room].floor = id
  s.stats.placed += 1
  updateQuestToasts(s)
  checkAchievements(s)
  return { ok: true }
}

export function interact(s: GameState, room: RoomId, uid: string): { effect?: string } {
  const p = s.rooms[room].placed.find((o) => o.uid === uid)
  if (!p) return {}
  const kind = ITEMS[p.item]?.furn?.interactive
  if (!kind) return {}
  const n = s.pet.needs
  switch (kind) {
    case 'tv':
    case 'lamp':
    case 'radio':
    case 'musicbox':
    case 'fireplace':
    case 'fountain':
    case 'aquarium':
    case 'mirror':
      p.on = !p.on
      break
    default:
      break
  }
  if (kind === 'tv' && p.on) {
    n.fun = clamp(n.fun + 6)
    if (!anyLampOn(s, room)) discover(s, 'cinema')
  }
  if (kind === 'lamp' && !p.on && !s.pet.asleep) {
    const tv = s.rooms[room].placed.find((o) => ITEMS[o.item]?.furn?.interactive === 'tv' && o.on)
    if (tv && !anyLampOn(s, room)) discover(s, 'cinema')
  }
  if (kind === 'musicbox' && p.on) discover(s, 'dancefloor')
  if (kind === 'fireplace' && p.on) n.comfort = clamp(n.comfort + 6)
  if (kind === 'plant') {
    p.growth = Math.min(100, p.growth + 12)
    n.happiness = clamp(n.happiness + 1)
  }
  if (kind === 'ball' || kind === 'drum' || kind === 'globe') {
    n.fun = clamp(n.fun + 4)
    n.energy = clamp(n.energy - 1)
    nudgeTrait(s, 'playful', 0.2)
  }
  if (kind === 'telescope') {
    const c = clockOf(s.worldMinutes)
    if (c.phase === 'night') {
      discover(s, 'stargazer')
      grantMaterial(s, 'star', 1)
      toast('info', 'Yıldız tozu topladın.')
      nudgeTrait(s, 'curious', 0.6)
    } else toast('info', 'Yıldızlar için gece olmasını bekle.')
  }
  return { effect: kind }
}

function anyLampOn(s: GameState, room: RoomId): boolean {
  return s.rooms[room].placed.some((o) => ITEMS[o.item]?.furn?.interactive === 'lamp' && o.on)
}

export function growPlants(s: GameState, dtSec: number) {
  const g = dtSec / 120
  for (const r of ROOM_ORDER)
    for (const p of s.rooms[r].placed) if (ITEMS[p.item]?.furn?.interactive === 'plant') p.growth = Math.min(100, p.growth + g)
}

// ---------- Üretim ve keşif ----------

export function canCraft(s: GameState, recipeId: string): Result {
  const rc = RECIPES.find((r) => r.id === recipeId)
  if (!rc) return { ok: false, reason: 'Tarif yok.' }
  if (!s.recipes.includes(rc.id)) return { ok: false, reason: 'Tarif henüz açılmadı.' }
  for (const [m, q] of Object.entries(rc.need)) if ((s.materials[m] ?? 0) < q) return { ok: false, reason: 'Malzeme eksik.' }
  const out = ITEMS[rc.out]
  if (out && isOwnershipOnly(out.id) && ownedCount(s, out.id) > 0) return { ok: false, reason: 'Bunu zaten üretmiştin.' }
  return { ok: true }
}

export function craft(s: GameState, recipeId: string): Result {
  const c = canCraft(s, recipeId)
  if (!c.ok) return c
  const rc = RECIPES.find((r) => r.id === recipeId)!
  for (const [m, q] of Object.entries(rc.need)) s.materials[m] -= q
  grant(s, rc.out, 1)
  nudgeTrait(s, 'curious', 1)
  addXp(s, 12)
  track(s, 'crafts')
  sound('craft')
  toast('buy', `${item(rc.out).name} üretildi`)
  return { ok: true }
}

export interface ExploreResult extends Result {
  loot?: { materials: [string, number][]; items: string[] }
}

export function explore(s: GameState, areaId: string): ExploreResult {
  const area = AREAS.find((a) => a.id === areaId)
  if (!area) return { ok: false, reason: 'Bölge yok.' }
  if (s.level < area.unlock) return { ok: false, reason: `Seviye ${area.unlock} gerekir.` }
  const p = s.pet
  if (p.asleep) return { ok: false, reason: `${p.name} uyuyor.` }
  if (p.needs.energy < EXPLORE_COST) return { ok: false, reason: `${p.name} çok yorgun.` }
  p.needs.energy = clamp(p.needs.energy - EXPLORE_COST)
  p.needs.fun = clamp(p.needs.fun + 10)
  const trips = (s.exploreProg[areaId] ?? 0) + 1
  s.exploreProg[areaId] = trips
  const rnd = seeded(`${areaId}:${trips}:${s.created}`)
  const loot: [string, number][] = []
  for (const [m, q] of area.base) loot.push([m, q + (trips % 3 === 0 ? 1 : 0)])
  if (rnd() < 0.35) {
    const [m, q] = area.bonus[Math.floor(rnd() * area.bonus.length)]
    loot.push([m, q])
  }
  for (const [m, q] of loot) grantMaterial(s, m, q)
  const items: string[] = []
  const ms = area.milestones[trips]
  if (ms) {
    grant(s, ms, 1)
    items.push(ms)
  }
  nudgeTrait(s, 'curious', 1.2)
  addXp(s, 10)
  track(s, 'explores')
  sound('explore')
  return { ok: true, loot: { materials: loot, items } }
}

export function discover(s: GameState, id: string) {
  if (s.discoveries.includes(id)) return
  const d = SECRETS.find((x) => x.id === id)
  if (!d) return
  s.discoveries.push(id)
  addCoins(s, d.coins)
  addXp(s, 15)
  if (d.item) grant(s, d.item, 1)
  toast('achievement', `Gizli keşif: ${d.name}`)
  sound('achievement')
  bus.emit({ type: 'burst', kind: 'star', n: 16 })
  checkAchievements(s)
}

// ---------- Görevler ve başarımlar ----------

export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function weekKey(d: Date): string {
  const t = new Date(d)
  const dow = (t.getDay() + 6) % 7
  t.setDate(t.getDate() - dow)
  return dayKey(t)
}

function buildQuests(pool: typeof DAILY_POOL, count: number, seedKey: string, s: GameState, weekly: boolean): QuestInst[] {
  const rnd = seeded(seedKey)
  const picks = [...pool]
  const out: QuestInst[] = []
  while (out.length < count && picks.length) {
    const i = Math.floor(rnd() * picks.length)
    const [pl] = picks.splice(i, 1)
    const tier = Math.min(pl.targets.length - 1, Math.floor(rnd() * pl.targets.length))
    const target = pl.targets[tier]
    out.push({
      id: `${weekly ? 'w' : 'd'}_${pl.stat}_${target}`,
      title: pl.title(target),
      stat: pl.stat,
      target,
      base: s.stats[pl.stat],
      coins: weekly ? 150 + tier * 100 : 30 + tier * 25,
      xp: weekly ? 80 + tier * 50 : 20 + tier * 15,
      ep: weekly ? 20 + tier * 10 : 5 + tier * 3,
      claimed: false,
    })
  }
  return out
}

export function refreshQuests(s: GameState, now = new Date()) {
  const dk = dayKey(now)
  if (s.daily.key !== dk) {
    s.daily = { key: dk, quests: buildQuests(DAILY_POOL, 4, `daily:${dk}`, s, false) }
  }
  const wk = weekKey(now)
  if (s.weekly.key !== wk) {
    s.weekly = { key: wk, quests: buildQuests(WEEKLY_POOL, 2, `weekly:${wk}`, s, true) }
  }
}

export const questProgress = (s: GameState, q: QuestInst) => Math.max(0, Math.min(q.target, s.stats[q.stat] - q.base))
export const questDone = (s: GameState, q: QuestInst) => questProgress(s, q) >= q.target

const announced = new WeakMap<QuestInst, boolean>()
function updateQuestToasts(s: GameState) {
  for (const q of [...s.daily.quests, ...s.weekly.quests]) {
    if (!q.claimed && questDone(s, q) && !announced.get(q)) {
      announced.set(q, true)
      toast('quest', `Görev tamamlandı: ${q.title}`)
      sound('quest')
    }
  }
}

export function claimQuest(s: GameState, kind: 'daily' | 'weekly', id: string): Result {
  const list = kind === 'daily' ? s.daily.quests : s.weekly.quests
  const q = list.find((x) => x.id === id)
  if (!q) return { ok: false, reason: 'Görev yok.' }
  if (q.claimed) return { ok: false, reason: 'Ödül alındı.' }
  if (!questDone(s, q)) return { ok: false, reason: 'Görev bitmedi.' }
  q.claimed = true
  addCoins(s, q.coins)
  addXp(s, q.xp)
  addEp(s, q.ep)
  if (kind === 'daily') s.stats.questsDone += 1
  sound('coin')
  checkAchievements(s)
  return { ok: true }
}

export function achievementProgress(s: GameState, id: string): { value: number; target: number } {
  const a = ACHIEVEMENTS.find((x) => x.id === id)!
  return { value: Math.min(a.target, a.value(s)), target: a.target }
}

export function checkAchievements(s: GameState): string[] {
  const got: string[] = []
  let again = true
  while (again) {
    again = false
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue
      if (a.value(s) >= a.target) {
        s.achievements[a.id] = Date.now()
        s.stats.achievements += 1
        addCoins(s, a.coins, { silent: true })
        toast('achievement', `Başarım: ${a.name}`)
        sound('achievement')
        got.push(a.id)
        again = true
      }
    }
  }
  return got
}

// ---------- Etkinlik ----------

export function eventStatus(s: GameState) {
  const c = clockOf(s.worldMinutes)
  const ev = activeEvent(c)
  return { ev, year: c.year, ep: s.ep }
}

export function claimEvent(s: GameState, evId: string, at: number): Result {
  const c = clockOf(s.worldMinutes)
  const ev = EVENTS.find((e) => e.id === evId)
  if (!ev || activeEvent(c)?.id !== evId) return { ok: false, reason: 'Etkinlik aktif değil.' }
  const r = ev.rewards.find((x) => x.at === at)
  if (!r) return { ok: false, reason: 'Ödül yok.' }
  const key = eventKey(evId, c.year, at)
  if (s.eventClaims.includes(key)) return { ok: false, reason: 'Ödül alındı.' }
  if (s.ep < at) return { ok: false, reason: 'Etkinlik puanı yetmiyor.' }
  s.eventClaims.push(key)
  grant(s, r.item, 1)
  addCoins(s, r.coins)
  sound('achievement')
  return { ok: true }
}

// ---------- Mini oyun ----------

export const MINIGAME_REWARD: Record<string, { perPoint: number; cap: number; xp: number }> = {
  coinrush: { perPoint: 0.35, cap: 140, xp: 12 },
  memory: { perPoint: 0.12, cap: 120, xp: 12 },
  reaction: { perPoint: 0.4, cap: 130, xp: 12 },
  runner: { perPoint: 0.18, cap: 150, xp: 14 },
  stack: { perPoint: 6, cap: 110, xp: 10 },
  colormatch: { perPoint: 1.5, cap: 100, xp: 10 },
}

export function miniReward(id: string, score: number): number {
  const r = MINIGAME_REWARD[id]
  if (!r) return 0
  return Math.max(0, Math.min(r.cap, Math.floor(score * r.perPoint)))
}

export interface MiniResult {
  coins: number
  xp: number
  best: number
  record: boolean
}

export function finishMiniGame(s: GameState, id: string, score: number): MiniResult {
  const meta = MINIGAME_REWARD[id]
  const rec = s.records[id] ?? { best: 0, plays: 0, last: 0, total: 0 }
  const record = score > rec.best
  const coins = miniReward(id, score)
  rec.plays += 1
  rec.last = score
  rec.total += score
  if (record) {
    rec.best = score
    if (rec.plays > 1) s.stats.wins += 1
  }
  s.records[id] = rec
  s.pet.needs.fun = clamp(s.pet.needs.fun + 18)
  s.pet.needs.energy = clamp(s.pet.needs.energy - 6)
  s.pet.needs.happiness = clamp(s.pet.needs.happiness + 4)
  nudgeTrait(s, 'playful', 1)
  nudgeTrait(s, 'energetic', 0.5)
  if (coins > 0) addCoins(s, coins)
  addXp(s, meta?.xp ?? 8)
  addEp(s, 2)
  if (Math.random() < 0.3) grantMaterial(s, ['wood', 'cloth', 'paint', 'thread', 'fruit'][Math.floor(Math.random() * 5)], 1)
  track(s, 'plays')
  return { coins, xp: meta?.xp ?? 8, best: rec.best, record }
}

// ---------- Giriş ve zaman ----------

export function loginTick(s: GameState, now = new Date()): { newDay: boolean } {
  const dk = dayKey(now)
  refreshQuests(s, now)
  if (s.loginLast === dk) return { newDay: false }
  s.loginLast = dk
  s.loginDays += 1
  if (s.loginDays > 1) {
    const bonus = Math.min(100, 20 + s.loginDays * 5)
    addCoins(s, bonus)
    grantMaterial(s, ['cloth', 'wood', 'fruit', 'thread'][s.loginDays % 4], 1)
    toast('info', `Günlük giriş ödülü: ${bonus} coin`)
  }
  if (s.loginDays === 1) grant(s, 'c_badge_first', 1, { silent: true })
  if (s.loginDays === 7) grant(s, 'c_badge_week', 1)
  checkAchievements(s)
  return { newDay: true }
}

export function advanceWorld(s: GameState, dtSec: number) {
  const before = clockOf(s.worldMinutes)
  s.worldMinutes += dtSec
  s.playSeconds += dtSec
  growPlants(s, dtSec)
  const after = clockOf(s.worldMinutes)
  if (after.hour === 3 && !s.pet.asleep) discover(s, 'nightowl')
  if (before.season !== after.season) toast('info', 'Mevsim değişti.')
}

export function validRoom(r: string): r is RoomId {
  return (ROOM_ORDER as string[]).includes(r)
}
