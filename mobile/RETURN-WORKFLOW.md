# Vazvrad və vitrin

Axtarışda müştəri seçilir, sonra Vazvrad, Vitrin və ya Hər ikisi seçilir. Tarix məhdudiyyəti yoxdur; serverdə saxlanılan qeydlər səhifələnərək gətirilir. Siyahıda tarix və ilk iki məhsulun kodu/partiyası görünür. Detaldan geri qayıdanda seçim saxlanılır.

Şəkil əlavə etmək istəyə bağlıdır. Menecer təsdiqindən əvvəl hər daxil olmuş istifadəçi məhsulların kodunu, partiyasını, sayını və növünü dəyişə, məhsul əlavə edə/çıxara və qeydi silə bilər. Təsdiqdən sonra dəyişiklik və silinmə yalnız adminə açıqdır. Səbəb tələb olunur; əvvəlki/yeni dəyər və əməliyyatı edən istifadəçi tarixçədə saxlanılır. Silinmiş qeyd siyahılardan gizlədilir, audit məlumatı saxlanılır. Köhnə versiya ilə dəyişiklik göndəriləndə server yenidən açmağı tələb edir.

Axtarış → Anbara qəbul tarixi seçimi Bakı vaxtı ilə həmin gün menecerin təsdiqlədiyi qeydləri göstərir. Yaradılma tarixi deyil, faktiki təsdiq/qəbul tarixi əsas götürülür. Say göstəricisi seçilmiş növə aid məhsulların ədəd cəmidir.

## Günlük açot

Sürücü və açot operatoru günlük və köhnə borc əlavə edə, açıq günlük borcu düzəldə, nağd/kart ödənişi yaza və açıq ödənişi səbəblə düzəldə bilər. Köhnə borcun düzəlişi yalnız adminə açıqdır. Yeni borc mövcud borcun üstünə əlavə olunur; düzəliş ayrıca əməliyyatdır.

Günlük açot siyahısının sol yuxarısındakı Açotu bitir həmin ana qədərki günlük qeydləri kilidləyir. Kilidlənmiş və keçmiş borc/ödənişləri yalnız admin dəyişə bilər. Yeni borc və ödəniş həmin gün yenə əlavə oluna bilər; təkrar bitirmə həmin tarix üzrə eyni yekunu yeniləyir. Bir tarix üçün tək yekun saxlanılır. Bitmiş günlük borcun üstünə yeni borc gəlirsə, işçi düzəlişi yalnız yeni, açıq hissəyə tətbiq edilir.

Admin günlük borc düzəlişində keçmiş tarixi seçə bilər. Ödəniş düzəlişində əvvəlki və yeni məbləğ/üsul, səbəb və icraçı ayrıca auditdə qalır. Düzəliş sonrakı günlərin borcunu mənfiyə salırsa server rədd edir. Yeni miqrasiya əvvəl bitirilmiş günlərdəki qeydlərin kilidini saxlayır.

Menecer müştəri yarada bilər. Rəqəm sahələri rəqəm klaviaturası açır. Tamam düyməsi klaviaturanı bağlayır, formalar fokuslanan sahəyə görə sürüşür. Fiziki Android cihazında klaviatura və bildiriş yoxlaması ayrıca edilməlidir.

## Android bildirişlərini aktivləşdirmək

Yeni vazvrad menecer təsdiqinə göndəriləndə aktiv menecerlərin qeydiyyatdan keçmiş cihazlarına bildiriş növbəsi yaradılır. Qaralama yaradılması bildiriş göndərmir. Bildirişə basmaq uyğun qeydin detalını açır. Müvəqqəti göndərmə xətaları avtomatik təkrar yoxlanılır.

1. Firebase layihəsində Android tətbiqini `az.grandwall.app` paket adı ilə qeydiyyatdan keçirin və `google-services.json` faylını götürün.
2. EAS layihəsində build üçün istifadə olunan mühitdə (`preview` APK və ya `production`) `GOOGLE_SERVICES_JSON` adlı **file** tipli environment variable yaradıb bu faylı əlavə edin. `app.config.ts` build zamanı həmin faylın yolunu Android konfiqurasiyasına verir.
3. Firebase Project settings → Service accounts bölməsindən xidmət hesabının JSON açarını yaradın. EAS Project settings → Credentials → Android → FCM V1 service account key bölməsinə yükləyin. Bu açar `google-services.json` ilə eyni fayl deyil; gizli açarı Git-ə əlavə etməyin.
4. Yeni Android APK yığın və quraşdırın. Menecer hesabında Hesab → Bildirişləri aktivləşdir seçin və Android bildiriş icazəsini verin.
5. Başqa istifadəçi ilə şəkilsiz vazvrad yaradıb menecer təsdiqinə göndərin. Menecer telefonunda tətbiq arxa planda olarkən bildirişin gəlməsini və basanda düzgün detalın açılmasını yoxlayın.

Rəsmi quraşdırma: https://docs.expo.dev/push-notifications/fcm-credentials/

Firebase açarları qurulmayıbsa telefon bildirişi işləməyəcək. Yeni native paketlərə görə əvvəlki APK-ya sadəcə JavaScript yeniləməsi kifayət etmir. Server yenilənəndə `ReturnAdministrationAndPush` bazanın miqrasiyası tətbiq edilməlidir; API başlanğıcdakı mövcud miqrasiya mexanizmini istifadə edir.
