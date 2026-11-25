# Güldeninnggg V1.4

Kişisel seramik stüdyosu. Beş hoca karakteriyle Türkçe sohbet edebilir, iki fotoğrafa kadar gönderebilir ve metinden veya referans fotoğraflardan görsel üretebilirsin. Ana ekran ve atölye akışları V1.3 tasarımını kullanır. Hoca ayarları cihazda kalır. Sohbet açık olduğu sürece bellekte tutulur.

## Yerel çalıştırma

Node.js 24 gerekir. `.env.example` dosyasını `.env` olarak kopyala. `OPENAI_API_KEY` alanına OpenAI projesine ait anahtarı, `APP_PASSWORD` alanına 24–200 karakterlik rastgele bir atölye parolası gir. Parolayı örneğin `openssl rand -hex 24` ile üretebilirsin.

```sh
npm test
node --env-file=.env server/start.mjs
```

Uygulama [localhost:8080](http://localhost:8080) adresinde açılır. İlk yapay zekâ isteğinde atölye parolasını gir.

## Üretime alma

[Render ile kur](https://render.com/deploy?repo=https://github.com/mehmet604/Guldeninnggg/tree/codex/v1.4)

Bu bağlantı Docker, V1.4 dalı, sağlık kontrolü ve kotayı saklayan 1 GB diski otomatik ayarlar. Render özetinde ücreti kontrol et. Gizli alanlara OpenAI anahtarını ve sadece bu uygulama için seçtiğin 24–200 karakterlik rastgele atölye parolasını gir. Render'da uygulama adresi otomatik alınır.

GitHub Pages, V1.3’ü sunan statik barındırmadır. V1.4’ün ön yüzünü ve API’sini aynı HTTPS adresinde çalıştırmak için bu depodaki Dockerfile’ı kullan. Sağlayıcıda tek bir uygulama örneği, yazılabilir kalıcı `/data` diski (UID 1000) ve en az 120 saniyelik HTTP yanıt zaman aşımı tanımla. Sağlık kontrolü `GET /healthz` yoludur. Aynı kalıcı diski yeniden dağıtımlarda kullan, çünkü SQLite aylık kotayı burada saklar.

Barındırma sağlayıcısının gizli değişkenler bölümüne `OPENAI_API_KEY` ve `APP_PASSWORD` ekle. `APP_ORIGIN` gerçek HTTPS adresi olmalı (ör. `https://atolye.example.com`). Docker varsayılan olarak 8080 portunu dinler. OpenAI projesinde Responses ve Images kullanımı ile GPT-6 Luna ve GPT-Image-2.6 Flare erişimi gerekir. Anahtar, yalnızca bu uygulamaya ayrılmış bir projeden alınırsa maliyetleri izlemek kolaylaşır.

Yayından önce HTTPS adresinde parola girişini, bir hoca ile iki turlu sohbeti, fotoğraf analizini, metinden görsel üretimini ve referanslı görsel üretimini doğrula. iPhone’da Safari üzerinden ana ekrana ekleme akışını kontrol et.

## Kullanım ve maliyet

Her UTC takvim ayında toplam 300 sohbet veya fotoğraf analizi ve 40 görsel üretme veya düzenleme isteği kabul edilir. Sayaç OpenAI çağrısından önce atomik şekilde artar. Zaman aşımına uğrayan ve başarısız olan üst servis istekleri de kotadan düşer. Sistem otomatik tekrar göndermez. Görseller tek seferde bir adet, 1024×1024 ve düşük kalite ile üretilir. Sohbet yanıtı 650 çıktı belirteciyle sınırlandırılır.

Bu sınırlar aylık 10 € API hedefi için başlangıç ayarıdır. Gerçek fatura model kullanımına, fiyatlara, kura, vergilere ve aynı projedeki diğer isteklere bağlıdır. Barındırma ayrı ücretlenir. OpenAI proje bütçe bildirimi uyarı amaçlıdır. Uygulamadaki istek kotaları ise dolduğunda yeni çağrıyı durdurur. İlk canlı testten sonra OpenAI kullanım ekranından bir görsel düzenleme dahil gerçek maliyetleri kontrol et.

- [OpenAI fiyatları](https://developers.openai.com/api/docs/pricing)
- [OpenAI proje bütçeleri](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)

Uygulama mesaj ve fotoğrafları sunucu diskine yazmaz. Gönderilen içerik işlenmek üzere OpenAI’ye iletilir. Statik PWA dosyaları çevrimdışı açılabilir. Yapay zekâ işlemleri bağlantı gerektirir.
