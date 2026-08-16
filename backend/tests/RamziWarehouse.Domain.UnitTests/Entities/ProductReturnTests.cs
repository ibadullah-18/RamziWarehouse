using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Domain.Enums;

namespace RamziWarehouse.Domain.UnitTests.Entities;

public sealed class ProductReturnTests
{
    [Fact]
    public void NewReturn_ShouldHavePendingStatus()
    {
        var productReturn = new ProductReturn();

        Assert.Equal(
            ReturnStatus.Pending,
            productReturn.Status);
    }

    [Fact]
    public void Submit_ShouldChangeStatusToSubmitted()
    {
        var productReturn = new ProductReturn();

        productReturn.Submit();

        Assert.Equal(
            ReturnStatus.Submitted,
            productReturn.Status);
    }

    [Fact]
    public void Complete_ShouldStartRetentionPeriod()
    {
        var managerUserId = Guid.NewGuid();

        var completedAtUtc = new DateTime(
            2026,
            8,
            16,
            12,
            0,
            0,
            DateTimeKind.Utc);

        var productReturn = new ProductReturn();

        productReturn.Submit();

        productReturn.Complete(
            managerUserId,
            completedAtUtc);

        Assert.Equal(
            ReturnStatus.Completed,
            productReturn.Status);

        Assert.Equal(
            managerUserId,
            productReturn.ProcessedByUserId);

        Assert.True(productReturn.ProcessedAtUtc.HasValue);
        Assert.Equal(
            completedAtUtc,
            productReturn.ProcessedAtUtc.Value);

        Assert.True(productReturn.DeleteAfterUtc.HasValue);
        Assert.Equal(
            completedAtUtc.AddDays(40),
            productReturn.DeleteAfterUtc.Value);
    }

    [Fact]
    public void Complete_ShouldThrow_WhenNotSubmitted()
    {
        var productReturn = new ProductReturn();

        Assert.Throws<InvalidOperationException>(
            () => productReturn.Complete(
                Guid.NewGuid(),
                DateTime.UtcNow));
    }

    [Fact]
    public void Cancel_ShouldAllowPendingReturn()
    {
        var managerUserId = Guid.NewGuid();

        var cancelledAtUtc = new DateTime(
            2026,
            8,
            16,
            13,
            0,
            0,
            DateTimeKind.Utc);

        var productReturn = new ProductReturn();

        productReturn.Cancel(
            managerUserId,
            cancelledAtUtc);

        Assert.Equal(
            ReturnStatus.Cancelled,
            productReturn.Status);

        Assert.True(productReturn.DeleteAfterUtc.HasValue);
        Assert.Equal(
            cancelledAtUtc.AddDays(40),
            productReturn.DeleteAfterUtc.Value);
    }

    [Fact]
    public void Submit_ShouldThrow_WhenAlreadySubmitted()
    {
        var productReturn = new ProductReturn();

        productReturn.Submit();

        Assert.Throws<InvalidOperationException>(
            productReturn.Submit);
    }
}