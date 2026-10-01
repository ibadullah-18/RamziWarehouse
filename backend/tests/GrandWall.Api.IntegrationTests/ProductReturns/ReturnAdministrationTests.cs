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

