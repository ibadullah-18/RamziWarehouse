using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Notifications.Push;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace GrandWall.Api.IntegrationTests.ProductReturns;

/// <summary>Notifications for the installed web app (iPhone/Android home screen).</summary>
public sealed class WebPushDeliveryTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now = new(2026, 10, 1, 10, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class FakeSender : IWebPushSender
    {
        public Queue<WebPushResult> Results = new();
        public List<object> Sent = [];
        public string? PublicKey => "public";
        public Task<WebPushResult> SendAsync(WebPushSubscription subscription, object payload, CancellationToken ct)
        {
            Sent.Add(payload);
            return Task.FromResult(Results.Count > 0 ? Results.Dequeue() : WebPushResult.Sent);
        }
    }

    private const string Endpoint = "https://web.push.apple.com/abc";

    private static async Task<(AppDbContext Db, Clock Clock, User Manager, PushNotificationQueue Queue, ProductReturn Return)> Setup(bool enqueue = true)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var clock = new Clock();
        var manager = new User { FullName = "Manager", Username = "manager", Role = UserRole.Manager };
        var admin = new User { FullName = "Admin", Username = "admin", Role = UserRole.Admin };
        db.Users.AddRange(manager, admin);
        await db.SaveChangesAsync();
        var queue = new PushNotificationQueue(db, clock);
        await queue.RegisterWebAsync(manager.Id, Endpoint, "p256dh-key", "auth-key", default);
        await queue.RegisterWebAsync(admin.Id, "https://fcm.googleapis.com/fcm/send/admin", "p256dh-key", "auth-key", default);
        var record = new ProductReturn { CreatedByUserId = manager.Id, Customer = new Customer { Name = "Test" }, Warehouse = new Warehouse { Name = "Test" },
            Items = [new ProductReturnItem { ProductCode = "1001", BatchNumber = "10", Quantity = 1, ProductType = ProductType.Product }] };
        record.Submit();
        db.ProductReturns.Add(record);
        await db.SaveChangesAsync();
        if (enqueue)
        {
            await queue.EnqueueReturnAsync(record, default);
            await db.SaveChangesAsync();
        }
        return (db, clock, manager, queue, record);
    }

    private static PushDeliveryProcessor Processor(AppDbContext db, Clock clock, FakeSender sender) =>
        new(db, new HttpClient(), new ConfigurationBuilder().Build(), clock, NullLogger<PushDeliveryProcessor>.Instance, sender);

    [Fact]
    public async Task OnlyManagersGetAWebNotificationThatOpensTheReturn()
    {
        var (db, clock, manager, _, record) = await Setup();
        using var dispose = db;
        var delivery = Assert.Single(await db.PushDeliveries.ToListAsync());
        Assert.Equal(manager.Id, delivery.UserId);
        var sender = new FakeSender();
        await Processor(db, clock, sender).ProcessAsync(default);
        Assert.True(delivery.Completed);
        var payload = Assert.Single(sender.Sent);
        Assert.Contains("/return-detail/" + record.Id, payload.ToString());
    }

    [Fact]
    public async Task ExpiredSubscriptionIsRemovedAndTemporaryFailureRetries()
    {
        var (db, clock, _, _, _) = await Setup();
        using var dispose = db;
        var delivery = Assert.Single(await db.PushDeliveries.ToListAsync());
        var sender = new FakeSender();
        sender.Results.Enqueue(WebPushResult.Retry);
        sender.Results.Enqueue(WebPushResult.Gone);
        var processor = Processor(db, clock, sender);
        await processor.ProcessAsync(default);
        Assert.False(delivery.Completed);
        clock.Now = clock.Now.AddMinutes(5);
        await processor.ProcessAsync(default);
        Assert.True(delivery.Completed);
        Assert.False(await db.WebPushSubscriptions.AnyAsync(s => s.Endpoint == Endpoint));
    }

    [Fact]
    public async Task SameBrowserMovesToTheNewUserAndCanUnsubscribe()
    {
        var (db, _, manager, queue, _) = await Setup(enqueue: false);
        using var dispose = db;
        var other = new User { FullName = "Other", Username = "other", Role = UserRole.Manager };
        db.Users.Add(other);
        await db.SaveChangesAsync();
        await queue.RegisterWebAsync(other.Id, Endpoint, "new-key", "new-auth", default);
        var subscription = Assert.Single(await db.WebPushSubscriptions.Where(s => s.Endpoint == Endpoint).ToListAsync());
        Assert.Equal(other.Id, subscription.UserId);
        await queue.UnregisterWebAsync(manager.Id, Endpoint, default);
        Assert.True(await db.WebPushSubscriptions.AnyAsync(s => s.Endpoint == Endpoint));
        await queue.UnregisterWebAsync(other.Id, Endpoint, default);
        Assert.False(await db.WebPushSubscriptions.AnyAsync(s => s.Endpoint == Endpoint));
    }

    [Fact]
    public async Task InsecureEndpointIsRejected()
    {
        var (db, _, manager, queue, _) = await Setup(enqueue: false);
        using var dispose = db;
        await Assert.ThrowsAnyAsync<Exception>(() => queue.RegisterWebAsync(manager.Id, "http://evil.example/x", "k", "a", default));
    }
}
