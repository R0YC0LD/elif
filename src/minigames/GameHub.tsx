import { useCallback, useEffect, useRef, useState } from 'react'
import { GameLoop } from '../engine/loop'
import { sound } from '../game/events'
import { toast } from '../game/events'
import { canPlayMini, finishMiniGame, miniReward, type MiniResult } from '../game/logic'
import { act, useGame } from '../game/store'
import { Coin, Ico } from '../ui/Icons'
import { Sheet } from '../ui/Panels'
import { patchUi, useUi } from '../ui/uiStore'
import { CoinRush } from './coinrush'
import { DIFF_LABEL, DIFF_MULT, type CanvasGame, type Difficulty } from './common'
import { ColorMatchGame } from './ColorMatch'
import { MemoryGame } from './Memory'
import { ReactionArena } from './reaction'
import { PetRunner } from './runner'
import { StackTower } from './stack'

interface Meta {
  id: string
  name: string
  blurb: string
  how: string[]
  controls: string
  landscape?: boolean
  dom?: boolean
  create?: (d: Difficulty) => CanvasGame
}

export const GAMES: Meta[] = [
  {
    id: 'coinrush',
    name: 'Coin Rush',
    blurb: 'Düşen coinleri yakala, bombalardan kaç.',
    how: ['Coinleri topla, ardışık yakalamalar kombo çarpanı verir.', 'Bomba süre alır ve kombonu sıfırlar.', 'Mıknatıs, kalkan, çift puan ve ek süre güçlendirmeleri düşer.'],
    controls: 'Parmağını veya fareyi sürükle. Klavyede ok tuşları veya A ve D.',
    create: (d) => new CoinRush(d),
  },
  {
    id: 'memory',
    name: 'Memory Master',
    blurb: 'Kartları çevir, eşleri bul, süre dolmadan bitir.',
    how: ['İki kart çevir. Aynıysa eşleşir.', 'Ardışık eşleşmeler kombo puanı verir.', 'Az hamle ve kalan süre bonus getirir.'],
    controls: 'Kartlara dokun veya tıkla.',
    dom: true,
  },
  {
    id: 'reaction',
    name: 'Reaction Arena',
    blurb: 'Hedefler kaybolmadan vur. Kırmızıdan uzak dur.',
    how: ['Yeşil hedef 10, altın hedef 40 puan. Ne kadar hızlı vurursan o kadar çok puan.', 'Kırmızı X hedefe vurmak ve boşa tıklamak puan kırar.', 'Mavi hedef süre ekler.'],
    controls: 'Hedeflere dokun veya tıkla.',
    create: (d) => new ReactionArena(d),
  },
  {
    id: 'runner',
    name: 'Pet Runner',
    blurb: 'Koş, zıpla, kay. Engellere çarpmadan en uzağa git.',
    how: ['Sandıkların ve dikenlerin üstünden zıpla. Havada bir kez daha zıplayabilirsin.', 'Kuşların ve kapıların altından kay.', 'Mıknatıs, kalkan ve atılım toplayabilirsin.'],
    controls: 'Ekrana dokun: zıpla. Aşağı kaydır: kay. Klavyede boşluk veya yukarı ok: zıpla, aşağı ok: kay.',
    landscape: true,
    create: (d) => new PetRunner(d),
  },
  {
    id: 'stack',
    name: 'Stack Tower',
    blurb: 'Blokları tam zamanında bırak, kuleyi yükselt.',
    how: ['Kayan bloğu üstteki bloğun hizasında bırak.', 'Taşan kısım kesilir ve kule daralır.', 'Üst üste mükemmel yerleşim bloğu geri büyütür.'],
    controls: 'Ekrana dokun veya tıkla. Klavyede boşluk.',
    create: (d) => new StackTower(d),
  },
  {
    id: 'colormatch',
    name: 'Color Match',
    blurb: 'Yazı bir renk söylüyor, mürekkep başka. Doğruyu seç.',
    how: ['Yazının rengini seç, yazdığı kelimeyi değil.', 'Zor modda bazen kural tersine döner: kelimenin anlamını seç.', 'Hızlı doğru cevaplar daha çok puan verir.'],
    controls: 'Renk düğmelerine dokun.',
    dom: true,
  },
]

export function GamesPanel() {
  const s = useGame()
  return (
    <Sheet title="Oyun salonu" wide>
      <p className="muted">Her oyun enerji harcar ve eğlenceyi artırır. Ödül skora bağlıdır ve üst sınırı vardır.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' }}>
        {GAMES.map((g) => {
          const r = s.records[g.id]
          return (
            <button
              key={g.id}
              className="cell"
              style={{ alignItems: 'flex-start', textAlign: 'left', minHeight: 150 }}
              onClick={() => {
                const ok = canPlayMini(s)
                if (!ok.ok) {
                  toast('warn', ok.reason ?? 'Şimdi olmaz.')
                  sound('error')
                  return
                }
                sound('click')
                patchUi({ panel: null, game: g.id })
              }}
            >
              <span className="nm" style={{ fontSize: '1.05rem' }}>
                {g.name}
              </span>
              <span className="muted">{g.blurb}</span>
              <span className="tag">{r ? `Rekor ${r.best} · ${r.plays} oyun` : 'Henüz oynanmadı'}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

type Phase = 'intro' | 'play' | 'result'

export function GameShell() {
  const ui = useUi()
  const s = useGame()
  const meta = GAMES.find((g) => g.id === ui.game)
  const [phase, setPhase] = useState<Phase>('intro')
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<(MiniResult & { score: number; detail: string }) | null>(null)
  const [round, setRound] = useState(0)
  const [hud, setHud] = useState<[string, string]>(['', ''])
  const cv = useRef<HTMLCanvasElement>(null)
  const game = useRef<CanvasGame | null>(null)
  const loop = useRef<GameLoop | null>(null)
  const done = useRef(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  const exit = useCallback(() => {
    loop.current?.stop()
    patchUi({ game: null })
  }, [])

  const end = useCallback(
    (raw: number, detail: string) => {
      if (done.current || !meta) return
      done.current = true
      const final = Math.round(raw * DIFF_MULT[diff])
      const r = act((g) => finishMiniGame(g, meta.id, final))
      setResult({ ...r, score: final, detail })
      setPhase('result')
    },
    [meta, diff],
  )

  useEffect(() => {
    if (phase !== 'play' || !meta || meta.dom) return
    const canvas = cv.current!
    const g = meta.create!(diff)
    game.current = g
    done.current = false
    canvas.width = g.w
    canvas.height = g.h
    const c = canvas.getContext('2d')!
    let hudT = 0
    let ending = false
    const lp = new GameLoop({
      update: (dt) => {
        g.paused = pausedRef.current
        g.update(dt)
        hudT += dt
        if (hudT > 0.1) {
          hudT = 0
          setHud(g.hud())
        }
        if (g.over && !ending) {
          ending = true
          window.setTimeout(() => end(g.score, g.detail()), 900)
        }
      },
      render: () => g.draw(c),
    })
    loop.current = lp
    lp.start()
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: ((e.clientX - r.left) / r.width) * g.w, y: ((e.clientY - r.top) / r.height) * g.h }
    }
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const p = pos(e)
      g.pointer('down', p.x, p.y)
    }
    const move = (e: PointerEvent) => {
      const p = pos(e)
      g.pointer('move', p.x, p.y)
    }
    const up = (e: PointerEvent) => {
      const p = pos(e)
      g.pointer('up', p.x, p.y)
    }
    const kd = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault()
      g.key(true, e.key)
    }
    const ku = (e: KeyboardEvent) => g.key(false, e.key)
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      lp.stop()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, meta, diff])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'play') setPaused((p) => !p)
        else if (phase === 'intro') exit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, exit])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phase === 'play') setPaused(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  if (!meta) return null
  const rec = s.records[meta.id]
  const start = () => {
    done.current = false
    setPaused(false)
    setResult(null)
    setPhase('play')
    setRound((n) => n + 1)
    sound('open')
  }

  return (
    <div className="game-shell" role="dialog" aria-modal="true" aria-label={meta.name}>
      <div className="game-top">
        <button className="iconbtn" onClick={exit} aria-label="Oyundan çık">
          {Ico.left}
        </button>
        <h2>
          {meta.name} <span className="muted" style={{ color: 'inherit', opacity: 0.7 }}>· {DIFF_LABEL[diff]}</span>
        </h2>
        {phase === 'play' && (
          <button className="btn small" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Devam' : 'Duraklat'}
          </button>
        )}
      </div>
      <div className="game-area">
        <div className={`game-frame${meta.landscape ? ' landscape' : ''}`}>
          {phase === 'play' && !meta.dom && (
            <>
              <canvas ref={cv} aria-label={meta.name} />
              <div className="game-hud">
                <span>{hud[0]}</span>
                <span>{hud[1]}</span>
              </div>
            </>
          )}
          {phase === 'play' && meta.id === 'memory' && <MemoryGame key={round} diff={diff} paused={paused} onEnd={(r) => end(r.score, r.detail)} />}
          {phase === 'play' && meta.id === 'colormatch' && <ColorMatchGame key={round} diff={diff} paused={paused} onEnd={(r) => end(r.score, r.detail)} />}
          {phase === 'intro' && (
            <div className="game-overlay">
              <h3>{meta.name}</h3>
              <p>{meta.blurb}</p>
              <div style={{ textAlign: 'left', maxWidth: 360 }}>
                <b>Nasıl oynanır</b>
                <ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
                  {meta.how.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <b>Kontroller</b>
                <div style={{ opacity: 0.9 }}>{meta.controls}</div>
              </div>
              <div className="tabs" role="radiogroup" aria-label="Zorluk" style={{ justifyContent: 'center' }}>
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button key={d} role="radio" aria-checked={diff === d} className={`tab${diff === d ? ' on' : ''}`} style={diff === d ? { background: 'var(--gold)', color: 'var(--ink)' } : {}} onClick={() => setDiff(d)}>
                    {DIFF_LABEL[d]} x{DIFF_MULT[d]}
                  </button>
                ))}
              </div>
              <p>{rec ? `Kişisel rekor ${rec.best} · ${rec.plays} oyun` : 'İlk oyunun için hazırsın.'}</p>
              <button className="btn primary" onClick={start} autoFocus>
                {Ico.play} Başla
              </button>
            </div>
          )}
          {phase === 'play' && paused && (
            <div className="game-overlay">
              <h3>Duraklatıldı</h3>
              <button className="btn primary" onClick={() => setPaused(false)} autoFocus>
                Devam
              </button>
              <button className="btn" onClick={exit}>
                Çık
              </button>
            </div>
          )}
          {phase === 'result' && result && (
            <div className="game-overlay">
              <h3>{result.record ? 'Yeni rekor' : 'Oyun bitti'}</h3>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{result.score}</div>
              <p>{result.detail}</p>
              {result.fatigue < 1 && <p>Peş peşe oynadığın için coin ödülü %{Math.round(result.fatigue * 100)}.</p>}
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                <span className="pill">
                  <Coin />+{result.coins}
                </span>
                <span className="pill">+{result.xp} XP</span>
                <span className="pill">Rekor {result.best}</span>
              </div>
              {miniReward(meta.id, result.score) >= (({ coinrush: 140, memory: 120, reaction: 130, runner: 150, stack: 110, colormatch: 100 }) as Record<string, number>)[meta.id] && <p>Ödül üst sınırına ulaştın.</p>}
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={start} autoFocus>
                  Tekrar oyna
                </button>
                <button className="btn" onClick={exit}>
                  Çık
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

