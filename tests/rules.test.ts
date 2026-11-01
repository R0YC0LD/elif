import { describe, expect, it } from 'vitest'
import {
  addEp,
  buy,
  canPlayMini,
  countPetTick,
  finishBath,
  finishMiniGame,
  newGame,
  playFatigue,
  stepNeeds,
  syncEvent,
} from '../src/game/logic'
import { parseSave, serialize } from '../src/game/save'
import { DAY_MINUTES } from '../src/game/world'

const fresh = () => newGame('Test', 1_700_000_000_000)

describe('etkinlik puanı', () => {
  it('etkinlik yokken puan eklenmez', () => {
    const s = fresh()
    syncEvent(s)
    addEp(s, 10)
    expect(s.ep).toBe(0)
    expect(s.epCycle).toBe('')
  })

  it('etkinlik başlayınca puan sıfırlanır ve birikmeye başlar', () => {
    const s = fresh()
    s.ep = 500
    s.worldMinutes = DAY_MINUTES * 4
    syncEvent(s)
    expect(s.epCycle).toBe('spring:0')
    expect(s.ep).toBe(0)
    addEp(s, 25)
    expect(s.ep).toBe(25)
    syncEvent(s)
    expect(s.ep).toBe(25)
  })

  it('etkinlik bitince döngü kapanır, yeni etkinlikte puan sıfırdan başlar', () => {
    const s = fresh()
    s.worldMinutes = DAY_MINUTES * 4
    syncEvent(s)
    addEp(s, 100)
    s.worldMinutes = DAY_MINUTES * 8
    syncEvent(s)
    expect(s.epCycle).toBe('')
    s.worldMinutes = DAY_MINUTES * 11
    syncEvent(s)
    expect(s.epCycle).toBe('summer:0')
    expect(s.ep).toBe(0)
  })

  it('döngü kayıttan geri gelir', () => {
    const s = fresh()
    s.worldMinutes = DAY_MINUTES * 4
    syncEvent(s)
    const r = parseSave(serialize(s))
    expect(r.state!.epCycle).toBe('spring:0')
  })
})

describe('mini oyun dengesi', () => {
  it('uyuyan veya bitkin karakter oynayamaz', () => {
    const s = fresh()
    expect(canPlayMini(s).ok).toBe(true)
    s.pet.asleep = true
    expect(canPlayMini(s).ok).toBe(false)
    s.pet.asleep = false
    s.pet.needs.energy = 5
    expect(canPlayMini(s).ok).toBe(false)
  })

  it('peş peşe oynayınca ödül azalır, alt sınırı var', () => {
    const s = fresh()
    const first = finishMiniGame(s, 'coinrush', 400).coins
    finishMiniGame(s, 'coinrush', 400)
    finishMiniGame(s, 'coinrush', 400)
    const later = finishMiniGame(s, 'coinrush', 400)
    expect(later.fatigue).toBeLessThan(1)
    expect(later.coins).toBeLessThan(first)
    for (let i = 0; i < 12; i++) finishMiniGame(s, 'coinrush', 400)
    expect(playFatigue()).toBeGreaterThanOrEqual(0.4)
  })

  it('zaman geçince yorgunluk geçer', () => {
    expect(playFatigue(Date.now() + 11 * 60000)).toBe(1)
  })
})

describe('kötüye kullanım önlemleri', () => {
  it('çok hızlı dokunma sevme sayısını şişirmez', () => {
    const s = fresh()
    for (let i = 0; i < 50; i++) countPetTick(s)
    expect(s.stats.pets).toBeLessThanOrEqual(1)
  })

  it('temiz karakteri yıkamak az ödül verir', () => {
    const a = fresh()
    const b = fresh()
    finishBath(a, 20)
    finishBath(b, 90)
    expect(a.xp).toBeGreaterThan(b.xp)
  })

  it('satın almada tek bildirim yeterli, koleksiyona eklenir', () => {
    const s = fresh()
    s.coins = 200
    expect(buy(s, 'cap_red').ok).toBe(true)
    expect(s.collection).toContain('cap_red')
  })
})

describe('hastalık', () => {
  it('hasta ama bakımlı karakter makul sürede iyileşir', () => {
    const s = fresh()
    s.pet.sick = true
    s.pet.needs.health = 25
    for (let i = 0; i < 10; i++) {
      s.pet.needs.hunger = s.pet.needs.thirst = s.pet.needs.hygiene = 80
      stepNeeds(s, 1800)
    }
    expect(s.pet.sick).toBe(false)
  })

  it('uyku iyileşmeyi hızlandırır', () => {
    const a = fresh()
    const b = fresh()
    for (const s of [a, b]) {
      s.pet.sick = true
      s.pet.needs.health = 25
      s.pet.needs.energy = 20
    }
    b.pet.asleep = true
    stepNeeds(a, 3600)
    stepNeeds(b, 3600)
    expect(b.pet.needs.health).toBeGreaterThan(a.pet.needs.health)
  })
})
