using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

[ApiController]
public sealed class PrivacyController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("/privacy")]
    [Produces("text/html")]
    public ContentResult Privacy()
    {
        const string html = """
<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index,follow">
    <title>Məxfilik Siyasəti | GrandWall</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #F6F2EC;
            color: #25221E;
            font-family: -apple-system, BlinkMacSystemFont,
                         "Segoe UI", Arial, sans-serif;
            line-height: 1.7;
        }

        main {
            width: min(900px, calc(100% - 32px));
            margin: 48px auto;
            background: #FFFFFF;
            border-radius: 24px;
            padding: 48px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
        }

        .brand {
            color: #8A632B;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        h1 {
            margin: 8px 0 4px;
            font-size: 38px;
            line-height: 1.2;
        }

        h2 {
            margin-top: 32px;
            font-size: 21px;
        }

        p, li {
            color: #555049;
        }

        .updated {
            margin-top: 0;
            color: #81786D;
        }

        a {
            color: #8A632B;
        }

        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E8E0D6;
            color: #81786D;
            font-size: 14px;
        }

        @media (max-width: 600px) {
            main {
                margin: 0;
                width: 100%;
                min-height: 100vh;
                border-radius: 0;
                padding: 32px 22px;
            }

            h1 {
                font-size: 30px;
            }
        }
    </style>
</head>

<body>
<main>
    <div class="brand">GrandWall</div>

    <h1>Məxfilik Siyasəti</h1>
    <p class="updated">Son yenilənmə: 22 sentyabr 2026</p>

    <p>
        GrandWall istifadəçilərin məxfiliyinə hörmət edir.
        Bu Məxfilik Siyasəti GrandWall mobil tətbiqindən istifadə
        zamanı məlumatların necə emal olunduğunu izah edir.
    </p>

    <h2>1. Toplanan məlumatlar</h2>
    <p>
        Tətbiqin funksiyalarından asılı olaraq istifadəçinin təqdim etdiyi
        hesab, əlaqə, sifariş və çatdırılma məlumatları emal edilə bilər.
        Buraya ad, telefon nömrəsi, ünvan və sifarişlə bağlı məlumatlar
        daxil ola bilər.
    </p>

    <h2>2. Kamera və şəkillər</h2>
    <p>
        GrandWall müəyyən funksiyalarda sifarişlə bağlı sübut şəklinin
        çəkilməsi və ya cihazdan şəkil seçilməsi üçün kamera və media
        imkanlarından istifadə edə bilər. Bu imkanlar yalnız müvafiq
        funksiyanı istifadə etdiyiniz zaman istifadə olunur.
    </p>

    <h2>3. Məlumatların istifadə məqsədi</h2>
    <p>Məlumatlar aşağıdakı məqsədlər üçün emal edilə bilər:</p>

    <ul>
        <li>istifadəçi hesabının və autentifikasiyanın idarə edilməsi;</li>
        <li>sifarişlərin yaradılması və idarə edilməsi;</li>
        <li>çatdırılmanın təşkil edilməsi;</li>
        <li>istifadəçi dəstəyi və xidmətin göstərilməsi;</li>
        <li>təhlükəsizlik və sui-istifadənin qarşısının alınması;</li>
        <li>tətbiqin işləkliyinin təmin edilməsi.</li>
    </ul>

    <h2>4. Məlumatların saxlanması və təhlükəsizliyi</h2>
    <p>
        Məlumatların icazəsiz girişdən, dəyişdirilmədən və açıqlanmadan
        qorunması üçün uyğun texniki və təşkilati tədbirlər tətbiq olunur.
        Məlumatlar xidmətin göstərilməsi və tətbiq olunan tələblər üçün
        lazım olan müddət ərzində saxlanılır.
    </p>

    <h2>5. Üçüncü tərəflər</h2>
    <p>
        Xidmətin işləməsi üçün zəruri olduqda müəyyən texniki
        xidmət təminatçılarından istifadə edilə bilər.
        Məlumatlar qanuni tələb olmadığı və ya xidmətin göstərilməsi üçün
        zəruri olmadığı halda məqsədsiz şəkildə üçüncü tərəflərə verilmir.
    </p>

    <h2>6. İstifadəçinin seçimləri</h2>
    <p>
        İstifadəçilər cihaz parametrləri vasitəsilə kamera və digər
        icazələri idarə edə bilərlər. Müəyyən icazələrin söndürülməsi
        həmin icazədən asılı funksiyaların işləməsinə təsir göstərə bilər.
    </p>

    <h2>7. Məxfilik siyasətində dəyişikliklər</h2>
    <p>
        Bu Məxfilik Siyasəti tətbiqin funksiyalarında və ya hüquqi
        tələblərdə dəyişiklik olduqda yenilənə bilər. Aktual versiya
        həmişə bu səhifədə dərc olunur.
    </p>

    <h2>8. Əlaqə</h2>
    <p>
        Məxfilik və şəxsi məlumatların emalı ilə bağlı suallar üçün
        GrandWall ilə rəsmi əlaqə kanalları vasitəsilə əlaqə saxlaya
        bilərsiniz.
    </p>

    <footer>
        © 2026 GrandWall. Bütün hüquqlar qorunur.
    </footer>
</main>
</body>
</html>
""";

        return Content(
            html,
            "text/html; charset=utf-8");
    }
}
