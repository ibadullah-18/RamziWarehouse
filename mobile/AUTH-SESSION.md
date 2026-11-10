# Tətbiqdə qalıcı giriş

Giriş cihazın qorunan yaddaşında saxlanılır. 15 dəqiqəlik access token bir dəqiqə əvvəldən, tətbiq yenidən önə gələndə və server sorğusu zamanı avtomatik yenilənir. Bütün icazəli API sorğuları eyni sessiya idarəçisindən istifadə edir. Paralel sorğular yalnız bir refresh-token əməliyyatı yaradır. Server 401 qaytarsa, sorğu yeni tokenlə ən çox bir dəfə təkrarlanır. Şəbəkə xətasında ödəniş və digər yazılar avtomatik təkrarlanmır.

İnternet kəsilməsi və müvəqqəti server xətası giriş məlumatını silmir. Server refresh tokeni etibarsız saydıqda və ya istifadəçi çıxış etdikdə giriş silinir. Yeniləmə zamanı çıxış etmək sessiyanı geri qaytarmır.

Refresh token müddəti hər uğurlu yeniləmədə yenidən **10 gün** müəyyən edilir: tətbiq hər açılanda (və hər 15 dəqiqədən bir) müddət yenidən 10 gün olur, yəni istifadəçi hər gün çıxış etmir. 10 gün ərzində tətbiq heç açılmasa, avtomatik çıxış olur. Access token müddəti 15 dəqiqə olaraq qalır. Hesab deaktiv edilərsə yeniləmə rədd edilir. Tətbiqin məlumatları silinsə və ya qorunan yaddaş itirilsə yenidən giriş lazımdır.

Mobil tətbiq və server birlikdə yenilənməlidir. Docker konfiqurasiyasında `Jwt__RefreshTokenDays` yenilənib; `docker-compose.production.yml`-də dəyər 10-dur. Hazırkı uzunmüddətli tokenlər növbəti yeniləmədə 10 günlük olur. Mövcud 30 günlük refresh token növbəti uğurlu yeniləmədə uzunmüddətli tokenlə əvəz olunur. Artıq vaxtı bitmiş və ya ləğv edilmiş köhnə sessiya üçün bir dəfə yenidən giriş lazımdır. Bu dəyişiklik istehsala quraşdırılmayıb.

Yoxlama: `npm run test:auth` və `npm run check`.
