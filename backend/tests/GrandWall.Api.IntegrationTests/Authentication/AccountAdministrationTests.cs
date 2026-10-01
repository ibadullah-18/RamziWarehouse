using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GrandWall.Api.IntegrationTests.Infrastructure;
namespace GrandWall.Api.IntegrationTests.Authentication;
public sealed class AccountAdministrationTests
{
 [Fact]
 public async Task ManagerCannotReadAccountsChangePasswordsOrDeleteRecords()
 {
  using var factory=new GrandWallApiFactory();using var client=factory.CreateClient();
  IntegrationTestAuthHelper.SetBearerToken(client,await IntegrationTestAuthHelper.LoginAsManagerAsync(client));
  Assert.Equal(HttpStatusCode.Forbidden,(await client.GetAsync("/api/customer-accounts")).StatusCode);
  Assert.Equal(HttpStatusCode.Forbidden,(await client.DeleteAsync($"/api/users/{Guid.NewGuid()}")).StatusCode);
  Assert.Equal(HttpStatusCode.Forbidden,(await client.DeleteAsync($"/api/customers/{Guid.NewGuid()}")).StatusCode);
  Assert.Equal(HttpStatusCode.Forbidden,(await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}/password",new{newPassword="ChangedPassword123!"})).StatusCode);
 }
 [Fact]
 public async Task DeletingEmployeeImmediatelyBlocksAccessAndDeletingCustomerHidesIt()
 {
  using var factory=new GrandWallApiFactory();using var admin=factory.CreateClient();
  IntegrationTestAuthHelper.SetBearerToken(admin,await IntegrationTestAuthHelper.LoginAsync(admin,GrandWallApiFactory.AdminUsername,GrandWallApiFactory.AdminPassword));
  var me=await admin.GetFromJsonAsync<JsonElement>("/api/users/me");
  Assert.Equal(HttpStatusCode.Conflict,(await admin.DeleteAsync($"/api/users/{me.GetProperty("id").GetGuid()}")).StatusCode);
  var username="departed."+Guid.NewGuid().ToString("N");
  var created=await admin.PostAsJsonAsync("/api/users",new{fullName="İşçi",username,password="EmployeeTest123!",role=3});created.EnsureSuccessStatusCode();
  var employee=await created.Content.ReadFromJsonAsync<JsonElement>();var id=employee.GetProperty("id").GetGuid();
  using var worker=factory.CreateClient();IntegrationTestAuthHelper.SetBearerToken(worker,await IntegrationTestAuthHelper.LoginAsync(worker,username,"EmployeeTest123!"));
  Assert.Equal(HttpStatusCode.NoContent,(await admin.DeleteAsync($"/api/users/{id}")).StatusCode);
  Assert.Equal(HttpStatusCode.Unauthorized,(await worker.GetAsync("/api/users/me")).StatusCode);
  var users=await admin.GetFromJsonAsync<JsonElement>("/api/users");Assert.DoesNotContain(users.EnumerateArray(),u=>u.GetProperty("id").GetGuid()==id);
  var response=await admin.PostAsJsonAsync("/api/customers",new{name="Silinəcək müştəri"});response.EnsureSuccessStatusCode();
  var customer=await response.Content.ReadFromJsonAsync<JsonElement>();var customerId=customer.GetProperty("id").GetGuid();
  Assert.Equal(HttpStatusCode.NoContent,(await admin.DeleteAsync($"/api/customers/{customerId}")).StatusCode);
  var customers=await admin.GetFromJsonAsync<JsonElement>("/api/customers");Assert.DoesNotContain(customers.EnumerateArray(),c=>c.GetProperty("id").GetGuid()==customerId);
  Assert.Equal(HttpStatusCode.NotFound,(await admin.GetAsync($"/api/customers/{customerId}")).StatusCode);
 }
}
