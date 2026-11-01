import type { GameState, RoomId, StatKey } from './types'

export const MAX_LEVEL = 50
export const xpNeeded = (level: number) => 60 + (level - 1) * 35

export const STAGES = [
  { id: 0, name: 'Bebek', from: 1, scale: 0.72 },
  { id: 1, name: 'Çocuk', from: 5, scale: 0.86 },
  { id: 2, name: 'Genç', from: 10, scale: 0.96 },
  { id: 3, name: 'Olgun', from: 18, scale: 1.05 },
]

export function stageOfLevel(level: number): number {
  let s = 0
  for (const st of STAGES) if (level >= st.from) s = st.id
  return s
}

export interface RoomMeta {
  id: RoomId
  name: string
  unlock: number
  blurb: string
  fixtures: { x: number; y: number; w: number; h: number }[]
}

export const ROOMS: Record<RoomId, RoomMeta> = {
  living: { id: 'living', name: 'Oturma odası', unlock: 1, blurb: 'Günün çoğu burada geçer.', fixtures: [{ x: 12, y: 1, w: 6, h: 5 }] },
  kitchen: { id: 'kitchen', name: 'Mutfak', unlock: 1, blurb: 'Dolap dolu, ocak sıcak.', fixtures: [{ x: 3, y: 1, w: 5, h: 5 }] },
  bathroom: { id: 'bathroom', name: 'Banyo', unlock: 1, blurb: 'Köpük ve su damlaları.', fixtures: [{ x: 13, y: 1, w: 5, h: 5 }] },
  bedroom: { id: 'bedroom', name: 'Yatak odası', unlock: 1, blurb: 'Gece lambası burada.', fixtures: [{ x: 12, y: 1, w: 6, h: 5 }] },
  playroom: { id: 'playroom', name: 'Oyun salonu', unlock: 2, blurb: 'Mini oyunların kapısı.', fixtures: [{ x: 3, y: 1, w: 6, h: 5 }] },
  garden: { id: 'garden', name: 'Bahçe', unlock: 3, blurb: 'Mevsime göre değişir.', fixtures: [] },
  study: { id: 'study', name: 'Çalışma alanı', unlock: 5, blurb: 'Üretim ve keşif masası.', fixtures: [{ x: 12, y: 1, w: 6, h: 5 }] },
  vault: { id: 'vault', name: 'Ödül odası', unlock: 8, blurb: 'Koleksiyonunu sergiler.', fixtures: [] },
}

export const GRID = { cols: 20, rows: 15, cell: 36, wallRows: 9 }
export const SCENE = { w: 720, h: 540 }

export interface Area {
  id: string
  name: string
  unlock: number
  blurb: string
  base: [string, number][]
  bonus: [string, number][]
  milestones: Record<number, string>
}

export const AREAS: Area[] = [
  {
    id: 'forest',
    name: 'Fısıltı Ormanı',
    unlock: 4,
    blurb: 'Tahta, meyve ve kumaş parçaları bulunur.',
    base: [['wood', 1], ['fruit', 1]],
    bonus: [['cloth', 1], ['thread', 1], ['paint', 1]],
    milestones: { 3: 'c_feather', 6: 'c_mushroom', 10: 'c_key' },
  },
  {
    id: 'cave',
    name: 'Yankı Mağarası',
    unlock: 7,
    blurb: 'Cam, yıldız tozu ve taşlar çıkar.',
    base: [['glass', 1], ['star', 1]],
    bonus: [['paint', 1], ['wood', 1]],
    milestones: { 3: 'c_gem_blue', 6: 'c_fossil', 10: 'c_gem_red' },
  },
  {
    id: 'shore',
    name: 'Ay Kıyısı',
    unlock: 10,
    blurb: 'Kabuk, süt ve ışıltılı kalıntılar.',
    base: [['milk', 1], ['star', 1]],
    bonus: [['cloth', 1], ['glass', 1]],
    milestones: { 3: 'c_shell', 6: 'c_coin_old', 10: 'c_crystal' },
  },
]

export const EXPLORE_COST = 15

export interface Recipe {
  id: string
  name: string
  need: Record<string, number>
  out: string
  minLevel: number
  seconds: number
}

export const RECIPES: Recipe[] = [
  { id: 'r_scarf', name: 'Mavi atkı', need: { cloth: 2, thread: 1 }, out: 'scarf_blue', minLevel: 2, seconds: 3 },
  { id: 'r_hoodie', name: 'Kapüşonlu', need: { cloth: 3, thread: 2 }, out: 'hoodie', minLevel: 3, seconds: 4 },
  { id: 'r_table', name: 'Yuvarlak sehpa', need: { wood: 3, paint: 1 }, out: 'table_round', minLevel: 2, seconds: 3 },
  { id: 'r_shelf', name: 'Kitaplık', need: { wood: 4, paint: 2 }, out: 'bookshelf', minLevel: 3, seconds: 4 },
  { id: 'r_lamp', name: 'Masa lambası', need: { wood: 1, glass: 1, paint: 1 }, out: 'lamp_table', minLevel: 3, seconds: 3 },
  { id: 'r_smoothie', name: 'Meyve karışımı', need: { fruit: 2, milk: 1 }, out: 'smoothie', minLevel: 2, seconds: 2 },
  { id: 'r_cake', name: 'Yaş pasta', need: { fruit: 3, milk: 1 }, out: 'cake', minLevel: 4, seconds: 3 },
  { id: 'r_golden', name: 'Altın elma', need: { fruit: 5, star: 2 }, out: 'goldenapple', minLevel: 8, seconds: 5 },
  { id: 'r_frame', name: 'Gün doğumu tablosu', need: { glass: 2, paint: 1 }, out: 'frame_sun', minLevel: 4, seconds: 3 },
  { id: 'r_sparkle', name: 'Kıvılcım izi', need: { star: 3, glass: 2 }, out: 'fx_sparkle', minLevel: 6, seconds: 5 },
  { id: 'r_cape', name: 'Kahraman pelerini', need: { cloth: 4, thread: 3, star: 1 }, out: 'cape', minLevel: 7, seconds: 5 },
]

export const MATERIAL_PRICE: Record<string, number> = { cloth: 30, thread: 20, wood: 25, paint: 25, fruit: 12, milk: 12, star: 60, glass: 40 }

export interface SecretDef {
  id: string
  name: string
  hint: string
  coins: number
  item?: string
}

export const SECRETS: SecretDef[] = [
  { id: 'ticklish', name: 'Gıdıklanma', hint: 'Başına peş peşe hızlıca dokun.', coins: 50 },
  { id: 'nightowl', name: 'Gece kuşu', hint: 'Oyun saati sabaha karşı 3 ile 4 arasındayken uyanık ol.', coins: 80, item: 'c_mushroom' },
  { id: 'stargazer', name: 'Yıldız bakıcı', hint: 'Geceleri teleskoba dokun.', coins: 70, item: 'c_star' },
  { id: 'cinema', name: 'Sinema gecesi', hint: 'Bir odada televizyon açık, lamba kapalıyken bekle.', coins: 60 },
  { id: 'dancefloor', name: 'Dans pisti', hint: 'Müzik kutusunu çalıştır.', coins: 50 },
  { id: 'cloudtap', name: 'Bulut sohbeti', hint: 'Bahçede gökyüzündeki bulutlara 5 kez dokun.', coins: 50 },
  { id: 'fulloutfit', name: 'Kombin ustası', hint: 'Altı kozmetik yuvasını da doldur.', coins: 120, item: 'c_feather' },
  { id: 'hotcold', name: 'Sıcak soğuk', hint: 'Bir dakika içinde dondurma ve sıcak çikolata ver.', coins: 60 },
  { id: 'duckbath', name: 'Banyo ördeği', hint: 'Banyoda lastik ördekle oyna.', coins: 40 },
  { id: 'moontap', name: 'Ay dostu', hint: 'Geceleri pencerede ayın üstüne 3 kez dokun.', coins: 70 },
]

interface Pool {
  stat: StatKey
  targets: number[]
  title: (n: number) => string
}

export const DAILY_POOL: Pool[] = [
  { stat: 'feeds', targets: [3, 5, 8], title: (n) => `Nova'yı ${n} kez besle` },
  { stat: 'drinks', targets: [2, 4, 6], title: (n) => `${n} kez su veya içecek ver` },
  { stat: 'baths', targets: [1, 2, 3], title: (n) => `${n} kez banyo yaptır` },
  { stat: 'plays', targets: [2, 3, 5], title: (n) => `${n} mini oyun oyna` },
  { stat: 'coinsEarned', targets: [100, 250, 500], title: (n) => `${n} coin kazan` },
  { stat: 'placed', targets: [1, 2, 3], title: (n) => `${n} mobilya yerleştir` },
  { stat: 'pets', targets: [10, 25, 40], title: (n) => `Nova'yı ${n} kez sev` },
  { stat: 'sleeps', targets: [1, 2], title: (n) => `${n} kez uyut` },
  { stat: 'purchases', targets: [1, 2, 3], title: (n) => `Mağazadan ${n} ürün al` },
  { stat: 'achievements', targets: [1], title: () => 'Bir başarım kazan' },
  { stat: 'dressUps', targets: [1, 3], title: (n) => `${n} kez kozmetik tak` },
  { stat: 'toys', targets: [2, 4], title: (n) => `Oyuncakla ${n} kez oyna` },
]

export const WEEKLY_POOL: Pool[] = [
  { stat: 'feeds', targets: [25, 40, 60], title: (n) => `Bu hafta ${n} kez besle` },
  { stat: 'plays', targets: [10, 20, 30], title: (n) => `Bu hafta ${n} mini oyun oyna` },
  { stat: 'coinsEarned', targets: [800, 1500, 3000], title: (n) => `Bu hafta ${n} coin kazan` },
  { stat: 'baths', targets: [7, 12], title: (n) => `Bu hafta ${n} banyo yaptır` },
  { stat: 'crafts', targets: [3, 6], title: (n) => `Bu hafta ${n} eşya üret` },
  { stat: 'explores', targets: [5, 10], title: (n) => `Bu hafta ${n} keşif yap` },
  { stat: 'questsDone', targets: [10, 15], title: (n) => `Bu hafta ${n} günlük görev tamamla` },
]

export interface AchDef {
  id: string
  cat: 'bakim' | 'oyun' | 'ekonomi' | 'ev' | 'ilerleme' | 'gizli'
  name: string
  desc: string
  coins: number
  value: (s: GameState) => number
  target: number
  hidden?: boolean
}

const st = (k: StatKey) => (s: GameState) => s.stats[k]

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'a_feed1', cat: 'bakim', name: 'İlk lokma', desc: 'Nova\'yı ilk kez besle.', coins: 20, value: st('feeds'), target: 1 },
  { id: 'a_feed25', cat: 'bakim', name: 'Düzenli sofra', desc: '25 kez besle.', coins: 50, value: st('feeds'), target: 25 },
  { id: 'a_feed100', cat: 'bakim', name: 'Aşçıbaşı', desc: '100 kez besle.', coins: 150, value: st('feeds'), target: 100 },
  { id: 'a_drink10', cat: 'bakim', name: 'Susuzluk bitti', desc: '10 içecek ver.', coins: 40, value: st('drinks'), target: 10 },
  { id: 'a_bath1', cat: 'bakim', name: 'İlk banyo', desc: 'İlk banyoyu tamamla.', coins: 20, value: st('baths'), target: 1 },
  { id: 'a_bath20', cat: 'bakim', name: 'Pırıl pırıl', desc: '20 banyo yaptır.', coins: 100, value: st('baths'), target: 20 },
  { id: 'a_sleep1', cat: 'bakim', name: 'İyi geceler', desc: 'İlk kez uyut.', coins: 20, value: st('sleeps'), target: 1 },
  { id: 'a_sleep15', cat: 'bakim', name: 'Düzenli uyku', desc: '15 kez uyut.', coins: 90, value: st('sleeps'), target: 15 },
  { id: 'a_med1', cat: 'bakim', name: 'Geçmiş olsun', desc: 'İlk ilacı ver.', coins: 25, value: st('meds'), target: 1 },
  { id: 'a_pet50', cat: 'bakim', name: 'Şefkatli el', desc: '50 kez sev.', coins: 60, value: st('pets'), target: 50 },
  { id: 'a_pet300', cat: 'bakim', name: 'En iyi arkadaş', desc: '300 kez sev.', coins: 200, value: st('pets'), target: 300 },
  { id: 'a_play1', cat: 'oyun', name: 'İlk mini oyun', desc: 'Bir mini oyun bitir.', coins: 25, value: st('plays'), target: 1 },
  { id: 'a_play10', cat: 'oyun', name: 'Oyun merakı', desc: '10 mini oyun bitir.', coins: 60, value: st('plays'), target: 10 },
  { id: 'a_play50', cat: 'oyun', name: 'Salon müdavimi', desc: '50 mini oyun bitir.', coins: 160, value: st('plays'), target: 50 },
  { id: 'a_play100', cat: 'oyun', name: 'Yüzlük', desc: '100 mini oyun bitir.', coins: 300, value: st('plays'), target: 100 },
  { id: 'a_rush200', cat: 'oyun', name: 'Coin avcısı', desc: 'Coin Rush\'ta 200 puan yap.', coins: 100, value: (s) => s.records.coinrush?.best ?? 0, target: 200 },
  { id: 'a_memory', cat: 'oyun', name: 'Fil hafızası', desc: 'Memory Master\'ı 12 kartlık tabloda bitir.', coins: 100, value: (s) => (s.records.memory?.best ?? 0) > 0 ? 1 : 0, target: 1 },
  { id: 'a_react', cat: 'oyun', name: 'Şimşek refleks', desc: 'Reaction Arena\'da 150 puan yap.', coins: 100, value: (s) => s.records.reaction?.best ?? 0, target: 150 },
  { id: 'a_run500', cat: 'oyun', name: 'Maraton', desc: 'Pet Runner\'da 500 metre koş.', coins: 120, value: (s) => s.records.runner?.best ?? 0, target: 500 },
  { id: 'a_win10', cat: 'oyun', name: 'Rekor koleksiyoncusu', desc: 'Rekor sayını 10 yap.', coins: 150, value: st('wins'), target: 10 },
  { id: 'a_coin100', cat: 'ekonomi', name: 'İlk 100 coin', desc: 'Toplam 100 coin kazan.', coins: 30, value: st('coinsEarned'), target: 100 },
  { id: 'a_coin1000', cat: 'ekonomi', name: 'Binlik', desc: 'Toplam 1000 coin kazan.', coins: 100, value: st('coinsEarned'), target: 1000 },
  { id: 'a_coin10000', cat: 'ekonomi', name: 'Servet', desc: 'Toplam 10000 coin kazan.', coins: 400, value: st('coinsEarned'), target: 10000 },
  { id: 'a_buy1', cat: 'ekonomi', name: 'İlk alışveriş', desc: 'Mağazadan bir şey al.', coins: 20, value: st('purchases'), target: 1 },
  { id: 'a_buy25', cat: 'ekonomi', name: 'Düzenli müşteri', desc: '25 ürün satın al.', coins: 120, value: st('purchases'), target: 25 },
  { id: 'a_dress1', cat: 'ekonomi', name: 'İlk kombin', desc: 'Bir kozmetik tak.', coins: 25, value: st('dressUps'), target: 1 },
  { id: 'a_craft1', cat: 'ev', name: 'İlk üretim', desc: 'Bir eşya üret.', coins: 40, value: st('crafts'), target: 1 },
  { id: 'a_craft10', cat: 'ev', name: 'Usta eller', desc: '10 eşya üret.', coins: 160, value: st('crafts'), target: 10 },
  { id: 'a_place1', cat: 'ev', name: 'İlk dekorasyon', desc: 'Bir mobilya yerleştir.', coins: 30, value: st('placed'), target: 1 },
  { id: 'a_place20', cat: 'ev', name: 'İç mimar', desc: '20 mobilya yerleştir.', coins: 140, value: st('placed'), target: 20 },
  { id: 'a_rooms4', cat: 'ev', name: 'Geniş ev', desc: '5 oda aç.', coins: 40, value: (s) => s.unlockedRooms.length, target: 5 },
  { id: 'a_rooms8', cat: 'ev', name: 'Tüm odalar', desc: 'Bütün odaları aç.', coins: 300, value: (s) => s.unlockedRooms.length, target: 8 },
  { id: 'a_explore5', cat: 'ev', name: 'Kaşif', desc: '5 keşfe çık.', coins: 70, value: st('explores'), target: 5 },
  { id: 'a_coll10', cat: 'ev', name: 'Küçük koleksiyon', desc: 'Koleksiyonda 10 eşya biriktir.', coins: 80, value: (s) => s.collection.length, target: 10 },
  { id: 'a_coll40', cat: 'ev', name: 'Büyük koleksiyon', desc: 'Koleksiyonda 40 eşya biriktir.', coins: 250, value: (s) => s.collection.length, target: 40 },
  { id: 'a_lv2', cat: 'ilerleme', name: 'İlk seviye', desc: '2. seviyeye ulaş.', coins: 20, value: (s) => s.level, target: 2 },
  { id: 'a_lv5', cat: 'ilerleme', name: 'Çocuk evresi', desc: '5. seviyeye ulaş.', coins: 80, value: (s) => s.level, target: 5 },
  { id: 'a_lv10', cat: 'ilerleme', name: 'Genç evresi', desc: '10. seviyeye ulaş.', coins: 150, value: (s) => s.level, target: 10 },
  { id: 'a_lv18', cat: 'ilerleme', name: 'Olgunluk', desc: '18. seviyeye ulaş.', coins: 300, value: (s) => s.level, target: 18 },
  { id: 'a_login3', cat: 'ilerleme', name: 'Üç gün', desc: '3 farklı gün oyuna gir.', coins: 40, value: (s) => s.loginDays, target: 3 },
  { id: 'a_login10', cat: 'ilerleme', name: 'On gün', desc: '10 farklı gün oyuna gir.', coins: 200, value: (s) => s.loginDays, target: 10 },
  { id: 'a_quest20', cat: 'ilerleme', name: 'Görev insanı', desc: '20 günlük görev tamamla.', coins: 150, value: st('questsDone'), target: 20 },
  { id: 'a_secret1', cat: 'gizli', name: 'Merak', desc: 'İlk gizli keşfi bul.', coins: 60, value: (s) => s.discoveries.length, target: 1, hidden: true },
  { id: 'a_secret5', cat: 'gizli', name: 'Dedektif', desc: '5 gizli keşif bul.', coins: 200, value: (s) => s.discoveries.length, target: 5, hidden: true },
  { id: 'a_secret10', cat: 'gizli', name: 'Her şeyi bilen', desc: 'Bütün gizli keşifleri bul.', coins: 500, value: (s) => s.discoveries.length, target: 10, hidden: true },
  { id: 'a_dance10', cat: 'gizli', name: 'Dans tutkunu', desc: 'Nova 10 kez dans etsin.', coins: 80, value: st('dances'), target: 10, hidden: true },
]
