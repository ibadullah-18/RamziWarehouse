# Vazvrad və vitrin

Axtarışda müştəri seçilir, sonra Vazvrad, Vitrin və ya Hər ikisi seçilir. Tarix məhdudiyyəti yoxdur; serverdə saxlanılan qeydlər səhifələnərək gətirilir. Siyahıda tarix və ilk iki məhsulun kodu/partiyası görünür. Detaldan geri qayıdanda seçim saxlanılır.

Şəkil əlavə etmək istəyə bağlıdır. Təsdiqlənmiş qeydin kodunu və partiyasını yalnız admin dəyişə bilər. Dəyişiklik və bütün qeydin silinməsi üçün səbəb tələb olunur; əvvəlki/yeni dəyər və əməliyyatı edən istifadəçi tarixçədə saxlanılır. Silinmiş qeyd siyahılardan gizlədilir, audit məlumatı saxlanılır. Köhnə versiya ilə dəyişiklik göndəriləndə server yenidən açmağı tələb edir.

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
