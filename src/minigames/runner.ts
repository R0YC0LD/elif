import { sound } from '../game/events'
import { drawArt } from '../render/itemArt'
import { Particles } from '../render/particles'
import { PlayerPet, Shake, drawFloats, floatText, makeParticles, rand, skyGradient, type CanvasGame, type Difficulty, type PointerPhase } from './common'

const W = 640
const H = 480
const GROUND = 396
const GRAV = 2300
const JUMP_V = 860

type OKind = 'crate' | 'bird' | 'gate' | 'spikes'

interface Obstacle {
  kind: OKind
  x: number
  w: number
  h: number
  y: number
}

interface Pickup {
  kind: 'coin' | 'magnet' | 'shield' | 'dash'
  x: number
  y: number
  rot: number
}

export class PetRunner implements CanvasGame {
  readonly w = W
  readonly h = H
  score = 0
  over = false
  paused = false
  private pet = new PlayerPet()
  private px = 130
  private py = GROUND
  private vy = 0
  private onGround = true
  private jumps = 0
  private sliding = 0
  private speed: number
  private baseSpeed: number
  private dist = 0
  private coins = 0
  private obstacles: Obstacle[] = []
  private pickups: Pickup[] = []
  private nextPattern = 1.2
  private shield = false
  private magnet = 0
  private dash = 0
  private fx: Particles = makeParticles()
  private floats: { x: number; y: number; t: number; text: string; color: string }[] = []
  private shake = new Shake()
  private t = 0
  private hills = 0
  private clouds = 0
  private ground = 0
  private jumpHeld = false
  private startY = 0
  private touchId = false

  constructor(diff: Difficulty) {
    this.baseSpeed = diff === 'easy' ? 300 : diff === 'normal' ? 340 : 390
    this.speed = this.baseSpeed
  }

  hud(): [string, string] {
    return [`${Math.floor(this.dist)} m`, `Coin ${this.coins}${this.dash > 0 ? '  Atılım' : ''}`]
  }

  detail() {
    return `Mesafe ${Math.floor(this.dist)} m · Toplanan coin ${this.coins}`
  }

  pointer(phase: PointerPhase, x: number, y: number) {
    if (this.over || this.paused) return
    if (phase === 'down') {
      this.startY = y
      this.touchId = true
      this.jump()
    } else if (phase === 'move' && this.touchId) {
      if (y - this.startY > 34) {
        this.slide()
        this.touchId = false
      }
    } else if (phase === 'up') {
      this.touchId = false
      this.jumpHeld = false
    }
    void x
  }

  key(down: boolean, k: string) {
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      if (down && !this.jumpHeld) this.jump()
      this.jumpHeld = down
    }
    if ((k === 'ArrowDown' || k === 's' || k === 'S') && down) this.slide()
  }

  private jump() {
    if (this.sliding > 0) this.sliding = 0
    if (this.onGround) {
      this.vy = -JUMP_V
      this.onGround = false
      this.jumps = 1
      this.pet.anim.play('jumping')
      sound('jump')
      this.fx.emit('crumb', this.px, GROUND, 4, { speed: 60, up: 30, life: 0.4 })
    } else if (this.jumps === 1) {
      this.vy = -JUMP_V * 0.82
      this.jumps = 2
      sound('jump')
      this.fx.emit('spark', this.px, this.py - 40, 6, { speed: 80, up: 10, life: 0.4 })
    }
  }

  private slide() {
    if (!this.onGround) {
      this.vy = Math.max(this.vy, 900)
      return
    }
    this.sliding = 0.6
    sound('slide')
  }

  private spawnPattern() {
    const x0 = W + 60
    const r = Math.random()
    const sp = this.speed
    const gap = Math.max(260, sp * 0.62)
    if (r < 0.28) {
      this.obstacles.push({ kind: 'crate', x: x0, w: 54, h: 54, y: GROUND - 54 })
      this.arc(x0 - 20, 150, 5)
    } else if (r < 0.46) {
      this.obstacles.push({ kind: 'crate', x: x0, w: 54, h: 54, y: GROUND - 54 })
      this.obstacles.push({ kind: 'crate', x: x0 + 62, w: 54, h: 54, y: GROUND - 54 })
      this.arc(x0 - 10, 170, 6)
    } else if (r < 0.62) {
      this.obstacles.push({ kind: 'bird', x: x0, w: 54, h: 36, y: GROUND - 98 })
      this.row(x0 + 100, GROUND - 40, 4)
    } else if (r < 0.76) {
      this.obstacles.push({ kind: 'gate', x: x0, w: 46, h: 104, y: GROUND - 160 })
      this.row(x0 + 20, GROUND - 40, 4)
    } else if (r < 0.9) {
      this.obstacles.push({ kind: 'spikes', x: x0, w: 90, h: 30, y: GROUND - 30 })
      this.arc(x0 - 10, 160, 5)
    } else {
      this.row(x0, GROUND - 46, 8)
      if (Math.random() < 0.5) this.pickups.push({ kind: (['magnet', 'shield', 'dash'] as const)[Math.floor(Math.random() * 3)], x: x0 + 230, y: GROUND - 90, rot: 0 })
    }
    this.nextPattern = gap / sp + rand(0.1, 0.5)
  }

  private row(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.pickups.push({ kind: 'coin', x: x + i * 44, y, rot: i })
  }

  private arc(x: number, h: number, n: number) {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1)
      this.pickups.push({ kind: 'coin', x: x + i * 44, y: GROUND - 46 - Math.sin(k * Math.PI) * h, rot: i })
    }
  }

  update(dt: number) {
    if (this.over || this.paused) return
    this.t += dt
    this.speed = (this.baseSpeed + Math.min(300, this.t * 7)) * (this.dash > 0 ? 1.55 : 1)
    this.dist += (this.speed * dt) / 40
    this.hills += this.speed * dt * 0.25
    this.clouds += this.speed * dt * 0.08
    this.ground += this.speed * dt
    if (this.dash > 0) this.dash -= dt
    if (this.magnet > 0) this.magnet -= dt
    if (this.sliding > 0) this.sliding -= dt

    this.vy += GRAV * dt * (this.jumpHeld || this.vy > 0 ? 1 : 1.5)
    this.py += this.vy * dt
    if (this.py >= GROUND) {
      if (!this.onGround) this.fx.emit('crumb', this.px, GROUND, 3, { speed: 50, up: 20, life: 0.3 })
      this.py = GROUND
      this.vy = 0
      this.onGround = true
      this.jumps = 0
    }

    this.nextPattern -= dt
    if (this.nextPattern <= 0) this.spawnPattern()

    const hb = this.hitbox()
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      o.x -= this.speed * dt
      if (o.x + o.w < -30) {
        this.obstacles.splice(i, 1)
        continue
      }
      if (o.x < hb.x + hb.w && o.x + o.w > hb.x && o.y < hb.y + hb.h && o.y + o.h > hb.y) {
        if (this.dash > 0) {
          this.obstacles.splice(i, 1)
          this.fx.emit('star', o.x, o.y, 6, { speed: 140, up: 40, life: 0.5 })
          sound('bomb')
          continue
        }
        if (this.shield) {
          this.shield = false
          this.obstacles.splice(i, 1)
          this.shake.add(6)
          sound('bomb')
          floatText(this.floats, this.px, this.py - 120, 'Kalkan', '#8fd0e8')
          continue
        }
        this.crash()
        return
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      if (this.magnet > 0 && p.kind === 'coin') {
        const dx = this.px - p.x
        const dy = this.py - 50 - p.y
        const d = Math.hypot(dx, dy)
        if (d < 260) {
          p.x += (dx / d) * 520 * dt
          p.y += (dy / d) * 520 * dt
        }
      }
      p.x -= this.speed * dt
      p.rot += dt * 6
      if (p.x < -40) {
        this.pickups.splice(i, 1)
        continue
      }
      if (Math.abs(p.x - this.px) < 36 && Math.abs(p.y - (this.py - 48)) < 56) {
        this.pickups.splice(i, 1)
        if (p.kind === 'coin') {
          this.coins++
          this.fx.emit('spark', p.x, p.y, 3, { speed: 60, up: 10, life: 0.4 })
          sound('coin')
        } else {
          sound('power')
          if (p.kind === 'magnet') this.magnet = 7
          else if (p.kind === 'shield') this.shield = true
          else this.dash = 3
          floatText(this.floats, this.px, this.py - 120, p.kind === 'magnet' ? 'Mıknatıs' : p.kind === 'shield' ? 'Kalkan' : 'Atılım', '#f6e27a')
        }
      }
    }
    this.score = Math.floor(this.dist) + this.coins * 5
    this.pet.update(dt)
    this.fx.update(dt)
    this.shake.step(dt)
    if (this.onGround && Math.random() < dt * 14) this.fx.emit('crumb', this.px - 20, GROUND, 1, { speed: 20, up: 20, life: 0.3 })
  }

  private hitbox() {
    const h = this.sliding > 0 ? 44 : 84
    return { x: this.px - 28, y: this.py - h - 4, w: 56, h }
  }

  private crash() {
    this.over = true
    this.shake.add(14)
    this.pet.anim.play('defeat')
    this.fx.emit('star', this.px, this.py - 50, 14, { speed: 150, up: 60, life: 0.7 })
    sound('fail')
  }

  draw(c: CanvasRenderingContext2D) {
    c.save()
    this.shake.apply(c)
    skyGradient(c, W, H, '#9bd3ee', '#f2f8e8')
    for (let i = 0; i < 4; i++) {
      const x = ((((i * 190 - this.clouds) % (W + 200)) + (W + 200)) % (W + 200)) - 100
      c.fillStyle = 'rgba(255,255,255,0.85)'
      c.beginPath()
      c.ellipse(x, 70 + (i % 2) * 40, 52, 16, 0, 0, 7)
      c.ellipse(x - 28, 76 + (i % 2) * 40, 30, 12, 0, 0, 7)
      c.ellipse(x + 26, 74 + (i % 2) * 40, 32, 13, 0, 0, 7)
      c.fill()
    }
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? '#6fb35a' : '#9ccb82'
      const off = this.hills * (layer ? 1.6 : 1)
      c.beginPath()
      c.moveTo(0, H)
      for (let x = 0; x <= W; x += 20) {
        const y = GROUND - 60 - layer * 14 + Math.sin((x + off) * 0.011 + layer * 2) * 26 + Math.sin((x + off) * 0.027) * 8
        c.lineTo(x, y)
      }
      c.lineTo(W, H)
      c.fill()
    }
    c.fillStyle = '#c89a62'
    c.fillRect(0, GROUND, W, H - GROUND)
    c.fillStyle = '#6fae5a'
    c.fillRect(0, GROUND, W, 10)
    c.strokeStyle = 'rgba(0,0,0,0.12)'
    c.lineWidth = 2
    for (let x = -(this.ground % 80); x < W; x += 80) {
      c.beginPath()
      c.moveTo(x, GROUND + 14)
      c.lineTo(x - 30, H)
      c.stroke()
    }

    for (const o of this.obstacles) drawObstacle(c, o, this.t)
    for (const p of this.pickups) {
      c.save()
      c.translate(p.x, p.y)
      if (p.kind === 'coin') {
        c.scale(Math.abs(Math.cos(p.rot)) * 0.7 + 0.3, 1)
        drawArt(c, ['coinold', '#f2b630'], 32)
      } else {
        c.beginPath()
        c.arc(0, 0, 20, 0, 7)
        c.fillStyle = p.kind === 'magnet' ? '#d9433b' : p.kind === 'shield' ? '#3f8fd0' : '#e0793a'
        c.fill()
        c.lineWidth = 3
        c.strokeStyle = '#0f2123'
        c.stroke()
        c.fillStyle = '#fff'
        c.font = 'bold 15px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(p.kind === 'magnet' ? 'M' : p.kind === 'shield' ? 'K' : 'A', 0, 1)
        c.textBaseline = 'alphabetic'
      }
      c.restore()
    }

    c.save()
    c.translate(this.px, this.py)
    if (this.sliding > 0) {
      c.translate(0, 0)
      c.scale(1.18, 0.62)
      c.rotate(-0.1)
    } else if (!this.onGround) {
      c.scale(0.94, 1.08)
    } else {
      const bob = Math.abs(Math.sin(this.t * 12))
      c.translate(0, -bob * 4)
      c.scale(1 + bob * 0.03, 1 - bob * 0.04)
    }
    this.pet.draw(c, 0, 0, 0.7)
    c.restore()
    if (this.shield) {
      c.beginPath()
      c.arc(this.px, this.py - 48, 62, 0, 7)
      c.strokeStyle = 'rgba(63,143,208,0.9)'
      c.lineWidth = 4
      c.stroke()
    }
    if (this.dash > 0) {
      c.fillStyle = 'rgba(255,255,255,0.35)'
      for (let i = 0; i < 5; i++) c.fillRect(this.px - 80 - i * 26, this.py - 80 + i * 14, 60, 4)
    }
    this.fx.draw(c)
    drawFloats(c, this.floats, 1 / 60)
    c.restore()
  }
}

function drawObstacle(c: CanvasRenderingContext2D, o: Obstacle, t: number) {
  c.save()
  c.translate(o.x, o.y)
  c.lineWidth = 3
  c.strokeStyle = '#0f2123'
  c.lineJoin = 'round'
  switch (o.kind) {
    case 'crate':
      c.fillStyle = '#b8803f'
      c.beginPath()
      c.roundRect(0, 0, o.w, o.h, 6)
      c.fill()
      c.stroke()
      c.beginPath()
      c.moveTo(6, 6)
      c.lineTo(o.w - 6, o.h - 6)
      c.moveTo(o.w - 6, 6)
      c.lineTo(6, o.h - 6)
      c.stroke()
      break
    case 'bird': {
      const flap = Math.sin(t * 16) * 12
      c.fillStyle = '#d9573b'
      c.beginPath()
      c.ellipse(o.w / 2, o.h / 2, 24, 14, 0, 0, 7)
      c.fill()
      c.stroke()
      c.fillStyle = '#e8746a'
      c.beginPath()
      c.moveTo(18, 14)
      c.lineTo(34, 14 - 26 - flap)
      c.lineTo(42, 16)
      c.closePath()
      c.fill()
      c.stroke()
      c.fillStyle = '#f2cf4a'
      c.beginPath()
      c.moveTo(2, o.h / 2 - 3)
      c.lineTo(-12, o.h / 2 + 2)
      c.lineTo(2, o.h / 2 + 7)
      c.fill()
      c.stroke()
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(12, o.h / 2 - 4, 4, 0, 7)
      c.fill()
      break
    }
    case 'gate':
      c.fillStyle = '#6a4a30'
      c.fillRect(0, 0, 10, o.h + 40)
      c.fillRect(o.w - 10, 0, 10, o.h + 40)
      c.strokeRect(0, 0, 10, o.h + 40)
      c.strokeRect(o.w - 10, 0, 10, o.h + 40)
      c.fillStyle = '#d9433b'
      c.fillRect(-6, 0, o.w + 12, 34)
      c.strokeRect(-6, 0, o.w + 12, 34)
      c.fillStyle = '#fff'
      for (let i = 0; i < 4; i++) c.fillRect(i * 16, 4, 8, 26)
      break
    case 'spikes':
      c.fillStyle = '#9aa5ad'
      for (let i = 0; i < 4; i++) {
        c.beginPath()
        c.moveTo(i * (o.w / 4), o.h)
        c.lineTo(i * (o.w / 4) + o.w / 8, 0)
        c.lineTo((i + 1) * (o.w / 4), o.h)
        c.closePath()
        c.fill()
        c.stroke()
      }
      break
  }
  c.restore()
}
