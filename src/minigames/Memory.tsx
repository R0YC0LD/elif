import { useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '../game/events'
import { ITEMS } from '../game/items'
import { ItemIcon } from '../ui/Chrome'
import type { Difficulty } from './common'

const POOL = ['apple', 'banana', 'strawberry', 'burger', 'pizza', 'cake', 'icecream', 'donut', 'cookie', 'sushi', 'grapes', 'melon', 'taco', 'cupcake']

const CFG: Record<Difficulty, { cols: number; rows: number; time: number }> = {
  easy: { cols: 4, rows: 3, time: 60 },
  normal: { cols: 4, rows: 4, time: 75 },
  hard: { cols: 5, rows: 4, time: 85 },
}

interface Card {
  id: number
  face: string
  up: boolean
  done: boolean
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export interface MemoryResult {
  score: number
  detail: string
}

export function memoryDetail(moves: number, matches: number, best: number) {
  return `Hamle ${moves} · Eşleşme ${matches} · En iyi kombo ${best}`
}

export function MemoryGame({ diff, paused, onEnd }: { diff: Difficulty; paused: boolean; onEnd: (r: MemoryResult) => void }) {
  const cfg = CFG[diff]
  const [cards, setCards] = useState<Card[]>(() => {
    const faces = shuffle(POOL).slice(0, (cfg.cols * cfg.rows) / 2)
    return shuffle([...faces, ...faces]).map((face, id) => ({ id, face, up: false, done: false }))
  })
  const [time, setTime] = useState(cfg.time)
  const [moves, setMoves] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [score, setScore] = useState(0)
  const open = useRef<number[]>([])
  const lock = useRef(false)
  const ended = useRef(false)
  const pairs = cards.length / 2
  const matched = cards.filter((c) => c.done).length / 2

  const finish = useMemo(
    () => (won: boolean, t: number, mv: number, sc: number, bc: number, m: number) => {
      if (ended.current) return
      ended.current = true
      const bonus = won ? Math.round(t * 4) : 0
      const penalty = Math.max(0, mv - pairs) * 5
      const total = Math.max(0, sc + bonus - penalty)
      sound(won ? 'win' : 'fail')
      window.setTimeout(() => onEnd({ score: total, detail: `${memoryDetail(mv, m, bc)}${won ? ` · Süre bonusu ${bonus}` : ' · Süre bitti'}` }), 700)
    },
    [onEnd, pairs],
  )

  useEffect(() => {
    if (paused || ended.current) return
    const id = window.setInterval(() => {
      setTime((t) => {
        const n = t - 0.1
        if (n <= 0) {
          clearInterval(id)
          finish(false, 0, moves, score, best, matched)
          return 0
        }
        return n
      })
    }, 100)
    return () => clearInterval(id)
  }, [paused, finish, moves, score, best, matched])

  const flip = (i: number) => {
    if (paused || lock.current || ended.current) return
    const c = cards[i]
    if (c.up || c.done) return
    sound('flip')
    const next = cards.map((x, k) => (k === i ? { ...x, up: true } : x))
    setCards(next)
    open.current.push(i)
    if (open.current.length < 2) return
    lock.current = true
    const [a, b] = open.current
    open.current = []
    const mv = moves + 1
    setMoves(mv)
    if (next[a].face === next[b].face) {
      const nc = combo + 1
      const bc = Math.max(best, nc)
      const pts = 100 + (nc - 1) * 40
      const sc = score + pts
      setCombo(nc)
      setBest(bc)
      setScore(sc)
      window.setTimeout(() => {
        const done = next.map((x, k) => (k === a || k === b ? { ...x, done: true } : x))
        setCards(done)
        sound(nc > 1 ? 'combo' : 'match')
        lock.current = false
        if (done.every((x) => x.done)) finish(true, time, mv, sc, bc, pairs)
      }, 380)
    } else {
      setCombo(0)
      window.setTimeout(() => {
        setCards((cs) => cs.map((x, k) => (k === a || k === b ? { ...x, up: false } : x)))
        sound('mismatch')
        lock.current = false
      }, 780)
    }
  }

  return (
    <>
      <div className="game-hud">
        <span>
          Puan {score}
          {combo > 1 ? `  x${combo}` : ''}
        </span>
        <span>
          Hamle {moves} · {Math.max(0, Math.ceil(time))} sn
        </span>
      </div>
      <div className="mem-grid" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`, gridTemplateRows: `repeat(${cfg.rows}, 1fr)` }}>
        {cards.map((c, i) => (
          <button key={c.id} className={`mem-card${c.up || c.done ? ' up' : ''}${c.done ? ' done' : ''}`} onClick={() => flip(i)} aria-label={c.up || c.done ? ITEMS[c.face].name : 'Kapalı kart'}>
            <span className="mem-face mem-back" />
            <span className="mem-face mem-front">
              <ItemIcon id={c.face} size={56} />
            </span>
          </button>
        ))}
      </div>
    </>
  )
}
