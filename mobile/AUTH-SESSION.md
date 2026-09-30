# Tətbiqdə qalıcı giriş

Giriş cihazın qorunan yaddaşında saxlanılır. 15 dəqiqəlik access token bir dəqiqə əvvəldən, tətbiq yenidən önə gələndə və server sorğusu zamanı avtomatik yenilənir. Bütün icazəli API sorğuları eyni sessiya idarəçisindən istifadə edir. Paralel sorğular yalnız bir refresh-token əməliyyatı yaradır. Server 401 qaytarsa, sorğu yeni tokenlə ən çox bir dəfə təkrarlanır. Şəbəkə xətasında ödəniş və digər yazılar avtomatik təkrarlanmır.

İnternet kəsilməsi və müvəqqəti server xətası giriş məlumatını silmir. Server refresh tokeni etibarsız saydıqda və ya istifadəçi çıxış etdikdə giriş silinir. Yeniləmə zamanı çıxış etmək sessiyanı geri qaytarmır.

Refresh token müddəti hər uğurlu yeniləmədə yenidən 3650 gün müəyyən edilir. Access token müddəti 15 dəqiqə olaraq qalır. Hesab deaktiv edilərsə yeniləmə rədd edilir. Tətbiqin məlumatları silinsə və ya qorunan yaddaş itirilsə yenidən giriş lazımdır.

Mobil tətbiq və server birlikdə yenilənməlidir. Docker konfiqurasiyasında `Jwt__RefreshTokenDays` yenilənib; ayrıca xarici konfiqurasiya varsa onun da 3650 gün olması tələb olunur. Mövcud 30 günlük refresh token növbəti uğurlu yeniləmədə uzunmüddətli tokenlə əvəz olunur. Artıq vaxtı bitmiş və ya ləğv edilmiş köhnə sessiya üçün bir dəfə yenidən giriş lazımdır. Bu dəyişiklik istehsala quraşdırılmayıb.

Yoxlama: `npm run test:auth` və `npm run check`.
