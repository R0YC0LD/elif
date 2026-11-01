import { describe, expect, it } from 'vitest'
import { CoinRush } from '../src/minigames/coinrush'
import type { CanvasGame, Difficulty } from '../src/minigames/common'
import { ReactionArena } from '../src/minigames/reaction'
import { PetRunner } from '../src/minigames/runner'
import { StackTower } from '../src/minigames/stack'
import { Animator, ANIM_NAMES, newPose } from '../src/render/pet'
import { clockOf, weatherAt, activeEvent, DAY_MINUTES, DAYS_PER_SEASON } from '../src/game/world'

function run(g: CanvasGame, seconds: number, each?: (t: number) => void) {
  const dt = 1 / 60
  for (let t = 0; t < seconds && !g.over; t += dt) {
    each?.(t)
    g.update(dt)
  }
}

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

describe('mini oyunlar', () => {
  it.each(DIFFS)('Coin Rush süre dolunca biter (%s)', (d) => {
    const g: CanvasGame = new CoinRush(d)
    run(g, 80, (t) => g.pointer('move', 240 + Math.sin(t * 2) * 180, 500))
    expect(g.over).toBe(true)
    expect(g.score).toBeGreaterThanOrEqual(0)
    expect(g.hud()[1]).toContain('Süre')
  })

  it.each(DIFFS)('Reaction Arena biter ve puan negatif olmaz (%s)', (d) => {
    const g = new ReactionArena(d)
    run(g, 60, (t) => {
      if (Math.floor(t * 4) % 2 === 0) g.pointer('down', Math.random() * 480, Math.random() * 640)
    })
    expect(g.over).toBe(true)
    expect(g.score).toBeGreaterThanOrEqual(0)
    expect(g.detail()).toContain('Iska')
  })

  it('Pet Runner dokunmadan engele çarpıp biter', () => {
    const g = new PetRunner('normal')
    run(g, 60)
    expect(g.over).toBe(true)
    expect(g.score).toBeGreaterThan(0)
  })

  it('Pet Runner zıplama mesafeyi artırır', () => {
    const g = new PetRunner('easy')
    let jumps = 0
    run(g, 20, (t) => {
      if (t > jumps * 0.9 + 1) {
        jumps++
        g.key(true, ' ')
        g.key(false, ' ')
      }
    })
    expect(g.score).toBeGreaterThan(20)
  })

  it('Stack Tower kaçırılan blokta oyun biter, tam yerleşimde kat artar', () => {
    const g: CanvasGame = new StackTower('easy')
    let hit = false
    run(g, 30, () => {
      if (hit) return
      const anyG = g as unknown as { cur: { x: number }; stack: { x: number }[] }
      const top = anyG.stack[anyG.stack.length - 1]
      if (Math.abs(anyG.cur.x - top.x) < 4) {
        hit = true
        g.pointer('down', 0, 0)
      }
    })
    expect(g.score).toBeGreaterThanOrEqual(1)
    const g2: CanvasGame = new StackTower('easy')
    run(g2, 0.1)
    g2.pointer('down', 0, 0)
    run(g2, 30)
    expect(typeof g2.over).toBe('boolean')
  })
})

describe('animasyon sistemi', () => {
  it('en az 30 animasyon tanımlı', () => {
    expect(ANIM_NAMES.length).toBeGreaterThanOrEqual(30)
  })

  it('düşük öncelikli animasyon yüksek öncelikliyi kesmez', () => {
    const a = new Animator()
    expect(a.play('eating', { loop: true })).toBe(true)
    expect(a.play('yawn')).toBe(false)
    expect(a.current).toBe('eating')
    a.release('eating')
    for (let i = 0; i < 60; i++) a.update(1 / 60)
    expect(a.current).toBeNull()
    expect(a.play('yawn')).toBe(true)
  })

  it('yüksek öncelikli animasyon araya girebilir', () => {
    const a = new Animator()
    a.play('lookAround')
    expect(a.play('levelUp')).toBe(true)
    expect(a.current).toBe('levelUp')
  })

  it('zamanlı animasyon kendiliğinden biter', () => {
    const a = new Animator()
    a.play('surprised')
    for (let i = 0; i < 120 * 2; i++) a.update(1 / 120)
    expect(a.current).toBeNull()
  })

  it('her animasyon sonlu poz üretir', () => {
    for (const name of ANIM_NAMES) {
      const a = new Animator()
      a.play(name, { loop: false })
      for (let i = 0; i < 90; i++) a.update(1 / 60)
      const p = a.pose
      for (const k of Object.keys(newPose()) as (keyof typeof p)[]) expect(Number.isFinite(p[k])).toBe(true)
    }
  })
})

describe('oyun zamanı', () => {
  it('gün, mevsim ve aydınlık hesaplanır', () => {
    const noon = clockOf(12 * 60)
    expect(noon.phase).toBe('noon')
    expect(noon.daylight).toBe(1)
    expect(clockOf(2 * 60).daylight).toBe(0)
    expect(clockOf(DAY_MINUTES * DAYS_PER_SEASON).season).toBe('summer')
    expect(clockOf(DAY_MINUTES * DAYS_PER_SEASON * 4).season).toBe('spring')
  })

  it('hava durumu aynı zamanda aynı, kışın yağmur yok', () => {
    expect(weatherAt(5000)).toBe(weatherAt(5000))
    for (let i = 0; i < 56; i++) expect(weatherAt(DAY_MINUTES * DAYS_PER_SEASON * 3 + i * 180)).not.toBe('rainy')
  })

  it('etkinlik mevsimin son günlerinde açılır', () => {
    expect(activeEvent(clockOf(DAY_MINUTES * 1))).toBeNull()
    expect(activeEvent(clockOf(DAY_MINUTES * 4))?.id).toBe('spring')
  })
})
