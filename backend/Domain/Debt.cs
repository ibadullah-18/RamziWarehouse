// ==========================================================================
// GrandWall - AÃ§ot (Borc) Modulu - Domain ModellÉ™ri
// TODO: "Guid" tipini sÉ™nin layihÉ™ndÉ™ki Id tipinÉ™ (Guid/int) uyÄŸunlaÅŸdÄ±r.
// TODO: Customer, User class-larÄ± sÉ™nin layihÉ™ndÉ™ artÄ±q var - burada sadÉ™cÉ™
//       referans Ã¼Ã§Ã¼n minimal saxlanÄ±lÄ±b, Ã¶z Customer/User-inlÉ™ É™vÉ™z et.
// ==========================================================================

namespace GrandWall.Domain;

public enum DebtStatus
{
    Pending,        // hÉ™lÉ™ heÃ§ Ã¶dÉ™niÅŸ olmayÄ±b
    PartiallyPaid,  // qismÉ™n Ã¶dÉ™nilib
    Paid,           // tam Ã¶dÉ™nilib
    RolledOver      // mÃ¼ddÉ™ti bitib (N gÃ¼n), kÃ¶hnÉ™ borca keÃ§ib
}

/// <summary>
/// Bir mÃ¼ÅŸtÉ™riyÉ™ bir gÃ¼nÉ™ aid yaranan borc qeydi ("gÃ¼ndÉ™lik borc").
/// Ãœmumi borc DEYÄ°L - yalnÄ±z hÉ™min gÃ¼nÃ¼n borcu. Ã–dÉ™niÅŸ bura tÉ™tbiq olunmasa
/// vÉ™ N gÃ¼n keÃ§sÉ™, RolledOver statusuna keÃ§ib CustomerDebtAccount.OldDebtBalance-a É™lavÉ™ olunur.
/// </summary>
public class DailyDebt
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CustomerId { get; set; }

    /// <summary>Borcun yarandÄ±ÄŸÄ± gÃ¼n (saat yox, gÃ¼n - rollover hesablamasÄ± Ã¼Ã§Ã¼n).</summary>
    public DateOnly DebtDate { get; set; }

    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount => Amount - PaidAmount;

    public DebtStatus Status { get; set; } = DebtStatus.Pending;

    public Guid CreatedByUserId { get; set; }   // borcu yazan iÅŸÃ§i
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? RolledOverAt { get; set; }

    // RedaktÉ™ tarixÃ§É™si Ã¼Ã§Ã¼n (sÉ™bÉ™b MÆCBURÄ° deyil - avtomatik loglanÄ±r)
    public Guid? LastEditedByUserId { get; set; }
    public DateTimeOffset? LastEditedAt { get; set; }
    public decimal? OriginalAmount { get; set; } // ilk yaradÄ±lan mÉ™blÉ™ÄŸ (dÉ™yiÅŸikliyi gÃ¶rmÉ™k Ã¼Ã§Ã¼n)
}

/// <summary>
/// MÃ¼ÅŸtÉ™rinin toplanmÄ±ÅŸ ("kÃ¶hnÉ™") borc balansÄ±.
/// Ya Customer entity-sinÉ™ bir sahÉ™ kimi É™lavÉ™ et, ya da ayrÄ±ca cÉ™dvÉ™l saxla.
/// </summary>
public class CustomerDebtAccount
{
    public Guid CustomerId { get; set; }
    public decimal OldDebtBalance { get; set; }     // toplanmÄ±ÅŸ kÃ¶hnÉ™ borc
    public decimal CreditBalance { get; set; }      // artÄ±q Ã¶dÉ™niÅŸ olarsa (avans), gÉ™lÉ™cÉ™k borca hesablanÄ±r
}

/// <summary>Bir Ã¶dÉ™niÅŸ É™mÉ™liyyatÄ± (bir mÃ¼ÅŸtÉ™ridÉ™n bir dÉ™fÉ™yÉ™ alÄ±nan pul).</summary>
public class DebtPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public decimal Amount { get; set; }

    public Guid ReceivedByUserId { get; set; }   // Ã¶dÉ™niÅŸi qÉ™bul edÉ™n iÅŸÃ§i
    public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<DebtPaymentAllocation> Allocations { get; set; } = new();
}

/// <summary>
/// Bir Ã¶dÉ™niÅŸin hansÄ± borc(lar)a necÉ™ bÃ¶lÃ¼ÅŸdÃ¼rÃ¼ldÃ¼yÃ¼.
/// DailyDebtId == null  =>  bu hissÉ™ kÃ¶hnÉ™ borcdan (OldDebtBalance) Ã§Ä±xÄ±lÄ±b.
/// </summary>
public class DebtPaymentAllocation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DebtPaymentId { get; set; }
    public Guid? DailyDebtId { get; set; }
    public decimal AmountApplied { get; set; }
}

/// <summary>Sistemin rollover mÃ¼ddÉ™tini (default 5 gÃ¼n) saxlayan tÉ™nzimlÉ™mÉ™.</summary>
public class DebtSettings
{
    public int RolloverAfterDays { get; set; } = 5;      // neÃ§É™ gÃ¼ndÉ™n sonra kÃ¶hnÉ™yÉ™ keÃ§sin
    public int WarningBeforeDays { get; set; } = 1;      // rollover-É™ neÃ§É™ gÃ¼n qalanda xÉ™ttlÉ™ fÉ™rqlÉ™ndirilsin (default: son gÃ¼n)
}
