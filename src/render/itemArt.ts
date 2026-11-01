import type { ArtSpec } from '../game/types'

export const INK = '#2a3235'

export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const t = amt < 0 ? 0 : 255
  const p = Math.abs(amt)
  r = Math.round((t - r) * p + r)
  g = Math.round((t - g) * p + g)
  b = Math.round((t - b) * p + b)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

type C = CanvasRenderingContext2D

function fillStroke(c: C, fill: string | null, lw = 0.07) {
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  c.lineWidth = lw
  c.strokeStyle = INK
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.stroke()
}

function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0.07, rot = 0) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  fillStroke(c, fill, lw)
}

function rect(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, lw = 0.07) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  fillStroke(c, fill, lw)
}

function poly(c: C, pts: number[][], fill: string | null, lw = 0.07) {
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  fillStroke(c, fill, lw)
}

function gloss(c: C, x: number, y: number, r: number) {
  c.beginPath()
  c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.6)
  c.lineWidth = r * 0.45
  c.strokeStyle = 'rgba(255,255,255,0.65)'
  c.lineCap = 'round'
  c.stroke()
}

function star(c: C, x: number, y: number, r: number, fill: string, lw = 0.05) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  fillStroke(c, fill, lw)
}

function heart(c: C, x: number, y: number, s: number, fill: string, lw = 0.05) {
  c.beginPath()
  c.moveTo(x, y + s * 0.9)
  c.bezierCurveTo(x - s * 1.4, y + s * 0.1, x - s * 0.9, y - s * 0.9, x, y - s * 0.35)
  c.bezierCurveTo(x + s * 0.9, y - s * 0.9, x + s * 1.4, y + s * 0.1, x, y + s * 0.9)
  fillStroke(c, fill, lw)
}

// Birim koordinat: -1..1
export function drawArt(c: C, art: ArtSpec, size: number) {
  const [kind, c1, c2 = '#ffffff'] = art
  c.save()
  c.scale(size / 2, size / 2)
  c.lineJoin = 'round'
  c.lineCap = 'round'
  switch (kind) {
    case 'apple':
      c.beginPath()
      c.moveTo(0, -0.5)
      c.bezierCurveTo(-0.5, -0.8, -0.95, -0.2, -0.8, 0.3)
      c.bezierCurveTo(-0.65, 0.85, -0.2, 0.9, 0, 0.78)
      c.bezierCurveTo(0.2, 0.9, 0.65, 0.85, 0.8, 0.3)
      c.bezierCurveTo(0.95, -0.2, 0.5, -0.8, 0, -0.5)
      fillStroke(c, c1)
      gloss(c, -0.2, 0.05, 0.42)
      c.beginPath()
      c.moveTo(0, -0.5)
      c.quadraticCurveTo(0.05, -0.75, 0.12, -0.9)
      c.lineWidth = 0.08
      c.strokeStyle = INK
      c.stroke()
      ell(c, 0.3, -0.72, 0.28, 0.13, c2, 0.05, -0.5)
      break
    case 'banana':
      c.beginPath()
      c.moveTo(-0.85, -0.25)
      c.bezierCurveTo(-0.4, 0.75, 0.5, 0.85, 0.9, -0.35)
      c.bezierCurveTo(0.95, -0.55, 0.7, -0.5, 0.65, -0.35)
      c.bezierCurveTo(0.35, 0.3, -0.35, 0.3, -0.7, -0.5)
      c.bezierCurveTo(-0.8, -0.55, -0.88, -0.4, -0.85, -0.25)
      fillStroke(c, c1)
      ell(c, 0.86, -0.5, 0.07, 0.07, '#6b4a2a', 0.04)
      break
    case 'berry':
      heart(c, 0, -0.05, 0.85, c1, 0.07)
      c.fillStyle = '#ffe9a8'
      for (const [x, y] of [[-0.3, -0.1], [0.3, -0.1], [0, 0.1], [-0.15, 0.4], [0.15, 0.4], [0, -0.3]]) {
        c.beginPath()
        c.ellipse(x, y, 0.045, 0.07, 0, 0, 7)
        c.fill()
      }
      star(c, 0, -0.62, 0.38, c2, 0.04)
      break
    case 'grapes':
      for (const [x, y] of [[-0.45, -0.3], [0, -0.35], [0.45, -0.3], [-0.22, 0.05], [0.22, 0.05], [0, 0.45]]) ell(c, x, y, 0.3, 0.3, c1, 0.06)
      gloss(c, -0.5, -0.38, 0.12)
      c.beginPath()
      c.moveTo(0, -0.6)
      c.lineTo(0.05, -0.92)
      c.lineWidth = 0.08
      c.strokeStyle = INK
      c.stroke()
      ell(c, 0.3, -0.8, 0.28, 0.12, c2, 0.04, -0.4)
      break
    case 'melon':
      c.beginPath()
      c.moveTo(-0.95, -0.35)
      c.lineTo(0.95, -0.35)
      c.arc(0, -0.35, 0.95, 0, Math.PI)
      c.closePath()
      fillStroke(c, c2)
      c.beginPath()
      c.moveTo(-0.8, -0.3)
      c.lineTo(0.8, -0.3)
      c.arc(0, -0.3, 0.8, 0, Math.PI)
      c.closePath()
      c.fillStyle = c1
      c.fill()
      c.fillStyle = '#2a2420'
      for (const [x, y] of [[-0.4, 0], [0, 0.25], [0.4, 0], [-0.15, 0.45], [0.2, 0.5]]) {
        c.beginPath()
        c.ellipse(x, y, 0.04, 0.07, 0.3, 0, 7)
        c.fill()
      }
      break
    case 'egg':
      c.beginPath()
      c.moveTo(-0.85, 0)
      c.bezierCurveTo(-0.9, -0.7, 0.1, -0.95, 0.6, -0.5)
      c.bezierCurveTo(1, -0.1, 0.8, 0.7, 0.2, 0.8)
      c.bezierCurveTo(-0.5, 0.95, -0.8, 0.55, -0.85, 0)
      fillStroke(c, c1)
      ell(c, -0.05, 0.02, 0.32, 0.3, c2, 0.05)
      gloss(c, -0.12, -0.05, 0.14)
      break
    case 'sandwich':
      poly(c, [[-0.9, 0.55], [0, -0.75], [0.9, 0.55]], c1)
      poly(c, [[-0.75, 0.3], [0, -0.45], [0.75, 0.3]], '#7bbf4f', 0.04)
      poly(c, [[-0.62, 0.12], [0, -0.3], [0.62, 0.12]], c2, 0.04)
      poly(c, [[-0.9, 0.55], [0.9, 0.55], [0.75, 0.8], [-0.75, 0.8]], shade(c1, -0.1))
      break
    case 'bowl':
      ell(c, 0, -0.05, 0.85, 0.3, c1, 0.06)
      c.beginPath()
      c.moveTo(-0.95, -0.05)
      c.quadraticCurveTo(-0.9, 0.85, 0, 0.85)
      c.quadraticCurveTo(0.9, 0.85, 0.95, -0.05)
      c.quadraticCurveTo(0, 0.3, -0.95, -0.05)
      fillStroke(c, c2)
      c.strokeStyle = 'rgba(255,255,255,0.7)'
      c.lineWidth = 0.06
      for (const x of [-0.3, 0.1, 0.45]) {
        c.beginPath()
        c.moveTo(x, -0.45)
        c.bezierCurveTo(x - 0.12, -0.6, x + 0.12, -0.7, x, -0.9)
        c.stroke()
      }
      break
    case 'burger':
      c.beginPath()
      c.moveTo(-0.9, -0.1)
      c.bezierCurveTo(-0.95, -0.95, 0.95, -0.95, 0.9, -0.1)
      c.closePath()
      fillStroke(c, c1)
      c.fillStyle = '#fbe8b8'
      for (const [x, y] of [[-0.4, -0.55], [0, -0.7], [0.4, -0.5]]) {
        c.beginPath()
        c.ellipse(x, y, 0.06, 0.03, 0.4, 0, 7)
        c.fill()
      }
      c.beginPath()
      c.moveTo(-0.95, -0.05)
      for (let i = 0; i <= 8; i++) c.lineTo(-0.95 + i * 0.2375, i % 2 ? 0.05 : -0.1)
      c.lineTo(0.95, 0.12)
      c.lineTo(-0.95, 0.12)
      fillStroke(c, c2, 0.06)
      rect(c, -0.9, 0.1, 1.8, 0.3, 0.14, '#6b3d22')
      c.beginPath()
      c.moveTo(-0.9, 0.45)
      c.lineTo(0.9, 0.45)
      c.quadraticCurveTo(0.9, 0.85, 0.5, 0.85)
      c.lineTo(-0.5, 0.85)
      c.quadraticCurveTo(-0.9, 0.85, -0.9, 0.45)
      fillStroke(c, c1)
      break
    case 'pizza':
      c.beginPath()
      c.moveTo(0, 0.9)
      c.lineTo(-0.85, -0.55)
      c.quadraticCurveTo(0, -0.95, 0.85, -0.55)
      c.closePath()
      fillStroke(c, c1)
      c.beginPath()
      c.moveTo(-0.85, -0.55)
      c.quadraticCurveTo(0, -0.95, 0.85, -0.55)
      c.lineWidth = 0.22
      c.strokeStyle = '#d9a35a'
      c.stroke()
      ell(c, -0.2, -0.2, 0.17, 0.17, c2, 0.05)
      ell(c, 0.25, -0.3, 0.15, 0.15, c2, 0.05)
      ell(c, 0.02, 0.2, 0.14, 0.14, c2, 0.05)
      break
    case 'taco':
      c.beginPath()
      c.arc(0, 0.15, 0.9, Math.PI, 0)
      c.closePath()
      fillStroke(c, c1)
      c.beginPath()
      c.moveTo(-0.7, 0.1)
      for (let i = 0; i < 6; i++) c.quadraticCurveTo(-0.7 + i * 0.28 + 0.07, -0.15, -0.7 + (i + 1) * 0.28 - 0.02, 0.1)
      c.lineWidth = 0.15
      c.strokeStyle = c2
      c.stroke()
      c.beginPath()
      c.arc(0, 0.15, 0.62, Math.PI, 0)
      c.lineWidth = 0.05
      c.strokeStyle = INK
      c.stroke()
      break
    case 'sushi':
      rect(c, -0.8, -0.1, 1.6, 0.7, 0.3, c2)
      c.beginPath()
      c.roundRect(-0.85, -0.5, 1.7, 0.55, 0.25)
      fillStroke(c, c1)
      c.strokeStyle = 'rgba(255,255,255,0.55)'
      c.lineWidth = 0.05
      for (const x of [-0.4, 0, 0.4]) {
        c.beginPath()
        c.moveTo(x - 0.15, -0.4)
        c.quadraticCurveTo(x, -0.2, x + 0.15, -0.4)
        c.stroke()
      }
      rect(c, -0.12, -0.5, 0.24, 1.1, 0.04, '#222a2a', 0.05)
      break
    case 'cookie':
      ell(c, 0, 0, 0.88, 0.85, c1)
      for (const [x, y] of [[-0.35, -0.3], [0.3, -0.4], [0.1, 0.1], [-0.4, 0.3], [0.45, 0.25], [0, -0.65]]) ell(c, x, y, 0.1, 0.09, c2, 0.03)
      gloss(c, -0.1, 0, 0.6)
      break
    case 'cupcake':
      poly(c, [[-0.7, 0.05], [0.7, 0.05], [0.5, 0.85], [-0.5, 0.85]], c2)
      c.strokeStyle = 'rgba(0,0,0,0.2)'
      c.lineWidth = 0.04
      for (const x of [-0.3, 0, 0.3]) {
        c.beginPath()
        c.moveTo(x * 1.2, 0.1)
        c.lineTo(x * 0.85, 0.8)
        c.stroke()
      }
      ell(c, 0, -0.05, 0.85, 0.32, c1)
      ell(c, 0, -0.4, 0.6, 0.3, c1)
      ell(c, 0, -0.68, 0.32, 0.22, c1)
      ell(c, 0, -0.9, 0.1, 0.1, '#d9433b', 0.04)
      break
    case 'donut':
      ell(c, 0, 0, 0.92, 0.82, '#d9a864')
      c.beginPath()
      c.ellipse(0, -0.05, 0.84, 0.72, 0, 0, Math.PI * 2)
      c.fillStyle = c1
      c.fill()
      ell(c, 0, -0.02, 0.28, 0.24, '#f4ece0', 0.06)
      for (const [x, y, col] of [[-0.55, -0.2, '#fff'], [0.5, -0.3, '#f2cf4a'], [0.1, 0.4, '#8fd3b8'], [-0.3, 0.35, '#fff'], [0.55, 0.15, '#3f8fd0'], [-0.15, -0.55, '#f2cf4a']] as [number, number, string][]) {
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + 0.1, y + 0.03)
        c.lineWidth = 0.06
        c.strokeStyle = col
        c.stroke()
      }
      break
    case 'cake':
      poly(c, [[-0.85, 0.7], [0.85, 0.7], [0.85, -0.1], [-0.85, -0.1]], '#c88a4a')
      rect(c, -0.85, -0.12, 1.7, 0.2, 0.1, c1)
      rect(c, -0.85, 0.25, 1.7, 0.12, 0.05, c1, 0.04)
      c.beginPath()
      c.moveTo(-0.9, -0.15)
      for (let i = 0; i < 4; i++) c.arc(-0.675 + i * 0.45, -0.15, 0.225, Math.PI, 0, true)
      c.lineTo(0.9, -0.15)
      c.closePath()
      fillStroke(c, c1)
      ell(c, 0, -0.45, 0.14, 0.14, c2, 0.05)
      c.beginPath()
      c.moveTo(0.02, -0.58)
      c.quadraticCurveTo(0.2, -0.8, 0.3, -0.85)
      c.lineWidth = 0.05
      c.strokeStyle = INK
      c.stroke()
      break
    case 'icecream':
      poly(c, [[-0.5, 0], [0.5, 0], [0, 0.95]], '#d9a35a')
      c.strokeStyle = 'rgba(0,0,0,0.2)'
      c.lineWidth = 0.04
      c.beginPath()
      c.moveTo(-0.3, 0.1)
      c.lineTo(0.2, 0.5)
      c.moveTo(0.3, 0.1)
      c.lineTo(-0.2, 0.5)
      c.stroke()
      ell(c, 0, -0.05, 0.6, 0.35, c2)
      ell(c, 0, -0.5, 0.55, 0.4, c1)
      ell(c, 0, -0.9, 0.1, 0.1, '#d9433b', 0.04)
      break
    case 'choco':
      rect(c, -0.55, -0.85, 1.1, 1.7, 0.12, c1)
      c.strokeStyle = 'rgba(255,255,255,0.18)'
      c.lineWidth = 0.05
      for (const y of [-0.3, 0.3]) {
        c.beginPath()
        c.moveTo(-0.55, y)
        c.lineTo(0.55, y)
        c.stroke()
      }
      c.beginPath()
      c.moveTo(0, -0.85)
      c.lineTo(0, 0.85)
      c.stroke()
      break
    case 'candy':
      poly(c, [[-0.95, -0.4], [-0.45, 0], [-0.95, 0.4]], c2, 0.05)
      poly(c, [[0.95, -0.4], [0.45, 0], [0.95, 0.4]], c2, 0.05)
      ell(c, 0, 0, 0.55, 0.45, c1)
      c.beginPath()
      c.moveTo(-0.2, -0.4)
      c.quadraticCurveTo(0.1, 0, -0.2, 0.4)
      c.lineWidth = 0.1
      c.strokeStyle = 'rgba(255,255,255,0.6)'
      c.stroke()
      break
    case 'cup': {
      c.beginPath()
      c.moveTo(-0.55, -0.7)
      c.lineTo(0.55, -0.7)
      c.lineTo(0.42, 0.85)
      c.lineTo(-0.42, 0.85)
      c.closePath()
      c.fillStyle = 'rgba(235,248,255,0.55)'
      c.fill()
      c.beginPath()
      c.moveTo(-0.5, -0.3)
      c.lineTo(0.5, -0.3)
      c.lineTo(0.42, 0.85)
      c.lineTo(-0.42, 0.85)
      c.closePath()
      c.fillStyle = c1
      c.fill()
      c.beginPath()
      c.moveTo(-0.55, -0.7)
      c.lineTo(0.55, -0.7)
      c.lineTo(0.42, 0.85)
      c.lineTo(-0.42, 0.85)
      c.closePath()
      fillStroke(c, null)
      c.beginPath()
      c.moveTo(-0.3, -0.5)
      c.lineTo(-0.22, 0.6)
      c.lineWidth = 0.08
      c.strokeStyle = 'rgba(255,255,255,0.6)'
      c.stroke()
      break
    }
    case 'mug':
      c.beginPath()
      c.arc(0.55, 0.1, 0.32, -Math.PI / 2, Math.PI / 2)
      c.lineWidth = 0.14
      c.strokeStyle = INK
      c.stroke()
      rect(c, -0.65, -0.45, 1.2, 1.2, 0.2, '#f6efe0')
      ell(c, -0.05, -0.4, 0.55, 0.12, c1, 0.05)
      c.strokeStyle = 'rgba(80,80,80,0.5)'
      c.lineWidth = 0.06
      for (const x of [-0.3, 0.1]) {
        c.beginPath()
        c.moveTo(x, -0.55)
        c.bezierCurveTo(x - 0.12, -0.7, x + 0.12, -0.8, x, -0.95)
        c.stroke()
      }
      break
    case 'can':
      rect(c, -0.45, -0.75, 0.9, 1.5, 0.15, c1)
      rect(c, -0.45, -0.25, 0.9, 0.5, 0, '#fbfaf2', 0.04)
      ell(c, 0, -0.75, 0.45, 0.1, '#c9cfd2', 0.05)
      star(c, 0, 0, 0.2, c1, 0.03)
      break
    case 'bandage':
      c.save()
      c.rotate(-0.5)
      rect(c, -0.9, -0.3, 1.8, 0.6, 0.3, c1)
      rect(c, -0.3, -0.3, 0.6, 0.6, 0.04, '#fbe9d0', 0.04)
      c.restore()
      break
    case 'jar':
      rect(c, -0.5, -0.85, 1, 0.3, 0.1, '#e0793a')
      rect(c, -0.6, -0.55, 1.2, 1.4, 0.25, 'rgba(240,250,255,0.75)')
      rect(c, -0.5, -0.1, 1, 0.65, 0.05, c1, 0.04)
      c.fillStyle = INK
      c.fillRect(-0.06, 0.05, 0.12, 0.35)
      c.fillRect(-0.18, 0.17, 0.36, 0.12)
      break
    case 'syrup':
      rect(c, -0.2, -0.95, 0.4, 0.3, 0.05, '#fbfaf2')
      c.beginPath()
      c.moveTo(-0.2, -0.65)
      c.lineTo(0.2, -0.65)
      c.lineTo(0.7, -0.3)
      c.lineTo(0.7, 0.8)
      c.lineTo(-0.7, 0.8)
      c.lineTo(-0.7, -0.3)
      c.closePath()
      fillStroke(c, c1)
      rect(c, -0.5, -0.05, 1, 0.55, 0.06, '#fbfaf2', 0.04)
      c.fillStyle = c1
      c.fillRect(-0.08, 0.05, 0.16, 0.35)
      c.fillRect(-0.2, 0.17, 0.4, 0.11)
      break
    case 'pill':
      c.save()
      c.rotate(-0.6)
      c.beginPath()
      c.roundRect(-0.9, -0.38, 1.8, 0.76, 0.38)
      c.fillStyle = c2
      c.fill()
      c.beginPath()
      c.roundRect(-0.9, -0.38, 0.9, 0.76, [0.38, 0, 0, 0.38])
      c.fillStyle = c1
      c.fill()
      c.beginPath()
      c.roundRect(-0.9, -0.38, 1.8, 0.76, 0.38)
      fillStroke(c, null)
      c.beginPath()
      c.moveTo(0, -0.38)
      c.lineTo(0, 0.38)
      c.lineWidth = 0.05
      c.stroke()
      c.restore()
      break
    case 'ball':
      ell(c, 0, 0, 0.85, 0.85, c1)
      c.save()
      c.beginPath()
      c.arc(0, 0, 0.85, 0, 7)
      c.clip()
      c.fillStyle = '#fbfaf2'
      c.beginPath()
      c.ellipse(0, 0, 0.35, 1.2, 0.5, 0, 7)
      c.fill()
      c.restore()
      ell(c, 0, 0, 0.85, 0.85, null)
      gloss(c, -0.1, -0.05, 0.6)
      break
    case 'duck':
      ell(c, 0.05, 0.3, 0.8, 0.5, c1)
      ell(c, -0.3, -0.35, 0.42, 0.42, c1)
      poly(c, [[-0.7, -0.35], [-1, -0.28], [-0.7, -0.18]], '#e0793a', 0.05)
      ell(c, -0.4, -0.45, 0.06, 0.06, INK, 0.01)
      ell(c, 0.3, 0.25, 0.3, 0.2, shade(c1, -0.12), 0.05, -0.3)
      break
    case 'robot':
      rect(c, -0.55, -0.45, 1.1, 0.95, 0.2, c1)
      rect(c, -0.45, -0.85, 0.9, 0.5, 0.15, shade(c1, 0.15))
      ell(c, -0.17, -0.62, 0.09, 0.09, '#3f8fd0', 0.04)
      ell(c, 0.17, -0.62, 0.09, 0.09, '#3f8fd0', 0.04)
      c.beginPath()
      c.moveTo(0, -0.85)
      c.lineTo(0, -1)
      c.lineWidth = 0.06
      c.strokeStyle = INK
      c.stroke()
      ell(c, 0, -1, 0.06, 0.06, '#d9433b', 0.03)
      rect(c, -0.3, -0.2, 0.6, 0.4, 0.06, '#2a3a3d', 0.04)
      rect(c, -0.45, 0.5, 0.3, 0.35, 0.08, shade(c1, -0.2))
      rect(c, 0.15, 0.5, 0.3, 0.35, 0.08, shade(c1, -0.2))
      break
    case 'kite':
      poly(c, [[0, -0.95], [0.6, -0.1], [0, 0.55], [-0.6, -0.1]], c1)
      c.beginPath()
      c.moveTo(0, -0.95)
      c.lineTo(0, 0.55)
      c.moveTo(-0.6, -0.1)
      c.lineTo(0.6, -0.1)
      c.lineWidth = 0.04
      c.strokeStyle = INK
      c.stroke()
      c.beginPath()
      c.moveTo(0, 0.55)
      c.bezierCurveTo(-0.3, 0.7, 0.3, 0.8, 0, 0.95)
      c.stroke()
      break
    case 'blocks':
      rect(c, -0.85, 0.05, 0.8, 0.8, 0.06, c1)
      rect(c, 0.05, 0.05, 0.8, 0.8, 0.06, '#3f8fd0')
      rect(c, -0.4, -0.75, 0.8, 0.8, 0.06, '#f2cf4a')
      c.fillStyle = '#fff'
      c.font = 'bold 0.5px sans-serif'
      c.textAlign = 'center'
      c.fillText('A', -0.45, 0.62)
      c.fillText('B', 0.45, 0.62)
      c.fillText('C', 0, -0.17)
      break
    case 'plush':
      star(c, 0, 0, 0.95, c1, 0.07)
      ell(c, -0.18, -0.05, 0.06, 0.08, INK, 0.01)
      ell(c, 0.18, -0.05, 0.06, 0.08, INK, 0.01)
      c.beginPath()
      c.arc(0, 0.1, 0.15, 0.2, Math.PI - 0.2)
      c.lineWidth = 0.05
      c.strokeStyle = INK
      c.stroke()
      break
    case 'shell':
      c.beginPath()
      c.moveTo(0, -0.9)
      c.bezierCurveTo(0.9, -0.7, 0.9, 0.5, 0, 0.85)
      c.bezierCurveTo(-0.9, 0.5, -0.9, -0.7, 0, -0.9)
      fillStroke(c, c1)
      c.strokeStyle = 'rgba(0,0,0,0.25)'
      c.lineWidth = 0.05
      for (let i = -2; i <= 2; i++) {
        c.beginPath()
        c.moveTo(0, 0.85)
        c.quadraticCurveTo(i * 0.4, 0, i * 0.3, -0.75)
        c.stroke()
      }
      break
    case 'gem':
      poly(c, [[-0.6, -0.55], [0.6, -0.55], [0.95, -0.05], [0, 0.95], [-0.95, -0.05]], c1)
      c.strokeStyle = 'rgba(255,255,255,0.55)'
      c.lineWidth = 0.05
      c.beginPath()
      c.moveTo(-0.95, -0.05)
      c.lineTo(0.95, -0.05)
      c.moveTo(-0.3, -0.05)
      c.lineTo(0, 0.95)
      c.moveTo(0.3, -0.05)
      c.lineTo(0, 0.95)
      c.moveTo(-0.3, -0.05)
      c.lineTo(-0.6, -0.55)
      c.moveTo(0.3, -0.05)
      c.lineTo(0.6, -0.55)
      c.stroke()
      break
    case 'feather':
      c.beginPath()
      c.moveTo(-0.7, 0.85)
      c.bezierCurveTo(-1, -0.2, 0.2, -1, 0.9, -0.9)
      c.bezierCurveTo(0.9, -0.1, 0.2, 0.6, -0.7, 0.85)
      fillStroke(c, c1)
      c.beginPath()
      c.moveTo(-0.8, 0.95)
      c.quadraticCurveTo(0, 0, 0.8, -0.8)
      c.lineWidth = 0.06
      c.strokeStyle = INK
      c.stroke()
      break
    case 'fossil':
      ell(c, 0, 0, 0.9, 0.78, c1)
      c.beginPath()
      c.moveTo(-0.5, 0.35)
      c.quadraticCurveTo(0, -0.7, 0.5, -0.1)
      c.lineWidth = 0.08
      c.strokeStyle = shade(c1, -0.4)
      c.stroke()
      for (let i = 0; i < 4; i++) {
        c.beginPath()
        c.moveTo(-0.3 + i * 0.22, 0.1 - i * 0.12)
        c.lineTo(-0.25 + i * 0.22, -0.2 - i * 0.1)
        c.lineWidth = 0.04
        c.stroke()
      }
      break
    case 'coinold':
      ell(c, 0, 0, 0.85, 0.85, c1)
      ell(c, 0, 0, 0.62, 0.62, shade(c1, 0.15), 0.04)
      star(c, 0, 0, 0.35, shade(c1, -0.25), 0.03)
      break
    case 'mushroom':
      rect(c, -0.25, 0, 0.5, 0.85, 0.15, '#f6efe0')
      c.beginPath()
      c.arc(0, 0.05, 0.9, Math.PI, 0)
      c.closePath()
      fillStroke(c, c1)
      for (const [x, y] of [[-0.4, -0.35], [0.1, -0.55], [0.45, -0.2]]) ell(c, x, y, 0.12, 0.12, '#fbfaf2', 0.03)
      break
    case 'key':
      ell(c, -0.45, -0.35, 0.4, 0.4, c1)
      ell(c, -0.45, -0.35, 0.16, 0.16, '#fff', 0.04)
      c.beginPath()
      c.moveTo(-0.15, -0.05)
      c.lineTo(0.8, 0.85)
      c.lineWidth = 0.2
      c.strokeStyle = INK
      c.stroke()
      c.lineWidth = 0.1
      c.strokeStyle = c1
      c.stroke()
      rect(c, 0.45, 0.5, 0.3, 0.12, 0.03, c1, 0.04)
      break
    case 'badge':
      ell(c, 0, 0, 0.88, 0.88, c1)
      ell(c, 0, 0, 0.66, 0.66, shade(c1, 0.2), 0.04)
      star(c, 0, 0, 0.45, '#fbfaf2', 0.04)
      break
    case 'cloth':
      rect(c, -0.8, -0.55, 1.6, 1.1, 0.1, c1)
      c.strokeStyle = 'rgba(255,255,255,0.35)'
      c.lineWidth = 0.05
      for (let i = -2; i <= 2; i++) {
        c.beginPath()
        c.moveTo(i * 0.3, -0.5)
        c.lineTo(i * 0.3, 0.5)
        c.stroke()
      }
      break
    case 'thread':
      rect(c, -0.5, -0.8, 1, 0.2, 0.05, '#c9a444')
      rect(c, -0.5, 0.6, 1, 0.2, 0.05, '#c9a444')
      rect(c, -0.4, -0.6, 0.8, 1.2, 0.05, c1)
      c.strokeStyle = 'rgba(0,0,0,0.2)'
      c.lineWidth = 0.04
      for (let i = 0; i < 5; i++) {
        c.beginPath()
        c.moveTo(-0.4, -0.5 + i * 0.25)
        c.lineTo(0.4, -0.4 + i * 0.25)
        c.stroke()
      }
      break
    case 'wood':
      rect(c, -0.9, -0.7, 1.8, 0.45, 0.05, c1)
      rect(c, -0.9, -0.2, 1.8, 0.45, 0.05, shade(c1, -0.12))
      rect(c, -0.9, 0.3, 1.8, 0.45, 0.05, c1)
      break
    case 'paint':
      rect(c, -0.65, -0.55, 1.3, 1.3, 0.15, '#d9dde0')
      c.beginPath()
      c.ellipse(0, -0.55, 0.65, 0.16, 0, 0, 7)
      fillStroke(c, c1)
      c.beginPath()
      c.moveTo(-0.3, -0.5)
      c.quadraticCurveTo(-0.3, -0.1, -0.35, 0.05)
      c.lineWidth = 0.14
      c.strokeStyle = c1
      c.stroke()
      break
    default:
      drawWearableIcon(c, art)
  }
  c.restore()
}

function drawWearableIcon(c: C, art: ArtSpec) {
  const [kind] = art
  if (kind === 'tee' || kind === 'hoodie' || kind === 'dress' || kind === 'vest' || kind === 'overalls' || kind === 'cape') {
    drawGarmentIcon(c, art)
    return
  }
  if (kind.startsWith('fx')) {
    drawFxIcon(c, art)
    return
  }
  if (kind === 'wallpaper' || ['plain', 'stripes', 'dots', 'stars', 'brick', 'check', 'leaves', 'diamond', 'planks', 'tiles', 'checker', 'grass'].includes(kind)) {
    drawPattern(c, art, -0.9, -0.9, 1.8, 1.8)
    return
  }
  const slotY: Record<string, number> = { cap: 0.45, beanie: 0.35, party: 0.5, straw: 0.3, chef: 0.5, wizard: 0.55, crown: 0.4, headphones: 0.1, flowercrown: 0.2, ribbon: 0.2 }
  c.save()
  const isHat = kind in slotY
  const s = kind === 'shoe' || kind === 'boot' || kind === 'slipper' ? 1.7 : isHat ? 1.25 : 1.05
  c.scale(s, s)
  c.translate(0, slotY[kind] ?? 0)
  drawWearable(c, art)
  c.restore()
}

// ---- Kozmetik: birim 1 = gövde yarı genişliği ----

export function drawWearable(c: C, art: ArtSpec) {
  const [kind, c1, c2 = '#ffffff'] = art
  c.save()
  c.lineJoin = 'round'
  c.lineCap = 'round'
  switch (kind) {
    case 'cap':
      c.beginPath()
      c.arc(0, 0, 0.62, Math.PI, 0)
      c.closePath()
      fillStroke(c, c1, 0.05)
      c.beginPath()
      c.ellipse(0.55, -0.02, 0.5, 0.1, 0.08, 0, Math.PI)
      fillStroke(c, shade(c1, -0.18), 0.05)
      ell(c, 0, -0.62, 0.07, 0.07, shade(c1, -0.2), 0.03)
      break
    case 'beanie':
      c.beginPath()
      c.arc(0, 0.02, 0.64, Math.PI, 0)
      c.closePath()
      fillStroke(c, c1, 0.05)
      rect(c, -0.68, -0.14, 1.36, 0.26, 0.1, c2, 0.05)
      ell(c, 0, -0.68, 0.17, 0.17, c2, 0.04)
      break
    case 'party':
      poly(c, [[-0.4, 0.05], [0.4, 0.05], [0, -1.0]], c1, 0.05)
      c.strokeStyle = c2
      c.lineWidth = 0.09
      for (const y of [-0.2, -0.5]) {
        c.beginPath()
        c.moveTo(-0.3 + (0.2 - 0) * (y * -1 - 0.2) * 0.5, y)
        c.lineTo(0.3 - (0.2) * (y * -1 - 0.2) * 0.5, y + 0.08)
        c.stroke()
      }
      ell(c, 0, -1.02, 0.12, 0.12, c2, 0.04)
      break
    case 'straw':
      ell(c, 0, 0, 1.0, 0.2, c1, 0.05)
      c.beginPath()
      c.arc(0, -0.02, 0.5, Math.PI, 0)
      c.closePath()
      fillStroke(c, shade(c1, 0.1), 0.05)
      rect(c, -0.5, -0.2, 1, 0.14, 0.03, c2, 0.04)
      break
    case 'chef':
      rect(c, -0.45, -0.12, 0.9, 0.22, 0.04, c1, 0.05)
      for (const [x, y, r] of [[-0.35, -0.45, 0.3], [0.35, -0.45, 0.3], [0, -0.6, 0.36]]) ell(c, x, y, r, r, c1, 0.05)
      rect(c, -0.45, -0.18, 0.9, 0.2, 0.04, c1, 0.05)
      break
    case 'wizard':
      c.beginPath()
      c.moveTo(-0.55, 0.05)
      c.quadraticCurveTo(-0.2, -0.3, 0.1, -0.95)
      c.quadraticCurveTo(0.4, -0.5, 0.55, 0.05)
      c.closePath()
      fillStroke(c, c1, 0.05)
      ell(c, 0, 0.04, 0.8, 0.14, shade(c1, -0.15), 0.05)
      star(c, 0.03, -0.35, 0.15, c2, 0.03)
      star(c, -0.2, -0.05, 0.08, c2, 0.02)
      break
    case 'crown':
      c.beginPath()
      c.moveTo(-0.5, 0.1)
      c.lineTo(-0.55, -0.5)
      c.lineTo(-0.25, -0.2)
      c.lineTo(0, -0.62)
      c.lineTo(0.25, -0.2)
      c.lineTo(0.55, -0.5)
      c.lineTo(0.5, 0.1)
      c.closePath()
      fillStroke(c, c1, 0.05)
      ell(c, 0, -0.15, 0.08, 0.08, c2, 0.03)
      ell(c, -0.3, -0.05, 0.06, 0.06, c2, 0.03)
      ell(c, 0.3, -0.05, 0.06, 0.06, c2, 0.03)
      break
    case 'headphones':
      c.beginPath()
      c.arc(0, 0.25, 0.85, Math.PI * 1.05, Math.PI * 1.95)
      c.lineWidth = 0.1
      c.strokeStyle = c1
      c.stroke()
      rect(c, -0.98, 0.1, 0.28, 0.55, 0.12, c2, 0.05)
      rect(c, 0.7, 0.1, 0.28, 0.55, 0.12, c2, 0.05)
      break
    case 'flowercrown':
      c.beginPath()
      c.arc(0, 0.2, 0.7, Math.PI * 1.1, Math.PI * 1.9)
      c.lineWidth = 0.08
      c.strokeStyle = '#4f9d4b'
      c.stroke()
      for (const a of [-0.7, -0.35, 0, 0.35, 0.7]) {
        const x = Math.sin(a) * 0.72
        const y = 0.2 - Math.cos(a) * 0.72
        for (let k = 0; k < 5; k++) ell(c, x + Math.cos((k * Math.PI * 2) / 5) * 0.09, y + Math.sin((k * Math.PI * 2) / 5) * 0.09, 0.08, 0.08, c1, 0.02)
        ell(c, x, y, 0.06, 0.06, c2, 0.02)
      }
      break
    case 'ribbon':
      c.beginPath()
      c.moveTo(0, 0)
      c.quadraticCurveTo(-0.5, -0.5, -0.55, 0)
      c.quadraticCurveTo(-0.5, 0.2, 0, 0)
      fillStroke(c, c1, 0.05)
      c.beginPath()
      c.moveTo(0, 0)
      c.quadraticCurveTo(0.5, -0.5, 0.55, 0)
      c.quadraticCurveTo(0.5, 0.2, 0, 0)
      fillStroke(c, c1, 0.05)
      ell(c, 0, 0, 0.1, 0.1, shade(c1, -0.2), 0.04)
      break
    case 'roundg':
      ell(c, -0.38, 0, 0.3, 0.3, 'rgba(210,235,250,0.25)', c2 === 'thick' ? 0.1 : 0.05)
      ell(c, 0.38, 0, 0.3, 0.3, 'rgba(210,235,250,0.25)', c2 === 'thick' ? 0.1 : 0.05)
      c.beginPath()
      c.moveTo(-0.08, -0.04)
      c.quadraticCurveTo(0, -0.1, 0.08, -0.04)
      c.lineWidth = 0.05
      c.strokeStyle = INK
      c.stroke()
      break
    case 'shades':
      rect(c, -0.7, -0.22, 0.62, 0.42, 0.14, c1, 0.04)
      rect(c, 0.08, -0.22, 0.62, 0.42, 0.14, c1, 0.04)
      c.beginPath()
      c.moveTo(-0.1, -0.1)
      c.lineTo(0.1, -0.1)
      c.lineWidth = 0.06
      c.strokeStyle = INK
      c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.4)'
      c.lineWidth = 0.05
      c.beginPath()
      c.moveTo(-0.55, -0.12)
      c.lineTo(-0.4, -0.12)
      c.moveTo(0.23, -0.12)
      c.lineTo(0.38, -0.12)
      c.stroke()
      break
    case 'starg':
      star(c, -0.38, 0, 0.42, c1, 0.05)
      star(c, 0.38, 0, 0.42, c1, 0.05)
      c.beginPath()
      c.moveTo(-0.05, -0.05)
      c.lineTo(0.05, -0.05)
      c.lineWidth = 0.05
      c.strokeStyle = INK
      c.stroke()
      break
    case 'heartg':
      heart(c, -0.38, 0, 0.3, c1, 0.05)
      heart(c, 0.38, 0, 0.3, c1, 0.05)
      break
    case 'scarf':
      rect(c, -0.8, -0.14, 1.6, 0.3, 0.14, c1, 0.05)
      c.strokeStyle = c2
      c.lineWidth = 0.07
      for (const x of [-0.5, -0.15, 0.2, 0.55]) {
        c.beginPath()
        c.moveTo(x, -0.1)
        c.lineTo(x, 0.12)
        c.stroke()
      }
      rect(c, 0.3, 0.1, 0.28, 0.6, 0.08, c1, 0.05)
      c.strokeStyle = c2
      c.beginPath()
      c.moveTo(0.3, 0.35)
      c.lineTo(0.58, 0.35)
      c.stroke()
      break
    case 'bowtie':
      poly(c, [[0, 0], [-0.5, -0.28], [-0.5, 0.28]], c1, 0.05)
      poly(c, [[0, 0], [0.5, -0.28], [0.5, 0.28]], c1, 0.05)
      ell(c, 0, 0, 0.1, 0.12, shade(c1, 0.2), 0.04)
      break
    case 'bell':
      c.beginPath()
      c.arc(0, -0.35, 0.8, 0.25, Math.PI - 0.25)
      c.lineWidth = 0.1
      c.strokeStyle = c1
      c.stroke()
      ell(c, 0, 0.4, 0.17, 0.17, c2, 0.05)
      c.beginPath()
      c.moveTo(-0.08, 0.52)
      c.lineTo(0.08, 0.52)
      c.lineWidth = 0.04
      c.strokeStyle = INK
      c.stroke()
      break
    case 'bandana':
      c.beginPath()
      c.moveTo(-0.8, -0.1)
      c.lineTo(0.8, -0.1)
      c.lineTo(0, 0.7)
      c.closePath()
      fillStroke(c, c1, 0.05)
      c.fillStyle = '#fbfaf2'
      for (const [x, y] of [[-0.3, 0.05], [0.25, 0.1], [0, 0.35], [-0.5, -0.02], [0.5, -0.02]]) {
        c.beginPath()
        c.arc(x, y, 0.045, 0, 7)
        c.fill()
      }
      break
    case 'pearls':
      for (let i = 0; i < 9; i++) {
        const a = (i / 8) * Math.PI
        ell(c, Math.cos(a) * -0.7, Math.sin(a) * 0.45 - 0.05, 0.1, 0.1, c1, 0.03)
      }
      break
    case 'shoe':
      c.beginPath()
      c.moveTo(-0.3, -0.25)
      c.lineTo(0.05, -0.25)
      c.quadraticCurveTo(0.12, 0, 0.42, 0.04)
      c.quadraticCurveTo(0.52, 0.1, 0.5, 0.2)
      c.lineTo(-0.3, 0.2)
      c.closePath()
      fillStroke(c, c1, 0.05)
      rect(c, -0.32, 0.14, 0.86, 0.14, 0.07, c2, 0.05)
      break
    case 'boot':
      c.beginPath()
      c.moveTo(-0.28, -0.5)
      c.lineTo(0.1, -0.5)
      c.lineTo(0.1, -0.05)
      c.quadraticCurveTo(0.45, 0, 0.5, 0.18)
      c.lineTo(-0.28, 0.2)
      c.closePath()
      fillStroke(c, c1, 0.05)
      rect(c, -0.3, 0.14, 0.82, 0.14, 0.07, shade(c1, -0.35), 0.05)
      break
    case 'slipper':
      c.beginPath()
      c.moveTo(-0.3, 0.05)
      c.quadraticCurveTo(0, -0.2, 0.3, 0)
      c.quadraticCurveTo(0.6, 0.05, 0.5, 0.22)
      c.lineTo(-0.3, 0.22)
      c.closePath()
      fillStroke(c, c1, 0.05)
      break
    default:
      break
  }
  c.restore()
}

// Gövdeye kırpılmış giysi çizimi (gövde yolu clip edilmiş olmalı); birim: yarı genişlik, merkez gövde merkezi
export function drawGarmentOnBody(c: C, art: ArtSpec) {
  const [kind, c1, c2 = '#ffffff'] = art
  c.save()
  switch (kind) {
    case 'tee':
      c.fillStyle = c1
      c.fillRect(-1.2, -0.12, 2.4, 1.2)
      c.strokeStyle = shade(c1, -0.3)
      c.lineWidth = 0.05
      c.beginPath()
      c.moveTo(-1.2, -0.12)
      c.lineTo(1.2, -0.12)
      c.stroke()
      c.fillStyle = c2 === '#ffffff' ? 'rgba(255,255,255,0.16)' : c2
      c.fillRect(-1.2, 0.55, 2.4, 0.1)
      break
    case 'hoodie':
      c.fillStyle = c1
      c.fillRect(-1.2, -0.2, 2.4, 1.4)
      c.fillStyle = shade(c1, -0.18)
      c.beginPath()
      c.moveTo(-0.55, -0.22)
      c.quadraticCurveTo(0, 0.28, 0.55, -0.22)
      c.lineTo(0.55, -0.4)
      c.lineTo(-0.55, -0.4)
      c.closePath()
      c.fill()
      c.fillStyle = shade(c1, -0.12)
      c.beginPath()
      c.roundRect(-0.5, 0.45, 1, 0.32, 0.1)
      c.fill()
      c.strokeStyle = '#fbfaf2'
      c.lineWidth = 0.04
      c.beginPath()
      c.moveTo(-0.15, 0.08)
      c.lineTo(-0.15, 0.3)
      c.moveTo(0.15, 0.08)
      c.lineTo(0.15, 0.3)
      c.stroke()
      break
    case 'dress':
      c.fillStyle = c1
      c.fillRect(-1.2, -0.1, 2.4, 1.3)
      c.fillStyle = c2
      for (const [x, y] of [[-0.6, 0.1], [0, 0.25], [0.6, 0.1], [-0.3, 0.55], [0.35, 0.6], [-0.8, 0.6], [0.85, 0.55]]) {
        c.beginPath()
        c.arc(x, y, 0.07, 0, 7)
        c.fill()
      }
      c.fillStyle = shade(c1, -0.2)
      c.fillRect(-1.2, -0.1, 2.4, 0.1)
      break
    case 'vest':
      c.fillStyle = c1
      c.fillRect(-1.2, -0.1, 0.65, 1.3)
      c.fillRect(0.55, -0.1, 0.65, 1.3)
      c.fillStyle = '#c9a444'
      for (const y of [0.2, 0.45, 0.7]) {
        c.beginPath()
        c.arc(0.4, y, 0.04, 0, 7)
        c.fill()
      }
      break
    case 'overalls':
      c.fillStyle = c1
      c.fillRect(-1.2, 0.3, 2.4, 1)
      c.fillRect(-0.6, -0.1, 0.18, 0.5)
      c.fillRect(0.42, -0.1, 0.18, 0.5)
      c.fillStyle = shade(c1, -0.15)
      c.fillRect(-0.45, 0.4, 0.9, 0.4)
      c.fillStyle = c2
      c.beginPath()
      c.arc(-0.51, 0.3, 0.05, 0, 7)
      c.arc(0.51, 0.3, 0.05, 0, 7)
      c.fill()
      break
    default:
      break
  }
  c.restore()
}

function drawGarmentIcon(c: C, art: ArtSpec) {
  const [kind, c1, c2 = '#ffffff'] = art
  c.save()
  c.translate(0, -0.05)
  switch (kind) {
    case 'cape':
      c.beginPath()
      c.moveTo(-0.5, -0.8)
      c.lineTo(0.5, -0.8)
      c.lineTo(0.95, 0.9)
      c.quadraticCurveTo(0, 0.7, -0.95, 0.9)
      c.closePath()
      fillStroke(c, c1)
      ell(c, 0, -0.8, 0.5, 0.1, c2, 0.05)
      break
    case 'dress':
      c.beginPath()
      c.moveTo(-0.35, -0.85)
      c.lineTo(0.35, -0.85)
      c.lineTo(0.3, -0.2)
      c.lineTo(0.8, 0.85)
      c.lineTo(-0.8, 0.85)
      c.lineTo(-0.3, -0.2)
      c.closePath()
      fillStroke(c, c1)
      c.fillStyle = c2
      for (const [x, y] of [[-0.3, 0.3], [0.25, 0.45], [0, 0.65], [0.5, 0.7], [-0.5, 0.7]]) {
        c.beginPath()
        c.arc(x, y, 0.06, 0, 7)
        c.fill()
      }
      break
    case 'overalls':
      poly(c, [[-0.5, -0.4], [0.5, -0.4], [0.5, 0.85], [0.08, 0.85], [0.05, 0.3], [-0.05, 0.3], [-0.08, 0.85], [-0.5, 0.85]], c1)
      rect(c, -0.4, -0.9, 0.14, 0.55, 0.03, c1, 0.05)
      rect(c, 0.26, -0.9, 0.14, 0.55, 0.03, c1, 0.05)
      rect(c, -0.3, -0.2, 0.6, 0.3, 0.05, shade(c1, -0.15), 0.04)
      break
    default:
      c.beginPath()
      c.moveTo(-0.35, -0.8)
      c.quadraticCurveTo(0, -0.6, 0.35, -0.8)
      c.lineTo(0.95, -0.4)
      c.lineTo(0.7, -0.05)
      c.lineTo(0.5, -0.15)
      c.lineTo(0.5, 0.85)
      c.lineTo(-0.5, 0.85)
      c.lineTo(-0.5, -0.15)
      c.lineTo(-0.7, -0.05)
      c.lineTo(-0.95, -0.4)
      c.closePath()
      fillStroke(c, c1)
      if (kind === 'vest') rect(c, -0.05, -0.65, 0.1, 1.45, 0.02, shade(c1, -0.3), 0.03)
      else if (kind === 'hoodie') ell(c, 0, -0.6, 0.3, 0.2, shade(c1, -0.2), 0.04)
      break
  }
  c.restore()
}

function drawFxIcon(c: C, art: ArtSpec) {
  const [kind, c1] = art
  c.save()
  if (kind === 'fxhalo') {
    ell(c, 0, 0, 0.8, 0.28, null, 0.14)
    c.strokeStyle = c1
    c.lineWidth = 0.14
    c.beginPath()
    c.ellipse(0, 0, 0.8, 0.28, 0, 0, 7)
    c.stroke()
  } else if (kind === 'fxhearts') {
    heart(c, -0.35, 0.25, 0.45, c1)
    heart(c, 0.4, -0.2, 0.32, shade(c1, 0.2))
    heart(c, 0.05, -0.6, 0.2, c1)
  } else if (kind === 'fxbubbles') {
    for (const [x, y, r] of [[-0.35, 0.3, 0.38], [0.35, -0.05, 0.3], [-0.05, -0.55, 0.2]]) {
      ell(c, x, y, r, r, 'rgba(180,225,245,0.4)', 0.05)
      gloss(c, x, y, r * 0.7)
    }
  } else if (kind === 'fxleaves') {
    for (const [x, y, r] of [[-0.4, 0.3, 0.5], [0.4, -0.1, -0.7], [0, -0.6, 0.2]]) ell(c, x, y, 0.35, 0.16, c1, 0.05, r)
  } else if (kind === 'fxsnow') {
    c.strokeStyle = c1
    c.lineWidth = 0.1
    for (let i = 0; i < 3; i++) {
      c.save()
      c.rotate((i * Math.PI) / 3)
      c.beginPath()
      c.moveTo(-0.8, 0)
      c.lineTo(0.8, 0)
      c.stroke()
      c.restore()
    }
  } else {
    star(c, -0.2, 0.2, 0.5, c1)
    star(c, 0.5, -0.4, 0.28, shade(c1, 0.2), 0.04)
    star(c, -0.5, -0.5, 0.2, c1, 0.03)
  }
  c.restore()
}

// ---- Desenler (duvar kağıdı / zemin) ----

export function drawPattern(c: C, art: ArtSpec, x: number, y: number, w: number, h: number) {
  const [kind, c1, c2 = '#ffffff'] = art
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.fillStyle = c1
  c.fillRect(x, y, w, h)
  const u = Math.min(w, h)
  switch (kind) {
    case 'stripes':
      c.fillStyle = c2
      for (let i = 0; i < 8; i++) c.fillRect(x + (i * w) / 8, y, w / 16, h)
      break
    case 'dots':
      c.fillStyle = c2
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) {
          c.beginPath()
          c.arc(x + ((i + (j % 2) * 0.5) * w) / 5 + w / 10, y + (j * h) / 5 + h / 10, u / 22, 0, 7)
          c.fill()
        }
      break
    case 'stars':
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 4; j++) {
          c.fillStyle = (i + j) % 2 ? '#f6e27a' : c2
          c.beginPath()
          c.arc(x + ((i + (j % 2) * 0.5) * w) / 5 + w / 10, y + (j * h) / 4 + h / 8, u / 40, 0, 7)
          c.fill()
        }
      break
    case 'brick':
      c.strokeStyle = c2
      c.lineWidth = Math.max(1, u / 60)
      for (let j = 0; j < 6; j++) {
        const yy = y + (j * h) / 6
        c.beginPath()
        c.moveTo(x, yy)
        c.lineTo(x + w, yy)
        c.stroke()
        for (let i = 0; i < 4; i++) {
          const xx = x + ((i + (j % 2) * 0.5) * w) / 4
          c.beginPath()
          c.moveTo(xx, yy)
          c.lineTo(xx, yy + h / 6)
          c.stroke()
        }
      }
      break
    case 'check':
      c.fillStyle = c2
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) c.fillRect(x + (i * w) / 8, y + (j * h) / 8, w / 8, h / 8)
      break
    case 'leaves':
      c.fillStyle = c2
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          c.beginPath()
          c.ellipse(x + ((i + (j % 2) * 0.5) * w) / 4 + w / 8, y + (j * h) / 4 + h / 8, u / 14, u / 30, 0.6, 0, 7)
          c.fill()
        }
      break
    case 'diamond':
      c.fillStyle = c2
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const cx = x + ((i + 0.5) * w) / 4
          const cy = y + ((j + 0.5) * h) / 4
          c.beginPath()
          c.moveTo(cx, cy - u / 12)
          c.lineTo(cx + u / 12, cy)
          c.lineTo(cx, cy + u / 12)
          c.lineTo(cx - u / 12, cy)
          c.closePath()
          c.fill()
        }
      break
    case 'planks':
      c.strokeStyle = c2
      c.lineWidth = Math.max(1, u / 50)
      for (let j = 0; j < 5; j++) {
        const yy = y + (j * h) / 5
        c.beginPath()
        c.moveTo(x, yy)
        c.lineTo(x + w, yy)
        c.stroke()
        const xx = x + (((j * 37) % 100) / 100) * w
        c.beginPath()
        c.moveTo(xx, yy)
        c.lineTo(xx, yy + h / 5)
        c.stroke()
      }
      break
    case 'tiles':
      c.strokeStyle = c2
      c.lineWidth = Math.max(1, u / 40)
      for (let i = 1; i < 4; i++) {
        c.beginPath()
        c.moveTo(x + (i * w) / 4, y)
        c.lineTo(x + (i * w) / 4, y + h)
        c.moveTo(x, y + (i * h) / 4)
        c.lineTo(x + w, y + (i * h) / 4)
        c.stroke()
      }
      break
    case 'checker':
      c.fillStyle = c2
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) c.fillRect(x + (i * w) / 6, y + (j * h) / 6, w / 6, h / 6)
      break
    case 'grass':
      c.strokeStyle = c2
      c.lineWidth = Math.max(1, u / 40)
      for (let i = 0; i < 14; i++) {
        const xx = x + ((i * 53) % 100) * w * 0.01
        const yy = y + ((i * 31) % 100) * h * 0.01
        c.beginPath()
        c.moveTo(xx, yy)
        c.lineTo(xx + u / 40, yy - u / 12)
        c.stroke()
      }
      break
    default:
      break
  }
  c.restore()
}
