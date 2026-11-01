import { stageOfLevel } from '../game/progression'
import { store } from '../game/store'
import { Animator, drawPet, stageScale } from '../render/pet'
import { Particles } from '../render/particles'

export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Kolay', normal: 'Normal', hard: 'Zor' }
export const DIFF_MULT: Record<Difficulty, number> = { easy: 0.8, normal: 1, hard: 1.35 }

export type PointerPhase = 'down' | 'move' | 'up'

export interface CanvasGame {
  readonly w: number
  readonly h: number
  score: number
  over: boolean
  paused: boolean
  update(dt: number): void
  draw(c: CanvasRenderingContext2D): void
  pointer(phase: PointerPhase, x: number, y: number): void
  key(down: boolean, key: string): void
  hud(): [string, string]
  detail(): string
}

export class PlayerPet {
  anim = new Animator()
  private t = 0

  constructor() {
    const s = store.state
    this.anim.traits = s.pet.traits
    this.anim.mood = 'happy'
    this.anim.onIdleEvent = null
  }

  update(dt: number) {
    this.t += dt
    this.anim.update(dt)
  }

  draw(c: CanvasRenderingContext2D, x: number, groundY: number, size = 0.8, flip = 1) {
    const s = store.state
    c.save()
    c.translate(x, groundY)
    c.scale(size * flip, size)
    c.fillStyle = 'rgba(0,0,0,0.25)'
    c.beginPath()
    c.ellipse(0, 2, 50 * stageScale(stageOfLevel(s.level)), 9, 0, 0, 7)
    c.fill()
    drawPet(c, { hue: s.pet.hue, eyeHue: s.pet.eyeHue, stage: stageOfLevel(s.level), equipped: s.pet.equipped, time: this.t }, this.anim.pose, { n: 0 })
    c.restore()
  }
}

export class Shake {
  v = 0
  add(a: number) {
    if (store.state.settings.shake && !store.state.settings.reduceMotion) this.v = Math.max(this.v, a)
  }
  step(dt: number) {
    this.v = Math.max(0, this.v - dt * 30)
  }
  apply(c: CanvasRenderingContext2D) {
    if (this.v > 0) c.translate((Math.random() - 0.5) * this.v, (Math.random() - 0.5) * this.v)
  }
}

export function makeParticles() {
  const p = new Particles(160)
  if (store.state.settings.lowGfx) p.setLimit(50)
  return p
}

export function floatText(list: { x: number; y: number; t: number; text: string; color: string }[], x: number, y: number, text: string, color = '#fff') {
  list.push({ x, y, t: 0, text, color })
  if (list.length > 14) list.shift()
}

export function drawFloats(c: CanvasRenderingContext2D, list: { x: number; y: number; t: number; text: string; color: string }[], dt: number) {
  c.save()
  c.font = 'bold 22px sans-serif'
  c.textAlign = 'center'
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]
    f.t += dt
    if (f.t > 0.9) {
      list.splice(i, 1)
      continue
    }
    c.globalAlpha = 1 - f.t / 0.9
    c.lineWidth = 4
    c.strokeStyle = '#0f2123'
    c.strokeText(f.text, f.x, f.y - f.t * 40)
    c.fillStyle = f.color
    c.fillText(f.text, f.x, f.y - f.t * 40)
  }
  c.restore()
}

export function skyGradient(c: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string) {
  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
