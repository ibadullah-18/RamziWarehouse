namespace GrandWall.Domain.Entities;
public sealed class ReturnPerson
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
