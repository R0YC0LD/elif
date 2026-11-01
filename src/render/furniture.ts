import type { ArtSpec } from '../game/types'
import type { Season } from '../game/world'
import { INK, shade } from './itemArt'

type C = CanvasRenderingContext2D

export interface FurnEnv {
  t: number
  on: boolean
  growth: number
  tint: number
  seed: number
  season: Season
  hour: number
  minute: number
  bounce: number
  spin: number
}

export function tinted(hex: string, tint: number): string {
  if (!tint) return hex
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  const d = mx - mn
  let h = 0
  let s = 0
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (mx === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  h = (h + tint * 55) % 360
  return `hsl(${h.toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%)`
}

function rr(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, lw = 2.4) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (lw > 0) {
    c.lineWidth = lw
    c.strokeStyle = INK
    c.lineJoin = 'round'
    c.stroke()
  }
}

function el(c: C, x: number, y: number, rx: number, ry: number, fill: string | null, lw = 2.4) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (lw > 0) {
    c.lineWidth = lw
    c.strokeStyle = INK
    c.stroke()
  }
}

function rnd(seed: number, i: number) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function drawFurniture(c: C, art: ArtSpec, w: number, h: number, e: FurnEnv) {
  const [kind, c1raw, c2raw] = art
  const c1 = tinted(c1raw, e.tint)
  const c2 = c2raw && /^#/.test(c2raw) ? tinted(c2raw, e.tint) : c2raw
  const dark = shade(c1, -0.22)
  const light = shade(c1, 0.25)
  c.save()
  c.lineJoin = 'round'
  c.lineCap = 'round'
  switch (kind) {
    case 'sofa':
      rr(c, 6, h * 0.12, w - 12, h * 0.6, 14, dark)
      rr(c, 0, h * 0.34, w * 0.14, h * 0.58, 12, c1)
      rr(c, w * 0.86, h * 0.34, w * 0.14, h * 0.58, 12, c1)
      rr(c, w * 0.12, h * 0.46, w * 0.76, h * 0.4, 10, light)
      c.beginPath()
      c.moveTo(w / 2, h * 0.48)
      c.lineTo(w / 2, h * 0.84)
      c.lineWidth = 2
      c.strokeStyle = 'rgba(0,0,0,0.25)'
      c.stroke()
      rr(c, w * 0.1, h * 0.9, 10, h * 0.1, 3, INK, 0)
      rr(c, w * 0.9 - 10, h * 0.9, 10, h * 0.1, 3, INK, 0)
      break
    case 'armchair':
      rr(c, w * 0.12, h * 0.05, w * 0.76, h * 0.6, 14, dark)
      rr(c, 0, h * 0.34, w * 0.22, h * 0.56, 12, c1)
      rr(c, w * 0.78, h * 0.34, w * 0.22, h * 0.56, 12, c1)
      rr(c, w * 0.18, h * 0.5, w * 0.64, h * 0.38, 10, light)
      break
    case 'table': {
      const round = c2raw === 'round'
      const top = round ? '#f2ead6' : c1
      rr(c, w * 0.12, h * 0.38, 8, h * 0.62, 3, shade(top, -0.3))
      rr(c, w * 0.88 - 8, h * 0.38, 8, h * 0.62, 3, shade(top, -0.3))
      if (round) {
        el(c, w / 2, h * 0.34, w * 0.46, h * 0.2, top)
      } else rr(c, 0, h * 0.2, w, h * 0.24, 6, top)
      break
    }
    case 'bookshelf': {
      rr(c, 0, 0, w, h, 6, c1)
      rr(c, 6, 6, w - 12, h - 12, 3, dark, 1.6)
      const rows = 4
      for (let r = 0; r < rows; r++) {
        const y = 8 + r * ((h - 16) / rows)
        const rh = (h - 16) / rows
        let x = 9
        let i = 0
        while (x < w - 16) {
          const bw = 7 + rnd(e.seed, r * 20 + i) * 7
          const bh = rh * (0.55 + rnd(e.seed, r * 31 + i + 7) * 0.4)
          const col = ['#d9573b', '#3f7fd0', '#f2b630', '#4f9d4b', '#e0529a', '#8a6a4a', '#7a4aa0'][Math.floor(rnd(e.seed, r * 5 + i) * 7)]
          rr(c, x, y + rh - bh - 3, bw, bh, 1.5, col, 1.4)
          x += bw + 1.5
          i++
        }
        rr(c, 6, y + rh - 4, w - 12, 5, 1, c1, 1.4)
      }
      break
    }
    case 'desk':
      rr(c, 0, h * 0.18, w, h * 0.16, 5, c1)
      rr(c, 6, h * 0.34, w * 0.25, h * 0.66, 4, dark)
      rr(c, w * 0.75 - 6, h * 0.34, w * 0.25, h * 0.66, 4, dark)
      rr(c, w * 0.78, h * 0.42, w * 0.19, h * 0.22, 3, light, 1.4)
      rr(c, w * 0.78, h * 0.68, w * 0.19, h * 0.22, 3, light, 1.4)
      rr(c, w * 0.2, h * 0.06, w * 0.18, h * 0.13, 2, '#f6efe0', 1.6)
      rr(c, w * 0.5, h * 0.02, w * 0.14, h * 0.17, 2, '#3f7fd0', 1.6)
      break
    case 'bed': {
      rr(c, 0, h * 0.1, w * 0.08, h * 0.9, 5, dark)
      rr(c, w * 0.92, h * 0.34, w * 0.08, h * 0.66, 5, dark)
      rr(c, w * 0.06, h * 0.44, w * 0.88, h * 0.4, 8, '#f6efe0')
      rr(c, w * 0.34, h * 0.5, w * 0.6, h * 0.34, 8, c1)
      rr(c, w * 0.1, h * 0.36, w * 0.2, h * 0.2, 8, '#fff')
      c.beginPath()
      c.moveTo(w * 0.34, h * 0.62)
      c.lineTo(w * 0.94, h * 0.62)
      c.lineWidth = 2
      c.strokeStyle = 'rgba(255,255,255,0.4)'
      c.stroke()
      break
    }
    case 'rug':
      el(c, w / 2, h / 2, w / 2 - 2, h / 2 - 2, c1)
      el(c, w / 2, h / 2, w * 0.38, h * 0.36, c2 ?? '#fff', 1.6)
      el(c, w / 2, h / 2, w * 0.24, h * 0.22, c1, 1.6)
      break
    case 'plant': {
      const g = Math.max(0.35, Math.min(1, 0.4 + e.growth / 100 * 0.6))
      if (c2raw === 'cactus') {
        rr(c, w * 0.3, h * 0.75, w * 0.4, h * 0.25, 4, '#c9573b')
        rr(c, w * 0.38, h * (0.7 - 0.5 * g), w * 0.24, h * 0.5 * g + h * 0.1, 10, c1)
        if (g > 0.6) rr(c, w * 0.56, h * 0.38, w * 0.2, h * 0.14, 6, c1)
        break
      }
      rr(c, w * 0.22, h * 0.7, w * 0.56, h * 0.3, 5, '#c9573b')
      rr(c, w * 0.18, h * 0.66, w * 0.64, h * 0.1, 4, '#d9693f')
      const leaves = 5
      for (let i = 0; i < leaves; i++) {
        const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.55
        const len = h * 0.55 * g
        c.save()
        c.translate(w / 2, h * 0.68)
        c.rotate(a + Math.sin(e.t * 1.3 + i) * 0.03)
        c.beginPath()
        c.moveTo(0, 0)
        c.bezierCurveTo(-w * 0.14, -len * 0.4, -w * 0.12, -len * 0.8, 0, -len)
        c.bezierCurveTo(w * 0.12, -len * 0.8, w * 0.14, -len * 0.4, 0, 0)
        c.fillStyle = i % 2 ? shade(c1, -0.12) : c1
        c.fill()
        c.lineWidth = 2
        c.strokeStyle = INK
        c.stroke()
        c.restore()
      }
      break
    }
    case 'lamp': {
      const small = c2raw === 'small'
      if (small) {
        rr(c, w * 0.3, h * 0.8, w * 0.4, h * 0.2, 3, '#8a6a4a')
        rr(c, w * 0.46, h * 0.4, 4, h * 0.42, 1, INK, 0)
        c.beginPath()
        c.moveTo(w * 0.15, h * 0.45)
        c.lineTo(w * 0.85, h * 0.45)
        c.lineTo(w * 0.7, h * 0.1)
        c.lineTo(w * 0.3, h * 0.1)
        c.closePath()
      } else {
        rr(c, w * 0.3, h * 0.94, w * 0.4, h * 0.06, 3, '#5a4a3a')
        rr(c, w * 0.47, h * 0.3, 4, h * 0.66, 1, INK, 0)
        c.beginPath()
        c.moveTo(w * 0.1, h * 0.3)
        c.lineTo(w * 0.9, h * 0.3)
        c.lineTo(w * 0.72, h * 0.04)
        c.lineTo(w * 0.28, h * 0.04)
        c.closePath()
      }
      c.fillStyle = e.on ? '#fff1b8' : c1
      c.fill()
      c.lineWidth = 2.4
      c.strokeStyle = INK
      c.stroke()
      break
    }
    case 'tv': {
      rr(c, w * 0.3, h * 0.88, w * 0.4, h * 0.12, 3, '#3a4a4d')
      rr(c, 0, 0, w, h * 0.9, 8, c1)
      rr(c, 7, 7, w - 14, h * 0.9 - 14, 4, e.on ? '#fff' : '#1b2428', 1.6)
      if (e.on) {
        const k = Math.floor(e.t * 2) % 3
        const cols = [['#e0529a', '#f2cf4a', '#3f8fd0'], ['#4f9d4b', '#e0793a', '#e0529a'], ['#3f8fd0', '#f2cf4a', '#4f9d4b']][k]
        c.save()
        c.beginPath()
        c.rect(8, 8, w - 16, h * 0.9 - 16)
        c.clip()
        for (let i = 0; i < 3; i++) {
          c.fillStyle = cols[i]
          c.fillRect(8 + (i * (w - 16)) / 3, 8, (w - 16) / 3, h * 0.9 - 16)
        }
        const bx = 8 + ((e.t * 40) % (w - 16))
        el(c, bx, h * 0.45, 9, 9, '#fff', 1.6)
        c.restore()
      } else {
        c.beginPath()
        c.moveTo(w * 0.15, h * 0.12)
        c.lineTo(w * 0.3, h * 0.08)
        c.lineWidth = 3
        c.strokeStyle = 'rgba(255,255,255,0.18)'
        c.stroke()
      }
      break
    }
    case 'aquarium': {
      rr(c, 4, h * 0.82, w - 8, h * 0.18, 4, '#6a4a30')
      rr(c, 0, 0, w, h * 0.84, 8, 'rgba(150,215,240,0.75)')
      c.save()
      c.beginPath()
      c.roundRect(2, 2, w - 4, h * 0.84 - 4, 7)
      c.clip()
      c.fillStyle = 'rgba(110,190,225,0.5)'
      c.fillRect(0, h * 0.18, w, h)
      c.fillStyle = '#e8d6a0'
      c.fillRect(0, h * 0.7, w, h * 0.2)
      for (let i = 0; i < 3; i++) {
        c.beginPath()
        c.moveTo(w * (0.15 + i * 0.35), h * 0.72)
        c.quadraticCurveTo(w * (0.12 + i * 0.35) + Math.sin(e.t * 2 + i) * 4, h * 0.55, w * (0.17 + i * 0.35), h * 0.4)
        c.lineWidth = 3
        c.strokeStyle = '#4f9d4b'
        c.stroke()
      }
      for (let i = 0; i < 3; i++) {
        const sp = 18 + i * 9
        const dir = i % 2 ? -1 : 1
        const x = ((e.t * sp * dir + i * 50) % (w + 40) + (w + 40)) % (w + 40) - 20
        const y = h * (0.3 + i * 0.13) + Math.sin(e.t * 2 + i) * 4
        c.save()
        c.translate(x, y)
        c.scale(dir, 1)
        el(c, 0, 0, 9, 5, ['#f08a24', '#e0529a', '#f2cf4a'][i], 1.6)
        c.beginPath()
        c.moveTo(-8, 0)
        c.lineTo(-14, -5)
        c.lineTo(-14, 5)
        c.closePath()
        c.fillStyle = ['#f08a24', '#e0529a', '#f2cf4a'][i]
        c.fill()
        c.lineWidth = 1.4
        c.strokeStyle = INK
        c.stroke()
        c.restore()
      }
      c.restore()
      rr(c, 0, 0, w, h * 0.84, 8, null)
      break
    }
    case 'musicbox':
      rr(c, 0, h * 0.4, w, h * 0.6, 6, c1)
      rr(c, 0, h * 0.34, w, h * 0.14, 4, light)
      if (e.on) {
        c.save()
        c.translate(w / 2, h * 0.3)
        c.scale(Math.cos(e.t * 3), 1)
        rr(c, -3, -h * 0.28, 6, h * 0.28, 2, '#f4a3b6', 1.6)
        el(c, 0, -h * 0.3, 5, 5, '#f6d8c0', 1.6)
        c.restore()
      } else rr(c, w * 0.44, h * 0.08, 6, h * 0.28, 2, '#f4a3b6', 1.6)
      break
    case 'radio':
      rr(c, 0, h * 0.2, w, h * 0.8, 8, c1)
      el(c, w * 0.3, h * 0.6, h * 0.2, h * 0.2, '#2a3a3d')
      for (let i = 0; i < 4; i++) rr(c, w * 0.55, h * (0.42 + i * 0.1), w * 0.3, 3, 1, INK, 0)
      c.beginPath()
      c.moveTo(w * 0.8, h * 0.2)
      c.lineTo(w * 0.95, 0)
      c.lineWidth = 2
      c.strokeStyle = INK
      c.stroke()
      if (e.on) {
        c.strokeStyle = 'rgba(80,80,80,0.5)'
        for (let i = 0; i < 2; i++) {
          c.beginPath()
          c.arc(w * 0.5, h * 0.2, 8 + ((e.t * 14 + i * 8) % 16), Math.PI * 1.2, Math.PI * 1.8)
          c.stroke()
        }
      }
      break
    case 'drum':
      el(c, w / 2, h * 0.38, w * 0.46, h * 0.16, '#f6efe0')
      c.beginPath()
      c.moveTo(w * 0.04, h * 0.38)
      c.lineTo(w * 0.04, h * 0.84)
      c.quadraticCurveTo(w / 2, h * 1.06, w * 0.96, h * 0.84)
      c.lineTo(w * 0.96, h * 0.38)
      c.quadraticCurveTo(w / 2, h * 0.66, w * 0.04, h * 0.38)
      c.fillStyle = c1
      c.fill()
      c.lineWidth = 2.4
      c.strokeStyle = INK
      c.stroke()
      c.beginPath()
      c.moveTo(w * 0.2, h * 0.5)
      c.lineTo(w * 0.35, h * 0.85)
      c.moveTo(w * 0.5, h * 0.56)
      c.lineTo(w * 0.5, h * 0.95)
      c.moveTo(w * 0.8, h * 0.5)
      c.lineTo(w * 0.65, h * 0.85)
      c.strokeStyle = '#fbfaf2'
      c.lineWidth = 2
      c.stroke()
      break
    case 'ball': {
      const b = Math.abs(Math.sin(e.bounce * 4)) * e.bounce * 26
      el(c, w / 2, h - 3, w * 0.3, 4, 'rgba(0,0,0,0.2)', 0)
      c.save()
      c.translate(0, -b)
      el(c, w / 2, h / 2 + 2, w * 0.42, w * 0.42, c1)
      c.beginPath()
      c.arc(w / 2, h / 2 + 2, w * 0.42, -0.6, 0.6)
      c.lineWidth = 4
      c.strokeStyle = '#fff'
      c.stroke()
      c.restore()
      break
    }
    case 'globe':
      rr(c, w * 0.3, h * 0.9, w * 0.4, h * 0.1, 3, '#6a4a30')
      rr(c, w * 0.46, h * 0.62, 5, h * 0.3, 1, '#6a4a30', 1.6)
      el(c, w / 2, h * 0.4, w * 0.38, w * 0.38, c1)
      c.save()
      c.beginPath()
      c.arc(w / 2, h * 0.4, w * 0.38, 0, 7)
      c.clip()
      c.fillStyle = '#6fae5a'
      for (let i = 0; i < 3; i++) {
        const x = w * 0.2 + ((e.spin * 30 + i * 22) % (w * 0.8))
        el(c, x, h * (0.3 + i * 0.1), 9, 6, '#6fae5a', 0)
      }
      c.restore()
      c.beginPath()
      c.arc(w / 2, h * 0.4, w * 0.38, 0, 7)
      c.lineWidth = 2.4
      c.strokeStyle = INK
      c.stroke()
      break
    case 'telescope':
      c.beginPath()
      c.moveTo(w * 0.5, h * 0.4)
      c.lineTo(w * 0.2, h)
      c.moveTo(w * 0.5, h * 0.4)
      c.lineTo(w * 0.8, h)
      c.moveTo(w * 0.5, h * 0.4)
      c.lineTo(w * 0.5, h)
      c.lineWidth = 4
      c.strokeStyle = '#6a4a30'
      c.stroke()
      c.save()
      c.translate(w * 0.5, h * 0.4)
      c.rotate(-0.8)
      rr(c, -w * 0.5, -10, w * 0.78, 20, 5, c1)
      rr(c, w * 0.18, -13, 12, 26, 3, '#c9a444')
      rr(c, -w * 0.52, -8, 10, 16, 3, '#2a3a3d')
      c.restore()
      break
    case 'fireplace': {
      rr(c, 0, h * 0.05, w, h * 0.95, 4, c1)
      for (let r = 0; r < 5; r++)
        for (let i = 0; i < 6; i++) {
          c.strokeStyle = 'rgba(0,0,0,0.18)'
          c.lineWidth = 1.4
          c.strokeRect(((i + (r % 2) * 0.5) * w) / 6, h * 0.12 + r * h * 0.17, w / 6, h * 0.17)
        }
      rr(c, -4, 0, w + 8, h * 0.1, 3, '#6a4a30')
      rr(c, w * 0.18, h * 0.32, w * 0.64, h * 0.68, 10, '#1b1512')
      if (e.on) {
        for (let i = 0; i < 4; i++) {
          const fx = w * (0.28 + i * 0.15)
          const fh = h * (0.28 + 0.07 * Math.sin(e.t * 9 + i * 2))
          c.beginPath()
          c.moveTo(fx - 12, h * 0.98)
          c.quadraticCurveTo(fx - 8, h * 0.98 - fh, fx + Math.sin(e.t * 7 + i) * 4, h * 0.98 - fh * 1.3)
          c.quadraticCurveTo(fx + 8, h * 0.98 - fh, fx + 12, h * 0.98)
          c.fillStyle = i % 2 ? '#f08a24' : '#f2cf4a'
          c.fill()
        }
      }
      rr(c, w * 0.3, h * 0.92, w * 0.4, h * 0.08, 3, '#6a4a30', 1.6)
      break
    }
    case 'chest':
      rr(c, 0, h * 0.3, w, h * 0.7, 6, c1)
      rr(c, -2, h * 0.2, w + 4, h * 0.2, 5, dark)
      rr(c, w * 0.42, h * 0.38, w * 0.16, h * 0.18, 3, '#f2cf4a', 1.6)
      for (const [x, col] of [[0.2, '#3f8fd0'], [0.45, '#f2cf4a'], [0.7, '#4f9d4b']] as [number, string][]) rr(c, w * x, h * 0.04, w * 0.16, h * 0.2, 2, col, 1.6)
      break
    case 'bench':
      rr(c, 0, h * 0.28, w, h * 0.16, 4, c1)
      rr(c, 0, h * 0.02, w, h * 0.16, 4, c1)
      rr(c, w * 0.08, h * 0.44, 7, h * 0.56, 2, dark)
      rr(c, w * 0.92 - 7, h * 0.44, 7, h * 0.56, 2, dark)
      break
    case 'flowerbed': {
      rr(c, 0, h * 0.4, w, h * 0.6, 6, '#6a4a30')
      const cols = ['#e0529a', '#f2cf4a', '#fbfaf2', '#e0793a']
      const bloom = e.season === 'winter' ? 0 : e.season === 'autumn' ? 0.5 : 1
      for (let i = 0; i < 7; i++) {
        const x = 8 + (i * (w - 16)) / 6
        const sh = (h * 0.5) * (0.7 + rnd(e.seed, i) * 0.5) * (0.5 + e.growth / 200)
        c.beginPath()
        c.moveTo(x, h * 0.5)
        c.lineTo(x + Math.sin(e.t * 2 + i) * 2, h * 0.5 - sh)
        c.lineWidth = 2
        c.strokeStyle = '#4f9d4b'
        c.stroke()
        if (rnd(e.seed, i + 40) < bloom + 0.15) el(c, x + Math.sin(e.t * 2 + i) * 2, h * 0.5 - sh, 6, 6, cols[i % 4] === '#e0529a' && e.tint ? tinted('#e0529a', e.tint) : cols[i % 4], 1.6)
      }
      break
    }
    case 'tree': {
      const col = e.season === 'autumn' ? '#d9733a' : e.season === 'spring' ? '#f4a3b6' : e.season === 'winter' ? '#e8f0f2' : c1
      rr(c, w * 0.42, h * 0.45, w * 0.16, h * 0.55, 4, '#6a4a30')
      const sway = Math.sin(e.t * 1.2) * 2
      if (e.season === 'winter') {
        c.strokeStyle = '#6a4a30'
        c.lineWidth = 4
        for (const [x, y] of [[0.2, 0.15], [0.8, 0.2], [0.35, 0.05], [0.65, 0.08]]) {
          c.beginPath()
          c.moveTo(w * 0.5, h * 0.55)
          c.lineTo(w * x, h * y)
          c.stroke()
        }
        el(c, w * 0.5, h * 0.2, w * 0.4, h * 0.1, 'rgba(255,255,255,0.9)', 1.6)
      } else {
        el(c, w * 0.5 + sway, h * 0.3, w * 0.48, h * 0.3, col)
        el(c, w * 0.3 + sway, h * 0.42, w * 0.28, h * 0.2, shade(col, -0.08))
        el(c, w * 0.72 + sway, h * 0.4, w * 0.26, h * 0.2, shade(col, 0.08))
        if (e.season === 'summer' || e.season === 'autumn')
          for (let i = 0; i < 5; i++) el(c, w * (0.25 + rnd(e.seed, i) * 0.5) + sway, h * (0.2 + rnd(e.seed, i + 9) * 0.3), 4, 4, e.season === 'summer' ? '#d9433b' : '#e9b52c', 1.4)
      }
      break
    }
    case 'fountain':
      el(c, w / 2, h * 0.8, w * 0.48, h * 0.18, '#b8c4c8')
      el(c, w / 2, h * 0.76, w * 0.4, h * 0.13, '#8fd0e8')
      rr(c, w * 0.46, h * 0.3, w * 0.08, h * 0.46, 3, '#b8c4c8')
      el(c, w / 2, h * 0.3, w * 0.18, h * 0.07, '#b8c4c8')
      if (e.on) {
        c.strokeStyle = 'rgba(140,210,240,0.9)'
        c.lineWidth = 3
        for (let i = -2; i <= 2; i++) {
          c.beginPath()
          c.moveTo(w / 2, h * 0.28)
          c.quadraticCurveTo(w / 2 + i * 14, h * 0.05 + Math.sin(e.t * 6 + i) * 3, w / 2 + i * 26, h * 0.7)
          c.stroke()
        }
      }
      break
    case 'clock': {
      const r = Math.min(w, h) / 2 - 2
      el(c, w / 2, h / 2, r, r, '#f6efe0')
      el(c, w / 2, h / 2, r, r, null, 3)
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        c.beginPath()
        c.moveTo(w / 2 + Math.sin(a) * r * 0.82, h / 2 - Math.cos(a) * r * 0.82)
        c.lineTo(w / 2 + Math.sin(a) * r * 0.94, h / 2 - Math.cos(a) * r * 0.94)
        c.lineWidth = 2
        c.strokeStyle = INK
        c.stroke()
      }
      const ma = (e.minute / 60) * Math.PI * 2
      const ha = (((e.hour % 12) + e.minute / 60) / 12) * Math.PI * 2
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(w / 2, h / 2)
      c.lineTo(w / 2 + Math.sin(ha) * r * 0.5, h / 2 - Math.cos(ha) * r * 0.5)
      c.lineWidth = 3.4
      c.stroke()
      c.beginPath()
      c.moveTo(w / 2, h / 2)
      c.lineTo(w / 2 + Math.sin(ma) * r * 0.78, h / 2 - Math.cos(ma) * r * 0.78)
      c.lineWidth = 2.2
      c.stroke()
      el(c, w / 2, h / 2, 3, 3, INK, 0)
      break
    }
    case 'frame':
      rr(c, 0, 0, w, h, 4, c1)
      rr(c, 6, 6, w - 12, h - 12, 2, c2 ?? '#6db3d9', 1.6)
      c.save()
      c.beginPath()
      c.rect(7, 7, w - 14, h - 14)
      c.clip()
      el(c, w * 0.65, h * 0.38, 7, 7, '#f6e27a', 0)
      c.fillStyle = '#6fae5a'
      c.beginPath()
      c.moveTo(0, h)
      c.quadraticCurveTo(w * 0.35, h * 0.45, w, h * 0.7)
      c.lineTo(w, h)
      c.fill()
      c.restore()
      break
    case 'wshelf':
      rr(c, 0, h * 0.5, w, h * 0.4, 3, c1)
      rr(c, w * 0.1, 2, w * 0.14, h * 0.5, 2, '#d9573b', 1.6)
      rr(c, w * 0.26, h * 0.12, w * 0.12, h * 0.38, 2, '#3f7fd0', 1.6)
      el(c, w * 0.72, h * 0.28, 9, 9, '#8fd3b8', 1.6)
      break
    case 'mirror':
      rr(c, 0, 0, w, h, w / 2.4, c1)
      rr(c, 5, 5, w - 10, h - 10, w / 2.8, e.on ? '#e8f6fb' : '#cfe6ee', 1.6)
      c.beginPath()
      c.moveTo(w * 0.28, h * 0.22)
      c.lineTo(w * 0.5, h * 0.12)
      c.lineWidth = 4
      c.strokeStyle = 'rgba(255,255,255,0.85)'
      c.stroke()
      break
    case 'lights': {
      c.beginPath()
      c.moveTo(0, 3)
      for (let i = 0; i <= 6; i++) c.quadraticCurveTo(w * (i + 0.5) / 6, h * 0.8, w * (i + 1) / 6, 3)
      c.lineWidth = 2
      c.strokeStyle = INK
      c.stroke()
      const cols = ['#f2cf4a', '#e0529a', '#3f8fd0', '#4f9d4b', '#e0793a']
      for (let i = 0; i < 7; i++) {
        const lit = e.on ? 0.6 + 0.4 * Math.sin(e.t * 3 + i) : 0.15
        c.globalAlpha = 0.5 + lit * 0.5
        el(c, w * (i + 0.5) / 6, h * 0.62, 5, 6, cols[i % 5], 1.4)
      }
      c.globalAlpha = 1
      break
    }
    default:
      rr(c, 0, 0, w, h, 6, c1)
  }
  c.restore()
}
