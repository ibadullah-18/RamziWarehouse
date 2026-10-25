# Açot iş qaydaları

Açot yalnız telefon və planşet üçündür. Telefonda bir sütun, planşetdə iki sütun göstərilir (Galaxy Tab A7: 10,4 düym, dik ekran). Açota admin, açot operatoru və sürücü daxil ola bilər.

## Müştəri: “Sədərək dükanı”

Müştəri yaradanda və dəyişəndə “Sədərək dükanı” açarı var. Açıq olanda müştəri açotda görünür və seçilir. Bağlı olanlar açot siyahılarında görünmür; **vazvradda bütün müştərilər** görünür. Borcu və ya avansı olan müştəri açarı bağlı olsa da açotdan itmir. Köhnə müştərilərdən açot qeydi olanların hamısı yeniləmə zamanı avtomatik “Sədərək dükanı” olur.

## Günün gedişi

1. **Açota başla.** Açot səhifəsində `24.10.2026 açota başla` düyməsi günü başladır və “Günlük borclar” səhifəsini açır.
2. **Günlük borclar.** Hər müştərinin bugünkü günlük borcu yazılıb **Yadda saxla** basılır. Yenidən saxlamaq heç nəyi təkrarlamır; məbləğ dəyişsə yalnız fərq yazılır. **İlkin köhnə borc** yalnız bir dəfə, müştərinin köhnə borc qeydi olmayanda soruşulur (admin və açot operatoru yaza bilər). Sonradan düzəlişlə dəyişdirilir.
3. **Pul yığımı.** `Pul yığımına başla` günün müştərilərini göstərir. Bitməyən müştərinin yanında **−**, bitəndə **+** olur və kart yaşıl rəngə keçir. Müştəriyə basanda ödəniş pəncərəsi açılır. Siyahıda olmayan müştərini **Müştəri əlavə et** ilə seçmək olar.
4. **Müştəri ilə açotu bitir.** Nağd və kart (ayrı-ayrı və ya qarışıq) yazılır. Ödəmədiyi halda da müştəri məbləğsiz bitirilə bilər.
5. **Günü bitir (yekun).** Bütün müştərilər üçün yekun hazırlanır: yığılan pul, nağd və kart.

## Borc və ödəniş qaydası

- İki borc var: **köhnə borc** və **günlük borc**. “Günlük köhnə borc” ayrıca bölmə yoxdur: dünənkini saxladınızsa, o günlük borca qatılır və bu günün yeni borcu onun üstünə gəlir.
- Alınan pul, vazvrat və bonus **əvvəl günlük borcdan, sonra köhnə borcdan** çıxılır. Hələ artıq qalan məbləğ **avans** kimi qeyd olunur və növbəti borcdan avtomatik çıxılır.
- **Günlük borcu sabaha saxla** açıqdırsa, ödənilməyən günlük borc sabah avtomatik günlükdə görünür. Bağlıdırsa, ödənilməyən hissə həmin an köhnə borca keçir.
- Köhnə borcun əməliyyatla yazılması üçün ayrıca əməliyyat yaranır; heç nə silinmir.

## Vazvrat və bonus ödəniş zamanı

Ödəniş pəncərəsində müştərinin hələ borca tətbiq olunmamış vazvratları seçilir, hər birinin məbləği yazılır. Seçilən məbləğ **dərhal** borcdan çıxılır; sonradan menecer təsdiqi borcu təkrar azaltmır (menecer təsdiqi vazvradın anbara qəbulu üçün saxlanılır). Ləğv edilmiş vazvrat təklif olunmur. Bonus üçün açar və məbləğ yeri var; o da dərhal borcu azaldır. Bonus və vazvrat “real alınan pul”a əlavə edilmir. Ekranın altında nəticə önizləməsi göstərilir: neçə ₼ borcdan çıxır, nə qalır, nə sabaha saxlanır. Müştəri üçün yeni vazvrat yaratmaq düyməsi var.

## Bitmiş gün və sonradan gələn sifariş

Gün bitəndən sonra həmin gün ərzində müştəri sifariş verərsə, onu seçib borc və ya pul yazmaq olar; gün avtomatik yenidən açılır, sonra yenə bitirilir. Təqvim günü dəyişəndə (məsələn 25-i) əvvəlki gün **kilidlənir**: onu yalnız admin səbəb yazıb düzəldə bilər; düzəlişlər ayrıca auditdə saxlanılır. Hər gün yeni açot günüdür.

## Tarixçə

- **Günlərə görə**: seçilmiş ayın hər günü üçün yığılan pul, nağd, kart və müştəri sayı.
- **Günün yekunu**: `Filman Məcid — köhnə 300, günlük 250, ödədi 350 (nağd + kart), qalan borc 200`. Vazvrat və bonus varsa, məbləği ilə göstərilir. Ən yuxarıda yığılan pul, nağd və kart cəmi var.
- **Müştərilərə görə**: müştərini seçib ayın bütün ödənişlərini, o cümlədən köhnə/günlük borcunu və qalanı görürsünüz; admin düzəliş edə bilər.

## İcazələr

| Əməliyyat | Admin | Açot operatoru | Sürücü |
| --- | --- | --- | --- |
| Günlük borc yazmaq, pul yığımı, günü bitirmək | + | + | + |
| İlkin köhnə borc yazmaq | + | + | − |
| Bugünkü ödənişi/günlük borcu düzəltmək | + | + | + |
| Köhnə borcu düzəltmək | + | − | − |
| Bitmiş günü düzəltmək | + | − | − |

Menecer və anbar işçisi açota daxil ola bilmir (həm mobil, həm server). Silinmiş müştərinin borcu qalırsa, o siyahıda görünür və yeni borc ala bilmir.

## Server və yoxlama

Server və mobil tətbiq birlikdə yenilənməlidir. Yeni miqrasiya `AccountDaysAndShopFlag` bunları edir: `Customers.IsAccountCustomer`, `AccountDays` (başlama/bitirmə), `AccountSettlements` üçün sabaha saxlama və vazvrat açarı; `EntryType` yoxlama məhdudiyyətini 1–11 aralığına gətirir. Miqrasiya yerli və canlı bazaya tətbiq edilməyib.

26.10.2026 tarixindən yeni qayda işləyir. Bu tarixdən əvvəlki günlərdə ödənilməyən günlük borc növbəti gün avtomatik köhnə borca keçmişdi və eyni qaydada göstərilir; ümumi borc dəyişmir.

`npm run test:accounts` marşrutları, tarix və məbləğ hesablamalarını, klaviatura rejimlərini yoxlayır. `dotnet test` açot günü, ödəniş, vazvrat/bonus tətbiqi, bitmiş gün kilidi və icazələri yoxlayır. InMemory test bazası SQL Server kilidlənməsini yoxlamır; fiziki Tab A7 və telefonda ekran, klaviatura və geri düyməsi ayrıca yoxlanmalıdır.
