using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Api.Authorization;
using GrandWall.Domain.Enums;
using GrandWall.Application.Abstractions.Customers;
using GrandWall.Application.Features.Customers.Dtos;

namespace GrandWall.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(
        ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<
        ActionResult<IReadOnlyList<CustomerDto>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] bool? isAccountCustomer,
            CancellationToken cancellationToken)
    {
        var customers =
            await _customerService.GetAllAsync(
                search,
                isActive,
                isAccountCustomer,
                cancellationToken);

        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer =
            await _customerService.GetByIdAsync(
                id,
                cancellationToken);

        return Ok(customer);
    }

    [HttpPost]
    [RequirePermission(Permission.CustomersCreate)]
    public async Task<ActionResult<CustomerDto>> Create(
        [FromBody] CreateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        var customer =
            await _customerService.CreateAsync(
                request,
                cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = customer.Id },
            customer);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.CustomersEdit)]
    public async Task<ActionResult<CustomerDto>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        var customer =
            await _customerService.UpdateAsync(
                id,
                request,
                cancellationToken);

        return Ok(customer);
    }
    [HttpDelete("{id:guid}")]
    [RequirePermission(Permission.CustomersDelete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _customerService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
