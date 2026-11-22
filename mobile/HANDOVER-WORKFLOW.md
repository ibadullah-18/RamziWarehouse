# Mal təhvil

Sürücü malı müştəriyə təhvil verəndə şəklini çəkib menecerə göndərir. Hər gün yeni vərəqdir: siyahı hər səhər boş başlayır, keçmiş günlərə tarixlə baxmaq olar.

## Kim nə görür (İstifadəçilər → icazələr)

| İcazə | Nə edir | Standart |
| --- | --- | --- |
| **Mal təhvil vermək** | Alt menyuda **Təhvil** (yük maşını ikonu): şəkil çəkir, müştəri seçir, göndərir; öz təhvillərini görür, paylaşır, düzəldir, silir | Sürücü |
| **Bütün təhvilləri görmək** | Hamının təhvilləri, tarixə görə, paylaşmaq | Menecer (admin həmişə) |
| **Yeni təhvil bildirişləri** | Hər təhvildə telefona bildiriş | Menecer (admin üçün seçimlə) |

İstənilən istifadəçiyə admin bu icazələri ayrıca verə bilər.

## Sürücü

1. Alt menyuda **Təhvil**-ə basın — kamera dərhal açılır. Şəkli çəkin və təsdiqləyin.
2. Şəkil ekranda görünür; altında **Yenidən çək** düyməsi var. **Şəkil əlavə et** ilə 10 şəklə qədər çəkmək olar, × ilə şəkli çıxarmaq olar.
3. **Müştəri seç**: yuxarıda axtarış (ad və ya telefon), solda əlifba (A, B, C, Ç … Z). Barmağı hərflərin üstündə sürüşdürdükcə siyahı həmin hərfə keçir.
4. **Qeyd** (istəyə görə).
5. **Tamam — menecerə göndər**: bütün şəkillər bir dəfədə göndərilir. İnternet kəsilsə, təkrar basın — təhvil iki dəfə yazılmır.

**Göndərdiklərim**: sürücünün öz təhvilləri (bildiriş getmir). Hər birini paylaşmaq, **Düzəlt** (müştəri, qeyd) və **Sil** — səbəb soruşulmur.

## Menecer

Alt menyuda **Təhvil** → bu günün bütün təhvilləri; **‹ ›** ilə əvvəlki günlər. İdarəetmə səhifəsində də **Mal təhvil** keçidi var. Bildirişə basanda həmin təhvil açılır.

Şəkillər WhatsApp-dakı kimi bir yerdə düzülür (1, 2, 3, 4 və “+N”); şəklə basanda tam ekran açılır, sürüşdürməklə o biri şəkillərə keçilir.

**Paylaş** (yaşıl ikon) telefonun paylaşma pəncərəsini açır (WhatsApp və s.): **yalnız şəkillər və qeyd** gedir, **müştərinin adı getmir**. Saytda (iPhone/Android ana ekran) ilk dəfə şəkillər hazırlanarkən bəzən “yenidən toxunun” yazılır — ikinci toxunuşda paylaşma açılır.

## Server

Miqrasiyalar: `Handovers` (təhvil və şəkil cədvəlləri, bildirişin növü), `ReturnKeepDebt`. Şəkillər vazvrad şəkilləri kimi Cloudinary-də (`grandwall-warehouse/handovers`) saxlanır. Bir göndərişin həcmi: şəkillər telefonda kiçildilir (~200–300 KB), 10 şəkil ≈ 3 MB.
