# Açot iş qaydaları

- Galaxy Tab A7 (SM-T500/T505): 10,4 düym, dik ekranda 1200 × 2000 fiziki piksel. İnterfeys məntiqi ekran eninə uyğunlaşır; telefonlarda da bir sütun saxlanılır.
- Günlük borc → əvvəlki günlük qalıq → köhnə borc: ödəniş ardıcıllığı.
- Borcun yarandığı gün 1-ci gündür. Yeni günlük borc bütün günlük qalığın müddətini yeniləyir. Son yaradılma tarixindən 5 təqvim günü sonra, yəni 6-cı gün, qalıq köhnə borca keçir.
- Keçid tarixə görə serverdə hesablanır; ayrıca gecə işi tələb etmir. Keçmiş günlərin yekunu həmin tarixə görə hesablanır.
- Köhnə borc düzəlişi həmin an qalan köhnə borcu dəyişir. Günlük düzəliş bugünkü yazılmış borcu dəyişir; artıq ödənilmiş hissədən aşağı endirmək qəbul edilmir.
- Düzəlişlər əvvəlki qeydi silmir: əlavə audit yazısı məbləğin əvvəlki/yeni qiymətini, səbəbini və müəllifini saxlayır.
- Köhnə qeydlərdə ödəniş üsulu məlum olmadığı üçün onların məbləği hesabatda ayrıca göstərilir.
- Günün bağlanması bütün açot günü üçündür. Həmin günün yeni borcu, düzəlişi və ödənişi bundan sonra bloklanır. Təkrar bağlama eyni yekunu qaytarır.
- Açot tarixçəsinin 6 aylıq avtomatik silinməsi dayandırılıb. Yeni versiya köhnə versiyada artıq silinmiş qeydləri geri qaytarmır.

## Quraşdırma və yoxlama

Server və mobil tətbiq birlikdə yenilənməlidir. `AccountWorkflow` verilənlər bazası miqrasiyası ödəniş üsulunu, günlük düzəliş növlərini və gün bağlanmalarını əlavə edir. Serverin mövcud başlanğıc miqrasiya mexanizmi bunu tətbiq edir. Miqrasiya yerli və istehsal bazasına bu dəyişiklik zamanı tətbiq edilməyib.

Borc nümunələri və tarix sərhədləri domain testləri ilə yoxlanılır. Açot xidmətinin testləri məbləğləri, icazələri, audit qeydlərini və bağlanma blokunu yoxlayır. InMemory test bazası SQL Server kilidlənməsini yoxlamır. Real Tab A7 və telefonlarda ekran, klaviatura, Android geri düyməsi və şəbəkə kəsilməsi ayrıca cihaz yoxlaması tələb edir.

## Açot keçidləri və klaviaturalar

Açot üçün sabit `account/daily`, `account/reports`, `account/detail`, `account/history` və digər səhifə yolları istifadə olunur. Köhnə `[screen]` səhifəsi silinib: `screen` Expo Router / React Navigation tərəfindən daxili parametr kimi istifadə edilir və səhifənin əsas menyuya yanlış düşməsinə səbəb olurdu. Müştəri səhifələrində yalnız `id`, tarix yekununda yalnız `date` ötürülür. Geriyə qayıdış mövcud keçid zəncirini saxlayır; tarixçəsiz birbaşa açılan səhifədən açot menyusuna qayıdış mümkündür. Sürətli təkrar toxunuşlar eyni keçidi iki dəfə yaratmır.

Ad, istifadəçi adı, şifrə, qeyd və axtarış sahələri mətn klaviaturası; məbləğ sahələri qəpikli rəqəm klaviaturası; say və gün/ay/il sahələri rəqəm klaviaturası; telefon sahələri telefon klaviaturası tələb edir. Məhsul və partiya kodları serverdə hərf də qəbul etdiyinə görə mətn sahəsidir.

`npm run test:accounts` sabit səhifələrin öz məzmununu açmasını, parametrin düzgün ötürülməsini, mümkün olmayan tarixlərin rədd edilməsini və bütün giriş sahələrinin klaviatura rejimini yoxlayır. Operator/sürücü keçidləri yerli sınaq məlumatları ilə brauzerdə 360 × 800 və 600 × 1000 ölçülərində yoxlanılıb. Fiziki Android klaviaturası cihazda ayrıca yoxlanmalıdır.
