import { INK, shade } from './itemArt'

type C = CanvasRenderingContext2D

const outline = (c: C, lw = 2.4) => {
  c.lineWidth = lw
  c.strokeStyle = INK
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.stroke()
}

function pendant(c: C, x: number, len: number, col: string) {
  c.beginPath()
  c.moveTo(x, 0)
  c.lineTo(x, len)
  outline(c, 2)
  c.beginPath()
  c.moveTo(x - 30, len + 30)
  c.quadraticCurveTo(x - 24, len + 4, x, len)
  c.quadraticCurveTo(x + 24, len + 4, x + 30, len + 30)
  c.closePath()
  c.fillStyle = col
  c.fill()
  outline(c)
  c.beginPath()
  c.ellipse(x, len + 30, 30, 6, 0, 0, 7)
  c.fillStyle = '#fff1b8'
  c.fill()
  outline(c, 2)
}

function sconce(c: C, x: number, y: number) {
  c.beginPath()
  c.roundRect(x - 7, y + 14, 14, 20, 3)
  c.fillStyle = '#8a6a4a'
  c.fill()
  outline(c, 2)
  c.beginPath()
  c.moveTo(x - 16, y + 16)
  c.lineTo(x + 16, y + 16)
  c.lineTo(x + 10, y - 8)
  c.lineTo(x - 10, y - 8)
  c.closePath()
  c.fillStyle = '#f6e6b8'
  c.fill()
  outline(c, 2)
}

export function roomExtras(c: C, room: string) {
  c.save()
  switch (room) {
    case 'living':
      pendant(c, 300, 56, '#e0a24a')
      sconce(c, 60, 110)
      sconce(c, 690, 110)
      break
    case 'kitchen': {
      c.beginPath()
      c.moveTo(24, 96)
      c.lineTo(104, 96)
      outline(c, 3)
      for (let i = 0; i < 4; i++) {
        const x = 34 + i * 20
        c.beginPath()
        c.moveTo(x, 96)
        c.lineTo(x, 112)
        outline(c, 2)
        c.beginPath()
        if (i % 2) c.ellipse(x, 126, 6, 12, 0, 0, 7)
        else c.roundRect(x - 5, 112, 10, 30, 4)
        c.fillStyle = i % 2 ? '#c9cfd2' : '#e0793a'
        c.fill()
        outline(c, 2)
      }
      c.beginPath()
      c.ellipse(170, 216, 36, 8, 0, 0, 7)
      c.fillStyle = '#c9573b'
      c.fill()
      outline(c)
      for (const [x, col] of [[154, '#d9433b'], [172, '#f08a24'], [188, '#7fb83f']] as [number, string][]) {
        c.beginPath()
        c.arc(x, 208, 9, 0, 7)
        c.fillStyle = col
        c.fill()
        outline(c, 2)
      }
      c.beginPath()
      c.ellipse(170, 216, 36, 8, 0, 0, Math.PI)
      c.fillStyle = '#c9573b'
      c.fill()
      outline(c)
      c.beginPath()
      c.roundRect(250, 190, 26, 32, 5)
      c.fillStyle = '#cfe8da'
      c.fill()
      outline(c, 2)
      break
    }
    case 'bathroom': {
      c.beginPath()
      c.moveTo(290, 140)
      c.lineTo(350, 140)
      outline(c, 3)
      for (const [x, col] of [[298, '#e8746a'], [330, '#6db3d9']] as [number, string][]) {
        c.beginPath()
        c.roundRect(x - 12, 140, 26, 56, [2, 2, 8, 8])
        c.fillStyle = col
        c.fill()
        outline(c, 2)
      }
      c.beginPath()
      c.roundRect(180, 224, 34, 24, 8)
      c.fillStyle = '#f2cf4a'
      c.fill()
      outline(c, 2)
      c.beginPath()
      c.arc(190, 222, 11, 0, 7)
      c.fillStyle = '#f2cf4a'
      c.fill()
      outline(c, 2)
      c.beginPath()
      c.arc(187, 220, 1.8, 0, 7)
      c.fillStyle = INK
      c.fill()
      break
    }
    case 'bedroom': {
      const g = c.createRadialGradient(150, 110, 4, 150, 110, 70)
      g.addColorStop(0, 'rgba(255,240,170,0.55)')
      g.addColorStop(1, 'rgba(255,240,170,0)')
      c.fillStyle = g
      c.fillRect(70, 30, 160, 160)
      c.beginPath()
      c.arc(150, 110, 24, 0, 7)
      c.fillStyle = '#f6e6a8'
      c.fill()
      outline(c)
      c.beginPath()
      c.arc(160, 104, 20, 0, 7)
      c.fillStyle = 'rgba(0,0,0,0)'
      for (const [x, y, r] of [[80, 150, 4], [220, 90, 3], [110, 60, 3], [250, 150, 4]]) {
        c.beginPath()
        c.arc(x, y, r, 0, 7)
        c.fillStyle = '#f6e27a'
        c.fill()
      }
      break
    }
    case 'playroom': {
      const cols = ['#e0364a', '#f08a24', '#f2cf4a', '#4f9d4b', '#3f8fd0']
      for (let i = 0; i < cols.length; i++) {
        c.beginPath()
        c.arc(560, 215, 92 - i * 12, Math.PI, 0)
        c.lineWidth = 12
        c.strokeStyle = cols[i]
        c.stroke()
      }
      for (const dx of [-96, 96]) {
        c.beginPath()
        c.ellipse(560 + dx, 214, 26, 12, 0, 0, 7)
        c.ellipse(560 + dx + 14, 208, 20, 10, 0, 0, 7)
        c.fillStyle = '#fff'
        c.fill()
      }
      c.beginPath()
      c.roundRect(430, 250, 260, 10, 3)
      c.fillStyle = '#a8743f'
      c.fill()
      outline(c, 2)
      for (const [x, col] of [[450, '#e0529a'], [480, '#3f8fd0'], [512, '#f2cf4a']] as [number, string][]) {
        c.beginPath()
        c.roundRect(x, 226, 24, 24, 3)
        c.fillStyle = col
        c.fill()
        outline(c, 2)
      }
      c.beginPath()
      c.arc(640, 238, 12, 0, 7)
      c.fillStyle = '#e0364a'
      c.fill()
      outline(c, 2)
      break
    }
    case 'study': {
      c.beginPath()
      c.roundRect(306, 70, 108, 90, 4)
      c.fillStyle = '#f0deb0'
      c.fill()
      outline(c)
      c.fillStyle = '#9cc47f'
      c.beginPath()
      c.ellipse(340, 108, 22, 14, 0.3, 0, 7)
      c.ellipse(382, 126, 18, 12, -0.4, 0, 7)
      c.ellipse(352, 138, 12, 8, 0, 0, 7)
      c.fill()
      c.strokeStyle = '#d9433b'
      c.setLineDash([4, 4])
      c.beginPath()
      c.moveTo(326, 86)
      c.quadraticCurveTo(360, 100, 394, 82)
      c.stroke()
      c.setLineDash([])
      sconce(c, 40, 30)
      break
    }
    case 'vault': {
      for (const x of [26, 694]) {
        c.beginPath()
        c.roundRect(x - 18, 20, 36, 290, 4)
        c.fillStyle = '#c9a444'
        c.fill()
        outline(c)
        c.fillStyle = 'rgba(255,255,255,0.2)'
        c.fillRect(x - 12, 24, 6, 280)
      }
      for (const x of [220, 360, 500]) {
        const g = c.createLinearGradient(x, 0, x, 300)
        g.addColorStop(0, 'rgba(255,236,170,0.28)')
        g.addColorStop(1, 'rgba(255,236,170,0)')
        c.fillStyle = g
        c.beginPath()
        c.moveTo(x - 10, 0)
        c.lineTo(x + 10, 0)
        c.lineTo(x + 110, 320)
        c.lineTo(x - 110, 320)
        c.closePath()
        c.fill()
      }
      break
    }
    default:
      break
  }
  c.restore()
}

export function afterFloor(c: C, room: string, w: number, wallH: number) {
  c.save()
  switch (room) {
    case 'bathroom':
      c.beginPath()
      c.ellipse(w / 2, 450, 120, 26, 0, 0, 7)
      c.fillStyle = 'rgba(111,179,217,0.55)'
      c.fill()
      outline(c, 2)
      c.beginPath()
      c.ellipse(w / 2, 450, 84, 16, 0, 0, 7)
      c.strokeStyle = 'rgba(255,255,255,0.55)'
      c.lineWidth = 3
      c.stroke()
      break
    case 'vault': {
      c.beginPath()
      c.moveTo(250, wallH + 6)
      c.lineTo(470, wallH + 6)
      c.lineTo(560, 540)
      c.lineTo(160, 540)
      c.closePath()
      c.fillStyle = '#9a2c3a'
      c.fill()
      c.lineWidth = 6
      c.strokeStyle = '#c9a444'
      c.stroke()
      break
    }
    case 'garden': {
      c.fillStyle = '#d9c9a0'
      const pts: [number, number, number][] = [[120, 360, 30], [210, 392, 34], [320, 420, 38], [450, 450, 42], [590, 486, 46]]
      for (const [x, y, r] of pts) {
        c.beginPath()
        c.ellipse(x, y, r, r * 0.38, 0, 0, 7)
        c.fill()
        outline(c, 2)
      }
      for (let i = 0; i < 26; i++) {
        const x = ((i * 137) % 700) + 10
        const y = wallH + 20 + ((i * 71) % 190)
        c.beginPath()
        c.arc(x, y, 3.2, 0, 7)
        c.fillStyle = ['#f6e27a', '#fbfaf2', '#f4a3b6', '#8fd3b8'][i % 4]
        c.fill()
      }
      break
    }
    default:
      break
  }
  c.restore()
}

export function drawWindmill(c: C, x: number, y: number, t: number, daylight: number) {
  c.save()
  const dim = 1 - (1 - daylight) * 0.5
  c.translate(x, y)
  c.beginPath()
  c.moveTo(-18, 0)
  c.lineTo(-10, -70)
  c.lineTo(10, -70)
  c.lineTo(18, 0)
  c.closePath()
  c.fillStyle = shade('#e8d3a8', -(1 - dim))
  c.fill()
  outline(c)
  c.beginPath()
  c.moveTo(-12, -70)
  c.lineTo(0, -92)
  c.lineTo(12, -70)
  c.closePath()
  c.fillStyle = shade('#c9573b', -(1 - dim))
  c.fill()
  outline(c)
  c.translate(0, -72)
  c.rotate(t * 0.6)
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2)
    c.beginPath()
    c.rect(-3, -54, 6, 54)
    c.fillStyle = '#6a4a30'
    c.fill()
    c.beginPath()
    c.rect(3, -52, 18, 26)
    c.fillStyle = shade('#fbfaf2', -(1 - dim))
    c.fill()
    outline(c, 2)
  }
  c.restore()
}
