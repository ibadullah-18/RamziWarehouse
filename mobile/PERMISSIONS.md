# İcazələr, admin və tətbiqin adı

## İcazələr (istifadəçi yaradanda seçilir)

Admin istifadəçi yaradanda və ya dəyişəndə əvvəl **rol** seçir (Menecer, Anbar işçisi, Sürücü, Açot operatoru, Admin). Rol öz standart icazələrini qoyur, sonra **İcazələr** siyahısında hər icazəni ayrıca açıb-bağlamaq olar. “Rolun standartına qaytar” seçimi geri qaytarır. Dəyişiklik **dərhal** tətbiq olunur (server hər sorğuda icazəni bazadan oxuyur).

| Qrup | İcazə | Standart olaraq kimdə var |
| --- | --- | --- |
| Vazvrad | Vazvrad / vitrin yaratmaq | hamı |
| Vazvrad | “Sistemə işlənildi” və rədd etmək | Menecer |
| Vazvrad | Yeni vazvrad bildirişləri | Menecer (admin üçün seçimlə) |
| Vazvrad | Təsdiqdən sonra dəyişmək və silmək | Admin |
| Açot | Açota daxil olmaq | Açot operatoru, Sürücü |
| Açot | Köhnə borcu yazmaq və düzəltmək | Açot operatoru |
| Açot | Vazvrad qiymətlərini dəyişmək | Açot operatoru |
| Açot | “Bu günü sıfırla” | Açot operatoru |
| Açot | “Bütün hesabı sıfırla” | Admin |
| Açot | Bitmiş günü düzəltmək | Admin |
| Müştərilər | Müştəri yaratmaq | hamı |
| Müştərilər | Müştəriləri görmək və dəyişmək | Menecer |
| Müştərilər | Müştərini silmək | Admin |
| İdarəetmə | İdarəetmə paneli | Admin |
| İdarəetmə | İstifadəçiləri idarə etmək | Admin |
| İdarəetmə | Tətbiq ayarları (ad, loqo, kod qaydası) | Admin |

**Admin** rolu həmişə hər şeyi edə bilir (bağlamaq olmur); yalnız vazvrad bildirişləri admin üçün seçimlidir. Yeni admin yalnız admin tərəfindən yaradıla bilər. “İstifadəçiləri idarə etmək” icazəsi olan, amma admin olmayan istifadəçi admin yarada, adminin şifrəsini dəyişə və öz icazəsini götürə bilməz.

Admin istənilən istifadəçinin şifrəsini köhnə şifrə olmadan dəyişir (İstifadəçi → Şifrəni dəyiş); həmin istifadəçinin bütün cihazlarda sessiyası bağlanır.

## Giriş müddəti

İstifadəçi bir dəfə daxil olur. Tətbiqi hər açanda giriş müddəti yenidən 10 gün olur. 10 gün tətbiq açılmasa, avtomatik çıxış edir.

## Tətbiqin adı və loqosu

Tətbiqin adı standart olaraq **Ramzi**-dir. İdarəetmə → **Tətbiqin adı və loqosu** (icazə: Tətbiq ayarları):

- adı dəyişmək (1–40 simvol);
- loqo yükləmək (PNG, JPG, WEBP, ən çox 1 MB) və ya silmək. Loqo yoxdursa ad yazı kimi göstərilir.

Ad və loqo giriş səhifəsində, başlıqlarda, açılış animasiyasında, yeniləmə mesajlarında və saytın başlığında dərhal dəyişir.

**Ana ekran ikonu (sayt / iPhone / Android “Ana ekrana əlavə et”).** Loqo yüklənəndə server ondan avtomatik kvadrat ikonlar düzəldir (ağ fon, loqo ortada: 512, 192, 180 px). Saytın manifesti və iPhone ikonu artıq serverdən gəlir. Telefon ikonu yalnız **əlavə etmə anında** götürür: köhnə ikon ana ekranda qalırsa, onu silib saytı yenidən “Ana ekrana əlavə et” edin.

**Quraşdırılmış Android tətbiqinin ikonu** (APK) tətbiqin içində dəyişə bilməz: Android ikonu quraşdırma faylının içindədir. Yeni ikon üçün loqo faylı ilə yeni versiya (build) lazımdır. Tətbiqin içində ad və loqo dərhal dəyişir.

## Açılış animasiyası

Tətbiq açılanda (telefon və sayt) cari loqo böyüyərək görünür, altında xətt çəkilir, sonra yavaşca itir (~2 saniyə). Telefonun öz açılış ekranı boşdur ki, köhnə loqo görünməsin.

## iPhone-da yazanda böyümə

Xanaya yazanda Safari ekranı böyüdür; klaviatura bağlananda ekran avtomatik əvvəlki ölçüyə qayıdır.

## Server

Miqrasiyalar `PermissionsAndBranding` (`Users.Permissions`, `AppBranding`) və `BrandIcons` (loqodan düzəldilən ikonlar). Server açılanda avtomatik tətbiq olunur. Köhnə istifadəçilərin icazələri dəyişmir (rolun standartı ilə işləyirlər).
