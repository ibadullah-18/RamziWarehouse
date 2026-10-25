# Vazvrad və vitrin

Menecer təsdiqi saxlanılıb: **Şəkil gözləyir → (Menecerə göndər) → Təsdiq gözləyir → Sistemə işlənildi**; menecer ləğv də edə bilər. Vazvrad “Təsdiq gözləyir” olanda menecerə Telegram və push bildirişi gedir; menecer və ya admin “Sistemə işlənildi” basanda qeyd anbara qəbul olunur və məbləği müştərinin borcundan çıxılır.

Açotda müştəri ilə hesablaşanda vazvrat təsdiqi gözləmədən seçilib dərhal borcdan çıxıla bilər. Bu halda sonradan menecer təsdiq edəndə borc ikinci dəfə azalmır. Ləğv edilmiş vazvrat açotda təklif olunmur; borcdan çıxarılandan sonra ləğv edilərsə, borc geri qaytarılır.

## Yaratma

1. **Kim yaradır?** Admin “Vazvrat yaradanlar” bölməsində işçi adlarını əlavə edir. Yaratma səhifəsində bu adlar düymə kimi çıxır; işçi öz adını seçib davam edir. Ad siyahısı doludursa, ad seçmədən saxlamaq olmur.
2. **Müştəri.** Vazvradda bütün müştərilər görünür (“Sədərək dükanı” açarından asılı deyil).
3. **Kod və partiya.** Yalnız **rəqəm və `-`** yazılır (məsələn `1019`, `340-1`); hərflər avtomatik silinir. Rəqəm klaviaturasında tire olmadığı üçün hər kod sahəsinin yanında ayrıca `-` düyməsi var. Server də eyni qaydanı yoxlayır.
4. **Məbləğ** istəyə görədir; açotda müştəri ilə hesablaşanda da yazıla bilər.
5. **Şəkillər** istəyə görədir və yaratma səhifəsindən çəkilir.

## Şəkillərin sürətli göndərilməsi

“Menecerə göndər” düyməsi şəkillər göndərilənə qədər gözləyir ki, hamısı menecerin mesajında olsun. Əvvəl şəkil tam ölçüdə çəkilib sonra yenidən sıxılır və göndərilənə qədər ekran gözlədirdi. İndi kamera 0,6 keyfiyyətlə çəkir, şəkil ən uzun tərəfi 1280 piksel olan JPEG-ə (təxminən 150–300 KB) bir dəfə sıxılır və **arxa planda** göndərilir: işçi gözləmir, başqa şəkil çəkə və ya səhifədən çıxa bilər. Hər şəkil eyni əməliyyat nömrəsi ilə 3 dəfəyə qədər avtomatik təkrar göndərilir; alınmasa “Yenidən göndər” düyməsi qalır, şəkil iki dəfə yazılmır. Telegram kanalına hər yüklənən şəkil kod və müştəri adı ilə ayrıca göndərilir.

## Axtarış

Vazvrad və Axtarış səhifələrində bir axtarış xanası müştəri adını, məhsul kodunu və partiyanı tapır: `1019` yazanda tərkibində 1019 olan **bütün** vazvrad və vitrinlər çıxır, uyğun kod vurğulanır. Vazvrad / Vitrin / Hamısı seçimi, status seçimi (Təsdiq gözləyir, Şəkil gözləyir, İşlənib, Ləğv) və Axtarış səhifəsində müştəri filtri, həmçinin **Anbara qəbul tarixi** (menecerin təsdiqlədiyi gün, Bakı vaxtı ilə) əlavə edilə bilər. Vazvrad səhifəsi təsdiq gözləyənləri açır. Nəticələr səhifələnir; planşetdə iki sütun göstərilir.

## Düzəliş və silmə

Menecer təsdiqindən əvvəl vazvradı hər işçi düzəldə və silə bilər; səbəb tələb olunur, əvvəlki/yeni dəyər və icraçı tarixçədə qalır. Təsdiqdən sonra dəyişiklik və silinmə yalnız adminə açıqdır; məbləği dəyişəndə və ya silinəndə borc cari tarixə fərq və ya geri qaytarma kimi düzəldilir.

## Borca tətbiq

Vazvrat pul yığımı ekranında borcdan çıxarılır (bax: `ACCOUNT-WORKFLOW.md`). Hər vazvrat bir dəfə tətbiq olunur. Məbləği 0 olan və heç vaxt tətbiq olunmamış tamamlanmış vazvrat qeydləri 40 gün sonra təmizlənir; borcla bağlı qeydlər saxlanılır.

## Bildirişlər

Yeni vazvrad menecerə göndəriləndə Telegram kanalına mətn və şəkillər, aktiv menecerlərin cihazlarına push bildirişi göndərilir. Qaralama yaradılması bildiriş göndərmir. Bildirişə basmaq qeydin detalını açır. Android bildirişlərini aktivləşdirmək üçün:

1. Firebase layihəsində Android tətbiqini `az.grandwall.app` paket adı ilə qeydiyyatdan keçirin və `google-services.json` faylını götürün.
2. EAS layihəsində build üçün istifadə olunan mühitdə (`preview` APK və ya `production`) `GOOGLE_SERVICES_JSON` adlı **file** tipli environment variable yaradıb bu faylı əlavə edin. `app.config.ts` build zamanı həmin faylın yolunu Android konfiqurasiyasına verir.
3. Firebase Project settings → Service accounts bölməsindən xidmət hesabının JSON açarını yaradın. EAS Project settings → Credentials → Android → FCM V1 service account key bölməsinə yükləyin. Bu açar `google-services.json` ilə eyni fayl deyil; gizli açarı Git-ə əlavə etməyin.
4. Yeni Android APK yığın və quraşdırın. Menecer hesabında Hesab → Bildirişləri aktivləşdir seçin və Android bildiriş icazəsini verin.

CI APK hazırlayanda versiya nömrəsini yayımlanmış APK-dan böyük seçir. API dəyişdiyi üçün yeni APK buraxıldıqdan sonra serverdə `minimumVersionCode` yeni build nömrəsinə qaldırılmalıdır ki, köhnə tətbiqlər yenilənməyə yönləndirilsin.
