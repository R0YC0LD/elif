# Project Nova

Tarayıcıda çalışan sanal evcil hayvan oyunu. Karakter, ev, mini oyunlar ve sesler oyunun içinde çizilir ve üretilir. Sunucu, hesap veya dış bağlantı gerekmez. İlerleme tarayıcıda saklanır.

Oyunun adı `src/game/types.ts` içindeki `GAME_TITLE` ve `index.html` başlığından değişir.

## Çalıştırma

```bash
npm install
npm run dev
```

Diğer komutlar:

```bash
npm test          # birim testleri
npm run build     # tip denetimi ve üretim derlemesi (dist/)
npm run preview   # derlenmiş sürümü yerelde aç
```

## GitHub Pages ile yayınlama

Derleme `base: './'` ile yapılır, bu yüzden depo adı ne olursa olsun çalışır.

1. Projeyi bir GitHub deposuna it (`main` dalı).
2. Depoda Settings > Pages > Build and deployment > Source olarak **GitHub Actions** seç.
3. `.github/workflows/deploy.yml` her `main` push'unda testleri çalıştırır, derler ve yayınlar.
4. Adres `https://<kullanıcı>.github.io/<depo>/` olur.

## Oyun

- Karakter: dokunma (baş ve gövde farklı tepki verir), sevme, sürükleme. Kişilik oynama biçimine göre değişir. Dört gelişim evresi var.
- Bakım: beslenme (dokun veya sürükle), içecek, ilaç, banyo (sabun, sünger, duş, havlu), uyku ve lamba, oyuncaklar, dans.
- Ev: sekiz oda, mobilya yerleştirme (grid, çakışma ve sınır denetimi), çevirme, renk, duvar kağıdı ve zemin. Lamba, televizyon, akvaryum, saat, bitki, müzik kutusu gibi eşyalar etkileşimlidir.
- Dünya: gün ve gece, dört mevsim, beş hava durumu, mevsimlik etkinlikler. Oyun saati gerçek zamanla orantılıdır (1 gerçek saniye = 1 oyun dakikası).
- İlerleme: XP ve seviye, günlük ve haftalık görevler, 46 başarım, 10 gizli keşif, koleksiyon, üretim tarifleri, keşif bölgeleri.
- Mini oyunlar: Coin Rush, Memory Master, Reaction Arena, Pet Runner, Stack Tower, Color Match.
- Çevrimdışı ilerleme en fazla 8 saat hesaplanır, dönüşte özet gösterilir. Karakter kaybolmaz veya ölmez.

## Kayıt

Kayıt `localStorage` içinde sürümlüdür, her yüklemede doğrulanır. Bozuk ana kayıt olursa yedek kayıt, o da yoksa IndexedDB anlık görüntüsü denenir. Ayarlar bölümünden JSON olarak dışa ve içe aktarılabilir. Sıfırlama iki ayrı onay ister.

## Yapı

```
src/
  engine/      sabit adımlı döngü, performans ölçümü
  game/        durum, ihtiyaçlar, ekonomi, görevler, başarımlar, kayıt, dünya zamanı (React'e bağımlı değil)
  render/      karakter ve animasyon, odalar, mobilya, parçacıklar, sahne
  audio/       Web Audio ile ses efektleri ve müzik
  minigames/   mini oyunlar
  ui/          paneller, menüler, bildirimler
tests/         vitest
```

Oyun mantığı `src/game` altında saf fonksiyonlardır ve testlerle doğrulanır. Sahne `requestAnimationFrame` ile 1/120 sn sabit adımla çalışır, çizim ayrı yapılır. React sahne karelerinde yeniden çizilmez, ihtiyaç değerleri arayüze saniyede en fazla dört kez yansır.

Geliştirici paneli (Ayarlar > Geliştirici) gerçek ölçülen FPS, ortalama FPS, 1% düşük, kare süresi, çizilen nesne ve parçacık sayısı ile tarayıcı destekliyorsa bellek gösterir.

## Bilinen eksikler

- Mini oyun sayısı 6. Bubble Pop, Puzzle World, Catch the Stars ve Pet Soccer henüz yok.
- Yiyecek ve içecek 33, kozmetik 43 adet. Hedef 50 ve 60.
- Playwright testleri yazılmadı. Tarayıcı kontrolü elle yapıldı.
- Service worker bu ortamda denenemedi, yalnızca kod olarak hazır.
- 144 Hz davranışı gerçek bir 144 Hz ekranda ölçülmedi. Döngü ekranın yenileme hızını izler.
