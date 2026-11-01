import { INK } from './itemArt'

export type ParticleKind = 'heart' | 'star' | 'coin' | 'drop' | 'bubble' | 'note' | 'zzz' | 'leaf' | 'snow' | 'crumb' | 'foam' | 'spark' | 'rain'

interface P {
  on: boolean
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  g: number
  life: number
  max: number
  size: number
  rot: number
  vr: number
  color: string
}

const COLORS: Record<ParticleKind, string[]> = {
  heart: ['#e0529a', '#f06a8a', '#ff8fb0'],
  star: ['#f6e27a', '#f2b630', '#fff1b8'],
  coin: ['#f2b630'],
  drop: ['#8fd0e8', '#6db3d9', '#b8e4f2'],
  bubble: ['#d8f0fa', '#bfe6f5'],
  note: ['#3f8fd0', '#e0529a', '#4f9d4b'],
  zzz: ['#8aa0c8'],
  leaf: ['#d9733a', '#c9473c', '#e0a24a', '#7fbf5a'],
  snow: ['#ffffff'],
  crumb: ['#c88a4a', '#e0b070'],
  foam: ['#ffffff', '#f2fbff'],
  spark: ['#fff1b8', '#ffffff'],
  rain: ['#9ac8e6'],
}

export class Particles {
  private pool: P[]
  private cursor = 0
  active = 0
  maxCount: number

  constructor(size = 360) {
    this.maxCount = size
    this.pool = Array.from({ length: size }, () => ({ on: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, max: 1, size: 1, rot: 0, vr: 0, color: '#fff' }))
  }

  setLimit(n: number) {
    this.maxCount = Math.min(this.pool.length, n)
  }

  emit(kind: ParticleKind, x: number, y: number, n = 1, opts: { spread?: number; speed?: number; up?: number; g?: number; life?: number; size?: number } = {}) {
    const cols = COLORS[kind]
    for (let i = 0; i < n; i++) {
      if (this.active >= this.maxCount) return
      let p: P | null = null
      for (let k = 0; k < this.pool.length; k++) {
        const q = this.pool[(this.cursor + k) % this.pool.length]
        if (!q.on) {
          p = q
          this.cursor = (this.cursor + k + 1) % this.pool.length
          break
        }
      }
      if (!p) return
      const sp = opts.speed ?? 60
      const a = Math.random() * Math.PI * 2
      const spread = opts.spread ?? 14
      p.on = true
      p.kind = kind
      p.x = x + (Math.random() - 0.5) * spread
      p.y = y + (Math.random() - 0.5) * spread * 0.5
      p.vx = Math.cos(a) * sp * Math.random()
      p.vy = Math.sin(a) * sp * Math.random() - (opts.up ?? 30)
      p.g = opts.g ?? (kind === 'heart' || kind === 'zzz' || kind === 'bubble' || kind === 'note' ? -20 : kind === 'snow' || kind === 'leaf' ? 14 : 160)
      p.life = 0
      p.max = (opts.life ?? 1.1) * (0.7 + Math.random() * 0.6)
      p.size = (opts.size ?? 1) * (0.7 + Math.random() * 0.6)
      p.rot = Math.random() * 6
      p.vr = (Math.random() - 0.5) * 6
      p.color = cols[Math.floor(Math.random() * cols.length)]
      this.active++
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.on) continue
      p.life += dt
      if (p.life >= p.max) {
        p.on = false
        this.active--
        continue
      }
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (p.kind === 'leaf' || p.kind === 'snow') p.x += Math.sin(p.life * 3 + p.rot) * 10 * dt
    }
  }

  draw(c: CanvasRenderingContext2D) {
    for (const p of this.pool) {
      if (!p.on) continue
      const k = p.life / p.max
      const a = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1
      c.save()
      c.globalAlpha = Math.max(0, Math.min(1, a))
      c.translate(p.x, p.y)
      const s = p.size
      switch (p.kind) {
        case 'heart': {
          c.scale(s * 9, s * 9)
          c.rotate(Math.sin(p.rot) * 0.3)
          c.beginPath()
          c.moveTo(0, 0.9)
          c.bezierCurveTo(-1.4, 0.1, -0.9, -0.9, 0, -0.35)
          c.bezierCurveTo(0.9, -0.9, 1.4, 0.1, 0, 0.9)
          c.fillStyle = p.color
          c.fill()
          break
        }
        case 'star':
        case 'spark': {
          c.rotate(p.rot)
          c.fillStyle = p.color
          const r = (p.kind === 'star' ? 8 : 4) * s
          c.beginPath()
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.35 : r
            const an = (i * Math.PI) / 4
            c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr)
          }
          c.closePath()
          c.fill()
          break
        }
        case 'coin':
          c.scale(Math.abs(Math.cos(p.rot * 2)) * 0.8 + 0.2, 1)
          c.beginPath()
          c.arc(0, 0, 8 * s, 0, 7)
          c.fillStyle = p.color
          c.fill()
          c.lineWidth = 1.6
          c.strokeStyle = INK
          c.stroke()
          break
        case 'drop':
        case 'rain':
          c.beginPath()
          if (p.kind === 'rain') {
            c.moveTo(0, 0)
            c.lineTo(-2, 10 * s)
            c.lineWidth = 1.4
            c.strokeStyle = p.color
            c.stroke()
          } else {
            c.ellipse(0, 0, 2.6 * s, 4 * s, 0, 0, 7)
            c.fillStyle = p.color
            c.fill()
          }
          break
        case 'bubble':
        case 'foam':
          c.beginPath()
          c.arc(0, 0, (p.kind === 'foam' ? 9 : 6) * s, 0, 7)
          c.fillStyle = p.kind === 'foam' ? 'rgba(255,255,255,0.85)' : 'rgba(210,240,250,0.45)'
          c.fill()
          c.lineWidth = 1.2
          c.strokeStyle = 'rgba(120,180,210,0.7)'
          c.stroke()
          break
        case 'note':
          c.fillStyle = p.color
          c.beginPath()
          c.ellipse(0, 0, 4.5 * s, 3.4 * s, -0.4, 0, 7)
          c.fill()
          c.lineWidth = 1.8 * s
          c.strokeStyle = p.color
          c.beginPath()
          c.moveTo(4 * s, -1)
          c.lineTo(4 * s, -12 * s)
          c.lineTo(9 * s, -9 * s)
          c.stroke()
          break
        case 'zzz':
          c.fillStyle = p.color
          c.font = `bold ${14 * s}px sans-serif`
          c.fillText('z', 0, 0)
          break
        case 'leaf':
          c.rotate(p.rot)
          c.beginPath()
          c.ellipse(0, 0, 6 * s, 3 * s, 0, 0, 7)
          c.fillStyle = p.color
          c.fill()
          break
        case 'snow':
          c.beginPath()
          c.arc(0, 0, 2.6 * s, 0, 7)
          c.fillStyle = '#fff'
          c.fill()
          break
        case 'crumb':
          c.beginPath()
          c.arc(0, 0, 2.4 * s, 0, 7)
          c.fillStyle = p.color
          c.fill()
          break
      }
      c.restore()
    }
  }
}
