export const GAME_TITLE = 'Project Nova'

export type NeedKey =
  | 'hunger'
  | 'thirst'
  | 'happiness'
  | 'health'
  | 'hygiene'
  | 'energy'
  | 'fun'
  | 'social'
  | 'comfort'

export const NEED_KEYS: NeedKey[] = [
  'hunger',
  'thirst',
  'happiness',
  'health',
  'hygiene',
  'energy',
  'fun',
  'social',
  'comfort',
]

export const NEED_LABEL: Record<NeedKey, string> = {
  hunger: 'Tokluk',
  thirst: 'Su',
  happiness: 'Mutluluk',
  health: 'Sağlık',
  hygiene: 'Temizlik',
  energy: 'Enerji',
  fun: 'Eğlence',
  social: 'Sosyallik',
  comfort: 'Konfor',
}

export type Needs = Record<NeedKey, number>

export type Trait = 'energetic' | 'calm' | 'curious' | 'playful' | 'affectionate' | 'shy'
export const TRAITS: Trait[] = ['energetic', 'calm', 'curious', 'playful', 'affectionate', 'shy']
export const TRAIT_LABEL: Record<Trait, string> = {
  energetic: 'Enerjik',
  calm: 'Sakin',
  curious: 'Meraklı',
  playful: 'Oyuncu',
  affectionate: 'Sevecen',
  shy: 'Utangaç',
}

export type Slot = 'head' | 'eyes' | 'neck' | 'body' | 'feet' | 'fx'
export const SLOTS: Slot[] = ['head', 'eyes', 'neck', 'body', 'feet', 'fx']
export const SLOT_LABEL: Record<Slot, string> = {
  head: 'Baş',
  eyes: 'Göz',
  neck: 'Boyun',
  body: 'Gövde',
  feet: 'Ayak',
  fx: 'Efekt',
}

export type RoomId =
  | 'living'
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'playroom'
  | 'garden'
  | 'study'
  | 'vault'

export const ROOM_ORDER: RoomId[] = [
  'living',
  'kitchen',
  'bathroom',
  'bedroom',
  'playroom',
  'garden',
  'study',
  'vault',
]

export type Category =
  | 'food'
  | 'drink'
  | 'medicine'
  | 'hat'
  | 'glasses'
  | 'clothes'
  | 'shoes'
  | 'accessory'
  | 'furniture'
  | 'wallpaper'
  | 'floor'
  | 'toy'
  | 'collectible'
  | 'special'

export const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Yiyecek',
  drink: 'İçecek',
  medicine: 'İlaç',
  hat: 'Şapka',
  glasses: 'Gözlük',
  clothes: 'Kıyafet',
  shoes: 'Ayakkabı',
  accessory: 'Aksesuar',
  furniture: 'Mobilya',
  wallpaper: 'Duvar kağıdı',
  floor: 'Zemin',
  toy: 'Oyuncak',
  collectible: 'Koleksiyon',
  special: 'Özel',
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Yaygın',
  uncommon: 'Seyrek',
  rare: 'Nadir',
  epic: 'Efsane',
}

export type StatKey =
  | 'feeds'
  | 'drinks'
  | 'baths'
  | 'sleeps'
  | 'meds'
  | 'pets'
  | 'plays'
  | 'coinsEarned'
  | 'placed'
  | 'purchases'
  | 'crafts'
  | 'explores'
  | 'xpEarned'
  | 'achievements'
  | 'dances'
  | 'toys'
  | 'questsDone'
  | 'wins'
  | 'dressUps'

export const STAT_KEYS: StatKey[] = [
  'feeds',
  'drinks',
  'baths',
  'sleeps',
  'meds',
  'pets',
  'plays',
  'coinsEarned',
  'placed',
  'purchases',
  'crafts',
  'explores',
  'xpEarned',
  'achievements',
  'dances',
  'toys',
  'questsDone',
  'wins',
  'dressUps',
]

export type ArtSpec = [kind: string, c1: string, c2?: string, c3?: string]

export interface Item {
  id: string
  name: string
  desc: string
  cat: Category
  price: number
  rarity: Rarity
  art: ArtSpec
  minLevel?: number
  fx?: Partial<Record<NeedKey, number>>
  cure?: boolean
  slot?: Slot
  furn?: { w: number; h: number; zone: 'floor' | 'wall'; rooms?: RoomId[]; interactive?: string }
  shopHidden?: boolean
  event?: string
}

export interface PlacedItem {
  uid: string
  item: string
  x: number
  y: number
  flip: boolean
  tint: number
  on: boolean
  growth: number
}

export interface RoomState {
  wallpaper: string
  floor: string
  placed: PlacedItem[]
}

export interface QuestInst {
  id: string
  title: string
  stat: StatKey
  target: number
  base: number
  coins: number
  xp: number
  ep: number
  claimed: boolean
}

export interface Settings {
  music: boolean
  sfx: boolean
  musicVol: number
  sfxVol: number
  reduceMotion: boolean
  shake: boolean
  showFps: boolean
  devPanel: boolean
  lowGfx: boolean
  sensitivity: number
  fontScale: number
  highContrast: boolean
}

export interface PetState {
  name: string
  hue: number
  eyeHue: number
  traits: Record<Trait, number>
  needs: Needs
  sick: boolean
  asleep: boolean
  lampOn: boolean
  equipped: Record<Slot, string | null>
  bornAt: number
  lastSeenMood: string
  lastPetAt: number
}

export interface GameState {
  v: number
  pet: PetState
  coins: number
  ep: number
  xp: number
  level: number
  inventory: Record<string, number>
  materials: Record<string, number>
  rooms: Record<RoomId, RoomState>
  unlockedRooms: RoomId[]
  currentRoom: RoomId
  daily: { key: string; quests: QuestInst[] }
  weekly: { key: string; quests: QuestInst[] }
  achievements: Record<string, number>
  stats: Record<StatKey, number>
  records: Record<string, { best: number; plays: number; last: number; total: number }>
  collection: string[]
  recipes: string[]
  discoveries: string[]
  exploreProg: Record<string, number>
  eventClaims: string[]
  favFood: Record<string, number>
  stageHistory: { stage: number; at: number }[]
  loginDays: number
  loginLast: string
  playSeconds: number
  worldMinutes: number
  created: number
  lastSave: number
  lastSeen: number
  tutorialDone: boolean
  settings: Settings
}

export type ToastKind = 'coin' | 'xp' | 'quest' | 'achievement' | 'level' | 'buy' | 'error' | 'warn' | 'info'

export const SAVE_VERSION = 1
