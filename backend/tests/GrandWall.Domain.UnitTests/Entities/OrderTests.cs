using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;

namespace GrandWall.Domain.UnitTests.Entities;

public sealed class OrderTests
{
    [Fact]
    public void NewOrder_ShouldHaveCreatedStatus()
    {
        var order = new Order();

        Assert.Equal(
            OrderStatus.Created,
            order.Status);
    }

    [Fact]
    public void StartPreparation_ShouldAssignWorker()
    {
        var workerUserId = Guid.NewGuid();

        var startedAtUtc = new DateTime(
            2026,
            8,
            16,
            6,
            0,
            0,
            DateTimeKind.Utc);

        var order = new Order();

        order.StartPreparation(
            workerUserId,
            startedAtUtc);

        Assert.Equal(
            OrderStatus.InPreparation,
            order.Status);

        Assert.Equal(
            workerUserId,
            order.PreparedByUserId);

        Assert.True(
            order.PreparationStartedAtUtc.HasValue);

        Assert.Equal(
            startedAtUtc,
            order.PreparationStartedAtUtc.Value);
    }

    [Fact]
    public void CompletePreparation_ShouldMakeOrderReady()
    {
        var order = new Order();

        order.StartPreparation(
            Guid.NewGuid(),
            DateTime.UtcNow);

        order.CompletePreparation(
            DateTime.UtcNow.AddMinutes(10));

        Assert.Equal(
            OrderStatus.ReadyForDelivery,
            order.Status);

        Assert.True(order.PreparedAtUtc.HasValue);
    }

    [Fact]
    public void CompletePreparation_ShouldThrow_WhenNotStarted()
    {
        var order = new Order();

        Assert.Throws<InvalidOperationException>(
            () => order.CompletePreparation(
                DateTime.UtcNow));
    }

    [Fact]
    public void MarkAsDelivered_ShouldStartRetention()
    {
        var startedAtUtc = new DateTime(
            2026,
            8,
            16,
            6,
            0,
            0,
            DateTimeKind.Utc);

        var preparedAtUtc =
            startedAtUtc.AddHours(1);

        var deliveredAtUtc =
            preparedAtUtc.AddHours(2);

        var order = new Order();

        order.StartPreparation(
            Guid.NewGuid(),
            startedAtUtc);

        order.CompletePreparation(
            preparedAtUtc);

        order.MarkAsDelivered(
            deliveredAtUtc);

        Assert.Equal(
            OrderStatus.Delivered,
            order.Status);

        Assert.True(order.CompletedAtUtc.HasValue);
        Assert.Equal(
            deliveredAtUtc,
            order.CompletedAtUtc.Value);

        Assert.True(order.DeleteAfterUtc.HasValue);
        Assert.Equal(
            deliveredAtUtc.AddDays(40),
            order.DeleteAfterUtc.Value);
    }

    [Fact]
    public void MarkAsDelivered_ShouldThrow_WhenNotReady()
    {
        var order = new Order();

        Assert.Throws<InvalidOperationException>(
            () => order.MarkAsDelivered(
                DateTime.UtcNow));
    }
}