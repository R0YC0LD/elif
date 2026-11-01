import { seeded } from '../game/rng'

type Wave = OscillatorType

interface Tone {
  f: number
  d: number
  at?: number
  type?: Wave
  vol?: number
  to?: number
  bell?: boolean
  verb?: number
}

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

const N = (name: string): number => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  if (!m) return 440
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const semi = base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12
  return midiHz(semi)
}

const arp = (names: string[], step: number, d: number, type: Wave = 'triangle', vol = 0.6, bell = false): Tone[] =>
  names.map((n, i) => ({ f: N(n), d, at: i * step, type, vol, bell }))

const SFX: Record<string, Tone[]> = {
  click: [{ f: 640, d: 0.05, type: 'triangle', vol: 0.45 }, { f: 1280, d: 0.03, type: 'sine', vol: 0.12 }],
  open: [{ f: 440, d: 0.08, type: 'triangle' }, { f: 660, d: 0.12, at: 0.05, type: 'triangle', verb: 0.3 }],
  close: [{ f: 620, d: 0.06, type: 'triangle' }, { f: 400, d: 0.09, at: 0.05, type: 'triangle' }],
  coin: [{ f: N('E6'), d: 0.07, type: 'square', vol: 0.18 }, { f: N('B6'), d: 0.28, at: 0.06, type: 'sine', vol: 0.45, bell: true, verb: 0.35 }],
  xp: [{ f: N('G5'), d: 0.08, type: 'sine' }, { f: N('C6'), d: 0.16, at: 0.07, type: 'sine', bell: true }],
  levelup: [...arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.09, 0.4, 'triangle', 0.55, true), { f: N('C4'), d: 0.9, at: 0, type: 'sine', vol: 0.5, verb: 0.5 }],
  achievement: arp(['G5', 'B5', 'D6', 'G6'], 0.08, 0.5, 'sine', 0.6, true),
  quest: [{ f: N('D5'), d: 0.1, type: 'triangle' }, { f: N('A5'), d: 0.3, at: 0.1, type: 'sine', bell: true, verb: 0.3 }],
  buy: [{ f: N('A5'), d: 0.06, type: 'square', vol: 0.16 }, { f: N('E6'), d: 0.2, at: 0.06, type: 'sine', bell: true, vol: 0.5 }],
  error: [{ f: 190, d: 0.16, type: 'sawtooth', vol: 0.22, to: 120 }, { f: 150, d: 0.18, at: 0.08, type: 'square', vol: 0.12, to: 100 }],
  place: [{ f: 220, d: 0.1, type: 'sine', vol: 0.7, to: 130 }, { f: 520, d: 0.04, type: 'triangle', vol: 0.2 }],
  craft: arp(['C5', 'D5', 'F5', 'A5', 'C6'], 0.07, 0.2, 'triangle', 0.5, true),
  explore: arp(['E4', 'G4', 'B4', 'E5'], 0.12, 0.3, 'triangle', 0.5, true),
  room: [{ f: 300, d: 0.16, type: 'sine', to: 560, vol: 0.45, verb: 0.25 }],
  happy: [{ f: 520, d: 0.09, type: 'sine', to: 700 }, { f: 700, d: 0.12, at: 0.08, type: 'sine', to: 900 }],
  sad: [{ f: 420, d: 0.2, type: 'sine', to: 300 }, { f: 300, d: 0.26, at: 0.18, type: 'sine', to: 220 }],
  yuck: [{ f: 200, d: 0.3, type: 'sawtooth', vol: 0.18, to: 110 }],
  pet: [{ f: 760, d: 0.06, type: 'sine', vol: 0.3 }, { f: 940, d: 0.08, at: 0.04, type: 'sine', vol: 0.24 }],
  poke: [{ f: 500, d: 0.07, type: 'triangle', to: 680 }],
  giggle: [0, 1, 2, 3, 4, 5].map((i) => ({ f: 680 + (i % 2) * 150 + i * 14, d: 0.06, at: i * 0.07, type: 'sine' as Wave, vol: 0.45 })),
  bite: [{ f: 170, d: 0.06, type: 'square', vol: 0.18, to: 90 }],
  chew: [{ f: 140, d: 0.04, type: 'square', vol: 0.1, to: 100 }, { f: 130, d: 0.04, at: 0.09, type: 'square', vol: 0.08, to: 90 }],
  gulp: [{ f: 260, d: 0.12, type: 'sine', to: 110, vol: 0.5 }],
  splash: [{ f: 900, d: 0.06, type: 'sine', vol: 0.12, to: 480 }],
  sick: [{ f: 220, d: 0.34, type: 'triangle', to: 140, vol: 0.4 }],
  heal: arp(['C5', 'E5', 'G5', 'C6'], 0.09, 0.3, 'sine', 0.5, true),
  wake: [{ f: N('C5'), d: 0.14, type: 'sine' }, { f: N('G5'), d: 0.26, at: 0.1, type: 'sine', bell: true }],
  snore: [{ f: 110, d: 0.55, type: 'sine', vol: 0.18, to: 85 }],
  drum: [{ f: 150, d: 0.14, type: 'sine', vol: 0.9, to: 55 }],
  ball: [{ f: 320, d: 0.09, type: 'sine', to: 560 }],
  fail: arp(['E4', 'D4', 'C4'], 0.14, 0.28, 'triangle', 0.5),
  win: arp(['C5', 'E5', 'G5', 'C6'], 0.09, 0.3, 'square', 0.2),
  bomb: [{ f: 130, d: 0.34, type: 'sawtooth', vol: 0.45, to: 40 }],
  jump: [{ f: 300, d: 0.13, type: 'square', vol: 0.16, to: 580 }],
  slide: [{ f: 420, d: 0.14, type: 'sawtooth', vol: 0.1, to: 200 }],
  tick: [{ f: 1000, d: 0.03, type: 'square', vol: 0.12 }],
  flip: [{ f: 720, d: 0.05, type: 'triangle', vol: 0.4 }],
  match: [{ f: N('E5'), d: 0.08, type: 'sine' }, { f: N('A5'), d: 0.2, at: 0.07, type: 'sine', bell: true }],
  mismatch: [{ f: 260, d: 0.14, type: 'triangle', vol: 0.4, to: 190 }],
  combo: [{ f: N('G5'), d: 0.06, type: 'square', vol: 0.16 }, { f: N('D6'), d: 0.18, at: 0.05, type: 'sine', bell: true, vol: 0.5 }],
  power: arp(['C5', 'G5', 'C6'], 0.05, 0.12, 'sawtooth', 0.2),
  sparkle: arp(['E6', 'G6', 'B6', 'E7'], 0.04, 0.2, 'sine', 0.3, true),
  pop: [{ f: 600, d: 0.05, type: 'sine', vol: 0.5, to: 1200 }],
  bubble: [{ f: 500, d: 0.08, type: 'sine', vol: 0.3, to: 900 }],
}

interface Theme {
  bpm: number
  root: number
  scale: number[]
  prog: number[]
  lead: Wave
  leadVol: number
  bell?: boolean
  pad: Wave
  padVol: number
  bass?: 'sub' | 'walk' | 'pulse'
  drums?: 'soft' | 'bounce' | 'drive'
  density: number
  octave: number
  verb: number
  cutoff: number
  vibrato?: boolean
  birds?: boolean
}

const MAJ = [0, 2, 4, 5, 7, 9, 11]
const PENT = [0, 2, 4, 7, 9]
const MIN = [0, 2, 3, 5, 7, 8, 10]
const MINPENT = [0, 3, 5, 7, 10]
const LYD = [0, 2, 4, 6, 7, 9, 11]
const DOR = [0, 2, 3, 5, 7, 9, 10]

export const THEMES: Record<string, Theme> = {
  living: { bpm: 84, root: 60, scale: PENT, prog: [0, 5, 3, 4], lead: 'triangle', leadVol: 0.2, pad: 'sine', padVol: 0.1, bass: 'sub', density: 0.5, octave: 0, verb: 0.35, cutoff: 5200 },
  kitchen: { bpm: 108, root: 65, scale: MAJ, prog: [0, 3, 4, 0], lead: 'triangle', leadVol: 0.2, pad: 'triangle', padVol: 0.06, bass: 'walk', drums: 'soft', density: 0.65, octave: 0, verb: 0.2, cutoff: 6500 },
  bathroom: { bpm: 96, root: 62, scale: LYD, prog: [0, 1, 0, 4], lead: 'sine', leadVol: 0.28, bell: true, pad: 'sine', padVol: 0.08, bass: 'pulse', density: 0.55, octave: 1, verb: 0.55, cutoff: 7000 },
  bedroom: { bpm: 60, root: 57, scale: MINPENT, prog: [0, 3, 4, 3], lead: 'sine', leadVol: 0.26, bell: true, pad: 'sine', padVol: 0.12, density: 0.32, octave: 1, verb: 0.7, cutoff: 3600 },
  playroom: { bpm: 124, root: 67, scale: MAJ, prog: [0, 4, 5, 3], lead: 'square', leadVol: 0.07, pad: 'triangle', padVol: 0.05, bass: 'pulse', drums: 'bounce', density: 0.8, octave: 0, verb: 0.15, cutoff: 8000 },
  garden: { bpm: 76, root: 64, scale: PENT, prog: [0, 2, 3, 4], lead: 'sine', leadVol: 0.24, pad: 'sine', padVol: 0.1, bass: 'sub', density: 0.45, octave: 0, verb: 0.6, cutoff: 6000, vibrato: true, birds: true },
  study: { bpm: 70, root: 62, scale: DOR, prog: [0, 3, 5, 3], lead: 'triangle', leadVol: 0.2, pad: 'sine', padVol: 0.09, bass: 'sub', density: 0.4, octave: 0, verb: 0.45, cutoff: 4200 },
  vault: { bpm: 66, root: 58, scale: LYD, prog: [0, 2, 4, 1], lead: 'sine', leadVol: 0.24, bell: true, pad: 'triangle', padVol: 0.1, density: 0.42, octave: 1, verb: 0.85, cutoff: 5000 },
  coinrush: { bpm: 136, root: 60, scale: MAJ, prog: [0, 5, 3, 4], lead: 'square', leadVol: 0.07, pad: 'triangle', padVol: 0.05, bass: 'pulse', drums: 'drive', density: 0.85, octave: 0, verb: 0.12, cutoff: 9000 },
  memory: { bpm: 94, root: 65, scale: PENT, prog: [0, 3, 0, 4], lead: 'triangle', leadVol: 0.22, bell: true, pad: 'sine', padVol: 0.07, bass: 'walk', drums: 'soft', density: 0.6, octave: 0, verb: 0.3, cutoff: 6500 },
  reaction: { bpm: 142, root: 57, scale: MIN, prog: [0, 5, 3, 6], lead: 'sawtooth', leadVol: 0.05, pad: 'triangle', padVol: 0.05, bass: 'pulse', drums: 'drive', density: 0.9, octave: 0, verb: 0.15, cutoff: 7500 },
  runner: { bpm: 150, root: 62, scale: MAJ, prog: [0, 4, 5, 3], lead: 'square', leadVol: 0.07, pad: 'triangle', padVol: 0.05, bass: 'pulse', drums: 'drive', density: 0.9, octave: 0, verb: 0.15, cutoff: 9000 },
  stack: { bpm: 100, root: 60, scale: PENT, prog: [0, 2, 3, 2], lead: 'sine', leadVol: 0.26, bell: true, pad: 'sine', padVol: 0.08, bass: 'sub', density: 0.5, octave: 0, verb: 0.5, cutoff: 5600 },
  colormatch: { bpm: 116, root: 64, scale: MAJ, prog: [0, 4, 3, 4], lead: 'triangle', leadVol: 0.2, pad: 'triangle', padVol: 0.05, bass: 'walk', drums: 'bounce', density: 0.7, octave: 0, verb: 0.2, cutoff: 7000 },
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private comp!: DynamicsCompressorNode
  private sfxGain!: GainNode
  private musicGain!: GainNode
  private musicFade!: GainNode
  private musicFilter!: BiquadFilterNode
  private verb!: ConvolverNode
  private verbMusic!: GainNode
  private verbSfx!: GainNode
  private noiseBuf: AudioBuffer | null = null
  private musicOn = true
  private sfxOn = true
  private nextStep = 0
  private step = 0
  private timer: number | null = null
  private night = false
  private themeId = 'living'
  private motifs = new Map<string, (number | null)[]>()
  private lastPlay: Record<string, number> = {}

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.comp = ctx.createDynamicsCompressor()
    this.comp.threshold.value = -16
    this.comp.knee.value = 18
    this.comp.ratio.value = 4
    this.comp.attack.value = 0.004
    this.comp.release.value = 0.22
    this.master = ctx.createGain()
    this.master.gain.value = 0.92
    this.comp.connect(this.master)
    this.master.connect(ctx.destination)

    this.verb = ctx.createConvolver()
    this.verb.buffer = this.makeImpulse(2.4)
    const verbOut = ctx.createGain()
    verbOut.gain.value = 0.9
    this.verb.connect(verbOut)
    verbOut.connect(this.comp)

    this.sfxGain = ctx.createGain()
    this.sfxGain.connect(this.comp)
    this.verbSfx = ctx.createGain()
    this.verbSfx.gain.value = 0.22
    this.sfxGain.connect(this.verbSfx)
    this.verbSfx.connect(this.verb)

    this.musicGain = ctx.createGain()
    this.musicFade = ctx.createGain()
    this.musicFilter = ctx.createBiquadFilter()
    this.musicFilter.type = 'lowpass'
    this.musicFilter.frequency.value = 6000
    this.musicFilter.Q.value = 0.5
    this.musicFade.connect(this.musicFilter)
    this.musicFilter.connect(this.musicGain)
    this.musicGain.connect(this.comp)
    this.verbMusic = ctx.createGain()
    this.verbMusic.gain.value = 0.4
    this.musicGain.connect(this.verbMusic)
    this.verbMusic.connect(this.verb)

    const len = ctx.sampleRate
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.applyTheme(false)
    this.nextStep = ctx.currentTime + 0.15
    if (this.musicOn) this.startMusic()
  }

  private makeImpulse(sec: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * sec)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const t = i / len
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1)
      }
    }
    return buf
  }

  configure(opts: { music: boolean; sfx: boolean; musicVol: number; sfxVol: number }) {
    this.musicOn = opts.music
    this.sfxOn = opts.sfx
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.musicGain.gain.setTargetAtTime(opts.music ? opts.musicVol * 0.55 : 0, t, 0.06)
    this.sfxGain.gain.setTargetAtTime(opts.sfx ? opts.sfxVol * 0.7 : 0, t, 0.02)
    if (opts.music) this.startMusic()
    else this.stopMusic()
  }

  setMood(m: 'day' | 'night') {
    const n = m === 'night'
    if (n === this.night) return
    this.night = n
    this.applyTheme(false)
  }

  setTheme(id: string) {
    if (!THEMES[id] || id === this.themeId) return
    this.themeId = id
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.musicFade.gain.cancelScheduledValues(t)
    this.musicFade.gain.setValueAtTime(this.musicFade.gain.value, t)
    this.musicFade.gain.linearRampToValueAtTime(0.0001, t + 0.3)
    this.musicFade.gain.linearRampToValueAtTime(1, t + 0.9)
    this.applyTheme(true)
  }

  private applyTheme(reset: boolean) {
    if (!this.ctx) return
    const th = THEMES[this.themeId]
    const t = this.ctx.currentTime
    this.musicFilter.frequency.setTargetAtTime(this.night ? th.cutoff * 0.6 : th.cutoff, t, 0.4)
    this.verbMusic.gain.setTargetAtTime(th.verb, t, 0.3)
    if (reset) {
      this.step = 0
      this.nextStep = Math.max(this.nextStep, t + 0.32)
    }
  }

  suspend(on: boolean) {
    if (!this.ctx) return
    if (on) void this.ctx.suspend()
    else void this.ctx.resume()
  }

  play(name: string) {
    if (!this.ctx || !this.sfxOn) return
    const tones = SFX[name]
    if (!tones) return
    const now = this.ctx.currentTime
    const wall = performance.now()
    if (wall - (this.lastPlay[name] ?? 0) < 35) return
    this.lastPlay[name] = wall
    if (name === 'splash' || name === 'chew') this.noise(now, 0.07, 0.07, 2200, 'bandpass')
    if (name === 'bomb') this.noise(now, 0.4, 0.3, 500, 'lowpass')
    if (name === 'slide' || name === 'room') this.noise(now, 0.2, 0.08, 1800, 'bandpass')
    for (const t of tones) this.tone(now + (t.at ?? 0), t)
  }

  private tone(at: number, t: Tone) {
    const ctx = this.ctx!
    const v = t.vol ?? 0.6
    const mk = (freq: number, vol: number, type: Wave, detune = 0) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.detune.value = detune
      o.frequency.setValueAtTime(freq, at)
      if (t.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, t.to * (freq / t.f)), at + t.d)
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(vol, at + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, at + t.d)
      o.connect(g)
      g.connect(this.sfxGain)
      o.start(at)
      o.stop(at + t.d + 0.03)
    }
    mk(t.f, v, t.type ?? 'sine')
    mk(t.f, v * 0.5, t.type ?? 'sine', 7)
    if (t.bell) {
      mk(t.f * 2.76, v * 0.18, 'sine')
      mk(t.f * 5.4, v * 0.07, 'sine')
    }
  }

  private noise(at: number, d: number, vol: number, freq: number, type: BiquadFilterType, dest?: AudioNode) {
    const ctx = this.ctx!
    if (!this.noiseBuf) return
    const s = ctx.createBufferSource()
    s.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + d)
    s.connect(f)
    f.connect(g)
    g.connect(dest ?? this.sfxGain)
    s.start(at)
    s.stop(at + d)
  }

  // ---------- Müzik ----------

  private startMusic() {
    if (this.timer !== null || !this.ctx) return
    this.nextStep = Math.max(this.nextStep, this.ctx.currentTime + 0.1)
    this.timer = window.setInterval(() => this.schedule(), 80)
  }

  private stopMusic() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private motif(id: string, th: Theme): (number | null)[] {
    let m = this.motifs.get(id)
    if (!m) {
      const rnd = seeded(`motif:${id}`)
      m = []
      let deg = Math.floor(rnd() * th.scale.length)
      for (let i = 0; i < 32; i++) {
        const strong = i % 4 === 0
        if (rnd() < th.density * (strong ? 1.1 : 0.7)) {
          deg += Math.floor(rnd() * 5) - 2
          deg = Math.max(0, Math.min(th.scale.length * 2 - 1, deg))
          m.push(deg)
        } else m.push(null)
      }
      this.motifs.set(id, m)
    }
    return m
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    const th = THEMES[this.themeId]
    const bpm = th.bpm * (this.night ? 0.88 : 1)
    const stepLen = 60 / bpm / 4
    while (this.nextStep < ctx.currentTime + 0.4) {
      this.playStep(this.nextStep, this.step, th, stepLen)
      this.nextStep += stepLen
      this.step++
    }
  }

  private pitch(th: Theme, degree: number, chordOffset: number, oct = 0) {
    const len = th.scale.length
    const idx = degree + chordOffset
    const o = Math.floor(idx / len)
    const s = th.scale[((idx % len) + len) % len]
    return th.root + s + 12 * (o + oct + th.octave)
  }

  private voice(at: number, midi: number, dur: number, vol: number, type: Wave, opts: { bell?: boolean; vibrato?: boolean; attack?: number } = {}) {
    const ctx = this.ctx!
    const f = midiHz(midi)
    const mk = (freq: number, v: number, detune: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.value = freq
      o.detune.value = detune
      if (opts.vibrato) {
        const l = ctx.createOscillator()
        const lg = ctx.createGain()
        l.frequency.value = 5.2
        lg.gain.value = 9
        l.connect(lg)
        lg.connect(o.detune)
        l.start(at)
        l.stop(at + dur + 0.1)
      }
      const a = opts.attack ?? 0.012
      g.gain.setValueAtTime(0.0001, at)
      g.gain.linearRampToValueAtTime(v, at + a)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      o.connect(g)
      g.connect(this.musicFade)
      o.start(at)
      o.stop(at + dur + 0.05)
    }
    mk(f, vol, -4)
    mk(f, vol * 0.7, 5)
    if (opts.bell) {
      mk(f * 2.76, vol * 0.2, 0)
      mk(f * 4.1, vol * 0.08, 0)
    }
  }

  private playStep(at: number, step: number, th: Theme, stepLen: number) {
    const bar = Math.floor(step / 16)
    const inBar = step % 16
    const chordDeg = th.prog[bar % th.prog.length]
    const nightK = this.night ? 0.75 : 1

    if (inBar === 0) {
      const dur = stepLen * 15.5
      for (const k of [0, 2, 4]) this.voice(at, this.pitch(th, chordDeg + k, 0, -1), dur, th.padVol * nightK, th.pad, { attack: dur * 0.35 })
    }
    if (th.bass) {
      const root = this.pitch(th, chordDeg, 0, -2)
      if (th.bass === 'sub' && (inBar === 0 || inBar === 8)) this.voice(at, root, stepLen * 7, 0.2 * nightK, 'sine', { attack: 0.02 })
      if (th.bass === 'walk' && inBar % 4 === 0) this.voice(at, root + (inBar === 8 ? 7 : inBar === 12 ? 4 : 0), stepLen * 3.2, 0.2 * nightK, 'triangle')
      if (th.bass === 'pulse' && inBar % 2 === 0) this.voice(at, root + (inBar % 8 === 6 ? 7 : 0), stepLen * 1.6, 0.14 * nightK, 'triangle')
    }
    if (th.drums) {
      const ctx = this.ctx!
      const hard = th.drums === 'drive'
      if (inBar % 8 === 0 || (hard && inBar % 4 === 0)) this.kick(at, hard ? 0.34 : 0.22)
      if (th.drums !== 'soft' && (inBar === 4 || inBar === 12)) this.noise(at, 0.12, hard ? 0.16 : 0.1, 1800, 'bandpass', this.musicFade)
      if (inBar % 2 === 1 || hard) this.noise(at, 0.03, hard ? 0.06 : 0.04, 7500, 'highpass', this.musicFade)
      void ctx
    }
    const m = this.motif(this.themeId, th)
    const n = m[(step + (bar % 2 === 1 ? 0 : 0)) % 32]
    if (n !== null && n !== undefined) {
      const oct = bar % 4 === 3 && inBar >= 8 ? 1 : 0
      const midi = this.pitch(th, n, chordDeg, oct)
      const len = stepLen * (th.bell ? 5 : 2.4)
      this.voice(at, midi, len, th.leadVol * nightK, th.lead, { bell: th.bell, vibrato: th.vibrato })
    }
    if (th.birds && !this.night && inBar === 6 && bar % 3 === 1) this.chirp(at + stepLen * 0.3)
    if (th.birds && this.night && inBar === 3 && bar % 2 === 0) this.cricket(at)
  }

  private kick(at: number, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(140, at)
    o.frequency.exponentialRampToValueAtTime(42, at + 0.12)
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
    o.connect(g)
    g.connect(this.musicFade)
    o.start(at)
    o.stop(at + 0.22)
  }

  private chirp(at: number) {
    const ctx = this.ctx!
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const t0 = at + i * 0.09
      o.frequency.setValueAtTime(2600 + i * 300, t0)
      o.frequency.exponentialRampToValueAtTime(3400 + i * 200, t0 + 0.06)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07)
      o.connect(g)
      g.connect(this.musicFade)
      o.start(t0)
      o.stop(t0 + 0.09)
    }
  }

  private cricket(at: number) {
    const ctx = this.ctx!
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const t0 = at + i * 0.05
      o.frequency.value = 4200
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035)
      o.connect(g)
      g.connect(this.musicFade)
      o.start(t0)
      o.stop(t0 + 0.05)
    }
  }
}

export const audio = new AudioEngine()
