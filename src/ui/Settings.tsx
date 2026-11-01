import { useRef, useState } from 'react'
import { audio } from '../audio/audio'
import { perf } from '../engine/perf'
import { sound, toast } from '../game/events'
import { addCoins, addXp, newGame } from '../game/logic'
import { xpNeeded } from '../game/progression'
import { clearSave, parseSave, serialize } from '../game/save'
import { act, store, useGame } from '../game/store'
import { GAME_TITLE, type Settings } from '../game/types'
import { ANIM_NAMES } from '../render/pet'
import { scene } from '../render/scene'
import { Sheet } from './Panels'
import { ask, closePanel, patchUi } from './uiStore'

function Toggle({ label, k, s, hint }: { label: string; k: keyof Settings; s: Settings; hint?: string }) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint && <div className="muted">{hint}</div>}
      </span>
      <input
        type="checkbox"
        checked={s[k] as boolean}
        onChange={(e) =>
          act((g) => {
            ;(g.settings as unknown as Record<string, unknown>)[k] = e.target.checked
          })
        }
      />
    </label>
  )
}

function Slider({ label, k, s, min, max, step }: { label: string; k: keyof Settings; s: Settings; min: number; max: number; step: number }) {
  return (
    <label className="field">
      <span className="row" style={{ justifyContent: 'space-between' }}>
        {label}
        <span className="muted">{Math.round((s[k] as number) * 100)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[k] as number}
        onChange={(e) =>
          act((g) => {
            ;(g.settings as unknown as Record<string, unknown>)[k] = Number(e.target.value)
          })
        }
      />
    </label>
  )
}

export function applySettings(s: Settings) {
  audio.configure({ music: s.music, sfx: s.sfx, musicVol: s.musicVol, sfxVol: s.sfxVol })
  const r = document.documentElement
  r.style.setProperty('--font-size', `${16 * s.fontScale}px`)
  r.dataset.contrast = s.highContrast ? 'high' : 'normal'
  r.dataset.motion = s.reduceMotion ? 'reduce' : 'full'
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function SettingsPanel() {
  const g = useGame()
  const s = g.settings
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportSave = () => {
    store.saveNow()
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    download(`nova-kayit-${stamp}.json`, serialize(store.state))
    setMsg('Kayıt dosyası indirildi.')
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 4_000_000) return setMsg('Dosya çok büyük.')
    const text = await f.text()
    const r = parseSave(text)
    if (!r.ok || !r.state) {
      setMsg(`İçe aktarılamadı: ${r.error}`)
      return
    }
    const st = r.state
    ask({
      title: 'Kaydı içe aktar',
      text: `${st.pet.name}, seviye ${st.level}, ${st.coins} coin. Mevcut ilerleme bu kayıtla değiştirilecek. Önce mevcut kaydı dışa aktarmak istersen iptal et.`,
      ok: 'İçe aktar',
      run: () => {
        store.replace(st)
        applySettings(st.settings)
        closePanel()
        toast('info', 'Kayıt yüklendi.')
      },
    })
  }

  const reset = () =>
    ask({
      title: 'Oyunu sıfırla',
      text: 'Bütün ilerleme silinir: karakter, eşyalar, coin, başarımlar. Bu geri alınamaz.',
      ok: 'Devam',
      danger: true,
      run: () =>
        ask({
          title: 'Emin misin?',
          text: `${g.pet.name} ve bütün kayıtların silinecek. Önce dışa aktarmayı düşün.`,
          ok: 'Evet, sıfırla',
          danger: true,
          run: () => {
            clearSave()
            const fresh = newGame()
            store.replace(fresh)
            applySettings(fresh.settings)
            closePanel()
            patchUi({ tutorial: 0 })
          },
        }),
    })

  return (
    <Sheet title="Ayarlar" wide>
      <div className="card">
        <h3>Ses</h3>
        <Toggle label="Müzik" k="music" s={s} />
        <Slider label="Müzik seviyesi" k="musicVol" s={s} min={0} max={1} step={0.05} />
        <Toggle label="Ses efektleri" k="sfx" s={s} />
        <Slider label="Efekt seviyesi" k="sfxVol" s={s} min={0} max={1} step={0.05} />
      </div>
      <div className="card">
        <h3>Erişilebilirlik ve görüntü</h3>
        <Toggle label="Animasyonu azalt" k="reduceMotion" s={s} hint="Arayüz geçişleri ve parçacıklar azalır." />
        <Toggle label="Ekran sarsıntısı" k="shake" s={s} />
        <Toggle label="Düşük grafik modu" k="lowGfx" s={s} hint="Daha az parçacık, bulutsuz gökyüzü, 1x çözünürlük." />
        <Toggle label="Yüksek kontrast" k="highContrast" s={s} />
        <Toggle label="FPS sayacını göster" k="showFps" s={s} />
        <Slider label="Yazı boyutu" k="fontScale" s={s} min={0.85} max={1.4} step={0.05} />
        <Slider label="Dokunma hassasiyeti" k="sensitivity" s={s} min={0.5} max={2} step={0.1} />
      </div>
      <div className="card">
        <h3>Kayıt</h3>
        <p className="muted">Son kayıt: {new Date(g.lastSave).toLocaleString('tr-TR')}. İlerleme bu tarayıcıda saklanır.</p>
        <div className="row wrap" style={{ marginTop: 8 }}>
          <button className="btn" onClick={exportSave}>
            Dışa aktar (JSON)
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            İçe aktar
          </button>
          <button
            className="btn"
            onClick={() => {
              store.saveNow()
              setMsg('Kaydedildi.')
              sound('click')
            }}
          >
            Şimdi kaydet
          </button>
          <button className="btn danger" onClick={reset}>
            Sıfırla
          </button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        {msg && <p style={{ marginTop: 6 }} role="status">{msg}</p>}
      </div>
      <div className="card">
        <h3>Geliştirici</h3>
        <Toggle label="Geliştirici paneli" k="devPanel" s={s} hint="Performans ölçümleri, animasyon deneyi, hızlı test araçları." />
        {s.devPanel && <DevTools />}
      </div>
      <div className="card">
        <h3>Kısayollar</h3>
        <p className="muted">Sol/sağ ok: oda değiştir · Esc: paneli kapat · Tab: düğmeler arasında gezin.</p>
        <p className="muted">{GAME_TITLE} sürüm 0.1.0. Bütün görsel ve sesler oyun içinde üretilir.</p>
      </div>
    </Sheet>
  )
}

function DevTools() {
  const [sel, setSel] = useState('happy')
  const p = perf.snapshot()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row wrap">
        <select className="input" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Animasyon seç">
          {ANIM_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <button className="btn small" onClick={() => scene.anim.play(sel, { loop: false })}>
          Oynat
        </button>
        <button className="btn small" onClick={() => scene.anim.stopAll()}>
          Durdur
        </button>
      </div>
      <div className="row wrap">
        <button className="btn small" onClick={() => act((g) => addCoins(g, 500))}>
          +500 coin
        </button>
        <button className="btn small" onClick={() => act((g) => addXp(g, xpNeeded(g.level)))}>
          Seviye atla
        </button>
        <button
          className="btn small"
          onClick={() =>
            act((g) => {
              g.worldMinutes += 60
            })
          }
        >
          +1 oyun saati
        </button>
        <button
          className="btn small"
          onClick={() =>
            act((g) => {
              for (const k of Object.keys(g.pet.needs) as (keyof typeof g.pet.needs)[]) g.pet.needs[k] = 15
            })
          }
        >
          İhtiyaçları düşür
        </button>
      </div>
      <p className="muted">
        FPS {p.fps.toFixed(0)} · ort {p.avgFps.toFixed(0)} · 1% düşük {p.low1.toFixed(0)} · kare {p.frameMs.toFixed(2)} ms
      </p>
    </div>
  )
}
