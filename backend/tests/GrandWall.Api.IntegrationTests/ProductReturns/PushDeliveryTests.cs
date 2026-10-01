using System.Net;
using System.Text;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Notifications.Push;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
namespace GrandWall.Api.IntegrationTests.ProductReturns;
public sealed class PushDeliveryTests
{
 private sealed class Clock:TimeProvider{public DateTimeOffset Now=new(2026,10,1,10,0,0,TimeSpan.Zero);public override DateTimeOffset GetUtcNow()=>Now;}
 private sealed class FakeHttp:HttpMessageHandler
 {
  public int Calls;public Queue<(HttpStatusCode Status,string Json)> Responses=new();
  protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct){Calls++;var r=Responses.Dequeue();return Task.FromResult(new HttpResponseMessage(r.Status){Content=new StringContent(r.Json,Encoding.UTF8,"application/json")});}
 }
 private static async Task<(AppDbContext Db,Clock Clock,User Manager,ProductReturn Return,PushNotificationQueue Queue)> Setup()
 {
  var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);var clock=new Clock();
  var manager=new User{FullName="Manager",Username="manager",Role=UserRole.Manager};var admin=new User{FullName="Admin",Username="admin",Role=UserRole.Admin};
  db.Users.AddRange(manager,admin);await db.SaveChangesAsync();var queue=new PushNotificationQueue(db,clock);
  await queue.RegisterAsync(manager.Id,"ExpoPushToken[manager]",default);await queue.RegisterAsync(admin.Id,"ExpoPushToken[admin]",default);
  var record=new ProductReturn{CreatedByUserId=manager.Id,Customer=new Customer{Name="Test"},Warehouse=new Warehouse{Name="Test"},Items=[new ProductReturnItem{ProductCode="101",BatchNumber="10",Quantity=1,ProductType=ProductType.Product}]};record.Submit();db.ProductReturns.Add(record);await db.SaveChangesAsync();
  await queue.EnqueueReturnAsync(record,default);await db.SaveChangesAsync();return(db,clock,manager,record,queue);
 }
 private static PushDeliveryProcessor Processor(AppDbContext db,Clock clock,FakeHttp handler)=>new(db,new HttpClient(handler){BaseAddress=new Uri("https://exp.host/--/api/v2/push/")},new ConfigurationBuilder().Build(),clock,NullLogger<PushDeliveryProcessor>.Instance);
 [Fact]
 public async Task TemporaryFailureRetriesAndSuccessfulReceiptFinishesDelivery()
 {
  var (db,clock,_,_,_)=await Setup();using var dispose=db;var delivery=Assert.Single(await db.PushDeliveries.ToListAsync());
  var handler=new FakeHttp();handler.Responses.Enqueue((HttpStatusCode.ServiceUnavailable,"{}"));handler.Responses.Enqueue((HttpStatusCode.OK,"{\"data\":{\"status\":\"ok\",\"id\":\"ticket-1\"}}"));handler.Responses.Enqueue((HttpStatusCode.OK,"{\"data\":{\"ticket-1\":{\"status\":\"ok\"}}}"));
  var processor=Processor(db,clock,handler);await processor.ProcessAsync(default);Assert.Equal(1,delivery.Attempts);Assert.False(delivery.Completed);Assert.True(delivery.NextAttemptUtc>clock.Now.UtcDateTime);
  clock.Now=clock.Now.AddMinutes(5);await processor.ProcessAsync(default);Assert.Equal("ticket-1",delivery.TicketId);Assert.False(delivery.Completed);
  clock.Now=clock.Now.AddMinutes(16);await processor.ProcessAsync(default);Assert.True(delivery.Completed);Assert.Equal(3,handler.Calls);
 }
 [Fact]
 public async Task DeadDeviceIsRemovedWithoutRetrying()
 {
  var (db,clock,_,_,_)=await Setup();using var dispose=db;var handler=new FakeHttp();handler.Responses.Enqueue((HttpStatusCode.OK,"{\"data\":{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}}"));
  await Processor(db,clock,handler).ProcessAsync(default);Assert.True(Assert.Single(db.PushDeliveries).Completed);Assert.False(await db.PushDevices.AnyAsync(d=>d.Token=="ExpoPushToken[manager]"));
 }
 [Fact]
 public async Task ChangedRoleOrDeviceOwnerNeverReceivesQueuedCustomerInformation()
 {
  var (db,clock,manager,_,queue)=await Setup();using var dispose=db;var handler=new FakeHttp();
  var driver=new User{Username="driver",FullName="Driver",Role=UserRole.Driver};db.Users.Add(driver);await db.SaveChangesAsync();await queue.RegisterAsync(driver.Id,"ExpoPushToken[manager]",default);
  await Processor(db,clock,handler).ProcessAsync(default);Assert.True(Assert.Single(db.PushDeliveries).Completed);Assert.Equal(0,handler.Calls);
  Assert.Equal(UserRole.Manager,manager.Role);
 }
}
