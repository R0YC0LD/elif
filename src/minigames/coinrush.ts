import { sound } from '../game/events'
import { drawArt } from '../render/itemArt'
import { Particles } from '../render/particles'
import { DIFF_MULT, PlayerPet, Shake, drawFloats, floatText, makeParticles, rand, skyGradient, type CanvasGame, type Difficulty, type PointerPhase } from './common'

type Kind = 'coin' | 'gold' | 'bomb' | 'magnet' | 'shield' | 'double' | 'time'

interface Drop {
  kind: Kind
  x: number
  y: number
  vy: number
  r: number
  rot: number
}

const W = 480
const H = 640
const GROUND = 586

export class CoinRush implements CanvasGame {
  readonly w = W
  readonly h = H
  score = 0
  over = false
  paused = false
  private pet = new PlayerPet()
  private x = W / 2
  private targetX = W / 2
  private vx = 0
  private drops: Drop[] = []
  private time: number
  private elapsed = 0
  private spawnIn = 0.4
  private combo = 0
  private bestCombo = 0
  private comboT = 0
  private magnet = 0
  private shield = false
  private dbl = 0
  private caught = 0
  private bombs = 0
  private keys = { l: false, r: false }
  private fx: Particles = makeParticles()
  private floats: { x: number; y: number; t: number; text: string; color: string }[] = []
  private shake = new Shake()
  private diffK: number
  private clouds = [rand(0, W), rand(0, W), rand(0, W)]
  private bg = 0

  constructor(diff: Difficulty) {
    this.time = diff === 'easy' ? 50 : diff === 'normal' ? 45 : 40
    this.diffK = diff === 'easy' ? 0.85 : diff === 'normal' ? 1 : 1.25
    void DIFF_MULT
  }

  hud(): [string, string] {
    return [`Puan ${this.score}`, `Süre ${Math.max(0, Math.ceil(this.time))}${this.combo > 1 ? `  x${this.multiplier()}` : ''}`]
  }

  detail() {
    return `Toplanan coin ${this.caught} · En iyi kombo ${this.bestCombo} · Bomba ${this.bombs}`
  }

  private multiplier() {
    return Math.min(5, 1 + Math.floor(this.combo / 4))
  }

  pointer(phase: PointerPhase, x: number) {
    if (phase !== 'up') this.targetX = Math.max(40, Math.min(W - 40, x))
  }

  key(down: boolean, k: string) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.l = down
    if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.r = down
  }

  private spawn() {
    const t = this.elapsed
    const r = Math.random()
    let kind: Kind = 'coin'
    const bombP = Math.min(0.3, 0.1 + t * 0.004) * this.diffK
    if (r < bombP) kind = 'bomb'
    else if (r < bombP + 0.06) kind = 'gold'
    else if (r < bombP + 0.06 + 0.035) kind = (['magnet', 'shield', 'double', 'time'] as Kind[])[Math.floor(Math.random() * 4)]
    const speed = (150 + t * 3.2) * this.diffK
    this.drops.push({ kind, x: rand(36, W - 36), y: -30, vy: speed * rand(0.85, 1.25), r: kind === 'gold' ? 24 : 18, rot: 0 })
  }

  update(dt: number) {
    if (this.over || this.paused) return
    this.elapsed += dt
    this.time -= dt
    if (this.time <= 0) {
      this.time = 0
      this.over = true
      sound('win')
      return
    }
    this.bg += dt * 12
    const sens = 520
    if (this.keys.l) this.targetX -= sens * dt
    if (this.keys.r) this.targetX += sens * dt
    this.targetX = Math.max(40, Math.min(W - 40, this.targetX))
    const prev = this.x
    this.x += (this.targetX - this.x) * Math.min(1, dt * 14)
    this.vx = (this.x - prev) / Math.max(dt, 0.001)
    const pa = this.pet.anim
    if (Math.abs(this.vx) > 120 && !pa.current) pa.play('excited')

    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawn()
      const rate = Math.max(0.2, 0.62 - this.elapsed * 0.006) / this.diffK
      this.spawnIn = rate * rand(0.7, 1.2)
      if (Math.random() < 0.15) this.spawnIn *= 0.4
    }

    if (this.magnet > 0) this.magnet -= dt
    if (this.dbl > 0) this.dbl -= dt
    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0 && this.combo > 0) this.combo = 0
    }

    const py = GROUND - 56
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      if (this.magnet > 0 && (d.kind === 'coin' || d.kind === 'gold')) {
        const dx = this.x - d.x
        const dy = py - d.y
        const dist = Math.hypot(dx, dy)
        if (dist < 220) {
          d.x += (dx / dist) * 380 * dt
          d.y += (dy / dist) * 200 * dt
        }
      }
      d.y += d.vy * dt
      d.rot += dt * 5
      const hit = Math.abs(d.x - this.x) < 52 + d.r * 0.6 && Math.abs(d.y - py) < 58 + d.r * 0.6
      if (hit) {
        this.collect(d)
        this.drops.splice(i, 1)
      } else if (d.y > H + 40) {
        this.drops.splice(i, 1)
      }
    }
    this.fx.update(dt)
    this.pet.update(dt)
    this.shake.step(dt)
  }

  private collect(d: Drop) {
    const py = GROUND - 80
    switch (d.kind) {
      case 'coin':
      case 'gold': {
        this.combo++
        this.comboT = 2.4
        this.bestCombo = Math.max(this.bestCombo, this.combo)
        const base = d.kind === 'gold' ? 30 : 10
        const pts = base * this.multiplier() * (this.dbl > 0 ? 2 : 1)
        this.score += pts
        this.caught++
        floatText(this.floats, d.x, py, `+${pts}`, d.kind === 'gold' ? '#f6e27a' : '#fff')
        this.fx.emit('spark', d.x, d.y, 4, { speed: 80, up: 20, life: 0.5 })
        sound(this.combo > 0 && this.combo % 4 === 0 ? 'combo' : 'coin')
        if (this.combo % 8 === 0) this.pet.anim.play('veryHappy')
        break
      }
      case 'bomb':
        if (this.shield) {
          this.shield = false
          floatText(this.floats, d.x, py, 'Kalkan', '#8fd0e8')
          sound('power')
        } else {
          this.combo = 0
          this.bombs++
          this.time = Math.max(0, this.time - 4)
          this.score = Math.max(0, this.score - 20)
          this.shake.add(10)
          this.fx.emit('star', d.x, d.y, 8, { speed: 120, up: 40, life: 0.6 })
          floatText(this.floats, d.x, py, '-4 sn', '#ff8a7a')
          this.pet.anim.play('surprised')
          sound('bomb')
        }
        break
      case 'magnet':
        this.magnet = 7
        floatText(this.floats, d.x, py, 'Mıknatıs', '#f6e27a')
        sound('power')
        break
      case 'shield':
        this.shield = true
        floatText(this.floats, d.x, py, 'Kalkan', '#8fd0e8')
        sound('power')
        break
      case 'double':
        this.dbl = 8
        floatText(this.floats, d.x, py, 'x2 puan', '#f6e27a')
        sound('power')
        break
      case 'time':
        this.time += 5
        floatText(this.floats, d.x, py, '+5 sn', '#9fe8b4')
        sound('power')
        break
    }
  }

  draw(c: CanvasRenderingContext2D) {
    c.save()
    this.shake.apply(c)
    skyGradient(c, W, H, '#7fc4ea', '#e9f6fb')
    for (let i = 0; i < this.clouds.length; i++) {
      const x = ((this.clouds[i] + this.bg * (0.6 + i * 0.3)) % (W + 160)) - 80
      c.fillStyle = 'rgba(255,255,255,0.85)'
      c.beginPath()
      c.ellipse(x, 80 + i * 70, 50, 17, 0, 0, 7)
      c.ellipse(x - 26, 86 + i * 70, 30, 13, 0, 0, 7)
      c.ellipse(x + 28, 84 + i * 70, 32, 14, 0, 0, 7)
      c.fill()
    }
    c.fillStyle = '#8bc57a'
    c.beginPath()
    c.moveTo(0, GROUND - 40)
    c.bezierCurveTo(W * 0.3, GROUND - 90, W * 0.6, GROUND - 10, W, GROUND - 60)
    c.lineTo(W, H)
    c.lineTo(0, H)
    c.fill()
    c.fillStyle = '#5da24c'
    c.fillRect(0, GROUND, W, H - GROUND)
    c.fillStyle = '#4d8f3f'
    c.fillRect(0, GROUND, W, 6)

    for (const d of this.drops) {
      c.save()
      c.translate(d.x, d.y)
      switch (d.kind) {
        case 'coin':
          c.scale(Math.abs(Math.cos(d.rot)) * 0.7 + 0.3, 1)
          drawArt(c, ['coinold', '#f2b630'], 40)
          break
        case 'gold':
          c.scale(Math.abs(Math.cos(d.rot)) * 0.7 + 0.3, 1)
          drawArt(c, ['coinold', '#f6d34a'], 54)
          break
        case 'bomb':
          drawBomb(c)
          break
        case 'magnet':
          drawPower(c, '#d9433b', 'M')
          break
        case 'shield':
          drawPower(c, '#3f8fd0', 'K')
          break
        case 'double':
          drawPower(c, '#e0793a', 'x2')
          break
        case 'time':
          drawPower(c, '#4f9d4b', '+5')
          break
      }
      c.restore()
    }

    this.pet.draw(c, this.x, GROUND + 6, 0.78)
    if (this.shield) {
      c.beginPath()
      c.arc(this.x, GROUND - 54, 70, 0, 7)
      c.strokeStyle = 'rgba(143,208,232,0.9)'
      c.lineWidth = 4
      c.stroke()
      c.fillStyle = 'rgba(143,208,232,0.18)'
      c.fill()
    }
    if (this.magnet > 0) {
      c.strokeStyle = 'rgba(217,67,59,0.5)'
      c.lineWidth = 3
      c.setLineDash([8, 8])
      c.beginPath()
      c.arc(this.x, GROUND - 60, 120 + Math.sin(this.elapsed * 6) * 6, 0, 7)
      c.stroke()
      c.setLineDash([])
    }
    this.fx.draw(c)
    drawFloats(c, this.floats, 1 / 60)
    if (this.dbl > 0 || this.magnet > 0) {
      c.fillStyle = '#fff'
      c.font = 'bold 15px sans-serif'
      c.textAlign = 'left'
      c.strokeStyle = '#0f2123'
      c.lineWidth = 3
      const txt = `${this.dbl > 0 ? `x2 ${Math.ceil(this.dbl)}  ` : ''}${this.magnet > 0 ? `Mıknatıs ${Math.ceil(this.magnet)}` : ''}`
      c.strokeText(txt, 12, H - 14)
      c.fillText(txt, 12, H - 14)
    }
    c.restore()
  }
}

function drawBomb(c: CanvasRenderingContext2D) {
  c.beginPath()
  c.arc(0, 4, 18, 0, 7)
  c.fillStyle = '#2a3235'
  c.fill()
  c.lineWidth = 3
  c.strokeStyle = '#0f2123'
  c.stroke()
  c.beginPath()
  c.moveTo(6, -12)
  c.quadraticCurveTo(14, -24, 20, -18)
  c.strokeStyle = '#8a6a4a'
  c.lineWidth = 3
  c.stroke()
  c.beginPath()
  c.arc(22, -20, 4, 0, 7)
  c.fillStyle = '#f2653a'
  c.fill()
  c.beginPath()
  c.arc(-6, -2, 4, 0, 7)
  c.fillStyle = 'rgba(255,255,255,0.35)'
  c.fill()
}

function drawPower(c: CanvasRenderingContext2D, col: string, label: string) {
  c.beginPath()
  c.arc(0, 0, 21, 0, 7)
  c.fillStyle = col
  c.fill()
  c.lineWidth = 3
  c.strokeStyle = '#0f2123'
  c.stroke()
  c.fillStyle = '#fff'
  c.font = 'bold 16px sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(label, 0, 1)
  c.textBaseline = 'alphabetic'
}
