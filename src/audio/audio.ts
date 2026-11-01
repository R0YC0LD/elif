type Wave = OscillatorType

interface Tone {
  f: number
  d: number
  at?: number
  type?: Wave
  vol?: number
  to?: number
}

const N = (name: string): number => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  if (!m) return 440
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  let semi = base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  semi += (Number(m[3]) - 4) * 12
  return 261.6256 * Math.pow(2, semi / 12)
}

const SFX: Record<string, Tone[]> = {
  click: [{ f: 620, d: 0.05, type: 'triangle', vol: 0.5 }],
  open: [{ f: 440, d: 0.07, type: 'triangle' }, { f: 660, d: 0.09, at: 0.05, type: 'triangle' }],
  close: [{ f: 600, d: 0.06, type: 'triangle' }, { f: 400, d: 0.08, at: 0.05, type: 'triangle' }],
  coin: [{ f: N('E6'), d: 0.07, type: 'square', vol: 0.3 }, { f: N('B6'), d: 0.16, at: 0.06, type: 'square', vol: 0.3 }],
  xp: [{ f: N('G5'), d: 0.08, type: 'sine' }, { f: N('C6'), d: 0.12, at: 0.07, type: 'sine' }],
  levelup: [N('C5'), N('E5'), N('G5'), N('C6'), N('E6')].map((f, i) => ({ f, d: 0.16, at: i * 0.1, type: 'triangle' as Wave, vol: 0.7 })),
  achievement: [N('G5'), N('B5'), N('D6'), N('G6')].map((f, i) => ({ f, d: 0.2, at: i * 0.09, type: 'sine' as Wave, vol: 0.7 })),
  quest: [{ f: N('D5'), d: 0.1, type: 'triangle' }, { f: N('A5'), d: 0.2, at: 0.1, type: 'triangle' }],
  buy: [{ f: N('A5'), d: 0.06, type: 'square', vol: 0.25 }, { f: N('E6'), d: 0.12, at: 0.06, type: 'square', vol: 0.25 }],
  error: [{ f: 180, d: 0.14, type: 'sawtooth', vol: 0.3, to: 120 }],
  place: [{ f: 220, d: 0.08, type: 'sine', vol: 0.7, to: 140 }],
  craft: [N('C5'), N('D5'), N('F5'), N('A5')].map((f, i) => ({ f, d: 0.09, at: i * 0.07, type: 'triangle' as Wave })),
  explore: [{ f: N('E4'), d: 0.12, type: 'triangle' }, { f: N('G4'), d: 0.12, at: 0.12, type: 'triangle' }, { f: N('B4'), d: 0.2, at: 0.24, type: 'triangle' }],
  room: [{ f: 300, d: 0.12, type: 'sine', to: 520, vol: 0.5 }],
  happy: [{ f: 520, d: 0.08, type: 'sine', to: 700 }, { f: 700, d: 0.1, at: 0.08, type: 'sine', to: 880 }],
  sad: [{ f: 420, d: 0.18, type: 'sine', to: 300 }, { f: 300, d: 0.22, at: 0.18, type: 'sine', to: 220 }],
  yuck: [{ f: 200, d: 0.25, type: 'sawtooth', vol: 0.2, to: 120 }],
  pet: [{ f: 760, d: 0.05, type: 'sine', vol: 0.35 }, { f: 900, d: 0.06, at: 0.04, type: 'sine', vol: 0.3 }],
  poke: [{ f: 500, d: 0.06, type: 'triangle', to: 640 }],
  giggle: [0, 1, 2, 3, 4].map((i) => ({ f: 680 + (i % 2) * 140, d: 0.06, at: i * 0.07, type: 'sine' as Wave, vol: 0.5 })),
  bite: [{ f: 160, d: 0.05, type: 'square', vol: 0.2, to: 90 }],
  chew: [{ f: 140, d: 0.04, type: 'square', vol: 0.12, to: 100 }, { f: 130, d: 0.04, at: 0.09, type: 'square', vol: 0.1, to: 90 }],
  gulp: [{ f: 260, d: 0.1, type: 'sine', to: 120, vol: 0.5 }],
  splash: [{ f: 900, d: 0.05, type: 'sine', vol: 0.15, to: 500 }],
  sick: [{ f: 220, d: 0.3, type: 'triangle', to: 150, vol: 0.4 }],
  heal: [N('C5'), N('E5'), N('G5')].map((f, i) => ({ f, d: 0.15, at: i * 0.09, type: 'sine' as Wave })),
  wake: [{ f: N('C5'), d: 0.12, type: 'sine' }, { f: N('G5'), d: 0.2, at: 0.1, type: 'sine' }],
  snore: [{ f: 110, d: 0.5, type: 'sine', vol: 0.2, to: 90 }],
  drum: [{ f: 150, d: 0.12, type: 'sine', vol: 0.9, to: 60 }],
  ball: [{ f: 320, d: 0.08, type: 'sine', to: 540 }],
  fail: [N('E4'), N('D4'), N('C4')].map((f, i) => ({ f, d: 0.2, at: i * 0.14, type: 'triangle' as Wave })),
  win: [N('C5'), N('E5'), N('G5'), N('C6')].map((f, i) => ({ f, d: 0.14, at: i * 0.09, type: 'square' as Wave, vol: 0.28 })),
  bomb: [{ f: 120, d: 0.3, type: 'sawtooth', vol: 0.5, to: 40 }],
  jump: [{ f: 300, d: 0.12, type: 'square', vol: 0.2, to: 560 }],
  slide: [{ f: 400, d: 0.12, type: 'sawtooth', vol: 0.12, to: 200 }],
  tick: [{ f: 1000, d: 0.03, type: 'square', vol: 0.15 }],
  flip: [{ f: 700, d: 0.05, type: 'triangle', vol: 0.4 }],
  match: [{ f: N('E5'), d: 0.08, type: 'sine' }, { f: N('A5'), d: 0.14, at: 0.07, type: 'sine' }],
  mismatch: [{ f: 260, d: 0.12, type: 'triangle', vol: 0.4, to: 200 }],
  combo: [{ f: N('G5'), d: 0.06, type: 'square', vol: 0.2 }, { f: N('D6'), d: 0.1, at: 0.05, type: 'square', vol: 0.2 }],
  power: [N('C5'), N('G5'), N('C6')].map((f, i) => ({ f, d: 0.08, at: i * 0.05, type: 'sawtooth' as Wave, vol: 0.25 })),
}

const SCALE = [0, 2, 4, 7, 9]
const PROGRESSION = [
  { root: 'C3', notes: ['C4', 'E4', 'G4'] },
  { root: 'A2', notes: ['A3', 'C4', 'E4'] },
  { root: 'F2', notes: ['F3', 'A3', 'C4'] },
  { root: 'G2', notes: ['G3', 'B3', 'D4'] },
]

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private sfxGain!: GainNode
  private musicGain!: GainNode
  private noiseBuf: AudioBuffer | null = null
  private musicOn = true
  private sfxOn = true
  private nextBeat = 0
  private beat = 0
  private timer: number | null = null
  private mood: 'day' | 'night' = 'day'
  private lastPlay: Record<string, number> = {}

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(this.ctx.destination)
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.connect(this.master)
    this.musicGain = this.ctx.createGain()
    this.musicGain.connect(this.master)
    const len = this.ctx.sampleRate * 0.5
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.nextBeat = this.ctx.currentTime + 0.2
    if (this.musicOn) this.startMusic()
  }

  configure(opts: { music: boolean; sfx: boolean; musicVol: number; sfxVol: number }) {
    this.musicOn = opts.music
    this.sfxOn = opts.sfx
    if (this.ctx) {
      this.musicGain.gain.setTargetAtTime(opts.music ? opts.musicVol * 0.35 : 0, this.ctx.currentTime, 0.05)
      this.sfxGain.gain.setTargetAtTime(opts.sfx ? opts.sfxVol * 0.6 : 0, this.ctx.currentTime, 0.02)
      if (opts.music) this.startMusic()
      else this.stopMusic()
    }
  }

  setMood(m: 'day' | 'night') {
    this.mood = m
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
    if (name === 'splash' || name === 'chew') this.noise(now, 0.06, 0.08)
    for (const t of tones) this.tone(now + (t.at ?? 0), t)
  }

  private tone(at: number, t: Tone) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = t.type ?? 'sine'
    o.frequency.setValueAtTime(t.f, at)
    if (t.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), at + t.d)
    const v = t.vol ?? 0.6
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(v, at + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, at + t.d)
    o.connect(g)
    g.connect(this.sfxGain)
    o.start(at)
    o.stop(at + t.d + 0.02)
  }

  private noise(at: number, d: number, vol: number) {
    const ctx = this.ctx!
    if (!this.noiseBuf) return
    const s = ctx.createBufferSource()
    s.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 2200
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + d)
    s.connect(f)
    f.connect(g)
    g.connect(this.sfxGain)
    s.start(at)
    s.stop(at + d)
  }

  private startMusic() {
    if (this.timer !== null || !this.ctx) return
    this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + 0.1)
    this.timer = window.setInterval(() => this.schedule(), 100)
  }

  private stopMusic() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    const bpm = this.mood === 'night' ? 66 : 88
    const beatLen = 60 / bpm
    while (this.nextBeat < ctx.currentTime + 0.35) {
      this.playBeat(this.nextBeat, this.beat, beatLen)
      this.nextBeat += beatLen
      this.beat++
    }
  }

  private mtone(at: number, f: number, d: number, vol: number, type: Wave) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.06, d / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, at + d)
    o.connect(g)
    g.connect(this.musicGain)
    o.start(at)
    o.stop(at + d + 0.05)
  }

  private playBeat(at: number, beat: number, len: number) {
    const bar = Math.floor(beat / 4) % PROGRESSION.length
    const inBar = beat % 4
    const chord = PROGRESSION[bar]
    if (inBar === 0) {
      this.mtone(at, N(chord.root), len * 3.8, 0.5, 'sine')
      for (const n of chord.notes) this.mtone(at, N(n) * (this.mood === 'night' ? 1 : 2), len * 3.6, 0.1, 'triangle')
    }
    const arpSteps = this.mood === 'night' ? [0, 2] : [0, 1, 2, 3]
    if (arpSteps.includes(inBar)) {
      const step = (beat * 7 + bar * 3) % SCALE.length
      const oct = inBar === 2 ? 1 : 0
      const midi = 72 + SCALE[step] + oct * 12 - (bar === 1 ? 3 : 0)
      const f = 440 * Math.pow(2, (midi - 69) / 12)
      this.mtone(at, f, len * 1.6, 0.16, 'sine')
      if (this.mood === 'day' && inBar % 2 === 1) this.mtone(at + len / 2, f * 1.5, len * 0.8, 0.06, 'triangle')
    }
  }
}

export const audio = new AudioEngine()
