import { ITEMS } from '../game/items'
import { GRID, ROOMS, SCENE } from '../game/progression'
import type { GameState, RoomId } from '../game/types'
import type { Clock, Weather } from '../game/world'
import { INK, drawArt, drawPattern, shade } from './itemArt'

type C = CanvasRenderingContext2D

const CELL = GRID.cell
const WALL_H = GRID.wallRows * CELL

type RGB = [number, number, number]
const hexRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`

const SKY = {
  dayTop: hexRgb('#6fb9e6'),
  dayBot: hexRgb('#d6eef8'),
  duskTop: hexRgb('#46508f'),
  duskBot: hexRgb('#f2a373'),
  nightTop: hexRgb('#0d1736'),
  nightBot: hexRgb('#25396a'),
}

function skyColors(clock: Clock, weather: Weather): [RGB, RGB] {
  const d = clock.daylight
  let top: RGB
  let bot: RGB
  if (d > 0.6) {
    const k = (d - 0.6) / 0.4
    top = mix(SKY.duskTop, SKY.dayTop, k)
    bot = mix(SKY.duskBot, SKY.dayBot, k)
  } else {
    const k = d / 0.6
    top = mix(SKY.nightTop, SKY.duskTop, k)
    bot = mix(SKY.nightBot, SKY.duskBot, k)
  }
  const gray: RGB = mix([150, 162, 172], [30, 36, 50], 1 - d)
  const amt = weather === 'rainy' ? 0.6 : weather === 'cloudy' ? 0.4 : weather === 'snowy' ? 0.5 : weather === 'windy' ? 0.15 : 0
  return [mix(top, gray, amt), mix(bot, gray, amt)]
}

const HILLS: Record<string, [string, string]> = {
  spring: ['#9fd08a', '#7fbf6a'],
  summer: ['#5fae52', '#468f3f'],
  autumn: ['#d29a4a', '#b9763a'],
  winter: ['#eef4f6', '#d3e0e6'],
}

function cloud(c: C, x: number, y: number, s: number, col: string) {
  c.fillStyle = col
  c.beginPath()
  c.ellipse(x, y, 34 * s, 15 * s, 0, 0, 7)
  c.ellipse(x - 20 * s, y + 4 * s, 22 * s, 11 * s, 0, 0, 7)
  c.ellipse(x + 22 * s, y + 3 * s, 24 * s, 12 * s, 0, 0, 7)
  c.ellipse(x + 4 * s, y - 10 * s, 20 * s, 13 * s, 0, 0, 7)
  c.fill()
}

export interface OutdoorView {
  clock: Clock
  weather: Weather
  t: number
  px: number
}

export function moonPos(clock: Clock, r: { x: number; y: number; w: number; h: number }) {
  const hh = (clock.hour + clock.minute / 60 + 24 - 19) % 24
  const k = Math.min(1, hh / 11)
  return { x: r.x + r.w * (0.15 + 0.7 * k), y: r.y + r.h * (0.5 - Math.sin(k * Math.PI) * 0.38) }
}

export function drawOutdoor(c: C, r: { x: number; y: number; w: number; h: number }, v: OutdoorView, season: string, low: boolean) {
  const { clock, weather, t } = v
  c.save()
  c.beginPath()
  c.rect(r.x, r.y, r.w, r.h)
  c.clip()
  const [top, bot] = skyColors(clock, weather)
  const g = c.createLinearGradient(0, r.y, 0, r.y + r.h)
  g.addColorStop(0, css(top))
  g.addColorStop(1, css(bot))
  c.fillStyle = g
  c.fillRect(r.x, r.y, r.w, r.h)

  const d = clock.daylight
  const sx = v.px * 0.5
  if (d < 0.35 && weather !== 'cloudy' && weather !== 'rainy') {
    c.fillStyle = `rgba(255,255,255,${(0.35 - d) * 2})`
    for (let i = 0; i < 26; i++) {
      const x = r.x + ((i * 97) % 100) * 0.01 * r.w
      const y = r.y + ((i * 53) % 70) * 0.01 * r.h
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + i)
      c.fillRect(x, y, 2 * tw, 2 * tw)
    }
  }
  if (d > 0.08) {
    const hh = clock.hour + clock.minute / 60
    const k = Math.max(0, Math.min(1, (hh - 5.5) / 14))
    const x = r.x + r.w * (0.1 + 0.8 * k)
    const y = r.y + r.h * (0.78 - Math.sin(k * Math.PI) * 0.62)
    const glow = c.createRadialGradient(x, y, 4, x, y, 60)
    glow.addColorStop(0, 'rgba(255,240,170,0.7)')
    glow.addColorStop(1, 'rgba(255,240,170,0)')
    if (weather === 'sunny' || weather === 'windy') {
      c.fillStyle = glow
      c.fillRect(x - 60, y - 60, 120, 120)
      c.beginPath()
      c.arc(x, y, 14, 0, 7)
      c.fillStyle = '#fff3b0'
      c.fill()
    }
  }
  if (d < 0.5) {
    const m = moonPos(clock, r)
    c.globalAlpha = Math.min(1, (0.5 - d) * 3)
    c.beginPath()
    c.arc(m.x, m.y, 13, 0, 7)
    c.fillStyle = '#f4f1dc'
    c.fill()
    c.beginPath()
    c.arc(m.x + 5, m.y - 3, 11, 0, 7)
    c.fillStyle = css(mix(top, bot, 0.4))
    c.fill()
    c.globalAlpha = 1
  }

  const nClouds = weather === 'sunny' ? 2 : weather === 'windy' ? 4 : weather === 'cloudy' ? 6 : 5
  const speed = weather === 'windy' ? 26 : 7
  const cc = weather === 'rainy' || weather === 'cloudy' || weather === 'snowy' ? mix([235, 240, 245], [90, 100, 125], 1 - d) : mix([255, 255, 255], [80, 95, 130], 1 - d)
  const cStr = css(cc)
  if (!low) {
    for (let i = 0; i < nClouds; i++) {
      const w = r.w + 120
      const x = r.x + ((((i * 163 + t * speed * (0.6 + (i % 3) * 0.3)) % w) + w) % w) - 60 + sx * (0.3 + i * 0.05)
      cloud(c, x, r.y + r.h * (0.14 + ((i * 37) % 40) / 140), 0.8 + (i % 3) * 0.25, cStr)
    }
  }

  const hills = HILLS[season] ?? HILLS.summer
  const dim = 1 - (1 - d) * 0.55
  c.fillStyle = shade(hills[0], -(1 - dim))
  c.beginPath()
  c.moveTo(r.x, r.y + r.h)
  c.lineTo(r.x, r.y + r.h * 0.74)
  c.bezierCurveTo(r.x + r.w * 0.25, r.y + r.h * 0.55, r.x + r.w * 0.5, r.y + r.h * 0.85, r.x + r.w, r.y + r.h * 0.62)
  c.lineTo(r.x + r.w, r.y + r.h)
  c.fill()
  c.fillStyle = shade(hills[1], -(1 - dim))
  c.beginPath()
  c.moveTo(r.x, r.y + r.h)
  c.lineTo(r.x, r.y + r.h * 0.88)
  c.bezierCurveTo(r.x + r.w * 0.3, r.y + r.h * 0.7, r.x + r.w * 0.7, r.y + r.h * 0.98, r.x + r.w, r.y + r.h * 0.8)
  c.lineTo(r.x + r.w, r.y + r.h)
  c.fill()

  const sway = (weather === 'windy' ? 5 : 1.5) * Math.sin(t * (weather === 'windy' ? 4 : 1.4))
  for (const fx of [0.18, 0.72]) {
    const tx = r.x + r.w * fx + sx * 0.8
    const ty = r.y + r.h * 0.92
    c.fillStyle = shade('#6a4a30', -(1 - dim))
    c.fillRect(tx - 2, ty - 18, 4, 18)
    const leaf = season === 'autumn' ? '#d9733a' : season === 'spring' ? '#f4a3b6' : season === 'winter' ? '#f2f6f8' : '#4f9d4b'
    c.fillStyle = shade(leaf, -(1 - dim))
    c.beginPath()
    c.ellipse(tx + sway, ty - 26, 15, 13, 0, 0, 7)
    c.fill()
  }

  if (!low) {
    if (weather === 'rainy') {
      c.strokeStyle = `rgba(190,220,245,${0.35 + d * 0.3})`
      c.lineWidth = 1.2
      c.beginPath()
      for (let i = 0; i < 34; i++) {
        const x = r.x + ((i * 61 + t * 30) % (r.w + 20))
        const y = r.y + ((i * 47 + t * 340) % (r.h + 20)) - 10
        c.moveTo(x, y)
        c.lineTo(x - 3, y + 11)
      }
      c.stroke()
    } else if (weather === 'snowy') {
      c.fillStyle = 'rgba(255,255,255,0.9)'
      for (let i = 0; i < 40; i++) {
        const x = r.x + ((i * 59 + Math.sin(t + i) * 12 + t * 8) % (r.w + 10))
        const y = r.y + ((i * 43 + t * 40) % (r.h + 10))
        c.beginPath()
        c.arc(x, y, 1.8 + (i % 3) * 0.6, 0, 7)
        c.fill()
      }
    } else if (weather === 'windy') {
      c.strokeStyle = 'rgba(255,255,255,0.4)'
      c.lineWidth = 1.4
      c.beginPath()
      for (let i = 0; i < 8; i++) {
        const x = r.x + ((i * 83 + t * 220) % (r.w + 60)) - 30
        const y = r.y + r.h * (0.15 + ((i * 29) % 60) / 100)
        c.moveTo(x, y)
        c.quadraticCurveTo(x + 14, y - 5, x + 30, y)
      }
      c.stroke()
      c.fillStyle = season === 'autumn' ? '#d9733a' : '#7fbf5a'
      for (let i = 0; i < 4; i++) {
        const x = r.x + ((i * 131 + t * 150) % (r.w + 20))
        const y = r.y + r.h * 0.5 + Math.sin(t * 3 + i) * 14 + i * 10
        c.beginPath()
        c.ellipse(x, y, 4, 2, t * 2 + i, 0, 7)
        c.fill()
      }
    }
  }
  c.restore()
}

export function windowRect(room: RoomId) {
  const f = ROOMS[room].fixtures[0]
  if (!f) return null
  return { x: f.x * CELL, y: f.y * CELL, w: f.w * CELL, h: f.h * CELL }
}

export function drawStaticRoom(c: C, room: RoomId, s: GameState, season: string) {
  const rs = s.rooms[room]
  const wall = ITEMS[rs.wallpaper]?.art ?? ['plain', '#f2e6cf']
  const floor = ITEMS[rs.floor]?.art ?? ['planks', '#c89a62', '#b58650']
  const outdoor = room === 'garden'
  c.clearRect(0, 0, SCENE.w, SCENE.h)

  if (!outdoor) {
    drawPattern(c, wall, 0, 0, SCENE.w, WALL_H)
    const sh = c.createLinearGradient(0, 0, 0, WALL_H)
    sh.addColorStop(0, 'rgba(0,0,0,0.1)')
    sh.addColorStop(0.35, 'rgba(0,0,0,0)')
    sh.addColorStop(1, 'rgba(0,0,0,0.08)')
    c.fillStyle = sh
    c.fillRect(0, 0, SCENE.w, WALL_H)
  }

  const fw = windowRect(room)
  if (!outdoor) {
    if (fw) {
      c.save()
      c.globalCompositeOperation = 'destination-out'
      c.fillStyle = '#000'
      c.fillRect(fw.x + 9, fw.y + 9, fw.w - 18, fw.h - 18)
      c.restore()
    }
    roomFixtures(c, room, s)
    if (fw) drawWindowFrame(c, fw, room)
  } else {
    c.save()
    c.globalCompositeOperation = 'destination-out'
    c.fillStyle = '#000'
    c.fillRect(0, 0, SCENE.w, WALL_H - 10)
    c.restore()
  }

  // baseboard
  if (!outdoor) {
    c.fillStyle = shade(wall[1], -0.28)
    c.fillRect(0, WALL_H - 12, SCENE.w, 12)
    c.fillStyle = 'rgba(255,255,255,0.25)'
    c.fillRect(0, WALL_H - 12, SCENE.w, 2)
  }

  // zemin
  drawPattern(c, floor, 0, WALL_H, SCENE.w, SCENE.h - WALL_H)
  const fg = c.createLinearGradient(0, WALL_H, 0, SCENE.h)
  fg.addColorStop(0, 'rgba(0,0,0,0.18)')
  fg.addColorStop(0.3, 'rgba(0,0,0,0)')
  fg.addColorStop(1, 'rgba(0,0,0,0.12)')
  c.fillStyle = fg
  c.fillRect(0, WALL_H, SCENE.w, SCENE.h - WALL_H)
  if (outdoor) {
    c.fillStyle = season === 'winter' ? '#f4f8fa' : season === 'autumn' ? '#b9763a' : '#5da24c'
    c.fillRect(0, WALL_H - 14, SCENE.w, 14)
    c.fillStyle = '#c9a068'
    for (let x = 6; x < SCENE.w; x += 52) {
      c.beginPath()
      c.roundRect(x, WALL_H - 56, 30, 56, [8, 8, 0, 0])
      c.fill()
      c.lineWidth = 2.4
      c.strokeStyle = INK
      c.stroke()
    }
    c.fillStyle = '#c9a068'
    c.fillRect(0, WALL_H - 38, SCENE.w, 8)
    c.fillRect(0, WALL_H - 18, SCENE.w, 8)
  }
}

function drawWindowFrame(c: C, w: { x: number; y: number; w: number; h: number }, room: RoomId) {
  const frame = '#f2ead6'
  c.lineWidth = 3
  c.strokeStyle = INK
  c.fillStyle = frame
  c.beginPath()
  c.rect(w.x, w.y, w.w, 9)
  c.rect(w.x, w.y + w.h - 9, w.w, 9)
  c.rect(w.x, w.y, 9, w.h)
  c.rect(w.x + w.w - 9, w.y, 9, w.h)
  c.fill()
  c.stroke()
  c.fillStyle = frame
  c.beginPath()
  c.rect(w.x + w.w / 2 - 4, w.y, 8, w.h)
  c.rect(w.x, w.y + w.h / 2 - 4, w.w, 8)
  c.fill()
  c.stroke()
  c.fillStyle = '#e0d6bf'
  c.beginPath()
  c.roundRect(w.x - 8, w.y + w.h, w.w + 16, 10, 3)
  c.fill()
  c.stroke()
  const curtain = room === 'bedroom' ? '#7aa0c9' : room === 'playroom' ? '#f2b630' : room === 'kitchen' ? '#e8746a' : '#c9857a'
  for (const sgn of [0, 1]) {
    c.beginPath()
    const x0 = sgn ? w.x + w.w - 22 : w.x - 4
    c.moveTo(x0, w.y - 6)
    c.lineTo(x0 + 26, w.y - 6)
    c.quadraticCurveTo(x0 + (sgn ? 18 : 28), w.y + w.h * 0.5, x0 + (sgn ? 24 : 22), w.y + w.h - 4)
    c.lineTo(x0 + (sgn ? -2 : 2), w.y + w.h - 4)
    c.quadraticCurveTo(x0 + (sgn ? 6 : 8), w.y + w.h * 0.5, x0, w.y - 6)
    c.fillStyle = curtain
    c.fill()
    c.lineWidth = 2.4
    c.stroke()
  }
  c.beginPath()
  c.rect(w.x - 10, w.y - 12, w.w + 20, 7)
  c.fillStyle = '#6a4a30'
  c.fill()
  c.stroke()
}

function roomFixtures(c: C, room: RoomId, s: GameState) {
  switch (room) {
    case 'kitchen': {
      // alt dolaplar ve tezgah
      c.fillStyle = '#e8d3a8'
      c.fillRect(0, 232, SCENE.w, 80)
      c.strokeStyle = INK
      c.lineWidth = 2.4
      for (let x = 0; x < SCENE.w; x += 90) {
        c.beginPath()
        c.roundRect(x + 4, 242, 82, 64, 4)
        c.fillStyle = '#f2e3c0'
        c.fill()
        c.stroke()
        c.fillStyle = '#c9a444'
        c.fillRect(x + 36, 252, 18, 4)
      }
      c.fillStyle = '#8a7a6a'
      c.fillRect(0, 222, SCENE.w, 14)
      c.strokeRect(0, 222, SCENE.w, 14)
      // üst dolaplar
      for (let x = 320; x < SCENE.w; x += 100) {
        c.beginPath()
        c.roundRect(x, 40, 92, 100, 4)
        c.fillStyle = '#efdcb4'
        c.fill()
        c.stroke()
        c.fillStyle = '#c9a444'
        c.fillRect(x + 40, 124, 12, 4)
      }
      // ocak ve tencere
      c.fillStyle = '#4a5558'
      c.fillRect(350, 206, 80, 18)
      c.strokeRect(350, 206, 80, 18)
      c.fillStyle = '#9aa5ad'
      c.beginPath()
      c.roundRect(360, 180, 60, 28, 4)
      c.fill()
      c.stroke()
      break
    }
    case 'bathroom': {
      c.fillStyle = 'rgba(255,255,255,0.65)'
      c.fillRect(0, 150, SCENE.w, WALL_H - 150 - 12)
      c.strokeStyle = 'rgba(120,160,170,0.5)'
      c.lineWidth = 1.5
      for (let x = 0; x < SCENE.w; x += 36) {
        c.beginPath()
        c.moveTo(x, 150)
        c.lineTo(x, WALL_H - 12)
        c.stroke()
      }
      for (let y = 150; y < WALL_H; y += 36) {
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(SCENE.w, y)
        c.stroke()
      }
      c.lineWidth = 2.4
      c.strokeStyle = INK
      c.fillStyle = '#fbfaf2'
      c.beginPath()
      c.roundRect(14, 236, 230, 74, [10, 10, 24, 24])
      c.fill()
      c.stroke()
      c.fillStyle = '#d9f0f8'
      c.beginPath()
      c.roundRect(28, 244, 202, 24, 8)
      c.fill()
      c.fillStyle = '#c9cfd2'
      c.fillRect(250, 210, 10, 40)
      c.fillRect(246, 200, 24, 12)
      c.fillStyle = '#9aa5ad'
      c.fillRect(358, 0, 10, 56)
      c.beginPath()
      c.ellipse(363, 62, 30, 9, 0, 0, 7)
      c.fill()
      c.stroke()
      break
    }
    case 'bedroom': {
      c.fillStyle = 'rgba(255,255,255,0.35)'
      for (let i = 0; i < 6; i++) {
        c.beginPath()
        c.moveTo(24 + i * 60, 30)
        c.lineTo(54 + i * 60, 30)
        c.lineTo(39 + i * 60, 66)
        c.closePath()
        c.fillStyle = ['#f2b630', '#e0529a', '#3f8fd0', '#4f9d4b', '#e0793a', '#7a4aa0'][i]
        c.fill()
        c.stroke()
      }
      break
    }
    case 'playroom': {
      c.fillStyle = '#fbfaf2'
      c.font = 'bold 40px sans-serif'
      const cols = ['#e0529a', '#f2b630', '#3f8fd0', '#4f9d4b']
      'NOVA'.split('').forEach((ch, i) => {
        c.fillStyle = cols[i]
        c.fillText(ch, 330 + i * 36, 120)
      })
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, 22)
      for (let i = 0; i <= 12; i++) c.quadraticCurveTo(i * 60 - 30, 50, i * 60, 22)
      c.strokeStyle = INK
      c.stroke()
      for (let i = 0; i < 12; i++) {
        c.beginPath()
        c.arc(i * 60 - 30, 44, 6, 0, 7)
        c.fillStyle = cols[i % 4]
        c.fill()
      }
      break
    }
    case 'study': {
      c.fillStyle = '#2f4a45'
      c.beginPath()
      c.roundRect(40, 50, 250, 140, 4)
      c.fill()
      c.lineWidth = 6
      c.strokeStyle = '#a8743f'
      c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.8)'
      c.lineWidth = 2.4
      c.beginPath()
      c.moveTo(70, 100)
      c.lineTo(130, 100)
      c.moveTo(70, 130)
      c.lineTo(180, 130)
      c.arc(230, 120, 22, 0, 7)
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.8)'
      c.font = '16px sans-serif'
      c.fillText('E = mc²', 72, 168)
      break
    }
    case 'vault': {
      c.fillStyle = 'rgba(255,230,160,0.07)'
      c.fillRect(0, 0, SCENE.w, WALL_H)
      const list = s.collection.filter((id) => ITEMS[id]?.cat === 'collectible' || ITEMS[id]?.rarity === 'epic').slice(0, 12)
      for (let r = 0; r < 3; r++) {
        const y = 100 + r * 70
        c.fillStyle = '#8a6a3a'
        c.fillRect(70, y + 30, SCENE.w - 140, 10)
        c.strokeStyle = INK
        c.lineWidth = 2.4
        c.strokeRect(70, y + 30, SCENE.w - 140, 10)
        for (let i = 0; i < 4; i++) {
          const id = list[r * 4 + i]
          const x = 150 + i * 140
          c.fillStyle = 'rgba(255,255,255,0.1)'
          c.beginPath()
          c.roundRect(x - 34, y - 16, 68, 48, 6)
          c.fill()
          if (id) {
            c.save()
            c.translate(x, y + 8)
            drawArt(c, ITEMS[id].art, 44)
            c.restore()
          } else {
            c.fillStyle = 'rgba(255,255,255,0.25)'
            c.font = 'bold 22px sans-serif'
            c.textAlign = 'center'
            c.fillText('?', x, y + 16)
            c.textAlign = 'start'
          }
        }
      }
      break
    }
    default:
      break
  }
}

export interface LightSource {
  x: number
  y: number
  r: number
  color: string
  a: number
}

export function drawLighting(c: C, clock: Clock, outdoor: boolean, extraDark: number, lights: LightSource[], weather: Weather) {
  const d = clock.daylight
  let a = (1 - d) * (outdoor ? 0.5 : 0.42)
  if (weather === 'rainy') a += 0.06
  a += extraDark
  if (a > 0.01) {
    c.fillStyle = `rgba(14,22,58,${Math.min(0.85, a)})`
    c.fillRect(0, 0, SCENE.w, SCENE.h)
  }
  if (d > 0.35 && d < 0.85 && clock.hour >= 16) {
    c.fillStyle = `rgba(255,150,70,${0.12 * (1 - Math.abs(d - 0.6) * 3)})`
    c.fillRect(0, 0, SCENE.w, SCENE.h)
  }
  if (lights.length) {
    c.save()
    c.globalCompositeOperation = 'screen'
    for (const l of lights) {
      const g = c.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r)
      g.addColorStop(0, l.color.replace('A', String(l.a)))
      g.addColorStop(1, l.color.replace('A', '0'))
      c.fillStyle = g
      c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2)
    }
    c.restore()
  }
}
