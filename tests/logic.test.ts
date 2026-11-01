import { describe, expect, it } from 'vitest'
import {
  OFFLINE_CAP_SECONDS,
  addCoins,
  addXp,
  buy,
  canCraft,
  canPlace,
  checkAchievements,
  claimQuest,
  craft,
  equip,
  explore,
  finishMiniGame,
  grant,
  miniReward,
  newGame,
  placeItem,
  placedCount,
  questDone,
  refreshQuests,
  setSleep,
  simulateOffline,
  stepNeeds,
  track,
  useItem,
} from '../src/game/logic'
import { ITEM_LIST } from '../src/game/items'
import { ACHIEVEMENTS, DAILY_POOL, RECIPES, WEEKLY_POOL, xpNeeded } from '../src/game/progression'
import { parseSave, sanitize, serialize } from '../src/game/save'
import { NEED_KEYS } from '../src/game/types'

const fresh = () => newGame('Test', 1_700_000_000_000)

describe('ihtiyaçlar', () => {
  it('değerler 0-100 aralığında kalır', () => {
    const s = fresh()
    stepNeeds(s, 3600 * 200)
    for (const k of NEED_KEYS) {
      expect(s.pet.needs[k]).toBeGreaterThanOrEqual(0)
      expect(s.pet.needs[k]).toBeLessThanOrEqual(100)
    }
  })

  it('açlık ve enerji zamanla düşer', () => {
    const s = fresh()
    const h0 = s.pet.needs.hunger
    const e0 = s.pet.needs.energy
    stepNeeds(s, 3600)
    expect(s.pet.needs.hunger).toBeLessThan(h0)
    expect(s.pet.needs.energy).toBeLessThan(e0)
  })

  it('uyurken enerji artar, dolunca uyanır', () => {
    const s = fresh()
    s.pet.needs.energy = 20
    expect(setSleep(s, true).ok).toBe(true)
    stepNeeds(s, 3600)
    expect(s.pet.needs.energy).toBeGreaterThan(90)
    stepNeeds(s, 3600)
    expect(s.pet.asleep).toBe(false)
  })

  it('tok iken uyutma reddedilir', () => {
    const s = fresh()
    s.pet.needs.energy = 100
    expect(setSleep(s, true).ok).toBe(false)
  })

  it('düşük açlık mutluluğu aşağı çeker', () => {
    const a = fresh()
    const b = fresh()
    a.pet.needs.hunger = 5
    for (let i = 0; i < 20; i++) {
      stepNeeds(a, 600)
      stepNeeds(b, 600)
      b.pet.needs.hunger = 80
    }
    expect(a.pet.needs.happiness).toBeLessThan(b.pet.needs.happiness)
  })

  it('uzun ihmalde hastalanır ama ölmez', () => {
    const s = fresh()
    stepNeeds(s, 3600 * 400)
    expect(s.pet.sick).toBe(true)
    expect(s.pet.needs.health).toBeGreaterThanOrEqual(0)
  })
})

describe('çevrimdışı ilerleme', () => {
  it('8 saatte sınırlanır', () => {
    const s = fresh()
    const r = simulateOffline(s, 3600 * 40)
    expect(r.capped).toBe(true)
    expect(r.seconds).toBe(3600 * 40)
    expect(OFFLINE_CAP_SECONDS).toBe(28800)
  })

  it('ihtiyaçları düşürür ama sert zemin bırakır', () => {
    const s = fresh()
    const before = s.pet.needs.hunger
    const r = simulateOffline(s, 3600 * 8)
    expect(r.after.hunger).toBeLessThan(before)
    expect(r.after.hunger).toBeGreaterThanOrEqual(15)
  })

  it('kısa süreyi görmezden gelir', () => {
    const s = fresh()
    const before = { ...s.pet.needs }
    simulateOffline(s, 10)
    expect(s.pet.needs).toEqual(before)
  })
})

describe('ekonomi ve mağaza', () => {
  it('yeterli coin ile satın alır', () => {
    const s = fresh()
    s.coins = 100
    s.achievements.a_buy1 = 1
    expect(buy(s, 'pizza').ok).toBe(true)
    expect(s.coins).toBe(72)
    expect(s.inventory.pizza).toBe(1)
    expect(s.stats.purchases).toBe(1)
  })

  it('coin yetmezse reddeder', () => {
    const s = fresh()
    s.coins = 3
    expect(buy(s, 'pizza').ok).toBe(false)
    expect(s.coins).toBe(3)
    expect(s.inventory.pizza).toBeUndefined()
  })

  it('seviye kilidine uyar', () => {
    const s = fresh()
    s.coins = 5000
    expect(buy(s, 'crown').ok).toBe(false)
    s.level = 10
    expect(buy(s, 'crown').ok).toBe(true)
  })

  it('kozmetik ikinci kez alınmaz', () => {
    const s = fresh()
    s.coins = 500
    expect(buy(s, 'cap_red').ok).toBe(true)
    const c = s.coins
    expect(buy(s, 'cap_red').ok).toBe(false)
    expect(s.coins).toBe(c)
  })

  it('kazanılan coin istatistiğe işler', () => {
    const s = fresh()
    addCoins(s, 40)
    expect(s.stats.coinsEarned).toBe(40)
    addCoins(s, -10, { earned: false })
    expect(s.stats.coinsEarned).toBe(40)
  })

  it('mağazada gizli ürün alınamaz', () => {
    const s = fresh()
    s.coins = 9999
    expect(buy(s, 'c_star').ok).toBe(false)
  })
})

describe('envanter ve kullanım', () => {
  it('yemek tüketilir ve açlığı giderir', () => {
    const s = fresh()
    s.pet.needs.hunger = 40
    grant(s, 'burger', 2)
    const r = useItem(s, 'burger')
    expect(r.ok).toBe(true)
    expect(s.inventory.burger).toBe(1)
    expect(s.pet.needs.hunger).toBeGreaterThan(70)
    expect(s.stats.feeds).toBe(1)
  })

  it('tok iken yemek reddedilir ve tüketilmez', () => {
    const s = fresh()
    s.pet.needs.hunger = 99
    grant(s, 'pizza', 1)
    expect(useItem(s, 'pizza').ok).toBe(false)
    expect(s.inventory.pizza).toBe(1)
  })

  it('uyurken beslenmez', () => {
    const s = fresh()
    s.pet.asleep = true
    s.pet.needs.hunger = 10
    expect(useItem(s, 'apple').ok).toBe(false)
  })

  it('su susuzluğu azaltır', () => {
    const s = fresh()
    s.pet.needs.thirst = 20
    expect(useItem(s, 'water').ok).toBe(true)
    expect(s.pet.needs.thirst).toBeGreaterThan(45)
    expect(s.stats.drinks).toBe(1)
  })

  it('şurup hastalığı iyileştirir', () => {
    const s = fresh()
    s.pet.sick = true
    s.pet.needs.health = 20
    grant(s, 'syrup', 1)
    expect(useItem(s, 'syrup').ok).toBe(true)
    expect(s.pet.sick).toBe(false)
    expect(s.pet.needs.health).toBeGreaterThanOrEqual(60)
  })
})

describe('kozmetik', () => {
  it('farklı yuvalar birbirini silmez', () => {
    const s = fresh()
    for (const id of ['cap_red', 'shades', 'bowtie']) grant(s, id)
    equip(s, 'cap_red')
    equip(s, 'shades')
    equip(s, 'bowtie')
    expect(s.pet.equipped.head).toBe('cap_red')
    expect(s.pet.equipped.eyes).toBe('shades')
    expect(s.pet.equipped.neck).toBe('bowtie')
  })

  it('aynı yuvada değiştirir, tekrar basınca çıkarır', () => {
    const s = fresh()
    grant(s, 'cap_red')
    grant(s, 'cap_blue')
    equip(s, 'cap_red')
    equip(s, 'cap_blue')
    expect(s.pet.equipped.head).toBe('cap_blue')
    equip(s, 'cap_blue')
    expect(s.pet.equipped.head).toBeNull()
  })

  it('sahip olunmayan eşya takılmaz', () => {
    const s = fresh()
    expect(equip(s, 'crown').ok).toBe(false)
  })
})

describe('oda yerleştirme', () => {
  it('sahne dışına ve üst üste yerleştirmeyi engeller', () => {
    const s = fresh()
    grant(s, 'sofa_red', 2)
    expect(canPlace(s, 'living', 'sofa_red', 18, 10).ok).toBe(false)
    expect(placeItem(s, 'living', 'sofa_red', 9, 10).ok).toBe(true)
    expect(canPlace(s, 'living', 'sofa_red', 10, 10).ok).toBe(false)
    expect(canPlace(s, 'living', 'sofa_red', 14, 12).ok).toBe(true)
  })

  it('sahip olunandan fazlasını yerleştirmez', () => {
    const s = fresh()
    grant(s, 'lamp_floor', 1)
    expect(placeItem(s, 'living', 'lamp_floor', 10, 9).ok).toBe(true)
    expect(placeItem(s, 'living', 'lamp_floor', 14, 9).ok).toBe(false)
    expect(placedCount(s, 'lamp_floor')).toBe(1)
  })

  it('duvar eşyası zemine konmaz, pencere önüne konmaz', () => {
    const s = fresh()
    grant(s, 'frame_sun', 1)
    expect(canPlace(s, 'living', 'frame_sun', 2, 11).ok).toBe(false)
    expect(canPlace(s, 'living', 'frame_sun', 13, 2).ok).toBe(false)
    expect(canPlace(s, 'living', 'frame_sun', 5, 2).ok).toBe(true)
  })

  it('yatak sadece yatak odasına konur', () => {
    const s = fresh()
    grant(s, 'bed_pink', 1)
    expect(canPlace(s, 'living', 'bed_pink', 8, 11).ok).toBe(false)
    expect(canPlace(s, 'bedroom', 'bed_pink', 12, 11).ok).toBe(true)
  })
})

describe('xp ve seviye', () => {
  it('xp seviye atlatır, artan xp devreder', () => {
    const s = fresh()
    addXp(s, xpNeeded(1) + 10)
    expect(s.level).toBe(2)
    expect(s.xp).toBe(10)
  })

  it('seviye ile oda açılır', () => {
    const s = fresh()
    for (let i = 0; i < 1; i++) addXp(s, xpNeeded(s.level))
    expect(s.unlockedRooms).toContain('playroom')
  })

  it('evre seviyeye göre ilerler', () => {
    const s = fresh()
    while (s.level < 5) addXp(s, xpNeeded(s.level))
    expect(s.stageHistory.length).toBe(2)
  })
})

describe('görevler ve başarımlar', () => {
  it('günlük havuzda en az 30, haftalıkta en az 15 varyasyon var', () => {
    const d = DAILY_POOL.reduce((a, p) => a + p.targets.length, 0)
    const w = WEEKLY_POOL.reduce((a, p) => a + p.targets.length, 0)
    expect(d).toBeGreaterThanOrEqual(30)
    expect(w).toBeGreaterThanOrEqual(15)
  })

  it('aynı gün aynı görevler üretilir', () => {
    const a = fresh()
    const b = fresh()
    const day = new Date(2026, 5, 3)
    refreshQuests(a, day)
    refreshQuests(b, day)
    expect(a.daily.quests.map((q) => q.id)).toEqual(b.daily.quests.map((q) => q.id))
  })

  it('görev ilerlemesi izlenir ve ödül bir kez alınır', () => {
    const s = fresh()
    refreshQuests(s, new Date(2026, 5, 3))
    const q = s.daily.quests[0]
    expect(claimQuest(s, 'daily', q.id).ok).toBe(false)
    track(s, q.stat, q.target)
    expect(questDone(s, q)).toBe(true)
    const coins = s.coins
    expect(claimQuest(s, 'daily', q.id).ok).toBe(true)
    expect(s.coins).toBeGreaterThan(coins)
    const after = s.coins
    expect(claimQuest(s, 'daily', q.id).ok).toBe(false)
    expect(s.coins).toBe(after)
  })

  it('başarım koşulu sağlanınca bir kez açılır', () => {
    const s = fresh()
    track(s, 'feeds')
    expect(s.achievements.a_feed1).toBeTruthy()
    const t = s.achievements.a_feed1
    const coins = s.coins
    track(s, 'feeds')
    expect(s.achievements.a_feed1).toBe(t)
    expect(s.coins).toBe(coins)
    expect(checkAchievements(s)).toEqual([])
  })

  it('en az 40 başarım tanımlı', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })
})

describe('üretim ve keşif', () => {
  it('malzeme yoksa üretmez, varsa tüketir ve eşya verir', () => {
    const s = fresh()
    const rc = RECIPES.find((r) => r.id === 'r_scarf')!
    s.level = 5
    s.recipes.push(rc.id)
    s.materials = {}
    expect(canCraft(s, rc.id).ok).toBe(false)
    s.materials = { cloth: 2, thread: 1 }
    expect(craft(s, rc.id).ok).toBe(true)
    expect(s.materials.cloth).toBe(0)
    expect(s.inventory.scarf_blue).toBe(1)
    expect(s.stats.crafts).toBe(1)
  })

  it('tarif sayısı ve çıktıları geçerli', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(10)
    for (const r of RECIPES) expect(ITEM_LIST.some((i) => i.id === r.out)).toBe(true)
  })

  it('keşif enerji harcar ve malzeme verir', () => {
    const s = fresh()
    s.level = 4
    const e = s.pet.needs.energy
    const r = explore(s, 'forest')
    expect(r.ok).toBe(true)
    expect(s.pet.needs.energy).toBeLessThan(e)
    expect((s.materials.wood ?? 0) + (s.materials.fruit ?? 0)).toBeGreaterThan(2)
  })

  it('üçüncü keşif garantili koleksiyon parçası verir', () => {
    const s = fresh()
    s.level = 4
    for (let i = 0; i < 3; i++) {
      s.pet.needs.energy = 100
      explore(s, 'forest')
    }
    expect(s.inventory.c_feather).toBe(1)
  })

  it('seviye yetmezse keşfe çıkılmaz', () => {
    const s = fresh()
    expect(explore(s, 'cave').ok).toBe(false)
  })
})

describe('mini oyun ödülleri', () => {
  it('ödül üst sınırı aşmaz', () => {
    expect(miniReward('coinrush', 100000)).toBeLessThanOrEqual(140)
    expect(miniReward('coinrush', 0)).toBe(0)
    expect(miniReward('bilinmeyen', 500)).toBe(0)
  })

  it('rekor kaydedilir, ikinci düşük skor rekoru bozmaz', () => {
    const s = fresh()
    const a = finishMiniGame(s, 'coinrush', 200)
    expect(a.record).toBe(true)
    const b = finishMiniGame(s, 'coinrush', 100)
    expect(b.record).toBe(false)
    expect(s.records.coinrush.best).toBe(200)
    expect(s.records.coinrush.plays).toBe(2)
    expect(s.stats.plays).toBe(2)
  })

  it('oynamak eğlenceyi artırır, enerjiyi azaltır', () => {
    const s = fresh()
    s.pet.needs.fun = 30
    s.pet.needs.energy = 80
    finishMiniGame(s, 'memory', 300)
    expect(s.pet.needs.fun).toBeGreaterThan(30)
    expect(s.pet.needs.energy).toBeLessThan(80)
  })
})

describe('kayıt ve yükleme', () => {
  it('kaydedip geri yükleyince aynı durum gelir', () => {
    const s = fresh()
    s.pet.name = 'Bulut'
    grant(s, 'cap_red')
    equip(s, 'cap_red')
    useItem(s, 'apple')
    s.coins = 777
    const r = parseSave(serialize(s))
    expect(r.ok).toBe(true)
    expect(r.state!.coins).toBe(777)
    expect(r.state!.pet.name).toBe('Bulut')
    expect(r.state!.pet.equipped.head).toBe('cap_red')
    expect(r.state!.stats.feeds).toBe(1)
    expect(r.state!.rooms.living.placed.length).toBe(s.rooms.living.placed.length)
  })

  it('bozuk JSON kontrollü hata verir', () => {
    expect(parseSave('{bozuk').ok).toBe(false)
    expect(parseSave('[]').ok).toBe(false)
    expect(parseSave('{"data":{"v":1}}').ok).toBe(false)
  })

  it('daha yeni sürümü reddeder', () => {
    expect(parseSave(JSON.stringify({ v: 99, pet: { name: 'x' } })).ok).toBe(false)
  })

  it('geçersiz değerleri düzeltir', () => {
    const s = fresh()
    const raw = JSON.parse(serialize(s)).data
    raw.coins = -50
    raw.level = 9999
    raw.pet.needs.hunger = 500
    raw.pet.equipped.head = 'olmayan_esya'
    raw.inventory.olmayan = 5
    raw.rooms.living.placed.push({ uid: 'x', item: 'yok', x: 1, y: 1 })
    const c = sanitize(raw)!
    expect(c.coins).toBe(0)
    expect(c.level).toBe(50)
    expect(c.pet.needs.hunger).toBe(100)
    expect(c.pet.equipped.head).toBeNull()
    expect(c.inventory.olmayan).toBeUndefined()
    expect(c.rooms.living.placed.every((p) => p.item !== 'yok')).toBe(true)
  })

  it('içerik hedefleri', () => {
    const foods = ITEM_LIST.filter((i) => i.cat === 'food' || i.cat === 'drink')
    expect(foods.length).toBeGreaterThanOrEqual(30)
    for (const i of ITEM_LIST) {
      expect(i.name.length).toBeGreaterThan(0)
      expect(i.price).toBeGreaterThanOrEqual(0)
    }
  })
})
