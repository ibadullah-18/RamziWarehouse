# Vazvrad və vitrin

Axtarışda müştəri seçilir, sonra Vazvrad, Vitrin və ya Hər ikisi seçilir. Tarix məhdudiyyəti yoxdur; serverdə saxlanılan qeydlər səhifələnərək gətirilir. Siyahıda tarix və ilk iki məhsulun kodu/partiyası görünür. Detaldan geri qayıdanda seçim saxlanılır.

Şəkil əlavə etmək istəyə bağlıdır. Menecer təsdiqindən əvvəl hər daxil olmuş istifadəçi məhsulların kodunu, partiyasını, sayını və növünü dəyişə, məhsul əlavə edə/çıxara və qeydi silə bilər. Təsdiqdən sonra dəyişiklik və silinmə yalnız adminə açıqdır. Səbəb tələb olunur; əvvəlki/yeni dəyər və əməliyyatı edən istifadəçi tarixçədə saxlanılır. Silinmiş qeyd siyahılardan gizlədilir, audit məlumatı saxlanılır. Köhnə versiya ilə dəyişiklik göndəriləndə server yenidən açmağı tələb edir.

Axtarış → Anbara qəbul tarixi seçimi Bakı vaxtı ilə həmin gün menecerin təsdiqlədiyi qeydləri göstərir. Yaradılma tarixi deyil, faktiki təsdiq/qəbul tarixi əsas götürülür. Say göstəricisi seçilmiş növə aid məhsulların ədəd cəmidir.

## Günlük açot

Sürücü və açot operatoru günlük və köhnə borc əlavə edə, açıq günlük borcu düzəldə, nağd/kart ödənişi yaza və açıq ödənişi səbəblə düzəldə bilər. Köhnə borcun düzəlişi yalnız adminə açıqdır. Yeni borc mövcud borcun üstünə əlavə olunur; düzəliş ayrıca əməliyyatdır.

Günlük açot siyahısının sol yuxarısındakı Açotu bitir həmin ana qədərki günlük qeydləri kilidləyir. Kilidlənmiş və keçmiş borc/ödənişləri yalnız admin dəyişə bilər. Yeni borc və ödəniş həmin gün yenə əlavə oluna bilər; təkrar bitirmə həmin tarix üzrə eyni yekunu yeniləyir. Bir tarix üçün tək yekun saxlanılır. Bitmiş günlük borcun üstünə yeni borc gəlirsə, işçi düzəlişi yalnız yeni, açıq hissəyə tətbiq edilir.

Admin günlük borc düzəlişində keçmiş tarixi seçə bilər. Ödəniş düzəlişində əvvəlki və yeni məbləğ/üsul, səbəb və icraçı ayrıca auditdə qalır. Düzəliş sonrakı günlərin borcunu mənfiyə salırsa server rədd edir. Yeni miqrasiya əvvəl bitirilmiş günlərdəki qeydlərin kilidini saxlayır.

Bütün rollar müştəri yarada bilər; müştəri redaktəsi və qaimə hüquqları ayrıca qalır. Məhsul və partiya kodları mətn kimi saxlanılır: `611`, `611-1`, `510-611-1` ayrıdır. Məbləğ və say üçün rəqəm klaviaturası, kod və partiya üçün tire daxil etməyə imkan verən mətn klaviaturası açılır. Tamam düyməsi klaviaturanı bağlayır.

## 08.10.2026 tarixindən yeni borc qaydası

Bu tarixdən günlük borcun ödənilməyən hissəsi növbəti gün bir dəfə köhnə borca keçir. Əvvəlki tarixlər öz beşgünlük hesablama qaydası ilə göstərilir; tarixi hesabatlar yenidən yazılmır. Avans köhnə/günlük borcu mənfiyə salmır və növbəti satışlara avtomatik tətbiq edilir.

Ödəniş ekranında nağd və kart məbləği ayrı yazılır. “Vazvrat / Bonus əlavə et” bölməsi istəyə görə açılır. Bonus borcu azaldır, real alınan pula əlavə edilmir. Vazvrat ayrıca real qeydə bağlanır və yalnız menecer təsdiqindən sonra borcu azaldır. Təsdiq, maliyyə qeydi və status eyni database əməliyyatında saxlanılır; sonrakı məbləğ düzəlişi/silinmə cari tarixə fərq və ya geri qaytarma kimi yazılır.

“Açotu tamamla” müştərinin həmin andakı açıq günlük qeydlərini kilidləyir. Ödənişlər, bonus və əməliyyat identifikatoru serializable transaction daxilində saxlanılır. Eyni identifikatorla təkrar sorğu ödənişi təkrarlamır. Sonra yeni borc və yeni ödəniş əlavə etmək olar; günün yekunu həmin tarix üzrə yenilənir. Keçmiş açotda tarixə basmaq həmin günün ayrı detal səhifəsini açır; nağd, kart, faktiki ödəniş və varsa bonus/vazvrat göstərilir.

Admin “Vazvrat yaradanlar” siyahısında ad əlavə edir, düzəldir və deaktiv edir. Seçilən ad tarixi qeyd kimi saxlanılır və hesab/menecer adlarından ayrıdır. Köhnə vazvratlara məbləğ avtomatik yazılmır və əvvəlki borc dəyişdirilmir. Maliyyə ilə bağlı vazvratlar və açot qeydləri 40 günlük təmizləmədən qorunur.

Şəkillər telefonda ən uzun tərəfi 1600 piksel olan JPEG şəklində sıxılır. Önizləmə 480 piksel Cloudinary variantını alır; istifadəçiyə aid keş təkrar yükləməni azaldır. Tam ekran yalnız lazım olan böyük şəkli və qonşu şəkilləri yükləyir; sürüşdürmə, əvvəlki/növbəti və böyütmə mövcuddur. Fiziki Android cihazında sürət, toxunuş və bildiriş yoxlaması ayrıca edilməlidir.

Əsas ekranlar və vazvrat yaratma səhifəsi bütün rollarda yeniləmə banneri göstərir. Fokus və tətbiqə qayıdış yeni versiyanı yoxlayır. CI APK hazırlayanda versiya nömrəsini yayımlanmış APK-dan böyük seçir və təkrar buraxılışları ardıcıllıqla işləyir.

## Android bildirişlərini aktivləşdirmək

Yeni vazvrad menecer təsdiqinə göndəriləndə aktiv menecerlərin qeydiyyatdan keçmiş cihazlarına bildiriş növbəsi yaradılır. Qaralama yaradılması bildiriş göndərmir. Bildirişə basmaq uyğun qeydin detalını açır. Müvəqqəti göndərmə xətaları avtomatik təkrar yoxlanılır.

1. Firebase layihəsində Android tətbiqini `az.grandwall.app` paket adı ilə qeydiyyatdan keçirin və `google-services.json` faylını götürün.
2. EAS layihəsində build üçün istifadə olunan mühitdə (`preview` APK və ya `production`) `GOOGLE_SERVICES_JSON` adlı **file** tipli environment variable yaradıb bu faylı əlavə edin. `app.config.ts` build zamanı həmin faylın yolunu Android konfiqurasiyasına verir.
3. Firebase Project settings → Service accounts bölməsindən xidmət hesabının JSON açarını yaradın. EAS Project settings → Credentials → Android → FCM V1 service account key bölməsinə yükləyin. Bu açar `google-services.json` ilə eyni fayl deyil; gizli açarı Git-ə əlavə etməyin.
4. Yeni Android APK yığın və quraşdırın. Menecer hesabında Hesab → Bildirişləri aktivləşdir seçin və Android bildiriş icazəsini verin.
5. Başqa istifadəçi ilə şəkilsiz vazvrad yaradıb menecer təsdiqinə göndərin. Menecer telefonunda tətbiq arxa planda olarkən bildirişin gəlməsini və basanda düzgün detalın açılmasını yoxlayın.

Rəsmi quraşdırma: https://docs.expo.dev/push-notifications/fcm-credentials/

Firebase açarları qurulmayıbsa telefon bildirişi işləməyəcək. Yeni native paketlərə görə əvvəlki APK-ya sadəcə JavaScript yeniləməsi kifayət etmir. Server yenilənəndə `ReturnAdministrationAndPush` bazanın miqrasiyası tətbiq edilməlidir; API başlanğıcdakı mövcud miqrasiya mexanizmini istifadə edir.
