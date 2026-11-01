import { perf } from './perf'

export const STEP = 1 / 120
const MAX_FRAME = 0.1

export interface LoopHandlers {
  update(dt: number): void
  render(alpha: number, frameDt: number): void
}

export class GameLoop {
  private raf = 0
  private last = 0
  private acc = 0
  private running = false

  constructor(private h: LoopHandlers) {}

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.acc = 0
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private frame = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.frame)
    const raw = (now - this.last) / 1000
    this.last = now
    perf.frame(raw * 1000)
    const dt = Math.min(raw, MAX_FRAME)
    this.acc += dt
    let steps = 0
    while (this.acc >= STEP && steps < 24) {
      this.h.update(STEP)
      this.acc -= STEP
      steps++
    }
    if (steps === 24) this.acc = 0
    const t0 = performance.now()
    this.h.render(this.acc / STEP, dt)
    perf.renderTime(performance.now() - t0)
  }
}
