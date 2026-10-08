using GrandWall.Application.Common.Exceptions;
using GrandWall.Domain.Entities;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Api.Controllers;
[ApiController, Authorize, Route("api/return-persons")]
public sealed class ReturnPersonsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await db.ReturnPersons.AsNoTracking().OrderBy(x=>x.Name).ToListAsync(ct));
    [HttpPost, Authorize(Policy="AdminOnly")]
    public async Task<IActionResult> Create(PersonRequest request, CancellationToken ct)
    {
        var person=new ReturnPerson{Name=Validate(request.Name),IsActive=request.IsActive};
        db.ReturnPersons.Add(person);await db.SaveChangesAsync(ct);return Ok(person);
    }
    [HttpPut("{id:guid}"), Authorize(Policy="AdminOnly")]
    public async Task<IActionResult> Edit(Guid id,PersonRequest request,CancellationToken ct)
    {
        var person=await db.ReturnPersons.FindAsync([id],ct)??throw new NotFoundException("Şəxs tapılmadı.");
        person.Name=Validate(request.Name);person.IsActive=request.IsActive;await db.SaveChangesAsync(ct);return Ok(person);
    }
    private static string Validate(string name) => string.IsNullOrWhiteSpace(name)||name.Trim().Length>150 ? throw new ConflictException("Ad 1–150 simvol olmalıdır.") : name.Trim();
    public sealed record PersonRequest(string Name,bool IsActive);
}
