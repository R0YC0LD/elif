const WINDOW = 240

export interface PerfSnapshot {
  fps: number
  avgFps: number
  frameMs: number
  low1: number
  renderMs: number
  drawn: number
  particles: number
  heapMb: number | null
  refreshHz: number
}

class PerfMonitor {
  private times = new Float32Array(WINDOW)
  private idx = 0
  private filled = 0
  private sum = 0
  private lastRender = 0
  drawn = 0
  particles = 0
  private snapshotCache: PerfSnapshot | null = null
  private snapshotAt = 0

  frame(ms: number) {
    if (ms <= 0 || ms > 1000) return
    this.sum += ms - this.times[this.idx]
    this.times[this.idx] = ms
    this.idx = (this.idx + 1) % WINDOW
    this.filled = Math.min(WINDOW, this.filled + 1)
  }

  renderTime(ms: number) {
    this.lastRender = this.lastRender * 0.9 + ms * 0.1
  }

  snapshot(): PerfSnapshot {
    const now = performance.now()
    if (this.snapshotCache && now - this.snapshotAt < 250) return this.snapshotCache
    const n = this.filled
    let last = 0
    let avg = 0
    let low1 = 0
    if (n > 0) {
      last = this.times[(this.idx - 1 + WINDOW) % WINDOW]
      avg = this.sum / n
      const sorted = Array.from(this.times.subarray(0, n)).sort((a, b) => b - a)
      const take = Math.max(1, Math.ceil(n * 0.01))
      let acc = 0
      for (let i = 0; i < take; i++) acc += sorted[i]
      low1 = 1000 / (acc / take)
    }
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    const snap: PerfSnapshot = {
      fps: last > 0 ? 1000 / last : 0,
      avgFps: avg > 0 ? 1000 / avg : 0,
      frameMs: avg,
      low1,
      renderMs: this.lastRender,
      drawn: this.drawn,
      particles: this.particles,
      heapMb: mem ? mem.usedJSHeapSize / 1048576 : null,
      refreshHz: avg > 0 ? Math.round(1000 / avg / 5) * 5 : 0,
    }
    this.snapshotCache = snap
    this.snapshotAt = now
    return snap
  }
}

export const perf = new PerfMonitor()
