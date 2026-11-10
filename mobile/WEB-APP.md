# GrandWall sayt və telefona əlavə edilən tətbiq (PWA)

Android/iPhone tətbiqi əvvəlki kimi qalır. Bundan əlavə eyni tətbiq sayt kimi də işləyir:
**https://api.grandwall.az** ünvanını açıb daxil olmaq olar.

## Server

Sayt API ilə eyni Docker image-də qurulur (`backend/Dockerfile`, `web` mərhələsi:
`npx expo export --platform web`) və API onu `wwwroot`-dan verir. Ayrı domen və CORS lazım deyil.

- `index.html`, `sw.js`, `manifest.json` keşlənmir: yeni versiya push olunan kimi açılır.
- `/return-detail/...` kimi ünvanlar birbaşa açılır (bildirişə basanda), `/api/...` olduğu kimi qalır.
- Mobil kod dəyişəndə də CI image-i yenidən qurur və serverə yayır.

## iPhone (iOS 16.4 və yuxarı)

1. **Safari**-də https://api.grandwall.az açın.
2. Paylaş düyməsi (kvadrat və yuxarı ox) → **Ana ekrana əlavə et** → Əlavə et.
3. Ana ekrandakı **GrandWall** ikonundan açın və yenidən daxil olun (Safari ilə giriş ayrı saxlanır).
4. Menecer: Profil → **Bildirişləri aktivləşdir** → İcazə ver.

Bildirişlər iPhone-da yalnız ana ekrandan açılan tətbiqdə işləyir; Safari vərəqində işləmir.
Giriş səhifəsində və profildə bu addımlar yazılıb.

## Android

Chrome-da saytı açın → **Tətbiqi quraşdır** düyməsi (giriş səhifəsində / profildə) və ya
menyu (⋮) → **Ana ekrana əlavə et**. Bildirişlər həm quraşdırılmış tətbiqdə, həm Chrome-da işləyir.

## Bildirişlər (Web Push)

Yeni vazvrad/vitrin menecerə göndəriləndə aktiv menecerlərə həm telefon tətbiqinə (Expo),
həm də sayta (Web Push, VAPID) bildiriş gedir. Bildirişə basanda vazvradın səhifəsi açılır.
Çıxış edəndə həmin brauzer abunəliyi silinir. Abunəlik `WebPushSubscriptions` cədvəlindədir
(miqrasiya `WebPushSubscriptions`, server açılanda avtomatik tətbiq olunur).

Serverdə `.env.production` faylına bir dəfə açar əlavə edilməlidir (sonra dəyişməyin, köhnə
abunəliklər işləməz):

```
WEB_PUSH_PUBLIC_KEY=...
WEB_PUSH_PRIVATE_KEY=...
WEB_PUSH_SUBJECT=mailto:admin@grandwall.az
```

Açarları yaratmaq:

```
node -e "const e=require('crypto').createECDH('prime256v1');e.generateKeys();console.log(e.getPublicKey('base64url'));console.log(e.getPrivateKey('base64url'))"
```

Birinci sətir public, ikinci private açardır. Açar yoxdursa sayt işləyir, yalnız sayt bildirişləri
gəlmir (profil “Serverdə bildiriş açarları qurulmayıb” yazır). Yerli inkişaf üçün açarlar
`appsettings.Development.json`-dadır (yalnız yerli).
