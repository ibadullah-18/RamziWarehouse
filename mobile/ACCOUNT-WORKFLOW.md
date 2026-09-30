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
