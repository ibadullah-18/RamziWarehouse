using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GrandWall.Api.IntegrationTests.ProductReturns;
public sealed class ReturnAdministrationTests
{
 [Theory]
 [InlineData(2)]
 [InlineData(3)]
 [InlineData(5)]
 public async Task EveryEmployeeCanEditAndDeleteBeforeManagerApproval(int role)
 {
  using var factory=new GrandWallApiFactory();using var admin=factory.CreateClient();using var manager=factory.CreateClient();using var employee=factory.CreateClient();
  IntegrationTestAuthHelper.SetBearerToken(admin,await IntegrationTestAuthHelper.LoginAsync(admin,GrandWallApiFactory.AdminUsername,GrandWallApiFactory.AdminPassword));
  IntegrationTestAuthHelper.SetBearerToken(manager,await IntegrationTestAuthHelper.LoginAsManagerAsync(manager));
  var username="editor."+Guid.NewGuid().ToString("N");(await admin.PostAsJsonAsync("/api/users",new{fullName="Redaktə edən",username,password="EmployeeTest123!",role})).EnsureSuccessStatusCode();
  IntegrationTestAuthHelper.SetBearerToken(employee,await IntegrationTestAuthHelper.LoginAsync(employee,username,"EmployeeTest123!"));
  var customer=await Customer(manager,"Düzəliş müştərisi");var warehouses=await manager.GetFromJsonAsync<JsonElement>("/api/warehouses");var warehouse=warehouses[0].GetProperty("id").GetGuid();
  var record=await Create(manager,customer,warehouse,1,"101");var id=record.GetProperty("id").GetGuid();
  var submitted=await manager.PostAsync($"/api/product-returns/{id}/submit",null);submitted.EnsureSuccessStatusCode();record=await submitted.Content.ReadFromJsonAsync<JsonElement>();
  var item=record.GetProperty("items")[0];var revision=record.GetProperty("revision").GetGuid();
  var edit=await employee.PutAsJsonAsync($"/api/product-returns/{id}",new{expectedRevision=revision,reason="İşçi düzəlişi",items=new[]{new{id=item.GetProperty("id").GetGuid(),productCode="111",batchNumber="22",quantity=5,productType=1},new{id=Guid.Empty,productCode="222",batchNumber="33",quantity=4,productType=2}}});edit.EnsureSuccessStatusCode();record=await edit.Content.ReadFromJsonAsync<JsonElement>();
  Assert.Equal(2,record.GetProperty("items").GetArrayLength());Assert.Equal(9,record.GetProperty("items").EnumerateArray().Sum(i=>i.GetProperty("quantity").GetInt32()));
  Assert.Equal(HttpStatusCode.Conflict,(await employee.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{id}"){Content=JsonContent.Create(new{expectedRevision=revision,reason="Köhnə məlumat"})})).StatusCode);
  (await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete",new{note="Qəbul"})).EnsureSuccessStatusCode();
  record=await employee.GetFromJsonAsync<JsonElement>($"/api/product-returns/{id}");
  Assert.Equal(HttpStatusCode.Forbidden,(await employee.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{id}"){Content=JsonContent.Create(new{expectedRevision=record.GetProperty("revision").GetGuid(),reason="Təsdiqdən sonra"})})).StatusCode);
  var pending=await Create(manager,customer,warehouse,1,"333");var pendingId=pending.GetProperty("id").GetGuid();
  Assert.Equal(HttpStatusCode.NoContent,(await employee.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{pendingId}"){Content=JsonContent.Create(new{expectedRevision=pending.GetProperty("revision").GetGuid(),reason="Təkrar qaralama"})})).StatusCode);
 }

 [Fact]
 public async Task AcceptedDateUsesApprovalTimestampAndBakuMidnightBoundaries()
 {
  using var factory=new GrandWallApiFactory();using var client=factory.CreateClient();IntegrationTestAuthHelper.SetBearerToken(client,await IntegrationTestAuthHelper.LoginAsManagerAsync(client));
  var customer=await Customer(client,"Qəbul tarixi");var warehouses=await client.GetFromJsonAsync<JsonElement>("/api/warehouses");var warehouse=warehouses[0].GetProperty("id").GetGuid();
  var times=new[]{new DateTime(2026,9,29,19,59,59,DateTimeKind.Utc),new DateTime(2026,9,29,20,0,0,DateTimeKind.Utc),new DateTime(2026,9,30,19,59,59,DateTimeKind.Utc),new DateTime(2026,9,30,20,0,0,DateTimeKind.Utc)};
  foreach(var time in times){var r=await Create(client,customer,warehouse,1,time.Hour.ToString());using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();var entity=await db.ProductReturns.FindAsync(r.GetProperty("id").GetGuid());entity!.Submit();entity.Complete(entity.CreatedByUserId,time);entity.ReturnDateUtc=time.AddDays(-5);await db.SaveChangesAsync();}
  await Create(client,customer,warehouse,1,"Pending");
  var list=await client.GetFromJsonAsync<JsonElement>("/api/product-returns?acceptedDate=2026-09-30");Assert.Equal(2,list.GetProperty("totalCount").GetInt32());
  foreach(var r in list.GetProperty("items").EnumerateArray())Assert.Equal(2,r.GetProperty("status").GetInt32());
 }
 private static async Task<Guid> Customer(HttpClient client,string name)
 {
  var response=await client.PostAsJsonAsync("/api/customers",new{name});response.EnsureSuccessStatusCode();
  return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
 }
 private static async Task<JsonElement> Create(HttpClient client,Guid customer,Guid warehouse,int type,string code)
 {
  var response=await client.PostAsJsonAsync("/api/product-returns",new{customerId=customer,warehouseId=warehouse,items=new[]{new{productCode=code,batchNumber="10",quantity=2,productType=type}}});
  response.EnsureSuccessStatusCode();return await response.Content.ReadFromJsonAsync<JsonElement>();
 }
 [Fact]
 public async Task PhotosAreOptionalAndOnlyAdminCanCorrectOrArchiveWithReasonAndAudit()
 {
  using var factory=new GrandWallApiFactory();using var manager=factory.CreateClient();using var admin=factory.CreateClient();
  IntegrationTestAuthHelper.SetBearerToken(manager,await IntegrationTestAuthHelper.LoginAsManagerAsync(manager));
  IntegrationTestAuthHelper.SetBearerToken(admin,await IntegrationTestAuthHelper.LoginAsync(admin,GrandWallApiFactory.AdminUsername,GrandWallApiFactory.AdminPassword));
  var customer=await Customer(manager,"Yeni müştəri");
  var warehouses=await manager.GetFromJsonAsync<JsonElement>("/api/warehouses");var warehouse=warehouses[0].GetProperty("id").GetGuid();
  (await manager.PostAsJsonAsync("/api/push-devices",new{token="ExpoPushToken[testManagerDevice]"})).EnsureSuccessStatusCode();
  var record=await Create(manager,customer,warehouse,1,"101");var id=record.GetProperty("id").GetGuid();
  var submit=await manager.PostAsync($"/api/product-returns/{id}/submit",null);submit.EnsureSuccessStatusCode();
  var submitted=await submit.Content.ReadFromJsonAsync<JsonElement>();Assert.Equal(4,submitted.GetProperty("status").GetInt32());Assert.Empty(submitted.GetProperty("photos").EnumerateArray());
  using(var scope=factory.Services.CreateScope()){var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();Assert.Single(await db.PushDeliveries.Where(p=>p.ProductReturnId==id).ToListAsync());}
  var complete=await manager.PostAsJsonAsync($"/api/product-returns/{id}/complete",new{note="Qəbul edildi"});complete.EnsureSuccessStatusCode();
  record=await complete.Content.ReadFromJsonAsync<JsonElement>();var item=record.GetProperty("items")[0];var revision=record.GetProperty("revision").GetGuid();
  var correction=new{expectedRevision=revision,reason="Yanlış yazılmış kod",items=new[]{new{id=item.GetProperty("id").GetGuid(),productCode="202",batchNumber="20"}}};
  Assert.Equal(HttpStatusCode.Forbidden,(await manager.PutAsJsonAsync($"/api/product-returns/{id}",correction)).StatusCode);
  Assert.Equal(HttpStatusCode.Forbidden,(await manager.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{id}"){Content=JsonContent.Create(new{expectedRevision=revision,reason="Səhv qeyd"})})).StatusCode);
  var corrected=await admin.PutAsJsonAsync($"/api/product-returns/{id}",correction);corrected.EnsureSuccessStatusCode();record=await corrected.Content.ReadFromJsonAsync<JsonElement>();
  Assert.Equal("202",record.GetProperty("items")[0].GetProperty("productCode").GetString());Assert.Equal(2,record.GetProperty("status").GetInt32());
  Assert.Contains(record.GetProperty("statusHistory").EnumerateArray(),h=>h.GetProperty("note").GetString()!.Contains("101 → 202")&&h.GetProperty("note").GetString()!.Contains("10 → 20"));
  Assert.Equal(HttpStatusCode.Conflict,(await admin.PutAsJsonAsync($"/api/product-returns/{id}",correction)).StatusCode);
  revision=record.GetProperty("revision").GetGuid();
  using var invalidDelete=await admin.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{id}"){Content=JsonContent.Create(new{expectedRevision=revision,reason=""})});Assert.Equal(HttpStatusCode.Conflict,invalidDelete.StatusCode);
  using var deleted=await admin.SendAsync(new HttpRequestMessage(HttpMethod.Delete,$"/api/product-returns/{id}"){Content=JsonContent.Create(new{expectedRevision=revision,reason="Təkrar qeyd"})});Assert.Equal(HttpStatusCode.NoContent,deleted.StatusCode);
  var list=await manager.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={customer}");Assert.Empty(list.GetProperty("items").EnumerateArray());
  Assert.Equal(HttpStatusCode.NotFound,(await manager.GetAsync($"/api/product-returns/{id}")).StatusCode);
  record=await admin.GetFromJsonAsync<JsonElement>($"/api/product-returns/{id}");Assert.True(record.GetProperty("isDeleted").GetBoolean());
  Assert.Contains(record.GetProperty("statusHistory").EnumerateArray(),h=>h.GetProperty("note").GetString()!.Contains("Təkrar qeyd"));
 }
 [Fact]
 public async Task SearchIncludesOnlySelectedCustomerAndRequestedReturnTypeAcrossDates()
 {
  using var factory=new GrandWallApiFactory();using var client=factory.CreateClient();IntegrationTestAuthHelper.SetBearerToken(client,await IntegrationTestAuthHelper.LoginAsManagerAsync(client));
  var first=await Customer(client,"Birinci");var second=await Customer(client,"İkinci");var warehouses=await client.GetFromJsonAsync<JsonElement>("/api/warehouses");var warehouse=warehouses[0].GetProperty("id").GetGuid();
  var a=await Create(client,first,warehouse,1,"111");var b=await Create(client,first,warehouse,2,"222");await Create(client,second,warehouse,1,"333");
  using(var scope=factory.Services.CreateScope()){var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();var old=await db.ProductReturns.FindAsync(a.GetProperty("id").GetGuid());old!.ReturnDateUtc=DateTime.UtcNow.AddDays(-30);await db.SaveChangesAsync();}
  var both=await client.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={first}");Assert.Equal(2,both.GetProperty("items").GetArrayLength());
  var showcase=await client.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={first}&productType=2");Assert.Equal(b.GetProperty("id").GetGuid(),Assert.Single(showcase.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
  var returns=await client.GetFromJsonAsync<JsonElement>($"/api/product-returns?customerId={first}&productType=1");Assert.Equal(a.GetProperty("id").GetGuid(),Assert.Single(returns.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
 }
}

