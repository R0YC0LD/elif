import { useSyncExternalStore } from 'react'
import { GameLoop } from '../engine/loop'
import { perf } from '../engine/perf'
import { bus, sound, toast } from '../game/events'
import { ITEMS } from '../game/items'
import {
  advanceWorld,
  canPlace,
  countPetTick,
  discover,
  finishBath,
  footprint,
  interact,
  moodOf,
  moveItem,
  petPet,
  placeItem,
  removeItem,
  scrubGain,
  stepNeeds,
  useItem,
  type Taste,
} from '../game/logic'
import { GRID, SCENE, ROOMS, stageOfLevel } from '../game/progression'
import { store, act } from '../game/store'
import type { RoomId } from '../game/types'
import { clockOf, weatherAt } from '../game/world'
import { drawFurniture, type FurnEnv } from './furniture'
import { drawArt } from './itemArt'
import { Animator, drawPet, stageScale } from './pet'
import { Particles } from './particles'
import { drawWindmill } from './roomArt'
import { drawLighting, drawOutdoor, drawStaticRoom, moonPos, windowRect, type LightSource } from './rooms'

const CELL = GRID.cell
const GROUND_Y = 466
const PET_S = 1.22

export interface SceneUi {
  decorOn: boolean
  placing: string | null
  selected: string | null
  bathOn: boolean
  bathTool: 'soap' | 'sponge' | 'shower' | 'towel' | null
  bathHint: string
  busy: boolean
  version: number
}

export const sceneUi: SceneUi = { decorOn: false, placing: null, selected: null, bathOn: false, bathTool: null, bathHint: '', busy: false, version: 0 }
const uiListeners = new Set<() => void>()
export function patchSceneUi(p: Partial<SceneUi>) {
  Object.assign(sceneUi, p)
  sceneUi.version++
  uiListeners.forEach((l) => l())
}
export function useSceneUi(): SceneUi {
  useSyncExternalStore(
    (l) => {
      uiListeners.add(l)
      return () => {
        uiListeners.delete(l)
      }
    },
    () => sceneUi.version,
  )
  return sceneUi
}

interface Task {
  at: number
  fn: () => void
}

interface Prop {
  art: [string, string, string?, string?]
  x: number
  y: number
  size: number
  rot: number
  scale: number
}

type FurnRuntime = { bounce: number; spin: number }

export class Scene {
  canvas!: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D
  private loop: GameLoop
  particles = new Particles()
  anim = new Animator()
  private time = 0
  private tasks: Task[] = []
  private statics = new Map<string, HTMLCanvasElement>()
  private res = 1
  private actorX = 360
  private actorY = GROUND_Y
  private targetX = 360
  private vy = 0
  private lifted = 0
  private hopT = 0
  private wanderIn = 4
  private busyUntil = 0
  private prop: Prop | null = null
  private pointer = { down: false, x: 0, y: 0, sx: 0, sy: 0, t0: 0, onPet: false, drag: false, path: 0, lx: 0, ly: 0, moved: 0 }
  private ghost: { x: number; y: number; ok: boolean } | null = null
  private moveGrab: { dx: number; dy: number } | null = null
  private runtime = new Map<string, FurnRuntime>()
  private shake = 0
  private flash = 0
  private tickAcc = 0
  private tapTimes: number[] = []
  private cloudTaps = 0
  private moonTaps = 0
  private lastWall = Date.now()
  private lastRoom: RoomId = 'living'
  private lastStage = 0
  private lastMood = ''
  private foamBlobs: { x: number; y: number; r: number }[] = []
  private bath = { foam: 0, wet: 0, dry: 0, rinsed: false, soaped: false, showerOn: false }
  private snoreIn = 3
  private fxIn = 0
  private unsub: (() => void)[] = []
  private pointerHome = { x: 0, y: 0 }
  private roomSwitch = 0
  private vign: HTMLCanvasElement | null = null
  private gift: { x: number; y: number; t: number; vx: number } | null = null
  private giftIn = 18
  private bubble: { x: number; y: number; r: number; room: RoomId } | null = null
  private ambIn = 0

  constructor() {
    this.loop = new GameLoop({ update: (dt) => this.update(dt), render: (_a, dt) => this.render(dt) })
    this.anim.onIdleEvent = (n) => {
      if (n === 'yawn') sound('happy')
    }
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D desteklenmiyor.')
    this.ctx = ctx
    const s = store.state
    this.lastRoom = s.currentRoom
    this.lastStage = stageOfLevel(s.level)
    this.unsub.push(
      bus.on((e) => {
        if (e.type === 'burst') this.burst(e.kind, e.n)
        else if (e.type === 'anim') {
          this.anim.play(e.name)
        } else if (e.type === 'levelup') {
          this.anim.play('levelUp')
          this.burst('star', 22)
          this.ringBurst(3)
          this.addShake(5)
        } else if (e.type === 'stage') {
          this.flash = 1
          this.addShake(8)
          this.burst('star', 40)
        }
      }),
    )
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    canvas.addEventListener('pointerleave', this.onLeave)
    this.resize()
  }

  detach() {
    this.loop.stop()
    this.unsub.forEach((u) => u())
    this.unsub = []
    const c = this.canvas
    if (c) {
      c.removeEventListener('pointerdown', this.onDown)
      c.removeEventListener('pointermove', this.onMove)
      c.removeEventListener('pointerup', this.onUp)
      c.removeEventListener('pointercancel', this.onUp)
      c.removeEventListener('pointerleave', this.onLeave)
    }
  }

  start() {
    this.lastWall = Date.now()
    this.loop.start()
  }

  stop() {
    this.loop.stop()
  }

  resize() {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const low = store.state.settings.lowGfx
    const dpr = low ? 1 : Math.min(window.devicePixelRatio || 1, 2.5)
    const w = Math.max(160, Math.round(Math.max(rect.width, (rect.height * SCENE.w) / SCENE.h) * dpr))
    const h = Math.round((w * SCENE.h) / SCENE.w)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.statics.clear()
    }
    this.res = w / SCENE.w
    this.vign = null
    this.particles.setLimit(low ? 90 : 360)
  }

  // ---------- Yardımcılar ----------

  private later(sec: number, fn: () => void) {
    this.tasks.push({ at: this.time + sec, fn })
  }

  private addShake(a: number) {
    const st = store.state.settings
    if (!st.shake || st.reduceMotion) return
    this.shake = Math.max(this.shake, a)
  }

  private fxScale() {
    const st = store.state.settings
    return st.reduceMotion ? 0.4 : st.lowGfx ? 0.5 : 1
  }

  burst(kind: 'heart' | 'star' | 'coin' | 'drop' | 'bubble' | 'note' | 'zzz' | 'leaf', n: number) {
    const k = this.fxScale()
    this.particles.emit(kind, this.actorX, this.actorY - 80 * stageScale(this.stage()) * PET_S, Math.max(1, Math.round(n * k)), { spread: 50, speed: 90, up: 70 })
  }

  private stage() {
    return stageOfLevel(store.state.level)
  }

  get busy() {
    return this.time < this.busyUntil
  }

  private lockFor(sec: number) {
    this.busyUntil = Math.max(this.busyUntil, this.time + sec)
    patchSceneUi({ busy: true })
    this.later(sec, () => {
      if (!this.busy) patchSceneUi({ busy: false })
    })
  }

  petCenter() {
    const sc = stageScale(this.stage()) * PET_S
    return { x: this.actorX, y: this.actorY - 62 * sc, rx: 60 * sc, ry: 58 * sc, mouthY: this.actorY - 56 * sc, sc }
  }

  toScene(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect()
    const k = Math.max(r.width / SCENE.w, r.height / SCENE.h)
    const ox = (r.width - SCENE.w * k) / 2
    const oy = (r.height - SCENE.h * k) / 2
    return { x: (clientX - r.left - ox) / k, y: (clientY - r.top - oy) / k }
  }

  hitPet(clientX: number, clientY: number): boolean {
    const p = this.toScene(clientX, clientY)
    const c = this.petCenter()
    const dx = (p.x - c.x) / (c.rx + 14)
    const dy = (p.y - c.y) / (c.ry + 14)
    return dx * dx + dy * dy <= 1
  }

  // ---------- Bakım dizileri ----------

  feed(itemId: string, from?: { x: number; y: number }): boolean {
    if (this.busy || this.lifted) return false
    const it = ITEMS[itemId]
    if (!it) return false
    const out = act((s) => useItem(s, itemId))
    if (!out.ok) {
      toast('warn', out.reason ?? 'Olmadı.')
      sound('error')
      if (out.reason?.includes('tok') || out.reason?.includes('susa')) this.anim.play('sniff')
      return false
    }
    sound('click')
    const kind = out.kind
    const taste: Taste = out.taste ?? 'like'
    const c = this.petCenter()
    const start = from ?? { x: this.actorX + (Math.random() - 0.5) * 80, y: SCENE.h - 20 }
    const prop: Prop = { art: it.art, x: start.x, y: start.y, size: 52, rot: 0, scale: 1 }
    this.prop = prop
    const travel = 0.45
    const x0 = start.x
    const y0 = start.y
    const t0 = this.time

    if (kind === 'toy') {
      this.prop = null
      this.anim.play('jumping')
      this.burst('star', 8)
      sound('ball')
      this.lockFor(1.4)
      return true
    }

    this.anim.play('eating')
    this.lockFor(travel + (kind === 'drink' ? 2.6 : kind === 'medicine' ? 1.8 : 3.4))
    const mouthX = c.x
    const mouthY = c.mouthY - 4
    const mover = () => {
      if (this.prop !== prop) return
      const k = Math.min(1, (this.time - t0) / travel)
      const e = 1 - Math.pow(1 - k, 3)
      prop.x = x0 + (mouthX - x0) * e
      prop.y = y0 + (mouthY - y0) * e - Math.sin(k * Math.PI) * 30
      if (k < 1) this.later(0.016, mover)
    }
    mover()

    if (kind === 'drink') {
      this.later(travel, () => {
        this.anim.play('drinking')
        prop.rot = -0.5
        sound('splash')
      })
      for (let i = 1; i <= 3; i++) {
        this.later(travel + i * 0.55, () => {
          prop.scale = 1 - i * 0.28
          prop.rot = -0.5 - i * 0.1
          sound('gulp')
          this.particles.emit('drop', mouthX + 10, mouthY + 6, 3, { spread: 10, speed: 40, up: 20, life: 0.6 })
        })
      }
      this.later(travel + 2.1, () => {
        this.prop = null
        this.finishTaste(taste)
      })
    } else if (kind === 'medicine') {
      this.later(travel, () => {
        sound('bite')
        prop.scale = 0.5
      })
      this.later(travel + 0.4, () => {
        this.prop = null
        this.anim.play('chewing')
        sound('gulp')
      })
      this.later(travel + 1.2, () => {
        this.anim.release()
        this.anim.play(store.state.pet.sick ? 'sad' : 'recovering')
        this.burst('star', 10)
        sound('heal')
      })
    } else {
      for (let i = 1; i <= 3; i++) {
        this.later(travel + (i - 1) * 0.85, () => {
          this.anim.play('chewing')
          prop.scale = 1 - i * 0.3
          sound('bite')
          this.particles.emit('crumb', mouthX, mouthY + 8, 5, { spread: 16, speed: 70, up: 30, life: 0.7 })
        })
        this.later(travel + (i - 1) * 0.85 + 0.45, () => sound('chew'))
      }
      this.later(travel + 2.6, () => {
        this.prop = null
        sound('gulp')
        this.finishTaste(taste)
      })
    }
    return true
  }

  private finishTaste(taste: Taste) {
    this.anim.release()
    if (taste === 'love') {
      this.anim.play('veryHappy')
      this.burst('heart', 12)
      sound('happy')
    } else if (taste === 'yuck') {
      this.anim.play('sad')
      sound('yuck')
    } else {
      this.anim.play('happy')
      this.burst('heart', 3)
      sound('happy')
    }
  }

  // ---------- Banyo ----------

  setBath(on: boolean) {
    patchSceneUi({ bathOn: on, bathTool: null })
    if (!on) {
      this.bath = { foam: 0, wet: 0, dry: 0, rinsed: false, soaped: false, showerOn: false }
      this.foamBlobs = []
      this.anim.release('bathing')
    } else this.updateBathHint()
  }

  setBathTool(t: SceneUi['bathTool']) {
    const cur = sceneUi.bathTool
    const next = cur === t ? null : t
    patchSceneUi({ bathTool: next })
    this.bath.showerOn = next === 'shower'
    if (next === 'shower') sound('splash')
    this.updateBathHint()
  }

  private updateBathHint() {
    const b = this.bath
    let h = 'Sabunu seç ve Nova\'nın üstünde sürükle.'
    if (b.soaped && b.foam > 0.15 && !b.rinsed) h = 'Süngerle ovala, sonra duşla durula.'
    if (b.soaped && b.foam <= 0.15 && b.rinsed && b.dry < 1) h = 'Havluyla kurula.'
    if (b.dry >= 1) h = 'Tertemiz.'
    if (sceneUi.bathHint !== h) patchSceneUi({ bathHint: h })
  }

  private bathStroke(len: number) {
    const tool = sceneUi.bathTool
    const b = this.bath
    const c = this.petCenter()
    const k = len / 100
    if (tool === 'soap') {
      b.foam = Math.min(1, b.foam + 0.45 * k)
      b.soaped = true
      b.rinsed = false
      b.dry = 0
      this.particles.emit('foam', c.x + (Math.random() - 0.5) * 80, c.y - 10 + (Math.random() - 0.5) * 60, 1, { spread: 10, speed: 20, up: 20, life: 0.9 })
      sound('splash')
    } else if (tool === 'sponge') {
      if (b.foam > 0.05) {
        b.foam = Math.min(1, b.foam + 0.12 * k)
        act((s) => scrubGain(s, 2.4 * k))
        this.particles.emit('bubble', c.x + (Math.random() - 0.5) * 80, c.y + (Math.random() - 0.5) * 60, 1, { spread: 10, speed: 30, up: 30, life: 1 })
        sound('splash')
      }
    } else if (tool === 'towel') {
      if (b.soaped && b.rinsed) {
        b.dry = Math.min(1, b.dry + 0.5 * k)
        b.wet = Math.max(0, b.wet - 0.3 * k)
        if (b.dry >= 1) {
          act((s) => finishBath(s))
          this.anim.play('veryHappy')
          this.burst('star', 14)
          sound('achievement')
          this.later(1.8, () => this.setBath(false))
        }
      }
    }
    this.updateBathHint()
  }

  // ---------- Girdi ----------

  private onLeave = () => {
    this.anim.focusX = null
    this.anim.focusY = null
  }

  private onDown = (e: PointerEvent) => {
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // yakalama desteklenmiyorsa olay yine canvas üzerinde işlenir
    }
    const p = this.toScene(e.clientX, e.clientY)
    const pt = this.pointer
    pt.down = true
    pt.x = pt.sx = pt.lx = p.x
    pt.y = pt.sy = pt.ly = p.y
    pt.t0 = performance.now()
    pt.drag = false
    pt.path = 0
    pt.moved = 0
    pt.onPet = this.hitPet(e.clientX, e.clientY)
    pt.lx = p.x
    pt.ly = p.y

    if (sceneUi.decorOn) {
      this.decorDown(p.x, p.y)
      return
    }
    if (sceneUi.bathOn) return
  }

  private onMove = (e: PointerEvent) => {
    const p = this.toScene(e.clientX, e.clientY)
    const pt = this.pointer
    const c = this.petCenter()
    this.pointerHome = p
    this.anim.focusX = Math.max(-1, Math.min(1, (p.x - c.x) / 200))
    this.anim.focusY = Math.max(-1, Math.min(1, (p.y - c.y) / 200))
    const dx = p.x - pt.lx
    const dy = p.y - pt.ly
    const step = Math.hypot(dx, dy)
    pt.x = p.x
    pt.y = p.y

    if (sceneUi.decorOn) {
      this.decorMove(p.x, p.y, pt.down)
      pt.lx = p.x
      pt.ly = p.y
      return
    }
    if (!pt.down) return
    pt.path += step
    pt.moved = Math.hypot(p.x - pt.sx, p.y - pt.sy)
    const sens = store.state.settings.sensitivity

    if (sceneUi.bathOn) {
      if (this.hitPet(e.clientX, e.clientY)) this.bathStroke(step)
      pt.lx = p.x
      pt.ly = p.y
      return
    }

    if (pt.onPet) {
      if (!pt.drag && pt.moved > 70 / sens) {
        if (!this.busy) {
          pt.drag = true
          this.lifted = 1
          this.anim.play('dragReact', { loop: true })
          sound('poke')
        }
      }
      if (pt.drag) {
        this.actorX = Math.max(140, Math.min(SCENE.w - 140, p.x))
        this.actorY = Math.max(300, Math.min(SCENE.h - 10, p.y + 40))
        this.targetX = this.actorX
        this.vy = 0
      } else if (this.hitPet(e.clientX, e.clientY) && !this.busy) {
        this.petAccum += step
        if (this.petAccum > 60 / sens) {
          this.petAccum = 0
          this.stroke(p.y < c.y - 6 ? 'head' : 'body')
        }
      }
    }
    pt.lx = p.x
    pt.ly = p.y
  }

  private petAccum = 0

  private stroke(zone: 'head' | 'body') {
    act((s) => {
      petPet(s, zone)
      countPetTick(s)
    })
    this.anim.play('petReact')
    this.particles.emit('heart', this.actorX + (Math.random() - 0.5) * 40, this.petCenter().y - 40, 1, { speed: 20, up: 40 })
    if (Math.random() < 0.4) sound('pet')
  }

  private onUp = (e: PointerEvent) => {
    const pt = this.pointer
    if (!pt.down) return
    pt.down = false
    const p = this.toScene(e.clientX, e.clientY)
    const dt = performance.now() - pt.t0

    if (sceneUi.decorOn) {
      this.decorUp(p.x, p.y)
      return
    }
    if (pt.drag) {
      this.lifted = 0
      this.anim.release('dragReact')
      this.vy = 60
      pt.drag = false
      return
    }
    if (sceneUi.bathOn) return
    const isTap = pt.moved < 12 && dt < 450
    if (!isTap) return
    if (this.tapHotspots(p.x, p.y)) return
    if (pt.onPet && !this.busy) this.poke(p.y)
  }

  private poke(y: number) {
    const c = this.petCenter()
    const head = y < c.y - 6
    const s = store.state
    const now = performance.now()
    if (head) {
      this.tapTimes.push(now)
      this.tapTimes = this.tapTimes.filter((t) => now - t < 4000)
      if (this.tapTimes.length >= 7) {
        this.tapTimes = []
        act((st) => discover(st, 'ticklish'))
        this.anim.play('laughing')
        this.burst('star', 16)
        sound('giggle')
        return
      }
    }
    act((st) => {
      petPet(st, head ? 'head' : 'body', 1.5)
      countPetTick(st)
    })
    const sy = s.pet.traits.shy
    if (sy > 55 && Math.random() < 0.5) this.anim.play('shy')
    else if (head) this.anim.play(Math.random() < 0.5 ? 'surprised' : 'happy')
    else this.anim.play('petReact')
    this.particles.emit('heart', this.actorX, c.y - 40, 2, { speed: 40, up: 60 })
    this.particles.emit('ring', this.actorX, c.y, 1, { spread: 0, speed: 0, up: 0, life: 0.5, size: 0.8 })
    sound(head ? 'giggle' : 'poke')
  }

  private tapHotspots(x: number, y: number): boolean {
    const s = store.state
    const room = s.currentRoom
    const clock = clockOf(s.worldMinutes)
    if (this.gift && Math.hypot(x - this.gift.x, y - this.gift.y) < 40) {
      const g = this.gift
      this.gift = null
      const n = 8 + Math.floor(Math.random() * 10)
      act((st) => {
        st.coins += n
        st.stats.coinsEarned += n
      })
      toast('coin', '+' + n + ' coin')
      this.particles.emit('glow', g.x, g.y, 6, { spread: 20, speed: 60, up: 10, life: 0.9, size: 1.4 })
      this.particles.emit('ring', g.x, g.y, 2, { spread: 0, speed: 0, up: 0, life: 0.7 })
      sound('sparkle')
      return true
    }
    if (this.bubble && Math.hypot(x - this.bubble.x, y - this.bubble.y) < this.bubble.r + 8 && !s.pet.asleep) {
      const target = this.bubble.room
      if (target !== room && s.unlockedRooms.includes(target)) {
        act((st) => {
          st.currentRoom = target
        })
        sound('room')
      } else this.anim.play('surprised')
      return true
    }
    if (room === 'garden' && y < 150 && !this.hitPetXY(x, y)) {
      this.cloudTaps++
      this.particles.emit('spark', x, y, 6, { speed: 40, up: 10 })
      sound('tick')
      if (this.cloudTaps >= 5) {
        this.cloudTaps = 0
        act((st) => discover(st, 'cloudtap'))
      }
      return true
    }
    const w = windowRect(room)
    if (w && clock.daylight < 0.4) {
      const m = moonPos(clock, { x: w.x + 9, y: w.y + 9, w: w.w - 18, h: w.h - 18 })
      if (Math.hypot(x - m.x, y - m.y) < 28) {
        this.moonTaps++
        sound('tick')
        this.particles.emit('star', m.x, m.y, 4, { speed: 40, up: 10 })
        if (this.moonTaps >= 3) {
          this.moonTaps = 0
          act((st) => discover(st, 'moontap'))
        }
        return true
      }
    }
    const placed = [...s.rooms[room].placed].reverse()
    for (const p of placed) {
      const it = ITEMS[p.item]
      const f = it?.furn
      if (!f?.interactive) continue
      const px = p.x * CELL
      const py = p.y * CELL
      if (x >= px && x <= px + f.w * CELL && y >= py && y <= py + f.h * CELL) {
        this.useFurniture(p.uid, p.item, px + (f.w * CELL) / 2, py + (f.h * CELL) / 2)
        return true
      }
    }
    return false
  }

  private hitPetXY(x: number, y: number) {
    const c = this.petCenter()
    const dx = (x - c.x) / (c.rx + 10)
    const dy = (y - c.y) / (c.ry + 10)
    return dx * dx + dy * dy <= 1
  }

  private rt(uid: string): FurnRuntime {
    let r = this.runtime.get(uid)
    if (!r) {
      r = { bounce: 0, spin: 0 }
      this.runtime.set(uid, r)
    }
    return r
  }

  private useFurniture(uid: string, itemId: string, cx: number, cy: number) {
    const kind = ITEMS[itemId].furn!.interactive!
    const res = act((s) => interact(s, s.currentRoom, uid))
    const r = this.rt(uid)
    switch (kind) {
      case 'ball':
        r.bounce = 1
        sound('ball')
        this.anim.play('jumping')
        break
      case 'drum':
        sound('drum')
        this.particles.emit('note', cx, cy - 30, 2)
        this.anim.play('excited')
        break
      case 'globe':
        r.spin = 3
        sound('tick')
        this.anim.play('lookAround')
        break
      case 'plant':
        this.particles.emit('drop', cx, cy - 30, 6, { spread: 30, speed: 30, up: 10, g: 220 })
        sound('splash')
        break
      case 'tv': {
        const on = store.state.rooms[store.state.currentRoom].placed.find((p) => p.uid === uid)?.on
        sound(on ? 'open' : 'close')
        if (on) this.anim.play('happy')
        break
      }
      case 'lamp':
        sound('click')
        break
      case 'musicbox': {
        const on = store.state.rooms[store.state.currentRoom].placed.find((p) => p.uid === uid)?.on
        sound('open')
        if (on) {
          this.anim.play('dancing')
          this.later(4, () => this.anim.release('dancing'))
          act((s) => {
            s.pet.needs.fun = Math.min(100, s.pet.needs.fun + 10)
          })
        }
        break
      }
      case 'radio':
        sound('open')
        this.particles.emit('note', cx, cy - 20, 3)
        break
      case 'telescope':
        sound('explore')
        break
      case 'fireplace':
      case 'fountain':
      case 'aquarium':
      case 'mirror':
        sound('click')
        break
      default:
        break
    }
    void res
  }

  // ---------- Dekor modu ----------

  private cellOf(x: number, y: number) {
    return { cx: Math.floor(x / CELL), cy: Math.floor(y / CELL) }
  }

  private decorDown(x: number, y: number) {
    const s = store.state
    const room = s.currentRoom
    if (sceneUi.placing) {
      const f = ITEMS[sceneUi.placing].furn!
      const { cx, cy } = this.cellOf(x, y)
      const gx = Math.max(0, Math.min(GRID.cols - f.w, cx - Math.floor(f.w / 2)))
      const gy = f.zone === 'wall' ? Math.max(0, cy - Math.floor(f.h / 2)) : Math.min(GRID.rows - f.h, Math.max(0, cy - f.h + 1))
      const res = act((st) => placeItem(st, room, sceneUi.placing!, gx, gy))
      if (!res.ok) {
        toast('warn', res.reason ?? 'Yerleştirilemedi.')
        sound('error')
      } else {
        patchSceneUi({ selected: res.uid ?? null, placing: null })
        this.ghost = null
      }
      return
    }
    const placed = [...s.rooms[room].placed].reverse()
    for (const p of placed) {
      const fp = footprint(p)
      const f = ITEMS[p.item].furn!
      const px = p.x * CELL
      const py = p.y * CELL
      if (x >= px && x <= px + f.w * CELL && y >= py && y <= py + f.h * CELL) {
        patchSceneUi({ selected: p.uid })
        this.moveGrab = { dx: x - px, dy: y - py }
        void fp
        return
      }
    }
    patchSceneUi({ selected: null })
  }

  private decorMove(x: number, y: number, down: boolean) {
    const s = store.state
    const room = s.currentRoom
    if (sceneUi.placing) {
      const f = ITEMS[sceneUi.placing].furn!
      const { cx, cy } = this.cellOf(x, y)
      const gx = Math.max(0, Math.min(GRID.cols - f.w, cx - Math.floor(f.w / 2)))
      const gy = f.zone === 'wall' ? Math.max(0, cy - Math.floor(f.h / 2)) : Math.min(GRID.rows - f.h, Math.max(0, cy - f.h + 1))
      this.ghost = { x: gx, y: gy, ok: canPlace(s, room, sceneUi.placing, gx, gy).ok }
      return
    }
    if (down && sceneUi.selected && this.moveGrab) {
      const p = s.rooms[room].placed.find((o) => o.uid === sceneUi.selected)
      if (!p) return
      const gx = Math.round((x - this.moveGrab.dx) / CELL)
      const gy = Math.round((y - this.moveGrab.dy) / CELL)
      const f = ITEMS[p.item].furn!
      const nx = Math.max(0, Math.min(GRID.cols - f.w, gx))
      const ny = Math.max(0, Math.min(GRID.rows - f.h, gy))
      this.ghost = { x: nx, y: ny, ok: canPlace(s, room, p.item, nx, ny, p.uid).ok }
    }
  }

  private decorUp(_x: number, _y: number) {
    const s = store.state
    const room = s.currentRoom
    if (sceneUi.selected && this.moveGrab && this.ghost) {
      const g = this.ghost
      if (g.ok) {
        const res = act((st) => moveItem(st, room, sceneUi.selected!, g.x, g.y))
        if (res.ok) sound('place')
      } else {
        toast('warn', 'Buraya sığmıyor.')
        sound('error')
      }
    }
    this.moveGrab = null
    if (!sceneUi.placing) this.ghost = null
  }

  removeSelected() {
    const uid = sceneUi.selected
    if (!uid) return
    act((s) => removeItem(s, s.currentRoom, uid))
    patchSceneUi({ selected: null })
    sound('close')
  }

  // ---------- Simülasyon ----------

  private update(dt: number) {
    this.time += dt
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      if (this.tasks[i].at <= this.time) {
        const t = this.tasks.splice(i, 1)[0]
        t.fn()
      }
    }
    const s = store.state
    if (s.currentRoom !== this.lastRoom) {
      this.lastRoom = s.currentRoom
      this.roomSwitch = 0.35
      this.runtime.clear()
      this.actorX = 360
      this.targetX = 360
      this.actorY = GROUND_Y
      if (sceneUi.bathOn && s.currentRoom !== 'bathroom') this.setBath(false)
    }
    if (this.roomSwitch > 0) this.roomSwitch -= dt

    this.tickAcc += dt
    if (this.tickAcc >= 1) {
      this.tickAcc -= 1
      this.worldTick()
    }

    // karakter
    const mood = moodOf(s)
    this.anim.mood = mood
    this.anim.traits = s.pet.traits
    if (mood !== this.lastMood) {
      if (mood === 'sleeping') {
        this.anim.play('sleeping', { loop: true })
      } else if (this.lastMood === 'sleeping') {
        this.anim.release('sleeping')
      }
      if (mood === 'sick') this.anim.play('sick', { loop: true })
      else if (this.lastMood === 'sick') this.anim.release('sick')
      this.lastMood = mood
    }
    this.moveActor(dt, mood)
    this.anim.update(dt)

    const st = stageOfLevel(s.level)
    if (st !== this.lastStage) this.lastStage = st

    this.ambientFx(dt, mood)
    this.updateBath(dt)
    this.particles.update(dt)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 14)
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.2)
    for (const r of this.runtime.values()) {
      if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 0.9)
      if (r.spin > 0) r.spin = Math.max(0, r.spin - dt)
    }
  }

  private worldTick() {
    const now = Date.now()
    const gap = (now - this.lastWall) / 1000
    this.lastWall = now
    const total = Math.min(gap, 8 * 3600)
    store.quiet((s) => {
      let left = total
      while (left > 0) {
        const d = Math.min(30, left)
        stepNeeds(s, d)
        advanceWorld(s, d)
        left -= d
      }
    })
    store.tickSave()
  }

  private bedSpot(): { x: number; y: number } | null {
    const s = store.state
    if (s.currentRoom !== 'bedroom') return null
    const bed = s.rooms.bedroom.placed.find((p) => p.item.startsWith('bed'))
    if (!bed) return null
    const f = ITEMS[bed.item].furn!
    return { x: (bed.x + f.w * 0.62) * CELL, y: (bed.y + f.h) * CELL - 20 }
  }

  private moveActor(dt: number, mood: string) {
    const s = store.state
    if (this.lifted) return
    const spot = mood === 'sleeping' ? this.bedSpot() : null
    if (spot) {
      this.targetX = spot.x
      this.actorX += (spot.x - this.actorX) * Math.min(1, dt * 5)
      this.actorY += (spot.y - this.actorY) * Math.min(1, dt * 5)
      this.vy = 0
      return
    }
    // yerçekimi
    const ground = sceneUi.bathOn ? 470 : GROUND_Y
    if (this.actorY < ground - 0.5 || this.vy < 0) {
      this.vy += 1500 * dt
      this.actorY += this.vy * dt
      if (this.actorY >= ground) {
        this.actorY = ground
        if (this.vy > 200) {
          this.anim.play('surprised')
          this.particles.emit('crumb', this.actorX, this.actorY, 4, { speed: 60, up: 30, life: 0.4 })
          sound('place')
        }
        this.vy = 0
      }
    } else this.actorY += (ground - this.actorY) * Math.min(1, dt * 6)

    if (sceneUi.bathOn) {
      this.targetX = 360
    } else if (mood === 'sleeping' || mood === 'sick' || this.busy || this.anim.current === 'dancing') {
      // yerinde
    } else {
      this.wanderIn -= dt
      if (this.wanderIn <= 0) {
        const tr = s.pet.traits
        this.wanderIn = 5 + Math.random() * 8 - tr.energetic / 25 + tr.calm / 25
        if (Math.random() < 0.35 + tr.energetic / 200) this.targetX = 170 + Math.random() * 380
      }
    }
    const dx = this.targetX - this.actorX
    if (Math.abs(dx) > 3 && !this.busy && mood !== 'sleeping') {
      const speed = 70 + s.pet.traits.energetic * 0.6
      this.actorX += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt)
      this.hopT += dt * 7.5
    } else {
      this.hopT = 0
    }
  }

  private ambientFx(dt: number, mood: string) {
    const s = store.state
    const k = this.fxScale()
    this.fxIn -= dt
    const c = this.petCenter()
    if (mood === 'sleeping') {
      this.snoreIn -= dt
      if (this.snoreIn <= 0) {
        this.snoreIn = 2.2
        this.particles.emit('zzz', c.x + 40, c.y - 50, 1, { speed: 6, up: 26, life: 2, size: 1.2 })
        sound('snore')
      }
    }
    const fx = s.pet.equipped.fx
    if (fx && this.fxIn <= 0) {
      this.fxIn = 0.25 / Math.max(0.4, k)
      const kind = fx === 'fx_sparkle' ? 'spark' : fx === 'fx_hearts' ? 'heart' : fx === 'fx_bubbles' ? 'bubble' : fx === 'fx_leaves' ? 'leaf' : fx === 'fx_snow' ? 'snow' : null
      if (kind) this.particles.emit(kind, c.x + (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 40), c.y + (Math.random() - 0.5) * 120, 1, { speed: 12, up: kind === 'snow' || kind === 'leaf' ? -20 : 20, life: 1.8 })
    }
    if (sceneUi.bathOn && this.bath.showerOn) {
      for (let i = 0; i < 2; i++) this.particles.emit('drop', 363 + (Math.random() - 0.5) * 50, 70, 1, { spread: 0, speed: 10, up: -120, g: 500, life: 0.7 })
      if (Math.random() < 0.3) sound('splash')
    }
    const clock = clockOf(s.worldMinutes)
    const w = weatherAt(s.worldMinutes)
    if (s.currentRoom === 'garden' && !s.settings.lowGfx) {
      if (w === 'rainy') this.particles.emit('rain', Math.random() * SCENE.w, 0, 2, { spread: 0, speed: 0, up: -400, g: 300, life: 1.1 })
      if (w === 'snowy') this.particles.emit('snow', Math.random() * SCENE.w, 0, 1, { spread: 0, speed: 8, up: -20, g: 24, life: 6 })
      if (w === 'windy' && Math.random() < 0.05) this.particles.emit('leaf', 0, 100 + Math.random() * 250, 1, { spread: 0, speed: 20, up: 0, g: 10, life: 4 })
    }
    this.roomAmbient(dt, s.currentRoom, clock.daylight, w)
  }

  private ringBurst(n: number) {
    const c = this.petCenter()
    for (let i = 0; i < n; i++) this.later(i * 0.18, () => this.particles.emit('ring', c.x, c.y, 1, { spread: 0, speed: 0, up: 0, life: 0.9, size: 1.2 }))
  }

  private roomAmbient(dt: number, room: RoomId, daylight: number, weather: string) {
    if (store.state.settings.lowGfx) return
    this.ambIn -= dt
    const k = store.state.settings.reduceMotion ? 2 : 1
    if (room === 'garden' && !store.state.pet.asleep) {
      this.giftIn -= dt
      if (this.giftIn <= 0 && !this.gift) {
        this.gift = { x: -30, y: 90 + Math.random() * 150, t: 0, vx: 55 + Math.random() * 30 }
        this.giftIn = 40 + Math.random() * 40
      }
    }
    if (this.gift) {
      const g = this.gift
      g.t += dt
      g.x += g.vx * dt
      g.y += Math.sin(g.t * 2.4) * 28 * dt
      if (g.x > SCENE.w + 40) this.gift = null
    }
    if (this.ambIn > 0) return
    switch (room) {
      case 'kitchen':
        this.ambIn = 0.4 * k
        this.particles.emit('steam', 390 + (Math.random() - 0.5) * 20, 178, 1, { spread: 4, speed: 4, up: 26, life: 1.8 })
        break
      case 'bathroom':
        this.ambIn = 0.7 * k
        this.particles.emit('bubble', 40 + Math.random() * 190, 240, 1, { spread: 0, speed: 8, up: 30, life: 2.6, size: 0.8 })
        this.particles.emit('steam', 60 + Math.random() * 160, 236, 1, { spread: 6, speed: 4, up: 18, life: 2.2 })
        break
      case 'bedroom':
        this.ambIn = 0.6 * k
        if (daylight < 0.5) this.particles.emit('mote', 80 + Math.random() * 560, 20 + Math.random() * 240, 1, { spread: 0, speed: 4, up: 0, life: 4, size: 1.3 })
        break
      case 'playroom':
        this.ambIn = 0.5 * k
        this.particles.emit('spark', Math.random() * SCENE.w, -6, 1, { spread: 0, speed: 20, up: -40, g: 30, life: 5, size: 0.8 })
        break
      case 'garden':
        this.ambIn = 0.5 * k
        if (daylight < 0.4) this.particles.emit('firefly', Math.random() * SCENE.w, 200 + Math.random() * 250, 1, { spread: 0, speed: 10, up: 0, life: 7, size: 1.1 })
        else if (weather === 'sunny') this.particles.emit('mote', Math.random() * SCENE.w, 40 + Math.random() * 260, 1, { spread: 0, speed: 6, up: 0, life: 5, size: 1.1 })
        break
      case 'vault':
        this.ambIn = 0.3 * k
        this.particles.emit('glow', 60 + Math.random() * 600, 60 + Math.random() * 240, 1, { spread: 0, speed: 3, up: 0, life: 2.4, size: 0.45 })
        break
      default:
        this.ambIn = 0.5 * k
        if (daylight > 0.3 && weather !== 'rainy') {
          const w = windowRect(room)
          if (w) this.particles.emit('mote', w.x + 20 + Math.random() * (w.w - 80) - Math.random() * 90, w.y + w.h + Math.random() * 120, 1, { spread: 0, speed: 3, up: 0, life: 5, size: 1.2 })
        }
    }
  }

  private drawShaft(c: CanvasRenderingContext2D, room: RoomId, daylight: number, weather: string) {
    const w = windowRect(room)
    if (!w || daylight < 0.3 || weather === 'rainy' || weather === 'snowy') return
    const a = 0.2 * daylight * (weather === 'cloudy' ? 0.45 : 1)
    const lean = 150
    const g = c.createLinearGradient(w.x, w.y + w.h, w.x - lean, 470)
    g.addColorStop(0, 'rgba(255,240,190,' + a + ')')
    g.addColorStop(1, 'rgba(255,240,190,0)')
    c.save()
    c.globalCompositeOperation = 'screen'
    c.fillStyle = g
    c.beginPath()
    c.moveTo(w.x + 12, w.y + w.h)
    c.lineTo(w.x + w.w - 12, w.y + w.h)
    c.lineTo(w.x + w.w - 12 - lean - 40, 480)
    c.lineTo(w.x + 12 - lean + 40, 480)
    c.closePath()
    c.fill()
    c.restore()
  }

  private drawBubble(c: CanvasRenderingContext2D) {
    const s = store.state
    this.bubble = null
    if (s.pet.asleep || sceneUi.bathOn || sceneUi.decorOn || this.lifted) return
    const n = s.pet.needs
    const cand: { v: number; id: string; room: RoomId }[] = [
      { v: s.pet.sick ? 0 : n.health, id: 'bandage', room: 'living' },
      { v: n.hunger, id: 'apple', room: 'kitchen' },
      { v: n.thirst, id: 'water', room: 'kitchen' },
      { v: n.hygiene, id: 'toy_duck', room: 'bathroom' },
      { v: n.energy, id: 'zzz', room: 'bedroom' },
      { v: n.fun, id: 'toy_ball', room: 'playroom' },
      { v: n.social, id: 'heart', room: 'living' },
    ]
    cand.sort((a, b) => a.v - b.v)
    const top = cand[0]
    if (top.v >= 30) return
    const pc = this.petCenter()
    const pulse = 1 + Math.sin(this.time * 4) * 0.05
    const bx = pc.x + pc.rx * 0.9
    const by = pc.y - pc.ry - 34 + Math.sin(this.time * 2) * 3
    const r = 28 * pulse
    this.bubble = { x: bx, y: by, r, room: top.room }
    c.save()
    c.translate(bx, by)
    c.fillStyle = '#fffaf0'
    c.strokeStyle = '#0f2123'
    c.lineWidth = 3
    c.beginPath()
    c.arc(-r * 0.7, r * 1.05, 5, 0, 7)
    c.arc(-r * 0.35, r * 0.78, 8, 0, 7)
    c.fill()
    c.stroke()
    c.beginPath()
    c.arc(0, 0, r, 0, 7)
    c.fill()
    c.stroke()
    if (top.id === 'zzz') {
      c.fillStyle = '#5a6fa8'
      c.font = 'bold 26px sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('Zzz', 0, 2)
    } else if (top.id === 'heart') drawArt(c, ['fxhearts', '#e0529a'], 40)
    else drawArt(c, ITEMS[top.id].art, 38)
    c.restore()
  }

  private drawGift(c: CanvasRenderingContext2D) {
    const g = this.gift
    if (!g) return
    const flap = Math.sin(g.t * 14)
    c.save()
    c.translate(g.x, g.y)
    c.globalCompositeOperation = 'lighter'
    const gl = c.createRadialGradient(0, 0, 2, 0, 0, 34)
    gl.addColorStop(0, 'rgba(255,230,120,0.7)')
    gl.addColorStop(1, 'rgba(255,230,120,0)')
    c.fillStyle = gl
    c.fillRect(-34, -34, 68, 68)
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#f2b630'
    c.strokeStyle = '#0f2123'
    c.lineWidth = 2.4
    for (const sg of [-1, 1]) {
      c.save()
      c.scale(sg, 1)
      c.rotate(-0.4 - flap * 0.5)
      c.beginPath()
      c.ellipse(11, -4, 12, 7, 0, 0, 7)
      c.fill()
      c.stroke()
      c.restore()
    }
    c.fillStyle = '#6a4a30'
    c.beginPath()
    c.ellipse(0, 0, 3, 8, 0, 0, 7)
    c.fill()
    c.restore()
  }

  private vignette(): HTMLCanvasElement {
    if (!this.vign) {
      const cv = document.createElement('canvas')
      cv.width = Math.round(SCENE.w * this.res)
      cv.height = Math.round(SCENE.h * this.res)
      const c = cv.getContext('2d')!
      const g = c.createRadialGradient(cv.width / 2, cv.height * 0.55, cv.height * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.72)
      g.addColorStop(0, 'rgba(10,18,30,0)')
      g.addColorStop(1, 'rgba(10,18,30,0.38)')
      c.fillStyle = g
      c.fillRect(0, 0, cv.width, cv.height)
      this.vign = cv
    }
    return this.vign
  }

  private updateBath(dt: number) {
    if (!sceneUi.bathOn) return
    const b = this.bath
    if (b.showerOn) {
      b.wet = Math.min(1, b.wet + dt * 1.5)
      if (b.foam > 0) b.foam = Math.max(0, b.foam - dt * 0.35)
      if (b.soaped && b.foam <= 0.02) b.rinsed = true
      this.updateBathHint()
    }
    if (b.soaped || b.wet > 0) this.anim.play('bathing', { loop: true })
    if (this.foamBlobs.length === 0) {
      for (let i = 0; i < 46; i++) this.foamBlobs.push({ x: (Math.random() * 2 - 1) * 56, y: -Math.random() * 108 - 4, r: 7 + Math.random() * 10 })
    }
  }

  // ---------- Çizim ----------

  private staticFor(room: RoomId): HTMLCanvasElement {
    const s = store.state
    const rs = s.rooms[room]
    const clock = clockOf(s.worldMinutes)
    const key = `${room}|${rs.wallpaper}|${rs.floor}|${clock.season}|${room === 'vault' ? s.collection.length : 0}|${this.res.toFixed(2)}`
    let cv = this.statics.get(key)
    if (!cv) {
      if (this.statics.size > 12) this.statics.clear()
      cv = document.createElement('canvas')
      cv.width = Math.round(SCENE.w * this.res)
      cv.height = Math.round(SCENE.h * this.res)
      const c = cv.getContext('2d')!
      c.scale(this.res, this.res)
      drawStaticRoom(c, room, s, clock.season)
      this.statics.set(key, cv)
    }
    return cv
  }

  private render(frameDt: number) {
    const c = this.ctx
    if (!c) return
    const s = store.state
    const room = s.currentRoom
    const clock = clockOf(s.worldMinutes)
    const weather = weatherAt(s.worldMinutes)
    const low = s.settings.lowGfx
    const t = this.time
    let drawn = 0

    c.setTransform(this.res, 0, 0, this.res, 0, 0)
    c.fillStyle = '#1b2428'
    c.fillRect(0, 0, SCENE.w, SCENE.h)

    c.save()
    const reduce = s.settings.reduceMotion
    const px = reduce ? 0 : ((this.pointerHome.x - SCENE.w / 2) / SCENE.w) * -6
    const sh = this.shake
    if (sh > 0) c.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh)

    // pencere gökyüzü
    const outdoor = room === 'garden'
    const win = windowRect(room)
    const view = { clock, weather, t, px }
    if (outdoor) {
      drawOutdoor(c, { x: 0, y: 0, w: SCENE.w, h: GRID.wallRows * CELL }, view, clock.season, low)
      drawWindmill(c, 590, 250, t, clock.daylight)
    }
    else if (win) drawOutdoor(c, { x: win.x + 9, y: win.y + 9, w: win.w - 18, h: win.h - 18 }, view, clock.season, low)
    else {
      c.fillStyle = '#1b2428'
    }
    drawn += 3

    c.drawImage(this.staticFor(room), 0, 0, SCENE.w, SCENE.h)
    drawn++
    if (!low && !outdoor) this.drawShaft(c, room, clock.daylight, weather)

    // eşyalar
    const placed = s.rooms[room].placed
    const lights: LightSource[] = []
    const layers: { y: number; fn: () => void }[] = []
    const bedAsleep = s.pet.asleep && this.bedSpot()
    let bedOverlay: (() => void) | null = null
    for (const p of placed) {
      const it = ITEMS[p.item]
      const f = it.furn!
      const w = f.w * CELL
      const h = f.h * CELL
      const rt = this.runtime.get(p.uid)
      const env: FurnEnv = {
        t,
        on: p.on,
        growth: p.growth,
        tint: p.tint,
        seed: parseInt(p.uid.slice(-4), 36) % 1000,
        season: clock.season,
        hour: clock.hour,
        minute: clock.minute,
        bounce: rt?.bounce ?? 0,
        spin: rt ? t * 2 : 0,
      }
      const draw = () => {
        c.save()
        c.translate(p.x * CELL, p.y * CELL)
        if (p.flip) {
          c.translate(w, 0)
          c.scale(-1, 1)
        }
        drawFurniture(c, it.art, w, h, env)
        c.restore()
        drawn++
      }
      const flat = p.item.startsWith('rug')
      const sortY = f.zone === 'wall' ? -1000 : flat ? -500 : (p.y + f.h) * CELL
      layers.push({ y: sortY, fn: draw })
      if (bedAsleep && p.item.startsWith('bed')) {
        bedOverlay = () => {
          c.save()
          c.beginPath()
          c.rect(p.x * CELL - 4, p.y * CELL + h * 0.5, w + 8, h * 0.6)
          c.clip()
          draw()
          c.restore()
        }
      }
      const kind = f.interactive
      if (p.on) {
        const cx = p.x * CELL + w / 2
        const cy = p.y * CELL + h / 2
        if (kind === 'lamp') lights.push({ x: cx, y: cy, r: 150, color: 'rgba(255,214,130,A)', a: 0.55 })
        else if (kind === 'tv') lights.push({ x: cx, y: cy + 20, r: 140, color: 'rgba(150,190,255,A)', a: 0.35 })
        else if (kind === 'fireplace') lights.push({ x: cx, y: cy + 30, r: 190, color: 'rgba(255,150,70,A)', a: 0.5 })
      }
    }
    layers.sort((a, b) => a.y - b.y)
    const petY = this.actorY
    let petDone = false
    const drawPetNow = () => {
      this.drawActor(c)
      drawn += 16
      petDone = true
    }
    for (const l of layers) {
      if (!petDone && l.y > petY - 4) drawPetNow()
      l.fn()
    }
    if (!petDone) drawPetNow()
    if (bedOverlay) bedOverlay()

    if (this.prop) {
      const pr = this.prop
      c.save()
      c.translate(pr.x, pr.y)
      c.rotate(pr.rot)
      c.scale(pr.scale, pr.scale)
      drawArt(c, pr.art, pr.size)
      c.restore()
      drawn++
    }
    if (sceneUi.bathOn) this.drawBathProps(c)

    this.drawBubble(c)
    this.particles.draw(c)
    this.drawGift(c)
    drawn += this.particles.active

    // ışıklandırma
    const extraDark = s.pet.asleep && !s.pet.lampOn ? 0.33 : 0
    for (const sp of this.activeLights(room)) lights.push(sp)
    drawLighting(c, clock, outdoor, extraDark, lights, weather)

    if (!low) c.drawImage(this.vignette(), 0, 0, SCENE.w, SCENE.h)

    // dekor katmanı
    if (sceneUi.decorOn) this.drawDecorOverlay(c)

    if (this.flash > 0) {
      c.fillStyle = `rgba(255,255,255,${this.flash * 0.85})`
      c.fillRect(0, 0, SCENE.w, SCENE.h)
    }
    if (this.roomSwitch > 0) {
      c.fillStyle = `rgba(20,30,34,${this.roomSwitch * 1.6})`
      c.fillRect(0, 0, SCENE.w, SCENE.h)
    }
    c.restore()
    perf.drawn = drawn
    perf.particles = this.particles.active
    void frameDt
  }

  private activeLights(room: RoomId): LightSource[] {
    const s = store.state
    const out: LightSource[] = []
    const clock = clockOf(s.worldMinutes)
    const w = windowRect(room)
    if (w && clock.daylight > 0.1 && clock.daylight < 0.95 && !s.pet.asleep) {
      out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 200, color: 'rgba(255,225,160,A)', a: 0.12 })
    }
    if (clock.daylight < 0.65) {
      if (room === 'living') out.push({ x: 300, y: 118, r: 170, color: 'rgba(255,210,130,A)', a: 0.5 }, { x: 60, y: 125, r: 110, color: 'rgba(255,210,130,A)', a: 0.4 }, { x: 690, y: 125, r: 110, color: 'rgba(255,210,130,A)', a: 0.4 })
      if (room === 'study') out.push({ x: 40, y: 40, r: 140, color: 'rgba(255,210,130,A)', a: 0.45 })
    }
    if (s.pet.asleep && s.pet.lampOn && room === 'bedroom') out.push({ x: 360, y: 300, r: 220, color: 'rgba(255,200,120,A)', a: 0.22 })
    return out
  }

  private drawActor(c: CanvasRenderingContext2D) {
    const s = store.state
    const stg = this.stage()
    const sc = stageScale(stg) * PET_S
    const look = { hue: s.pet.hue, eyeHue: s.pet.eyeHue, stage: stg, equipped: s.pet.equipped, time: this.time }
    const lift = this.lifted ? Math.max(0, (GROUND_Y - this.actorY) * 0.4) : 0
    const hop = this.hopT > 0 ? Math.abs(Math.sin(this.hopT)) * 10 : 0
    const air = Math.max(0, (GROUND_Y - this.actorY))
    const shadowK = Math.max(0.35, 1 - (hop + air * 0.5) / 120)
    c.save()
    c.translate(this.actorX, this.actorY)
    c.fillStyle = `rgba(20,25,35,${0.28 * shadowK})`
    c.beginPath()
    c.ellipse(0, 2, 56 * sc * shadowK, 11 * sc * shadowK, 0, 0, 7)
    c.fill()
    const squash = this.hopT > 0 ? 1 + Math.sin(this.hopT * 2) * 0.03 : 1
    c.translate(0, -hop - lift * 0)
    c.scale(PET_S * squash, PET_S / squash)
    const drawn = { n: 0 }
    const p = this.anim.pose
    drawPet(c, look, p, drawn)
    if (sceneUi.bathOn) this.drawFoamOnPet(c, sc)
    c.restore()
  }

  private drawFoamOnPet(c: CanvasRenderingContext2D, _sc: number) {
    const b = this.bath
    const n = Math.floor(b.foam * this.foamBlobs.length)
    c.save()
    c.scale(stageScale(this.stage()), stageScale(this.stage()))
    for (let i = 0; i < n; i++) {
      const f = this.foamBlobs[i]
      c.beginPath()
      c.arc(f.x, f.y, f.r, 0, 7)
      c.fillStyle = 'rgba(255,255,255,0.92)'
      c.fill()
      c.lineWidth = 1.4
      c.strokeStyle = 'rgba(130,180,210,0.8)'
      c.stroke()
    }
    if (b.wet > 0.2 && b.foam < 0.3) {
      c.fillStyle = `rgba(140,200,235,${0.5 * b.wet})`
      for (let i = 0; i < 10; i++) {
        c.beginPath()
        c.ellipse(-40 + i * 9, -100 + ((i * 37 + this.time * 40) % 90), 2.4, 4, 0, 0, 7)
        c.fill()
      }
    }
    c.restore()
  }

  private drawBathProps(c: CanvasRenderingContext2D) {
    const tool = sceneUi.bathTool
    const p = this.pointerHome
    if (!tool || tool === 'shower') {
      if (tool === 'shower') {
        c.fillStyle = 'rgba(150,210,240,0.25)'
        c.beginPath()
        c.moveTo(335, 70)
        c.lineTo(391, 70)
        c.lineTo(430, 470)
        c.lineTo(296, 470)
        c.closePath()
        c.fill()
      }
      return
    }
    c.save()
    c.translate(p.x, p.y)
    const art: [string, string, string?] =
      tool === 'soap' ? ['badge', '#8fd0e8', '#fff'] : tool === 'sponge' ? ['cloth', '#f2cf4a'] : ['cloth', '#e8746a']
    drawArt(c, art, 54)
    c.restore()
  }

  private drawDecorOverlay(c: CanvasRenderingContext2D) {
    const s = store.state
    c.save()
    c.strokeStyle = 'rgba(255,255,255,0.18)'
    c.lineWidth = 1
    c.beginPath()
    for (let x = 0; x <= GRID.cols; x++) {
      c.moveTo(x * CELL, 0)
      c.lineTo(x * CELL, SCENE.h)
    }
    for (let y = 0; y <= GRID.rows; y++) {
      c.moveTo(0, y * CELL)
      c.lineTo(SCENE.w, y * CELL)
    }
    c.stroke()
    c.setLineDash([6, 5])
    c.strokeStyle = 'rgba(255,255,255,0.55)'
    c.beginPath()
    c.moveTo(0, GRID.wallRows * CELL)
    c.lineTo(SCENE.w, GRID.wallRows * CELL)
    c.stroke()
    c.setLineDash([])
    for (const f of ROOMS[s.currentRoom].fixtures) {
      c.fillStyle = 'rgba(40,40,60,0.3)'
      c.fillRect(f.x * CELL, f.y * CELL, f.w * CELL, f.h * CELL)
    }
    const sel = s.rooms[s.currentRoom].placed.find((p) => p.uid === sceneUi.selected)
    if (sel) {
      const f = ITEMS[sel.item].furn!
      c.lineWidth = 3
      c.strokeStyle = '#f2cf4a'
      c.setLineDash([8, 5])
      c.lineDashOffset = -this.time * 20
      c.strokeRect(sel.x * CELL - 2, sel.y * CELL - 2, f.w * CELL + 4, f.h * CELL + 4)
      c.setLineDash([])
    }
    if (this.ghost && (sceneUi.placing || sel)) {
      const id = sceneUi.placing ?? sel!.item
      const f = ITEMS[id].furn!
      c.fillStyle = this.ghost.ok ? 'rgba(120,230,160,0.38)' : 'rgba(240,100,90,0.42)'
      c.fillRect(this.ghost.x * CELL, this.ghost.y * CELL, f.w * CELL, f.h * CELL)
      c.globalAlpha = 0.8
      c.save()
      c.translate(this.ghost.x * CELL, this.ghost.y * CELL)
      drawFurniture(c, ITEMS[id].art, f.w * CELL, f.h * CELL, { t: this.time, on: false, growth: 60, tint: 0, seed: 1, season: 'summer', hour: 12, minute: 0, bounce: 0, spin: 0 })
      c.restore()
      c.globalAlpha = 1
    }
    c.restore()
  }
}

export const scene = new Scene()
