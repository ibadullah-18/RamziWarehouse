using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Features.CustomerAccounts.Dtos;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using GrandWall.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
namespace GrandWall.Api.IntegrationTests.CustomerAccounts;
public sealed class SettlementTests
{
 private sealed class Actor : ICurrentUserService {public bool IsAuthenticated=>true;public Guid UserId=>Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");public string FullName=>"İşçi";public string Username=>"worker";public UserRole Role{get;set;}=UserRole.Driver;}
 private sealed class Clock : TimeProvider {public override DateTimeOffset GetUtcNow()=>new(2026,10,8,10,0,0,TimeSpan.Zero);}
 [Fact]public async Task AtomicCompletionSeparatesCashCardBonusAndRetryDoesNotDuplicate()
 {
  using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(w=>w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
  var customer=new Customer{Name="Dükan"};db.Customers.Add(customer);await db.SaveChangesAsync();var actor=new Actor();var service=new CustomerAccountService(db,actor,new Clock());
  await service.CreateTodayAsync(new(){CustomerId=customer.Id,TodayDebt=100,InitialPreviousDebt=400});
  var request=new CompleteSettlementRequest(Guid.NewGuid(),customer.Id,60,20,20,null,null);
  var result=await service.CompleteSettlementAsync(request);Assert.Equal(400,result.RemainingDebt);Assert.Equal(80,result.TotalPaid);Assert.Equal(20,result.Bonus);
  await service.CompleteSettlementAsync(request);Assert.Equal(2,await db.CustomerAccountEntries.CountAsync(e=>e.EntryType==CustomerAccountEntryType.Payment));Assert.Single(await db.AccountSettlements.ToListAsync());Assert.All(await db.CustomerAccountEntries.ToListAsync(),e=>Assert.True(e.IsFinalized));
  await Assert.ThrowsAsync<ForbiddenException>(()=>service.CorrectDailyAsync(new(){CustomerId=customer.Id,Amount=90,Reason="Düzəliş"}));
  await Assert.ThrowsAsync<ConflictException>(()=>service.CompleteSettlementAsync(request with{Cash=61}));
  await service.CreateTodayAsync(new(){CustomerId=customer.Id,TodayDebt=10});await service.CompleteSettlementAsync(request with{OperationId=Guid.NewGuid(),Cash=10,Card=0,Bonus=0});
  var report=await service.CloseDayAsync();Assert.Equal(70,report.Cash);Assert.Equal(20,report.Card);Assert.Equal(90,report.Total);Assert.Single(await db.AccountDayClosures.ToListAsync());
 }
 [Fact]public async Task ExcessPaymentCreatesAdvanceWithoutNegativeDebt()
 {
  using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(w=>w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);var c=new Customer{Name="Avans"};db.Customers.Add(c);await db.SaveChangesAsync();var service=new CustomerAccountService(db,new Actor(),new Clock());await service.CreateTodayAsync(new(){CustomerId=c.Id,TodayDebt=100});var result=await service.CompleteSettlementAsync(new(Guid.NewGuid(),c.Id,150,0,0,null,null));Assert.Equal(0,result.RemainingDebt);Assert.Equal(50,result.Advance);await service.CreateTodayAsync(new(){CustomerId=c.Id,TodayDebt=80});result=await service.GetByCustomerIdAsync(c.Id);Assert.Equal(30,result.RemainingDebt);Assert.Equal(0,result.Advance);
 }
}
