import { seeded, clamp } from './rng'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Weather = 'sunny' | 'rainy' | 'cloudy' | 'snowy' | 'windy'
export type Phase = 'morning' | 'noon' | 'evening' | 'night'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
export const SEASON_LABEL: Record<Season, string> = { spring: 'İlkbahar', summer: 'Yaz', autumn: 'Sonbahar', winter: 'Kış' }
export const WEATHER_LABEL: Record<Weather, string> = { sunny: 'Güneşli', rainy: 'Yağmurlu', cloudy: 'Bulutlu', snowy: 'Karlı', windy: 'Rüzgarlı' }
export const PHASE_LABEL: Record<Phase, string> = { morning: 'Sabah', noon: 'Öğle', evening: 'Akşam', night: 'Gece' }

export const DAY_MINUTES = 1440
export const DAYS_PER_SEASON = 7
export const START_MINUTES = 8 * 60

export interface Clock {
  day: number
  hour: number
  minute: number
  phase: Phase
  season: Season
  seasonDay: number
  year: number
  daylight: number
}

export function clockOf(worldMinutes: number): Clock {
  const day = Math.floor(worldMinutes / DAY_MINUTES)
  const inDay = worldMinutes - day * DAY_MINUTES
  const hour = Math.floor(inDay / 60)
  const minute = Math.floor(inDay % 60)
  const seasonIdx = Math.floor(day / DAYS_PER_SEASON) % 4
  const phase: Phase = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'noon' : hour >= 17 && hour < 21 ? 'evening' : 'night'
  const h = inDay / 60
  let daylight = 0
  if (h >= 5 && h < 7.5) daylight = (h - 5) / 2.5
  else if (h >= 7.5 && h < 17.5) daylight = 1
  else if (h >= 17.5 && h < 20.5) daylight = 1 - (h - 17.5) / 3
  return {
    day,
    hour,
    minute,
    phase,
    season: SEASONS[seasonIdx],
    seasonDay: day % DAYS_PER_SEASON,
    year: Math.floor(day / (DAYS_PER_SEASON * 4)),
    daylight: clamp(daylight, 0, 1),
  }
}

const WEATHER_WEIGHTS: Record<Season, [Weather, number][]> = {
  spring: [['sunny', 4], ['cloudy', 3], ['rainy', 4], ['windy', 2]],
  summer: [['sunny', 8], ['cloudy', 2], ['rainy', 2], ['windy', 1]],
  autumn: [['sunny', 2], ['cloudy', 4], ['rainy', 4], ['windy', 4]],
  winter: [['sunny', 2], ['cloudy', 4], ['snowy', 7], ['windy', 2]],
}

export function weatherAt(worldMinutes: number): Weather {
  const block = Math.floor(worldMinutes / 180)
  const season = clockOf(worldMinutes).season
  const rnd = seeded(`w${block}`)
  const table = WEATHER_WEIGHTS[season]
  const total = table.reduce((a, [, w]) => a + w, 0)
  let r = rnd() * total
  for (const [w, n] of table) {
    r -= n
    if (r <= 0) return w
  }
  return 'sunny'
}

export interface GameEventDef {
  id: string
  name: string
  season: Season
  blurb: string
  rewards: { at: number; item: string; coins: number }[]
}

export const EVENTS: GameEventDef[] = [
  {
    id: 'spring',
    name: 'İlkbahar Çiçek Şenliği',
    season: 'spring',
    blurb: 'Bahçede çiçekler açtı. Görevleri tamamlayıp etkinlik puanı topla.',
    rewards: [
      { at: 30, item: 'flowercrown', coins: 60 },
      { at: 80, item: 'c_blossom', coins: 120 },
      { at: 150, item: 'fx_leaves', coins: 200 },
    ],
  },
  {
    id: 'summer',
    name: 'Yaz Partisi',
    season: 'summer',
    blurb: 'Gün uzun, parti hazır. Havuz keyfi ve limonata.',
    rewards: [
      { at: 30, item: 'straw', coins: 60 },
      { at: 80, item: 'c_sunhat', coins: 120 },
      { at: 150, item: 'star_glasses', coins: 200 },
    ],
  },
  {
    id: 'autumn',
    name: 'Sonbahar Koleksiyonu',
    season: 'autumn',
    blurb: 'Yapraklar döküldü. Koleksiyon parçaları topla.',
    rewards: [
      { at: 30, item: 'scarf_red', coins: 60 },
      { at: 80, item: 'c_leafbadge', coins: 120 },
      { at: 150, item: 'vest', coins: 200 },
    ],
  },
  {
    id: 'winter',
    name: 'Kış Festivali',
    season: 'winter',
    blurb: 'Kar yağıyor, ışıklar yandı. Sıcak çikolata zamanı.',
    rewards: [
      { at: 30, item: 'beanie', coins: 60 },
      { at: 80, item: 'c_snowglobe', coins: 120 },
      { at: 150, item: 'fx_snow', coins: 200 },
    ],
  },
]

export function activeEvent(c: Clock): GameEventDef | null {
  if (c.seasonDay < 3) return null
  return EVENTS.find((e) => e.season === c.season) ?? null
}

export const eventKey = (id: string, year: number, at: number) => `${id}:${year}:${at}`
