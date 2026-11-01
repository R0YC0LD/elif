import { ITEMS } from '../game/items'
import type { Mood } from '../game/logic'
import { STAGES } from '../game/progression'
import type { ArtSpec, Slot, Trait } from '../game/types'
import { INK, drawGarmentOnBody, drawWearable, hsl } from './itemArt'

type C = CanvasRenderingContext2D

export interface Pose {
  sx: number
  sy: number
  dx: number
  dy: number
  rot: number
  eyeOpen: number
  lookX: number
  lookY: number
  smile: number
  mouthOpen: number
  brow: number
  blush: number
  tear: number
  sick: number
  armL: number
  armR: number
  sway: number
  eyeScale: number
  heartEyes: number
  sweat: number
  covered: number
}

const KEYS = ['sx', 'sy', 'dx', 'dy', 'rot', 'eyeOpen', 'lookX', 'lookY', 'smile', 'mouthOpen', 'brow', 'blush', 'tear', 'sick', 'armL', 'armR', 'sway', 'eyeScale', 'heartEyes', 'sweat', 'covered'] as const

export function newPose(): Pose {
  return { sx: 1, sy: 1, dx: 0, dy: 0, rot: 0, eyeOpen: 1, lookX: 0, lookY: 0, smile: 0.3, mouthOpen: 0, brow: 0, blush: 0.25, tear: 0, sick: 0, armL: 0, armR: 0, sway: 0, eyeScale: 1, heartEyes: 0, sweat: 0, covered: 0 }
}

function copyPose(to: Pose, from: Pose) {
  for (const k of KEYS) to[k] = from[k]
}

function mixPose(out: Pose, a: Pose, b: Pose, w: number) {
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * w
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
const easeBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = clamp01(t)
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

interface AnimDef {
  pri: number
  loop?: boolean
  dur: number
  fn: (t: number, p: Pose) => void
}

function squashJump(t: number, p: Pose, period: number, height: number) {
  const ph = (t % period) / period
  if (ph < 0.18) {
    const k = ph / 0.18
    p.sy *= 1 - 0.18 * k
    p.sx *= 1 + 0.14 * k
  } else if (ph < 0.78) {
    const k = (ph - 0.18) / 0.6
    p.dy -= Math.sin(k * Math.PI) * height
    p.sy *= 1 + 0.12 * Math.sin(k * Math.PI)
    p.sx *= 1 - 0.07 * Math.sin(k * Math.PI)
  } else {
    const k = (ph - 0.78) / 0.22
    const s = Math.sin(k * Math.PI)
    p.sy *= 1 - 0.14 * s
    p.sx *= 1 + 0.1 * s
  }
}

export const ANIMS: Record<string, AnimDef> = {
  blink: { pri: 0, dur: 0.16, fn: (t, p) => (p.eyeOpen *= 1 - Math.sin(clamp01(t / 0.16) * Math.PI)) },
  lookAround: {
    pri: 1,
    dur: 2.6,
    fn: (t, p) => {
      p.lookX = Math.sin(t * 2.4) * 0.8
      p.lookY = Math.sin(t * 1.2) * 0.2
      p.rot += Math.sin(t * 2.4) * 0.04
    },
  },
  yawn: {
    pri: 1,
    dur: 2.2,
    fn: (t, p) => {
      const k = Math.sin(clamp01(t / 2.2) * Math.PI)
      p.mouthOpen = k
      p.eyeOpen *= 1 - 0.85 * k
      p.sy *= 1 + 0.05 * k
      p.dy -= 3 * k
      p.smile = -0.1
    },
  },
  stretch: {
    pri: 1,
    dur: 1.6,
    fn: (t, p) => {
      const k = Math.sin(clamp01(t / 1.6) * Math.PI)
      p.sy *= 1 + 0.18 * k
      p.sx *= 1 - 0.1 * k
      p.armL = -2.4 * k
      p.armR = 2.4 * k
      p.eyeOpen *= 1 - 0.6 * k
    },
  },
  wave: {
    pri: 1,
    dur: 1.8,
    fn: (t, p) => {
      p.armR = 2.2 + Math.sin(t * 14) * 0.5
      p.smile = 0.8
      p.rot += Math.sin(t * 5) * 0.03
    },
  },
  sniff: {
    pri: 1,
    dur: 1.6,
    fn: (t, p) => {
      p.lookY = 0.5
      p.dy += Math.sin(t * 16) * 1.2
      p.rot = -0.05
      p.mouthOpen = 0.12
    },
  },
  shy: {
    pri: 2,
    dur: 2.2,
    fn: (t, p) => {
      const k = easeOut(t / 0.3) * (1 - clamp01((t - 1.8) / 0.4))
      p.armL = 1.9 * k
      p.armR = -1.9 * k
      p.covered = k
      p.blush = 0.9
      p.lookX = -0.6
      p.rot += -0.06 * k
      p.sx *= 1 - 0.04 * k
    },
  },
  loveEyes: {
    pri: 2,
    dur: 2.4,
    fn: (t, p) => {
      p.heartEyes = easeOut(t / 0.25) * (1 - clamp01((t - 2) / 0.4))
      p.smile = 0.9
      p.blush = 0.9
      p.dy -= Math.abs(Math.sin(t * 5)) * 3
    },
  },
  happy: {
    pri: 3,
    dur: 1.8,
    fn: (t, p) => {
      p.smile = 0.9
      p.mouthOpen = 0.25
      p.eyeOpen *= 0.92
      p.blush = 0.6
      squashJump(t, p, 0.7, 10)
    },
  },
  veryHappy: {
    pri: 4,
    dur: 2.6,
    fn: (t, p) => {
      p.smile = 1
      p.mouthOpen = 0.55
      p.blush = 0.85
      p.eyeScale = 1.1
      squashJump(t, p, 0.55, 22)
      p.armL = -1.8 - Math.sin(t * 12) * 0.3
      p.armR = 1.8 + Math.sin(t * 12) * 0.3
    },
  },
  sad: {
    pri: 3,
    dur: 3,
    fn: (t, p) => {
      p.smile = -0.8
      p.brow = -0.7
      p.sy *= 0.94
      p.eyeScale = 1.08
      p.lookY = 0.5
      p.dy += 2
      p.rot += Math.sin(t * 1.5) * 0.015
    },
  },
  angry: {
    pri: 3,
    dur: 2.2,
    fn: (t, p) => {
      p.smile = -0.7
      p.brow = 1
      p.blush = 0.1
      p.dx += Math.sin(t * 40) * 1.4
      p.sx *= 1.04
      p.sy *= 0.97
      p.mouthOpen = 0.18
    },
  },
  surprised: {
    pri: 4,
    dur: 1.4,
    fn: (t, p) => {
      const k = easeBack(t / 0.18)
      p.eyeScale = 1 + 0.25 * k
      p.mouthOpen = 0.7 * k
      p.smile = 0
      p.sy *= 1 + 0.1 * k
      p.dy -= 12 * Math.sin(clamp01(t / 0.35) * Math.PI)
      p.brow = 0.1
    },
  },
  sleepy: {
    pri: 3,
    dur: 3,
    fn: (t, p) => {
      p.eyeOpen *= 0.35 + 0.15 * Math.sin(t * 2)
      p.smile = -0.1
      p.rot += Math.sin(t * 1.4) * 0.05
      p.sy *= 0.97
    },
  },
  sleeping: {
    pri: 9,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.eyeOpen = 0
      p.smile = 0.2
      p.mouthOpen = 0.1 + 0.08 * Math.sin(t * 2)
      p.sy *= 1 + 0.025 * Math.sin(t * 1.6)
      p.sx *= 1 - 0.015 * Math.sin(t * 1.6)
      p.rot += 0.04
      p.dy += 3
      p.blush = 0.4
    },
  },
  eating: {
    pri: 5,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.mouthOpen = 0.3 + 0.55 * Math.max(0, Math.sin(t * 3))
      p.smile = 0.5
      p.lookY = -0.3
      p.sy *= 1 + 0.03 * Math.sin(t * 6)
    },
  },
  chewing: {
    pri: 5,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      const k = Math.abs(Math.sin(t * 7))
      p.mouthOpen = 0.08 + 0.22 * k
      p.smile = 0.6
      p.sy *= 1 - 0.05 * k
      p.sx *= 1 + 0.04 * k
      p.blush = 0.55
      p.eyeOpen *= 0.88
    },
  },
  drinking: {
    pri: 5,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.rot -= 0.12
      p.mouthOpen = 0.2 + 0.2 * Math.sin(t * 4)
      p.lookY = -0.5
      p.smile = 0.3
      p.sy *= 1 + 0.02 * Math.sin(t * 4)
    },
  },
  bathing: {
    pri: 5,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.eyeOpen *= 0.55
      p.smile = 0.7
      p.rot += Math.sin(t * 6) * 0.04
      p.dx += Math.sin(t * 3) * 3
      p.blush = 0.6
    },
  },
  sick: {
    pri: 9,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.sick = 1
      p.smile = -0.7
      p.brow = -0.5
      p.eyeOpen *= 0.6
      p.sy *= 0.95
      p.rot += Math.sin(t * 2) * 0.04
      p.sweat = 1
      p.blush = 0.05
    },
  },
  recovering: {
    pri: 7,
    dur: 2.2,
    fn: (t, p) => {
      const k = clamp01(t / 2.2)
      p.sick = 1 - k
      p.smile = -0.3 + 1.0 * k
      p.dy -= Math.abs(Math.sin(k * Math.PI * 2)) * 8 * k
      p.blush = 0.2 + 0.5 * k
      p.armL = -1 * k
      p.armR = 1 * k
    },
  },
  jumping: {
    pri: 4,
    dur: 1.4,
    fn: (t, p) => {
      p.smile = 0.8
      p.mouthOpen = 0.3
      squashJump(t, p, 0.7, 34)
      p.armL = -1.4
      p.armR = 1.4
    },
  },
  dancing: {
    pri: 4,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.smile = 0.9
      p.mouthOpen = 0.3
      p.rot += Math.sin(t * 6) * 0.14
      p.dx += Math.sin(t * 3) * 14
      p.dy -= Math.abs(Math.sin(t * 6)) * 8
      p.sy *= 1 + 0.06 * Math.sin(t * 12)
      p.sx *= 1 - 0.04 * Math.sin(t * 12)
      p.armL = Math.sin(t * 6) * 1.6 - 1
      p.armR = -Math.sin(t * 6) * 1.6 + 1
      p.blush = 0.7
    },
  },
  laughing: {
    pri: 4,
    dur: 2.4,
    fn: (t, p) => {
      p.smile = 1
      p.mouthOpen = 0.6 + 0.2 * Math.sin(t * 20)
      p.eyeOpen *= 0.25
      p.dy -= Math.abs(Math.sin(t * 10)) * 5
      p.sy *= 1 + 0.04 * Math.sin(t * 20)
      p.rot += Math.sin(t * 8) * 0.05
      p.tear = 0.4
    },
  },
  crying: {
    pri: 4,
    dur: 3,
    fn: (t, p) => {
      p.smile = -1
      p.mouthOpen = 0.5
      p.brow = -1
      p.tear = 1
      p.eyeOpen *= 0.55
      p.sy *= 0.95 + 0.02 * Math.sin(t * 14)
      p.dx += Math.sin(t * 18) * 1
    },
  },
  excited: {
    pri: 4,
    dur: 2,
    fn: (t, p) => {
      p.smile = 1
      p.mouthOpen = 0.5
      p.eyeScale = 1.12
      p.dx += Math.sin(t * 30) * 2
      squashJump(t, p, 0.4, 14)
      p.armL = -1.5
      p.armR = 1.5
    },
  },
  petReact: {
    pri: 5,
    dur: 0.9,
    fn: (t, p) => {
      const k = Math.sin(clamp01(t / 0.9) * Math.PI)
      p.smile = 0.9
      p.eyeOpen *= 1 - 0.7 * k
      p.blush = 0.9
      p.sy *= 1 - 0.07 * k
      p.sx *= 1 + 0.05 * k
      p.rot += Math.sin(t * 9) * 0.03
    },
  },
  dragReact: {
    pri: 6,
    loop: true,
    dur: 1,
    fn: (t, p) => {
      p.eyeScale = 1.12
      p.mouthOpen = 0.45
      p.smile = 0.1
      p.sy *= 1.12
      p.sx *= 0.92
      p.armL = -2
      p.armR = 2
      p.rot += Math.sin(t * 10) * 0.05
    },
  },
  levelUp: {
    pri: 8,
    dur: 2.6,
    fn: (t, p) => {
      const k = clamp01(t / 2.6)
      p.smile = 1
      p.mouthOpen = 0.45
      p.blush = 0.9
      p.eyeScale = 1.12
      p.rot += k * Math.PI * 2 * 0.0
      squashJump(t, p, 0.9, 40 * (1 - k * 0.4))
      p.armL = -2
      p.armR = 2
      p.sx *= 1 + 0.08 * Math.sin(k * Math.PI)
    },
  },
  victory: {
    pri: 6,
    dur: 2.4,
    fn: (t, p) => {
      p.smile = 1
      p.mouthOpen = 0.55
      p.armL = -2.5
      p.armR = 2.5
      squashJump(t, p, 0.6, 26)
      p.blush = 0.8
    },
  },
  defeat: {
    pri: 6,
    dur: 2.4,
    fn: (t, p) => {
      const k = easeOut(t / 0.4) * (1 - clamp01((t - 2) / 0.4))
      p.smile = -0.9
      p.brow = -0.8
      p.sy *= 1 - 0.1 * k
      p.sx *= 1 + 0.05 * k
      p.lookY = 0.6
      p.dy += 4 * k
      p.armL = 0.5 * k
      p.armR = -0.5 * k
    },
  },
  sneeze: {
    pri: 7,
    dur: 1.3,
    fn: (t, p) => {
      if (t < 0.6) {
        const k = easeOut(t / 0.6)
        p.sy *= 1 + 0.12 * k
        p.eyeOpen *= 1 - k
        p.mouthOpen = 0.4 * k
      } else {
        const k = clamp01((t - 0.6) / 0.15)
        p.sy *= 1 - 0.14 * (1 - k)
        p.sx *= 1 + 0.1 * (1 - k)
        p.dx -= 10 * (1 - k)
        p.mouthOpen = 0.9 * (1 - k * 0.5)
        p.eyeOpen = 0
      }
    },
  },
  wake: {
    pri: 7,
    dur: 2.2,
    fn: (t, p) => {
      const k = clamp01(t / 1.6)
      p.eyeOpen *= 0.2 + 0.8 * k
      p.armL = -2 * Math.sin(k * Math.PI)
      p.armR = 2 * Math.sin(k * Math.PI)
      p.sy *= 1 + 0.15 * Math.sin(k * Math.PI)
      p.mouthOpen = 0.6 * Math.sin(k * Math.PI)
    },
  },
}

export const ANIM_NAMES = Object.keys(ANIMS)

export interface Personality {
  energetic: number
  calm: number
  curious: number
  playful: number
  affectionate: number
  shy: number
}

interface Active {
  name: string
  t: number
  released: boolean
  relT: number
  loop: boolean
  dur: number
}

export class Animator {
  pose: Pose = newPose()
  private base = newPose()
  private tmp = newPose()
  private cur: Active | null = null
  private time = Math.random() * 10
  private blinkIn = 2 + Math.random() * 3
  private blinkT = -1
  private idleIn = 3
  private lookTx = 0
  private lookTy = 0
  private lookX = 0
  private lookY = 0
  private lookIn = 1
  mood: Mood = 'content'
  traits: Personality = { energetic: 40, calm: 40, curious: 40, playful: 40, affectionate: 40, shy: 25 }
  focusX: number | null = null
  focusY: number | null = null
  onIdleEvent: ((name: string) => void) | null = null

  get current(): string | null {
    return this.cur?.name ?? null
  }

  get busy(): boolean {
    return !!this.cur && ANIMS[this.cur.name].pri >= 3
  }

  play(name: string, opts: { loop?: boolean; dur?: number } = {}): boolean {
    const def = ANIMS[name]
    if (!def) return false
    if (this.cur) {
      const curDef = ANIMS[this.cur.name]
      const finished = !this.cur.loop && this.cur.t >= this.cur.dur
      if (!finished && !this.cur.released && curDef.pri > def.pri) return false
    }
    this.cur = { name, t: 0, released: false, relT: 0, loop: opts.loop ?? !!def.loop, dur: opts.dur ?? def.dur }
    return true
  }

  release(name?: string) {
    if (this.cur && (!name || this.cur.name === name) && this.cur.loop) {
      this.cur.released = true
      this.cur.relT = 0
    }
  }

  stopAll() {
    this.cur = null
  }

  update(dt: number) {
    this.time += dt
    const tr = this.traits
    const en = tr.energetic / 100
    const calm = tr.calm / 100
    const b = this.base
    const p = newPose()
    const breathSpeed = 1.6 + en * 0.9 - calm * 0.5
    const breath = Math.sin(this.time * breathSpeed)
    p.sy = 1 + 0.018 * breath
    p.sx = 1 - 0.01 * breath
    p.dy = -0.5 * breath
    p.sway = Math.sin(this.time * 2.1) * 0.5 + Math.sin(this.time * 3.3) * 0.25

    this.applyMood(p)

    this.lookIn -= dt
    if (this.focusX !== null && this.focusY !== null && tr.affectionate + tr.curious > 60) {
      this.lookTx = this.focusX
      this.lookTy = this.focusY
    } else if (this.lookIn <= 0) {
      this.lookIn = 1.5 + Math.random() * 3
      const ci = tr.curious / 100
      this.lookTx = (Math.random() * 2 - 1) * (0.3 + ci * 0.6)
      this.lookTy = (Math.random() * 2 - 1) * 0.3
    }
    this.lookX += (this.lookTx - this.lookX) * Math.min(1, dt * 8)
    this.lookY += (this.lookTy - this.lookY) * Math.min(1, dt * 8)
    p.lookX = this.lookX
    p.lookY = this.lookY

    this.blinkIn -= dt
    if (this.blinkIn <= 0 && this.blinkT < 0) {
      this.blinkT = 0
      this.blinkIn = 2 + Math.random() * 4
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt
      ANIMS.blink.fn(this.blinkT, p)
      if (this.blinkT > ANIMS.blink.dur) this.blinkT = -1
    }

    copyPose(b, p)

    if (this.cur) {
      const a = this.cur
      const def = ANIMS[a.name]
      a.t += dt
      if (a.released) a.relT += dt
      let w = clamp01(a.t / 0.16)
      if (a.loop) {
        if (a.released) w *= 1 - clamp01(a.relT / 0.24)
        if (a.released && a.relT >= 0.24) {
          this.cur = null
          copyPose(this.pose, b)
          this.idle(dt)
          return
        }
      } else {
        w *= clamp01((a.dur - a.t) / 0.24)
        if (a.t >= a.dur) {
          this.cur = null
          copyPose(this.pose, b)
          this.idle(dt)
          return
        }
      }
      copyPose(this.tmp, b)
      def.fn(a.t, this.tmp)
      mixPose(this.pose, b, this.tmp, w)
    } else {
      copyPose(this.pose, b)
      this.idle(dt)
    }
  }

  private applyMood(p: Pose) {
    switch (this.mood) {
      case 'happy':
        p.smile = 0.75
        p.blush = 0.45
        break
      case 'content':
        p.smile = 0.35
        break
      case 'sad':
        p.smile = -0.6
        p.brow = -0.5
        p.eyeScale = 1.06
        p.sy *= 0.97
        break
      case 'hungry':
        p.smile = -0.3
        p.brow = -0.3
        p.sy *= 0.98
        p.dx += Math.sin(this.time * 30) * 0.4
        break
      case 'thirsty':
        p.smile = -0.4
        p.mouthOpen = 0.1
        break
      case 'dirty':
        p.smile = -0.2
        p.brow = 0.3
        p.sweat = 0.4
        break
      case 'sleepy':
        p.eyeOpen = 0.45 + 0.1 * Math.sin(this.time * 0.9)
        p.smile = 0
        p.rot += Math.sin(this.time * 1.1) * 0.03
        break
      case 'sick':
        p.sick = 0.8
        p.smile = -0.5
        p.eyeOpen = 0.65
        p.sweat = 1
        p.sy *= 0.96
        break
      case 'sleeping':
        p.eyeOpen = 0
        p.smile = 0.2
        p.rot += 0.04
        break
    }
  }

  private idle(dt: number) {
    if (this.mood === 'sleeping' || this.mood === 'sick') return
    this.idleIn -= dt
    if (this.idleIn > 0 || this.cur) return
    const tr = this.traits
    const w: [string, number][] = [
      ['lookAround', 1 + tr.curious / 40],
      ['yawn', 0.6 + tr.calm / 60 + (this.mood === 'sleepy' ? 3 : 0)],
      ['stretch', 0.5 + tr.energetic / 80],
      ['wave', 0.4 + tr.affectionate / 60 + tr.playful / 120],
      ['sniff', 0.3 + tr.curious / 50],
      ['jumping', tr.playful / 50 + tr.energetic / 60],
      ['shy', tr.shy / 30],
      ['loveEyes', tr.affectionate / 80],
    ]
    if (this.mood === 'happy') w.push(['happy', 2])
    const total = w.reduce((a, [, n]) => a + n, 0)
    let r = Math.random() * total
    let pick = 'lookAround'
    for (const [n, v] of w) {
      r -= v
      if (r <= 0) {
        pick = n
        break
      }
    }
    if (this.play(pick)) this.onIdleEvent?.(pick)
    this.idleIn = 4 + Math.random() * 6 - tr.energetic / 40
  }
}

// ---------- Çizim ----------

export interface PetLook {
  hue: number
  eyeHue: number
  stage: number
  equipped: Record<Slot, string | null>
  time: number
}

function bodyPath(c: C) {
  c.beginPath()
  c.moveTo(0, -116)
  c.bezierCurveTo(42, -116, 59, -86, 59, -52)
  c.bezierCurveTo(59, -20, 42, -4, 0, -4)
  c.bezierCurveTo(-42, -4, -59, -20, -59, -52)
  c.bezierCurveTo(-59, -86, -42, -116, 0, -116)
  c.closePath()
}

function art(slot: Slot, look: PetLook): ArtSpec | null {
  const id = look.equipped[slot]
  return id ? (ITEMS[id]?.art ?? null) : null
}

const W = 56

export function stageScale(stage: number) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, stage))].scale
}

export function drawPet(c: C, look: PetLook, p: Pose, drawn: { n: number }) {
  const body = hsl(look.hue, 52, 72)
  const bodyDark = hsl(look.hue, 48, 58)
  const bodyLight = hsl(look.hue, 60, 84)
  const sc = stageScale(look.stage)
  const baby = look.stage === 0
  const eyeBase = baby ? 1.14 : 1

  c.save()
  c.translate(p.dx, p.dy)
  c.scale(sc * p.sx, sc * p.sy)
  c.rotate(p.rot)
  c.lineJoin = 'round'
  c.lineCap = 'round'

  const cape = art('body', look)
  if (cape && cape[0] === 'cape') {
    c.beginPath()
    c.moveTo(-40, -92)
    c.lineTo(40, -92)
    c.quadraticCurveTo(76 + p.sway * 4, -40, 66 + p.sway * 6, 6)
    c.quadraticCurveTo(0, -6 - p.sway * 3, -66 - p.sway * 6, 6)
    c.quadraticCurveTo(-76 - p.sway * 4, -40, -40, -92)
    c.closePath()
    c.fillStyle = cape[1]
    c.fill()
    c.lineWidth = 3
    c.strokeStyle = INK
    c.stroke()
    drawn.n++
  }

  // ayaklar
  for (const sgn of [-1, 1]) {
    c.save()
    c.translate(sgn * 26, -6)
    c.beginPath()
    c.ellipse(0, 0, 17, 10, 0, 0, Math.PI * 2)
    c.fillStyle = bodyDark
    c.fill()
    c.lineWidth = 3
    c.strokeStyle = INK
    c.stroke()
    const shoe = art('feet', look)
    if (shoe) {
      c.translate(0, -2)
      c.scale(W * 0.8 * sgn, W * 0.8)
      drawWearable(c, shoe)
    }
    c.restore()
  }

  // kollar
  const armPose = [p.armL, p.armR]
  for (let i = 0; i < 2; i++) {
    const sgn = i === 0 ? -1 : 1
    c.save()
    c.translate(sgn * 55, -48)
    c.rotate(armPose[i] * sgn * -0.5 + sgn * 0.35 + (p.covered ? -sgn * 1.2 * p.covered : 0))
    c.translate(0, p.covered ? -10 * p.covered : 0)
    c.beginPath()
    c.ellipse(sgn * 8, 8, 10, 16, sgn * -0.15, 0, Math.PI * 2)
    c.fillStyle = body
    c.fill()
    c.lineWidth = 3
    c.strokeStyle = INK
    c.stroke()
    c.restore()
  }

  // gövde
  bodyPath(c)
  const g = c.createLinearGradient(0, -116, 0, -4)
  g.addColorStop(0, bodyLight)
  g.addColorStop(0.45, body)
  g.addColorStop(1, bodyDark)
  c.fillStyle = g
  c.fill()

  c.save()
  bodyPath(c)
  c.clip()
  {
    const sh = c.createRadialGradient(-16, -88, 8, -4, -62, 84)
    sh.addColorStop(0, 'rgba(255,255,255,0.26)')
    sh.addColorStop(0.55, 'rgba(255,255,255,0)')
    sh.addColorStop(1, 'rgba(10,30,40,0.2)')
    c.fillStyle = sh
    c.fillRect(-70, -124, 140, 124)
  }
  if (look.stage >= 3) {
    c.beginPath()
    c.ellipse(0, -30, 34, 24, 0, 0, Math.PI * 2)
    c.fillStyle = hsl(look.hue, 60, 86, 0.55)
    c.fill()
  }
  const shirt = art('body', look)
  if (shirt && shirt[0] !== 'cape') {
    c.save()
    c.translate(0, -34)
    c.scale(W, W)
    drawGarmentOnBody(c, shirt)
    c.restore()
  }
  if (p.sick > 0.01) {
    c.fillStyle = `rgba(150,200,110,${0.3 * p.sick})`
    c.fillRect(-70, -120, 140, 120)
  }
  c.restore()
  bodyPath(c)
  c.lineWidth = 3.4
  c.strokeStyle = INK
  c.stroke()

  // parlama
  c.beginPath()
  c.ellipse(-30, -96, 12, 6, -0.7, 0, Math.PI * 2)
  c.fillStyle = 'rgba(255,255,255,0.4)'
  c.fill()

  // filiz
  const hat = art('head', look)
  if (!hat || hat[0] === 'headphones' || hat[0] === 'ribbon') {
    const len = 14 + look.stage * 4
    const leaf = hsl(112, 42, 52)
    const leafDark = hsl(124, 42, 38)
    const n = look.stage >= 2 ? 3 : 2
    for (let i = 0; i < n; i++) {
      const dir = n === 2 ? (i ? 1 : -1) : i - 1
      c.save()
      c.translate(0, -114)
      c.rotate(dir * 0.45 + p.sway * 0.05 + p.rot * 0.5)
      c.beginPath()
      c.moveTo(0, 0)
      c.bezierCurveTo(-8, -len * 0.5, -6, -len * 1.1, 0, -len * 1.5)
      c.bezierCurveTo(6, -len * 1.1, 8, -len * 0.5, 0, 0)
      c.fillStyle = i % 2 ? leafDark : leaf
      c.fill()
      c.lineWidth = 2.6
      c.strokeStyle = INK
      c.stroke()
      c.restore()
    }
  }
  if (look.stage >= 3) {
    c.save()
    c.translate(0, -100)
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 ? 3 : 7
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    c.closePath()
    c.fillStyle = '#f6e27a'
    c.fill()
    c.lineWidth = 1.6
    c.strokeStyle = INK
    c.stroke()
    c.restore()
  }

  // yanak
  if (p.blush > 0.02) {
    c.fillStyle = `rgba(240,110,120,${0.35 * Math.min(1, p.blush)})`
    for (const sgn of [-1, 1]) {
      c.beginPath()
      c.ellipse(sgn * 40, -56, 9, 6, 0, 0, Math.PI * 2)
      c.fill()
    }
  }

  // gözler
  const es = p.eyeScale * eyeBase
  for (const sgn of [-1, 1]) {
    const ex = sgn * 22
    const ey = -80
    const rx = 17 * es
    const ry = 20 * es
    c.save()
    c.translate(ex, ey)
    c.beginPath()
    c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    c.fillStyle = '#fffdf6'
    c.fill()
    c.save()
    c.clip()
    const ix = p.lookX * 6 + p.covered * 0
    const iy = p.lookY * 7
    if (p.heartEyes > 0.05) {
      c.translate(0, 0)
      c.scale(p.heartEyes, p.heartEyes)
      c.beginPath()
      c.moveTo(0, 12)
      c.bezierCurveTo(-18, -2, -10, -16, 0, -6)
      c.bezierCurveTo(10, -16, 18, -2, 0, 12)
      c.fillStyle = '#e0529a'
      c.fill()
    } else {
      c.beginPath()
      c.arc(ix, iy, 11 * es, 0, Math.PI * 2)
      c.fillStyle = hsl(look.eyeHue, 55, 42)
      c.fill()
      c.beginPath()
      c.arc(ix, iy, 6 * es, 0, Math.PI * 2)
      c.fillStyle = '#1b2428'
      c.fill()
      c.beginPath()
      c.arc(ix - 4 * es, iy - 5 * es, 3.4 * es, 0, Math.PI * 2)
      c.fillStyle = '#fff'
      c.fill()
      c.beginPath()
      c.arc(ix + 4 * es, iy + 5 * es, 1.6 * es, 0, Math.PI * 2)
      c.fillStyle = 'rgba(255,255,255,0.8)'
      c.fill()
    }
    const closed = 1 - Math.max(0, Math.min(1, p.eyeOpen))
    if (closed > 0.01) {
      c.fillStyle = hsl(look.hue, 52, 70)
      const h = ry * 2 * closed
      c.fillRect(-rx - 2, -ry - 1, rx * 2 + 4, h + 1)
      c.beginPath()
      c.moveTo(-rx, -ry + h)
      c.quadraticCurveTo(0, -ry + h + (closed > 0.95 ? 4 : 1), rx, -ry + h)
      c.lineWidth = 2.6
      c.strokeStyle = INK
      c.stroke()
    }
    c.restore()
    c.beginPath()
    c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    c.lineWidth = 3
    c.strokeStyle = INK
    c.stroke()

    // kaş
    if (Math.abs(p.brow) > 0.08) {
      c.beginPath()
      const a = p.brow * 0.5 * -sgn
      c.save()
      c.translate(0, -ry - 8)
      c.rotate(a)
      c.moveTo(-10, 0)
      c.lineTo(10, 0)
      c.lineWidth = 3.4
      c.strokeStyle = INK
      c.stroke()
      c.restore()
    }
    // gözyaşı
    if (p.tear > 0.05) {
      const ph = (look.time * 1.4 + (sgn > 0 ? 0.4 : 0)) % 1
      c.beginPath()
      c.ellipse(sgn * 4, ry * 0.6 + ph * 30, 3.2, 5, 0, 0, Math.PI * 2)
      c.fillStyle = `rgba(120,190,235,${p.tear * (1 - ph)})`
      c.fill()
    }
    c.restore()
  }

  // ağız
  {
    const my = -56
    const open = Math.max(0, Math.min(1, p.mouthOpen))
    const sm = Math.max(-1, Math.min(1, p.smile))
    const w = 11 + open * 6 + Math.max(0, sm) * 5
    c.beginPath()
    if (open < 0.06) {
      c.moveTo(-w, my - sm * 1)
      c.quadraticCurveTo(0, my + sm * 12, w, my - sm * 1)
      c.lineWidth = 3.2
      c.strokeStyle = INK
      c.stroke()
    } else {
      c.moveTo(-w, my - sm * 2)
      c.quadraticCurveTo(0, my + sm * 8 - 2, w, my - sm * 2)
      c.quadraticCurveTo(0, my + open * 24 + sm * 8, -w, my - sm * 2)
      c.closePath()
      c.fillStyle = '#7a2a2f'
      c.fill()
      c.lineWidth = 3
      c.strokeStyle = INK
      c.stroke()
      if (open > 0.4) {
        c.save()
        c.clip()
        c.beginPath()
        c.ellipse(0, my + open * 22, w * 0.6, 6, 0, 0, Math.PI * 2)
        c.fillStyle = '#e8747f'
        c.fill()
        c.restore()
      }
    }
  }

  // ter
  if (p.sweat > 0.05) {
    const ph = (look.time * 0.8) % 1
    c.beginPath()
    c.ellipse(46, -98 + ph * 10, 4, 6.5, 0, 0, Math.PI * 2)
    c.fillStyle = `rgba(150,210,240,${p.sweat * (1 - ph * 0.6)})`
    c.fill()
  }

  // gözlük
  const eyes = art('eyes', look)
  if (eyes) {
    c.save()
    c.translate(0, -80)
    c.scale(W, W)
    drawWearable(c, eyes)
    c.restore()
  }
  // boyun
  const neck = art('neck', look)
  if (neck) {
    c.save()
    c.translate(0, -29)
    c.scale(W * 0.78, W * 0.78)
    drawWearable(c, neck)
    c.restore()
  }
  // şapka
  if (hat) {
    c.save()
    c.translate(0, -102)
    c.scale(W, W)
    drawWearable(c, hat)
    c.restore()
  }
  const halo = art('fx', look)
  if (halo && halo[0] === 'fxhalo') {
    c.save()
    c.translate(0, -138 + Math.sin(look.time * 2) * 3)
    c.beginPath()
    c.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2)
    c.lineWidth = 6
    c.strokeStyle = halo[1]
    c.stroke()
    c.lineWidth = 1.8
    c.strokeStyle = INK
    c.beginPath()
    c.ellipse(0, 0, 33, 12, 0, 0, Math.PI * 2)
    c.stroke()
    c.restore()
  }
  c.restore()
  drawn.n += 14
}

export const MOOD_TRAIT_BIAS: Record<Trait, string> = {
  energetic: 'Kıpır kıpır',
  calm: 'Sakin',
  curious: 'Meraklı',
  playful: 'Oyuncu',
  affectionate: 'Sevecen',
  shy: 'Utangaç',
}
