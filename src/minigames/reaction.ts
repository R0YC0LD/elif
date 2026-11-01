import { sound } from '../game/events'
import { Particles } from '../render/particles'
import { Shake, drawFloats, floatText, makeParticles, rand, skyGradient, type CanvasGame, type Difficulty, type PointerPhase } from './common'

type TKind = 'normal' | 'gold' | 'decoy' | 'time' | 'mover'

interface Target {
  kind: TKind
  x: number
  y: number
  r: number
  life: number
  max: number
  born: number
  vx: number
  vy: number
}

const W = 480
const H = 640

const COL: Record<TKind, string> = { normal: '#4fa37f', gold: '#f2b630', decoy: '#d9433b', time: '#3f8fd0', mover: '#e0793a' }

export class ReactionArena implements CanvasGame {
  readonly w = W
  readonly h = H
  score = 0
  over = false
  paused = false
  private time = 35
  private elapsed = 0
  private targets: Target[] = []
  private spawnIn = 0.5
  private combo = 0
  private bestCombo = 0
  private hits = 0
  private misses = 0
  private rtSum = 0
  private rtN = 0
  private bestRt = 9999
  private fx: Particles = makeParticles()
  private floats: { x: number; y: number; t: number; text: string; color: string }[] = []
  private shake = new Shake()
  private k: number
  private flash = 0
  private pulse = 0

  constructor(diff: Difficulty) {
    this.k = diff === 'easy' ? 1.25 : diff === 'normal' ? 1 : 0.78
  }

  hud(): [string, string] {
    return [`Puan ${this.score}${this.combo > 1 ? `  x${this.mult()}` : ''}`, `Süre ${Math.max(0, Math.ceil(this.time))}`]
  }

  detail() {
    const avg = this.rtN ? Math.round(this.rtSum / this.rtN) : 0
    return `İsabet ${this.hits} · Iska ${this.misses} · Ortalama tepki ${avg} ms · En hızlı ${this.bestRt === 9999 ? 0 : Math.round(this.bestRt)} ms · En iyi kombo ${this.bestCombo}`
  }

  private mult() {
    return Math.min(4, 1 + Math.floor(this.combo / 5))
  }

  key() {}

  private spawn() {
    const t = this.elapsed
    const life = Math.max(0.65, 1.7 - t * 0.026) * this.k
    const r = Math.random()
    let kind: TKind = 'normal'
    if (r < 0.14 + Math.min(0.12, t * 0.003)) kind = 'decoy'
    else if (r < 0.2 + Math.min(0.12, t * 0.003)) kind = 'gold'
    else if (r < 0.24 + Math.min(0.12, t * 0.003)) kind = 'time'
    else if (r > 0.82 && t > 8) kind = 'mover'
    const rad = kind === 'gold' ? 30 : kind === 'mover' ? 34 : 38
    const tgt: Target = {
      kind,
      x: rand(rad + 8, W - rad - 8),
      y: rand(rad + 70, H - rad - 20),
      r: rad,
      life: kind === 'gold' ? life * 0.65 : life,
      max: kind === 'gold' ? life * 0.65 : life,
      born: this.elapsed,
      vx: kind === 'mover' ? rand(-110, 110) : 0,
      vy: kind === 'mover' ? rand(-80, 80) : 0,
    }
    for (const o of this.targets) if (Math.hypot(o.x - tgt.x, o.y - tgt.y) < o.r + tgt.r + 8) return
    this.targets.push(tgt)
  }

  pointer(phase: PointerPhase, x: number, y: number) {
    if (phase !== 'down' || this.over || this.paused) return
    let hit: Target | null = null
    let best = 1e9
    for (const t of this.targets) {
      const d = Math.hypot(t.x - x, t.y - y)
      if (d <= t.r + 10 && d < best) {
        best = d
        hit = t
      }
    }
    if (!hit) {
      this.miss(x, y)
      return
    }
    this.targets.splice(this.targets.indexOf(hit), 1)
    const rt = (this.elapsed - hit.born) * 1000
    switch (hit.kind) {
      case 'decoy':
        this.combo = 0
        this.score = Math.max(0, this.score - 15)
        this.misses++
        this.shake.add(8)
        this.flash = 1
        floatText(this.floats, hit.x, hit.y, '-15', '#ff8a7a')
        sound('error')
        return
      case 'time':
        this.time += 3
        floatText(this.floats, hit.x, hit.y, '+3 sn', '#9fe8b4')
        sound('power')
        break
      default: {
        const speedBonus = Math.max(0, 1 - hit.life / hit.max) < 0 ? 0 : hit.life / hit.max
        const base = hit.kind === 'gold' ? 40 : 10
        const pts = Math.round((base + speedBonus * base) * this.mult())
        this.score += pts
        floatText(this.floats, hit.x, hit.y, `+${pts}`, hit.kind === 'gold' ? '#f6e27a' : '#fff')
        sound(this.combo > 0 && this.combo % 5 === 4 ? 'combo' : 'coin')
      }
    }
    this.combo++
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.hits++
    this.rtSum += rt
    this.rtN++
    this.bestRt = Math.min(this.bestRt, rt)
    this.fx.emit('spark', hit.x, hit.y, 6, { speed: 100, up: 10, life: 0.5 })
    this.fx.emit('star', hit.x, hit.y, 2, { speed: 70, up: 20, life: 0.6 })
  }

  private miss(x: number, y: number) {
    this.combo = 0
    this.misses++
    this.score = Math.max(0, this.score - 5)
    floatText(this.floats, x, y, 'Iska', '#ffb0a0')
    sound('mismatch')
  }

  update(dt: number) {
    if (this.over || this.paused) return
    this.elapsed += dt
    this.time -= dt
    this.pulse += dt
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3)
    if (this.time <= 0) {
      this.time = 0
      this.over = true
      sound('win')
      return
    }
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawn()
      this.spawnIn = Math.max(0.28, 0.85 - this.elapsed * 0.014) * this.k * rand(0.7, 1.15)
    }
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i]
      t.life -= dt
      if (t.kind === 'mover') {
        t.x += t.vx * dt
        t.y += t.vy * dt
        if (t.x < t.r || t.x > W - t.r) t.vx *= -1
        if (t.y < t.r + 60 || t.y > H - t.r) t.vy *= -1
      }
      if (t.life <= 0) {
        if (t.kind === 'normal' || t.kind === 'gold') {
          this.combo = 0
          this.misses++
          floatText(this.floats, t.x, t.y, 'Kaçtı', '#ffb0a0')
        }
        this.targets.splice(i, 1)
      }
    }
    this.fx.update(dt)
    this.shake.step(dt)
  }

  draw(c: CanvasRenderingContext2D) {
    c.save()
    this.shake.apply(c)
    skyGradient(c, W, H, '#243a5a', '#3b5a7e')
    c.strokeStyle = 'rgba(255,255,255,0.06)'
    c.lineWidth = 2
    for (let x = 0; x <= W; x += 60) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, H)
      c.stroke()
    }
    for (let y = 0; y <= H; y += 60) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(W, y)
      c.stroke()
    }
    for (const t of this.targets) {
      const k = Math.max(0, t.life / t.max)
      const pop = Math.min(1, (this.elapsed - t.born) / 0.12)
      const rr = t.r * (0.6 + 0.4 * pop)
      c.save()
      c.translate(t.x, t.y)
      c.beginPath()
      c.arc(0, 0, rr + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
      c.strokeStyle = 'rgba(255,255,255,0.8)'
      c.lineWidth = 5
      c.stroke()
      c.beginPath()
      c.arc(0, 0, rr, 0, 7)
      c.fillStyle = COL[t.kind]
      c.fill()
      c.lineWidth = 3.5
      c.strokeStyle = '#0f2123'
      c.stroke()
      c.beginPath()
      c.arc(0, 0, rr * 0.55, 0, 7)
      c.fillStyle = 'rgba(255,255,255,0.28)'
      c.fill()
      c.fillStyle = '#fff'
      c.font = `bold ${rr * 0.7}px sans-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      if (t.kind === 'decoy') c.fillText('X', 0, 2)
      else if (t.kind === 'time') c.fillText('+3', 0, 2)
      else if (t.kind === 'gold') c.fillText('★', 0, 2)
      c.textBaseline = 'alphabetic'
      c.restore()
    }
    this.fx.draw(c)
    drawFloats(c, this.floats, 1 / 60)
    if (this.flash > 0) {
      c.fillStyle = `rgba(217,67,59,${this.flash * 0.3})`
      c.fillRect(0, 0, W, H)
    }
    c.restore()
  }
}
