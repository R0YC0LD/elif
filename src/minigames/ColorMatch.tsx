import { useEffect, useRef, useState } from 'react'
import { sound } from '../game/events'
import type { Difficulty } from './common'

const COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'red', name: 'Kırmızı', hex: '#d9433b' },
  { id: 'blue', name: 'Mavi', hex: '#3f7fd0' },
  { id: 'green', name: 'Yeşil', hex: '#4f9d4b' },
  { id: 'yellow', name: 'Sarı', hex: '#f2b630' },
  { id: 'pink', name: 'Pembe', hex: '#e0529a' },
  { id: 'orange', name: 'Turuncu', hex: '#e0793a' },
]

const CFG: Record<Difficulty, { time: number; n: number; limit: number }> = {
  easy: { time: 45, n: 3, limit: 4 },
  normal: { time: 40, n: 4, limit: 3 },
  hard: { time: 35, n: 6, limit: 2.2 },
}

interface Round {
  word: string
  ink: string
  rule: 'ink' | 'word'
}

function makeRound(n: number, hard: boolean): Round {
  const pool = COLORS.slice(0, n)
  const w = pool[Math.floor(Math.random() * pool.length)]
  let ink = pool[Math.floor(Math.random() * pool.length)]
  if (Math.random() < 0.7) while (ink.id === w.id && pool.length > 1) ink = pool[Math.floor(Math.random() * pool.length)]
  return { word: w.id, ink: ink.id, rule: hard && Math.random() < 0.3 ? 'word' : 'ink' }
}

export function ColorMatchGame({ diff, paused, onEnd }: { diff: Difficulty; paused: boolean; onEnd: (r: { score: number; detail: string }) => void }) {
  const cfg = CFG[diff]
  const [time, setTime] = useState(cfg.time)
  const [round, setRound] = useState<Round>(() => makeRound(cfg.n, diff === 'hard'))
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [right, setRight] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [left, setLeft] = useState(cfg.limit)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const ended = useRef(false)
  const stats = useRef({ best: 0 })

  const finish = (sc: number, r: number, w: number) => {
    if (ended.current) return
    ended.current = true
    sound('win')
    window.setTimeout(() => onEnd({ score: sc, detail: `Doğru ${r} · Yanlış ${w} · En iyi kombo ${stats.current.best}` }), 400)
  }

  useEffect(() => {
    if (paused || ended.current) return
    const id = window.setInterval(() => {
      setTime((t) => Math.max(0, t - 0.1))
      setLeft((l) => Math.max(0, l - 0.1))
    }, 100)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (time <= 0) finish(score, right, wrong)
  })

  const answer = (id: string | null) => {
    if (paused || ended.current) return
    const target = round.rule === 'ink' ? round.ink : round.word
    const ok = id === target
    if (ok) {
      const nc = combo + 1
      stats.current.best = Math.max(stats.current.best, nc)
      const pts = Math.round(10 * Math.min(5, 1 + Math.floor(nc / 4)) * (0.6 + 0.4 * (left / cfg.limit)))
      setScore((s) => s + pts)
      setCombo(nc)
      setRight((r) => r + 1)
      sound(nc % 4 === 0 ? 'combo' : 'coin')
    } else {
      setCombo(0)
      setWrong((w) => w + 1)
      setScore((s) => Math.max(0, s - 8))
      sound('mismatch')
    }
    setFlash(ok ? 'ok' : 'bad')
    window.setTimeout(() => setFlash(null), 160)
    setLeft(Math.max(1.2, cfg.limit - right * 0.03))
    setRound(makeRound(cfg.n, diff === 'hard'))
  }

  useEffect(() => {
    if (left <= 0 && !paused && !ended.current) answer(null)
  })

  const ink = COLORS.find((c) => c.id === round.ink)!
  const word = COLORS.find((c) => c.id === round.word)!
  return (
    <>
      <div className="game-hud">
        <span>
          Puan {score}
          {combo > 1 ? `  x${Math.min(5, 1 + Math.floor(combo / 4))}` : ''}
        </span>
        <span>Süre {Math.ceil(time)}</span>
      </div>
      <div style={{ position: 'absolute', inset: '56px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: flash === 'ok' ? 'rgba(79,163,127,0.15)' : flash === 'bad' ? 'rgba(217,67,59,0.18)' : 'transparent', borderRadius: 12 }}>
        <p style={{ color: 'var(--paper)', textAlign: 'center', margin: 0, fontWeight: 700 }}>{round.rule === 'ink' ? 'Yazının RENGİNİ seç' : 'Yazının ANLAMINI seç'}</p>
        <div className="progress" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <i style={{ width: `${(left / cfg.limit) * 100}%`, background: left < 1 ? 'var(--danger)' : 'var(--gold)' }} />
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 'clamp(2.4rem, 12vw, 4rem)', fontWeight: 900, color: ink.hex, textShadow: '0 3px 0 #0f2123, 0 0 0 #0f2123', WebkitTextStroke: '2px #0f2123' }}>{word.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {COLORS.slice(0, cfg.n).map((c) => (
            <button key={c.id} className="btn" style={{ background: c.hex, color: '#fff', minHeight: 56, fontSize: '1.05rem', textShadow: '0 2px 0 rgba(0,0,0,0.4)' }} onClick={() => answer(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
