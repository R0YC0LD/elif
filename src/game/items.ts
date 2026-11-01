import type { ArtSpec, Category, Item, NeedKey, Rarity, RoomId, Slot } from './types'

type Fx = Partial<Record<NeedKey, number>>

const list: Item[] = []

function add(i: Item) {
  list.push(i)
}

function food(id: string, name: string, desc: string, price: number, art: ArtSpec, fx: Fx, rarity: Rarity = 'common', minLevel = 1) {
  add({ id, name, desc, cat: 'food', price, rarity, art, fx, minLevel })
}

function drink(id: string, name: string, desc: string, price: number, art: ArtSpec, fx: Fx, rarity: Rarity = 'common', minLevel = 1) {
  add({ id, name, desc, cat: 'drink', price, rarity, art, fx, minLevel })
}

function med(id: string, name: string, desc: string, price: number, art: ArtSpec, fx: Fx, cure = false, rarity: Rarity = 'common') {
  add({ id, name, desc, cat: 'medicine', price, rarity, art, fx, cure })
}

function wear(cat: Category, slot: Slot, id: string, name: string, desc: string, price: number, art: ArtSpec, rarity: Rarity = 'common', minLevel = 1, extra: Partial<Item> = {}) {
  add({ id, name, desc, cat, price, rarity, art, slot, minLevel, ...extra })
}

function furn(
  id: string,
  name: string,
  desc: string,
  price: number,
  art: ArtSpec,
  w: number,
  h: number,
  zone: 'floor' | 'wall',
  rarity: Rarity = 'common',
  interactive?: string,
  rooms?: RoomId[],
  minLevel = 1,
) {
  add({ id, name, desc, cat: 'furniture', price, rarity, art, furn: { w, h, zone, interactive, rooms }, minLevel })
}

// Yiyecekler
food('apple', 'Kırmızı elma', 'Çıtır ve tatlı.', 8, ['apple', '#d9433b', '#4f9d4b'], { hunger: 12, health: 2 })
food('pear', 'Armut', 'Sulu bir ara öğün.', 8, ['apple', '#a8c94a', '#4f9d4b'], { hunger: 12, thirst: 3 })
food('banana', 'Muz', 'Enerji verir.', 8, ['banana', '#f2cf4a'], { hunger: 14, energy: 4 })
food('strawberry', 'Çilek', 'Küçük ama mutlu eder.', 10, ['berry', '#e0364a', '#3f9a4e'], { hunger: 8, happiness: 4 })
food('orange', 'Portakal', 'C vitamini deposu.', 8, ['apple', '#f08a24', '#4f9d4b'], { hunger: 10, health: 3, thirst: 4 })
food('grapes', 'Üzüm', 'Salkım salkım.', 12, ['grapes', '#7a4aa0', '#4f9d4b'], { hunger: 10, happiness: 3 })
food('melon', 'Karpuz dilimi', 'Serinletir.', 14, ['melon', '#e24b57', '#4f9d4b'], { hunger: 12, thirst: 14 })
food('egg', 'Sahanda yumurta', 'Sade ve doyurucu.', 14, ['egg', '#fff4d6', '#f2b630'], { hunger: 22, health: 2 })
food('sandwich', 'Peynirli sandviç', 'Hızlı öğün.', 20, ['sandwich', '#e9c27a', '#f2b630'], { hunger: 28 })
food('soup', 'Sebze çorbası', 'Midede sıcak bir yer açar.', 18, ['bowl', '#e48b3a', '#f6efe0'], { hunger: 24, health: 4, comfort: 6 })
food('noodles', 'Erişte kasesi', 'Buharı tüten kase.', 24, ['bowl', '#f0d38a', '#d9573b'], { hunger: 30, happiness: 4 })
food('burger', 'Hamburger', 'Doyurur, ama her gün olmaz.', 30, ['burger', '#d9953a', '#5a9c3f'], { hunger: 38, happiness: 8, health: -3 })
food('pizza', 'Pizza dilimi', 'Peynir uzar.', 28, ['pizza', '#f0b645', '#c9382f'], { hunger: 34, happiness: 8, health: -2 })
food('taco', 'Taco', 'Çıtır kabuk.', 26, ['taco', '#e9c27a', '#5a9c3f'], { hunger: 30, happiness: 6 })
food('sushi', 'Somon suşi', 'Küçük bir lüks.', 40, ['sushi', '#f2653a', '#fbfaf2'], { hunger: 30, happiness: 10, health: 3 }, 'uncommon', 3)
food('cookie', 'Çikolatalı kurabiye', 'Fırından yeni çıktı.', 12, ['cookie', '#c88a4a', '#4a2c1a'], { hunger: 8, happiness: 8, health: -1 })
food('cupcake', 'Kek', 'Üstünde krema var.', 22, ['cupcake', '#f4a3b6', '#c88a4a'], { hunger: 14, happiness: 12, health: -1 })
food('donut', 'Donut', 'Delikli mutluluk.', 18, ['donut', '#f4a3b6', '#d9a864'], { hunger: 14, happiness: 10, health: -2 })
food('cake', 'Yaş pasta', 'Özel günlere.', 35, ['cake', '#fff1d6', '#d9433b'], { hunger: 20, happiness: 18, health: -3 }, 'uncommon', 2)
food('icecream', 'Dondurma', 'Üç top, bir külah.', 20, ['icecream', '#f4a3b6', '#8fd3b8'], { hunger: 8, happiness: 12, fun: 6, thirst: -4 })
food('choco', 'Çikolata', 'Bir sıra kare.', 14, ['choco', '#5a3320'], { hunger: 8, happiness: 10, health: -1 })
food('candy', 'Şeker', 'Sarılı şeker.', 6, ['candy', '#e0364a', '#f2b630'], { hunger: 3, happiness: 6, health: -1 })
food('goldenapple', 'Altın elma', 'Nadir bulunur, çok işe yarar.', 120, ['apple', '#e9b52c', '#4f9d4b'], { hunger: 40, health: 20, happiness: 10 }, 'epic', 8)

// İçecekler
drink('water', 'Su', 'Bardakta berrak su.', 4, ['cup', '#8fd0e8'], { thirst: 32 })
drink('milk', 'Süt', 'Kemikler için.', 10, ['cup', '#fbfaf2'], { thirst: 24, hunger: 8, health: 2 })
drink('orangejuice', 'Portakal suyu', 'Taze sıkılmış.', 12, ['cup', '#f4a024'], { thirst: 28, happiness: 3 })
drink('applejuice', 'Elma suyu', 'Tatlı ve açık renk.', 12, ['cup', '#d6b445'], { thirst: 28, happiness: 3 })
drink('lemonade', 'Limonata', 'Ekşi ve ferah.', 12, ['cup', '#f0e26a'], { thirst: 30, happiness: 4 })
drink('tea', 'Bitki çayı', 'Sıcak bir fincan.', 10, ['mug', '#b4562f'], { thirst: 18, comfort: 10 })
drink('cocoa', 'Sıcak çikolata', 'Kış akşamları için.', 18, ['mug', '#6b3a22'], { thirst: 16, happiness: 8, comfort: 12 })
drink('soda', 'Gazoz', 'Kabarcıklı.', 14, ['can', '#3f8fd0'], { thirst: 20, fun: 6, health: -1 })
drink('smoothie', 'Meyve karışımı', 'Çilek ve muz.', 20, ['cup', '#e88aa0'], { thirst: 24, hunger: 12, health: 3 }, 'uncommon', 2)
drink('greenjuice', 'Yeşil karışım', 'Tadı garip, faydası büyük.', 22, ['cup', '#7fbf5a'], { thirst: 22, health: 8 }, 'uncommon', 3)

// İlaçlar
med('bandage', 'Yara bandı', 'Küçük sıyrıklar için.', 15, ['bandage', '#f2d0a4'], { health: 12 })
med('vitamin', 'Vitamin kavanozu', 'Günlük destek.', 25, ['jar', '#f2a024'], { health: 15, energy: 5 })
med('herbal', 'Ihlamur karışımı', 'Yumuşak bir iyileştirici.', 20, ['mug', '#a8bf5a'], { health: 14, comfort: 8 })
med('syrup', 'Şurup', 'Hastalığa karşı.', 40, ['syrup', '#d9433b'], { health: 35 }, true)
med('pill', 'Güçlü hap', 'Hızlı iyileştirir.', 55, ['pill', '#f6efe0', '#3f8fd0'], { health: 25 }, true, 'uncommon')

// Şapkalar
wear('hat', 'head', 'cap_red', 'Kırmızı kep', 'Siperi hafif eğik.', 60, ['cap', '#d9433b'])
wear('hat', 'head', 'cap_blue', 'Mavi kep', 'Spor ve rahat.', 60, ['cap', '#3f7fd0'])
wear('hat', 'head', 'beanie', 'Yün bere', 'Kış için.', 70, ['beanie', '#e0793a', '#f6efe0'])
wear('hat', 'head', 'beanie_green', 'Yeşil bere', 'Ponponlu.', 70, ['beanie', '#4f9d4b', '#f6efe0'])
wear('hat', 'head', 'party', 'Parti şapkası', 'Her gün doğum günü.', 50, ['party', '#e0364a', '#f2b630'])
wear('hat', 'head', 'straw', 'Hasır şapka', 'Yaz güneşi için.', 90, ['straw', '#e3c27a', '#d9433b'], 'common', 2)
wear('hat', 'head', 'chef', 'Aşçı şapkası', 'Mutfağın şefi.', 110, ['chef', '#fbfaf2'], 'uncommon', 3)
wear('hat', 'head', 'wizard', 'Yıldızlı büyücü şapkası', 'Yıldızlar üstünde parlar.', 220, ['wizard', '#3a4f9a', '#f2cf4a'], 'rare', 6)
wear('hat', 'head', 'crown', 'Küçük taç', 'Altın ve kırmızı taşlı.', 400, ['crown', '#e9b52c', '#d9433b'], 'epic', 10)
wear('hat', 'head', 'headphones', 'Kulaklık', 'Kendi müziği.', 150, ['headphones', '#2a3a3d', '#e0793a'], 'uncommon', 4)
wear('hat', 'head', 'flowercrown', 'Papatya tacı', 'Bahçeden toplandı.', 80, ['flowercrown', '#fbfaf2', '#f2cf4a'], 'common', 2)
wear('hat', 'head', 'ribbon', 'Kurdele', 'Başının üstünde fiyonk.', 40, ['ribbon', '#e0529a'])

// Gözlükler
wear('glasses', 'eyes', 'round_glasses', 'Yuvarlak gözlük', 'İnce çerçeve.', 70, ['roundg', '#3a2a22'])
wear('glasses', 'eyes', 'shades', 'Güneş gözlüğü', 'Havalı durur.', 100, ['shades', '#151a1c'], 'common', 2)
wear('glasses', 'eyes', 'star_glasses', 'Yıldız gözlük', 'Parti için.', 130, ['starg', '#f2b630'], 'uncommon', 3)
wear('glasses', 'eyes', 'nerd_glasses', 'Kalın çerçeve', 'Kitap kurdu.', 90, ['roundg', '#1f3a3d', 'thick'])
wear('glasses', 'eyes', 'heart_glasses', 'Kalp gözlük', 'Her şeyi pembe görür.', 140, ['heartg', '#e0529a'], 'uncommon', 4)

// Boyun
wear('accessory', 'neck', 'scarf_red', 'Kırmızı atkı', 'Sıcacık.', 75, ['scarf', '#d9433b', '#f6efe0'])
wear('accessory', 'neck', 'scarf_blue', 'Mavi atkı', 'Çizgili.', 75, ['scarf', '#3f7fd0', '#f6efe0'])
wear('accessory', 'neck', 'bowtie', 'Papyon', 'Şık.', 60, ['bowtie', '#2a3a3d'])
wear('accessory', 'neck', 'bell', 'Çıngıraklı tasma', 'Her adımda ses çıkarır.', 85, ['bell', '#d9433b', '#f2cf4a'])
wear('accessory', 'neck', 'bandana', 'Bandana', 'Kovboy havası.', 65, ['bandana', '#3f7fd0'])
wear('accessory', 'neck', 'pearls', 'İnci kolye', 'Parlak ve zarif.', 260, ['pearls', '#fbfaf2'], 'rare', 7)

// Gövde
wear('clothes', 'body', 'tee_red', 'Kırmızı tişört', 'Sade ve rahat.', 80, ['tee', '#d9433b'])
wear('clothes', 'body', 'tee_blue', 'Mavi tişört', 'Her güne uyar.', 80, ['tee', '#3f7fd0'])
wear('clothes', 'body', 'tee_yellow', 'Sarı tişört', 'Güneş rengi.', 80, ['tee', '#f2b630'])
wear('clothes', 'body', 'hoodie', 'Kapüşonlu', 'Cebi var.', 140, ['hoodie', '#4f6f9a'], 'uncommon', 3)
wear('clothes', 'body', 'overalls', 'Tulum', 'Çalışma günü.', 130, ['overalls', '#3f7fd0', '#f2b630'], 'common', 2)
wear('clothes', 'body', 'dress', 'Puantiyeli elbise', 'Dönünce savrulur.', 150, ['dress', '#e0529a', '#fbfaf2'], 'uncommon', 3)
wear('clothes', 'body', 'vest', 'Yelek', 'Kahverengi deri.', 120, ['vest', '#8a5a34'], 'common', 2)
wear('clothes', 'body', 'cape', 'Kahraman pelerini', 'Rüzgarda dalgalanır.', 300, ['cape', '#d9433b', '#f2cf4a'], 'rare', 7)
wear('clothes', 'body', 'labcoat', 'Önlük', 'Çalışma odası için.', 160, ['tee', '#fbfaf2', '#3f7fd0'], 'uncommon', 5)

// Ayak
wear('shoes', 'feet', 'sneakers', 'Spor ayakkabı', 'Beyaz tabanlı.', 90, ['shoe', '#d9433b', '#fbfaf2'])
wear('shoes', 'feet', 'sneakers_blue', 'Mavi spor ayakkabı', 'Hızlı koşar.', 90, ['shoe', '#3f7fd0', '#fbfaf2'])
wear('shoes', 'feet', 'boots', 'Yağmur çizmesi', 'Su birikintilerine hazır.', 110, ['boot', '#f2b630'], 'common', 2)
wear('shoes', 'feet', 'slippers', 'Panduf', 'Evin içinde.', 70, ['slipper', '#e8a0b8'])
wear('shoes', 'feet', 'goldshoes', 'Altın pabuç', 'Parıl parıl.', 350, ['shoe', '#e9b52c', '#fbfaf2'], 'epic', 9)

// Özel efektler
wear('special', 'fx', 'fx_sparkle', 'Kıvılcım izi', 'Etrafında ışıltı.', 200, ['fxsparkle', '#f2cf4a'], 'rare', 5)
wear('special', 'fx', 'fx_hearts', 'Kalp bulutu', 'Sevgi yayar.', 180, ['fxhearts', '#e0529a'], 'rare', 4)
wear('special', 'fx', 'fx_bubbles', 'Baloncuklar', 'Hafif ve oynak.', 150, ['fxbubbles', '#8fd0e8'], 'uncommon', 3)
wear('special', 'fx', 'fx_leaves', 'Yaprak yağmuru', 'Bahçe havası.', 160, ['fxleaves', '#7fbf5a'], 'uncommon', 3)
wear('special', 'fx', 'fx_snow', 'Kar tanesi', 'Kış hediyesi.', 0, ['fxsnow', '#e8f4fa'], 'rare', 1, { event: 'winter', shopHidden: true })
wear('special', 'fx', 'fx_halo', 'Hale', 'Başının üstünde ışık.', 500, ['fxhalo', '#f6e27a'], 'epic', 12)

// Duvar kağıtları ve zeminler
function paper(id: string, name: string, price: number, c1: string, c2: string, pattern: string, rarity: Rarity = 'common', minLevel = 1, shopHidden = false) {
  add({ id, name, desc: 'Duvara yeni bir hava katar.', cat: 'wallpaper', price, rarity, art: [pattern, c1, c2], minLevel, shopHidden })
}
function flooring(id: string, name: string, price: number, c1: string, c2: string, pattern: string, rarity: Rarity = 'common', minLevel = 1, shopHidden = false) {
  add({ id, name, desc: 'Zemini değiştirir.', cat: 'floor', price, rarity, art: [pattern, c1, c2], minLevel, shopHidden })
}

paper('wp_cream', 'Krem düz', 0, '#f2e6cf', '#e6d6b8', 'plain', 'common', 1, true)
paper('wp_mint', 'Nane çizgili', 60, '#cfe8da', '#bcdcc9', 'stripes')
paper('wp_sky', 'Gökyüzü mavisi', 60, '#cfe2ee', '#b9d3e4', 'plain')
paper('wp_peach', 'Şeftali benekli', 80, '#f6d8c0', '#efc4a4', 'dots')
paper('wp_sage', 'Adaçayı yeşili', 80, '#c3d3b4', '#b0c49f', 'plain')
paper('wp_navy', 'Gece mavisi yıldızlı', 120, '#2f4766', '#3d5a80', 'stars', 'uncommon', 3)
paper('wp_brick', 'Tuğla', 110, '#c46a4e', '#a8553c', 'brick', 'uncommon', 3)
paper('wp_check', 'Ekose', 100, '#efe3bd', '#e0cf9a', 'check', 'common', 2)
paper('wp_leaf', 'Yaprak desenli', 140, '#d3e4c6', '#a8c78e', 'leaves', 'uncommon', 4)
paper('wp_gold', 'Altın baklava', 320, '#2a4a46', '#c9a444', 'diamond', 'epic', 10)

flooring('fl_oak', 'Meşe parke', 0, '#c89a62', '#b58650', 'planks', 'common', 1, true)
flooring('fl_dark', 'Koyu ahşap', 90, '#6f4a30', '#5d3d27', 'planks', 'common', 2)
flooring('fl_tile', 'Beyaz karo', 100, '#e9e6dc', '#d3cfc2', 'tiles', 'common', 2)
flooring('fl_check', 'Dama zemin', 130, '#2a3a3d', '#e9e6dc', 'checker', 'uncommon', 4)
flooring('fl_grass', 'Çimen', 110, '#6fae5a', '#5d9a4a', 'grass', 'common', 3)
flooring('fl_carpet', 'Mavi halı zemin', 120, '#5a7fa8', '#4d6f96', 'tiles', 'uncommon', 3)
flooring('fl_stone', 'Taş döşeme', 140, '#9a9a94', '#868680', 'tiles', 'uncommon', 4)

// Mobilya
const LIV: RoomId[] = ['living', 'playroom', 'study', 'vault']
furn('sofa_red', 'Kırmızı kanepe', 'İki kişilik, yumuşak.', 220, ['sofa', '#c9473c'], 5, 2, 'floor', 'common', undefined, undefined, 1)
furn('sofa_teal', 'Yeşil kanepe', 'Kadife kumaş.', 220, ['sofa', '#3f8f86'], 5, 2, 'floor', 'common', undefined, undefined, 2)
furn('armchair', 'Koltuk', 'Okuma köşesi için.', 140, ['armchair', '#e0a24a'], 3, 2, 'floor')
furn('table_wood', 'Ahşap masa', 'Dört kişilik.', 120, ['table', '#a8743f'], 4, 2, 'floor')
furn('table_round', 'Yuvarlak sehpa', 'Çay için.', 90, ['table', '#e8e0cf', 'round'], 3, 2, 'floor')
furn('bookshelf', 'Kitaplık', 'Renkli sırtlar.', 180, ['bookshelf', '#8a5a34'], 3, 4, 'floor', 'common', undefined, undefined, 2)
furn('desk', 'Çalışma masası', 'Çekmeceli.', 200, ['desk', '#a8743f'], 5, 3, 'floor', 'common', undefined, ['study', 'living', 'playroom'], 2)
furn('bed_blue', 'Mavi yatak', 'Battaniyeli.', 260, ['bed', '#4a7fb0'], 6, 3, 'floor', 'common', undefined, ['bedroom'], 1)
furn('bed_pink', 'Pembe yatak', 'Yastıkları kabarık.', 260, ['bed', '#d97aa0'], 6, 3, 'floor', 'common', undefined, ['bedroom'], 1)
furn('rug_round', 'Yuvarlak halı', 'Zemini yumuşatır.', 80, ['rug', '#d9573b', '#f2b630'], 6, 2, 'floor')
furn('rug_blue', 'Mavi halı', 'Kenarı saçaklı.', 80, ['rug', '#3f7fd0', '#f6efe0'], 6, 2, 'floor')
furn('plant_pot', 'Saksı bitkisi', 'Suladıkça büyür.', 70, ['plant', '#3f9a4e'], 2, 3, 'floor', 'common', 'plant')
furn('cactus', 'Kaktüs', 'Susuzluğa dayanıklı.', 50, ['plant', '#5a9c6a', 'cactus'], 1, 2, 'floor', 'common', 'plant')
furn('lamp_floor', 'Ayaklı lamba', 'Sıcak ışık verir.', 110, ['lamp', '#f2cf4a'], 2, 4, 'floor', 'common', 'lamp')
furn('lamp_table', 'Masa lambası', 'Dokununca yanar.', 70, ['lamp', '#e0793a', 'small'], 1, 2, 'floor', 'common', 'lamp')
furn('tv_set', 'Televizyon', 'Çizgi film kanalı.', 320, ['tv', '#2a3a3d'], 4, 3, 'floor', 'uncommon', 'tv', LIV, 3)
furn('aquarium', 'Akvaryum', 'Balıklar yüzer.', 340, ['aquarium', '#6db3d9'], 4, 3, 'floor', 'uncommon', 'aquarium', undefined, 4)
furn('musicbox', 'Müzik kutusu', 'Dokununca melodi çalar.', 150, ['musicbox', '#c46a4e'], 2, 2, 'floor', 'common', 'musicbox', undefined, 2)
furn('radio', 'Eski radyo', 'Bir parça çalar.', 130, ['radio', '#c9a444'], 2, 2, 'floor', 'common', 'radio')
furn('drum', 'Davul', 'Vurdukça ses çıkarır.', 120, ['drum', '#d9433b'], 2, 2, 'floor', 'common', 'drum', ['playroom', 'living', 'garden'])
furn('ball_toy', 'Zıplayan top', 'Dokununca zıplar.', 40, ['ball', '#e0364a'], 1, 1, 'floor', 'common', 'ball')
furn('globe', 'Dünya küresi', 'Döndürülebilir.', 160, ['globe', '#3f7fd0'], 2, 2, 'floor', 'common', 'globe', ['study', 'living', 'playroom'], 3)
furn('telescope', 'Teleskop', 'Geceleri yıldızlara bak.', 380, ['telescope', '#8a5a34'], 3, 4, 'floor', 'rare', 'telescope', ['study', 'garden', 'living', 'bedroom'], 6)
furn('fireplace', 'Şömine', 'Alevi titrer.', 420, ['fireplace', '#8a6a5a'], 5, 4, 'floor', 'rare', 'fireplace', ['living', 'study', 'vault'], 5)
furn('toychest', 'Oyuncak sandığı', 'Kapağı açılır.', 130, ['chest', '#c9473c'], 3, 2, 'floor', 'common', undefined, ['playroom', 'bedroom', 'living'])
furn('bench', 'Bahçe bankı', 'Gölgede bir mola.', 130, ['bench', '#8a5a34'], 4, 2, 'floor', 'common', undefined, ['garden'])
furn('flowerbed', 'Çiçek tarhı', 'Her mevsim değişir.', 100, ['flowerbed', '#e0529a'], 4, 1, 'floor', 'common', 'plant', ['garden'])
furn('tree_small', 'Meyve ağacı', 'Mevsimle rengini değiştirir.', 240, ['tree', '#4f9d4b'], 4, 6, 'floor', 'uncommon', 'plant', ['garden'], 3)
furn('fountain', 'Küçük havuz', 'Su sesi.', 380, ['fountain', '#8fd0e8'], 4, 3, 'floor', 'rare', 'fountain', ['garden'], 6)
furn('clock_wall', 'Duvar saati', 'Oyun saatini gösterir.', 90, ['clock', '#f6efe0'], 2, 2, 'wall', 'common', 'clock')
furn('frame_sun', 'Gün doğumu tablosu', 'Sade bir çerçeve.', 60, ['frame', '#f2b630', '#6db3d9'], 2, 2, 'wall')
furn('frame_cat', 'Portre', 'Nova ve arkadaşları.', 70, ['frame', '#e0793a', '#8fd3b8'], 2, 2, 'wall')
furn('shelf_wall', 'Duvar rafı', 'Küçük objeler için.', 60, ['wshelf', '#a8743f'], 3, 1, 'wall')
furn('mirror', 'Boy aynası', 'Kendine bakabilir.', 160, ['mirror', '#c9a444'], 2, 4, 'wall', 'uncommon', 'mirror', undefined, 3)
furn('lights_string', 'Işık zinciri', 'Akşamları yanar.', 110, ['lights', '#f2cf4a'], 5, 1, 'wall', 'uncommon', 'lamp')

// Oyuncaklar
function toy(id: string, name: string, desc: string, price: number, art: ArtSpec, fx: Fx, rarity: Rarity = 'common', minLevel = 1) {
  add({ id, name, desc, cat: 'toy', price, rarity, art, fx, minLevel })
}
toy('toy_ball', 'Plaj topu', 'Oynamaya yeter.', 30, ['ball', '#3f8fd0'], { fun: 25, energy: -6 })
toy('toy_duck', 'Lastik ördek', 'Banyoda da olur.', 35, ['duck', '#f2cf4a'], { fun: 22, happiness: 6, energy: -4 })
toy('toy_robot', 'Küçük robot', 'Yürür ve ses çıkarır.', 90, ['robot', '#8aa0aa'], { fun: 32, happiness: 8, energy: -8 }, 'uncommon', 3)
toy('toy_kite', 'Uçurtma', 'Rüzgarlı günlerde güzel.', 70, ['kite', '#e0529a'], { fun: 28, energy: -8 }, 'common', 2)
toy('toy_blocks', 'Yapı blokları', 'Kule yapar.', 60, ['blocks', '#e0793a'], { fun: 24, energy: -5 })
toy('toy_plush', 'Peluş yıldız', 'Sarılmalık.', 80, ['plush', '#f2cf4a'], { fun: 15, comfort: 14, social: 10 })

// Koleksiyon parçaları (mağazada satılmaz)
function coll(id: string, name: string, desc: string, art: ArtSpec, rarity: Rarity, event?: string) {
  add({ id, name, desc, cat: 'collectible', price: 0, rarity, art, shopHidden: true, event })
}
coll('c_shell', 'Spiral deniz kabuğu', 'Kulağa tutunca dalga sesi gelir.', ['shell', '#f0c4a8'], 'common')
coll('c_gem_blue', 'Mavi taş', 'Mağara duvarından çıkarıldı.', ['gem', '#3f8fd0'], 'uncommon')
coll('c_gem_red', 'Kırmızı taş', 'İçinde küçük bir alev var gibi.', ['gem', '#d9433b'], 'rare')
coll('c_feather', 'Gökkuşağı tüyü', 'Işıkta renk değiştirir.', ['feather', '#8fd3b8'], 'uncommon')
coll('c_fossil', 'Fosil yaprak', 'Milyonlarca yıllık.', ['fossil', '#a89478'], 'rare')
coll('c_coin_old', 'Eski sikke', 'Üstünde silik bir yüz var.', ['coinold', '#c9a444'], 'rare')
coll('c_star', 'Düşen yıldız parçası', 'Hâlâ biraz sıcak.', ['gem', '#f6e27a'], 'epic')
coll('c_mushroom', 'Işıklı mantar', 'Karanlıkta parlar.', ['mushroom', '#e0529a'], 'uncommon')
coll('c_key', 'Pas tutmuş anahtar', 'Neyi açtığı belli değil.', ['key', '#8a6a4a'], 'rare')
coll('c_crystal', 'Kristal küme', 'Sesle titreşir.', ['gem', '#8fd3b8'], 'epic')
coll('c_badge_first', 'İlk gün rozeti', 'Nova ile ilk gün.', ['badge', '#f2b630'], 'common')
coll('c_badge_week', 'Hafta rozeti', 'Bir hafta düzenli giriş.', ['badge', '#3f8fd0'], 'uncommon')
coll('c_snowglobe', 'Kar küresi', 'Kış festivali hediyesi.', ['gem', '#e8f4fa'], 'rare', 'winter')
coll('c_sunhat', 'Yaz partisi rozeti', 'Yaz partisi hediyesi.', ['badge', '#f08a24'], 'rare', 'summer')
coll('c_leafbadge', 'Sonbahar yaprağı', 'Sonbahar koleksiyonu.', ['badge', '#c9473c'], 'rare', 'autumn')
coll('c_blossom', 'Kiraz çiçeği', 'İlkbahar etkinliği hediyesi.', ['badge', '#f4a3b6'], 'rare', 'spring')

export const ITEMS: Record<string, Item> = Object.fromEntries(list.map((i) => [i.id, i]))
export const ITEM_LIST: Item[] = list

export function item(id: string): Item {
  const it = ITEMS[id]
  if (!it) throw new Error(`Bilinmeyen eşya: ${id}`)
  return it
}

export const MATERIALS: Record<string, { name: string; art: ArtSpec }> = {
  cloth: { name: 'Kumaş', art: ['cloth', '#d9573b'] },
  thread: { name: 'İplik', art: ['thread', '#f2cf4a'] },
  wood: { name: 'Tahta', art: ['wood', '#a8743f'] },
  paint: { name: 'Boya', art: ['paint', '#3f8fd0'] },
  fruit: { name: 'Meyve', art: ['apple', '#d9433b', '#4f9d4b'] },
  milk: { name: 'Süt şişesi', art: ['cup', '#fbfaf2'] },
  star: { name: 'Yıldız tozu', art: ['gem', '#f6e27a'] },
  glass: { name: 'Cam parçası', art: ['gem', '#a8d8e8'] },
}

export const DEFAULT_WALL = 'wp_cream'
export const DEFAULT_FLOOR = 'fl_oak'
