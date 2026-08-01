namespace RamziWarehouse.Domain.Enums;

public enum OrderStatus
{
    Created = 1,
    InPreparation = 2,
    ReadyForDelivery = 3,
    Delivered = 4,
    Cancelled = 5
}