import { sound } from '../game/events'
import { Particles } from '../render/particles'
import { Shake, drawFloats, floatText, makeParticles, skyGradient, type CanvasGame, type Difficulty, type PointerPhase } from './common'

const W = 480
const H = 640
const BH = 34
const COLORS = ['#e8654f', '#f2b630', '#4fa37f', '#3f8fd0', '#e0529a', '#e0793a', '#7fb83f']

interface Block {
  x: number
  w: number
  c: string
}

interface Chip {
  x: number
  y: number
  w: number
  vy: number
  c: string
  rot: number
}

export class StackTower implements CanvasGame {
  readonly w = W
  readonly h = H
  score = 0
  over = false
  paused = false
  private stack: Block[] = [{ x: W / 2 - 110, w: 220, c: '#8a6a4a' }]
  private cur: Block
  private dir = 1
  private speed: number
  private camY = 0
  private camTarget = 0
  private chips: Chip[] = []
  private perfects = 0
  private streak = 0
  private fx: Particles = makeParticles()
  private floats: { x: number; y: number; t: number; text: string; color: string }[] = []
  private shake = new Shake()
  private t = 0
  private fall = 0
  private baseSpeed: number
  private tol: number

  constructor(diff: Difficulty) {
    this.baseSpeed = diff === 'easy' ? 190 : diff === 'normal' ? 240 : 295
    this.tol = diff === 'easy' ? 9 : diff === 'normal' ? 6 : 4
    this.speed = this.baseSpeed
    this.cur = this.nextBlock()
  }

  hud(): [string, string] {
    return [`Kat ${this.score}`, this.streak > 1 ? `Mükemmel x${this.streak}` : `Mükemmel ${this.perfects}`]
  }

  detail() {
    return `Kule ${this.score} kat · Mükemmel yerleşim ${this.perfects}`
  }

  key(down: boolean, k: string) {
    if (down && (k === ' ' || k === 'Enter' || k === 'ArrowDown')) this.drop()
  }

  pointer(phase: PointerPhase) {
    if (phase === 'down') this.drop()
  }

  private nextBlock(): Block {
    const top = this.stack[this.stack.length - 1]
    const c = COLORS[this.stack.length % COLORS.length]
    this.dir = this.stack.length % 2 ? 1 : -1
    return { x: this.dir > 0 ? -top.w : W, w: top.w, c }
  }

  private drop() {
    if (this.over || this.paused) return
    const top = this.stack[this.stack.length - 1]
    const b = this.cur
    const left = Math.max(b.x, top.x)
    const right = Math.min(b.x + b.w, top.x + top.w)
    const overlap = right - left
    const y = this.blockY(this.stack.length)
    if (overlap <= 0) {
      this.chips.push({ x: b.x, y, w: b.w, vy: 0, c: b.c, rot: 0 })
      this.over = true
      this.fall = 1
      this.shake.add(8)
      sound('fail')
      return
    }
    if (Math.abs(b.x - top.x) <= this.tol) {
      this.streak++
      this.perfects++
      const grow = this.streak >= 3 ? 6 : 0
      b.x = top.x - grow / 2
      b.w = top.w + Math.min(grow, 220 - top.w)
      floatText(this.floats, b.x + b.w / 2, this.screenY(y), this.streak > 1 ? `Mükemmel x${this.streak}` : 'Mükemmel', '#f6e27a')
      this.fx.emit('spark', b.x + b.w / 2, this.screenY(y), 10, { speed: 140, up: 30, life: 0.6 })
      sound(this.streak > 1 ? 'combo' : 'match')
    } else {
      this.streak = 0
      if (b.x < top.x) this.chips.push({ x: b.x, y, w: top.x - b.x, vy: 0, c: b.c, rot: 0 })
      else this.chips.push({ x: top.x + top.w, y, w: b.x + b.w - (top.x + top.w), vy: 0, c: b.c, rot: 0 })
      b.x = left
      b.w = overlap
      sound('place')
    }
    this.stack.push({ ...b })
    this.score = this.stack.length - 1
    this.speed = Math.min(this.baseSpeed * 2.1, this.baseSpeed + this.score * 7)
    this.camTarget = Math.max(0, (this.stack.length - 9) * BH)
    this.cur = this.nextBlock()
    this.cur.w = this.stack[this.stack.length - 1].w
    if (this.dir > 0) this.cur.x = -this.cur.w
  }

  private blockY(i: number) {
    return H - 70 - (i + 1) * BH
  }

  private screenY(y: number) {
    return y + this.camY
  }

  update(dt: number) {
    if (this.paused) return
    this.t += dt
    this.shake.step(dt)
    this.fx.update(dt)
    this.camY += (this.camTarget - this.camY) * Math.min(1, dt * 5)
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i]
      c.vy += 1500 * dt
      c.y += c.vy * dt
      c.rot += dt * 2
      if (c.y > H + 400) this.chips.splice(i, 1)
    }
    if (this.over) {
      if (this.fall > 0) this.fall -= dt
      return
    }
    const b = this.cur
    b.x += this.dir * this.speed * dt
    if (b.x + b.w > W + 10) this.dir = -1
    if (b.x < -10) this.dir = 1
  }

  draw(c: CanvasRenderingContext2D) {
    c.save()
    this.shake.apply(c)
    const k = Math.min(1, this.score / 40)
    skyGradient(c, W, H, k > 0.5 ? '#1c2a4e' : '#8fcbeb', k > 0.5 ? '#46608f' : '#e9f6fb')
    if (k > 0.5) {
      c.fillStyle = '#fff'
      for (let i = 0; i < 30; i++) c.fillRect((i * 97) % W, (i * 53) % H, 2, 2)
    }
    c.fillStyle = '#6fae5a'
    c.fillRect(0, H - 70 + this.camY, W, 90)
    c.fillStyle = '#5a9a48'
    c.fillRect(0, H - 70 + this.camY, W, 8)
    c.lineWidth = 3
    c.strokeStyle = '#0f2123'
    c.lineJoin = 'round'
    for (let i = 0; i < this.stack.length; i++) {
      const b = this.stack[i]
      const y = this.screenY(this.blockY(i))
      if (y > H || y < -BH) continue
      c.fillStyle = b.c
      c.beginPath()
      c.roundRect(b.x, y, b.w, BH, 4)
      c.fill()
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.28)'
      c.fillRect(b.x + 4, y + 4, b.w - 8, 6)
    }
    if (!this.over) {
      const b = this.cur
      const y = this.screenY(this.blockY(this.stack.length))
      c.fillStyle = b.c
      c.beginPath()
      c.roundRect(b.x, y, b.w, BH, 4)
      c.fill()
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.28)'
      c.fillRect(b.x + 4, y + 4, b.w - 8, 6)
    }
    for (const ch of this.chips) {
      c.save()
      c.translate(ch.x + ch.w / 2, this.screenY(ch.y) + BH / 2)
      c.rotate(ch.rot * 0.4)
      c.fillStyle = ch.c
      c.beginPath()
      c.roundRect(-ch.w / 2, -BH / 2, ch.w, BH, 4)
      c.fill()
      c.stroke()
      c.restore()
    }
    this.fx.draw(c)
    drawFloats(c, this.floats, 1 / 60)
    c.restore()
  }
}
