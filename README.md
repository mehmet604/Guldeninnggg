# Güldeninnggg V1.1
Statik, iPhone öncelikli PWA. API, sunucu veritabanı veya ücretli servis gerektirmez. ChatGPT mesajı kopyala/yapıştır akışı kullanır; fotoğraflar ChatGPT'de ayrıca seçilir. Ayarlar cihazda localStorage ile saklanır.

## Yerel deneme
Klasörde `python -m http.server 8000` çalıştır ve http://localhost:8000 aç. index.html dosyası doğrudan da açılabilir, fakat service worker HTTP(S) gerektirir.

## GitHub Pages
1. GitHub hesabında yeni public repository oluştur: guldeninnggg. Kişisel fotoğraf, parola ve özel veri yükleme.
2. ZIP'i aç; içindeki index.html, style.css, app.js, manifest.webmanifest, sw.js ve assets klasörünü depo köküne yükle. Commit changes.
3. Settings > Pages > Build and deployment > Deploy from a branch > main > /(root) > Save.
4. Pages ekranında gösterilen HTTPS bağlantısını iPhone Safari'de aç. Paylaş > Ana Ekrana Ekle.
5. Ayarlar'da Gülden'in erişebildiği ChatGPT proje veya özel GPT bağlantısını kaydet. Her danışmanlıkta mesajı kopyala, ChatGPT'yi aç ve yapıştır.

Güncelleme: değişen dosyaları aynı depoya commit et; servis çalışanı önbellek sürümünü de değiştir. GitHub Pages public site; kişisel erişim kontrolü yoktur. Ayarlar ve fotoğraflar sunucuya yüklenmez. Gerçek iPhone testi gereklidir. ChatGPT aboneliği ve limitleri ayrı geçerlidir.
