import { ITEMS } from '../game/items'
import { GRID } from '../game/progression'
import type { ArtSpec } from '../game/types'
import { drawFurniture } from './furniture'
import { drawArt } from './itemArt'

const cache = new Map<string, string>()

export function iconUrl(id: string, size = 96): string {
  const key = `${id}@${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const it = ITEMS[id]
  const dpr = 2
  const cv = document.createElement('canvas')
  cv.width = cv.height = size * dpr
  const c = cv.getContext('2d')!
  c.scale(dpr, dpr)
  c.translate(size / 2, size / 2)
  if (it?.cat === 'furniture' && it.furn) {
    const w = it.furn.w * GRID.cell
    const h = it.furn.h * GRID.cell
    const k = Math.min((size * 0.88) / w, (size * 0.88) / h)
    c.scale(k, k)
    c.translate(-w / 2, -h / 2)
    drawFurniture(c, it.art, w, h, { t: 0, on: true, growth: 80, tint: 0, seed: 3, season: 'summer', hour: 10, minute: 10, bounce: 0, spin: 0 })
  } else if (it?.cat === 'wallpaper' || it?.cat === 'floor') {
    drawArt(c, it.art, size * 0.92)
  } else if (it) {
    drawArt(c, it.art, size * 0.86)
  }
  const url = cv.toDataURL('image/png')
  cache.set(key, url)
  return url
}

export function artUrl(art: ArtSpec, size = 64): string {
  const key = `art:${art.join('|')}@${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = cv.height = size * 2
  const c = cv.getContext('2d')!
  c.scale(2, 2)
  c.translate(size / 2, size / 2)
  drawArt(c, art, size * 0.86)
  const url = cv.toDataURL('image/png')
  cache.set(key, url)
  return url
}
