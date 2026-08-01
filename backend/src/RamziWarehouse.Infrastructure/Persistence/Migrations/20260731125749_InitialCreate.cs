using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RamziWarehouse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Warehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Warehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OrderDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdditionalNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreparedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreparationStartedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PreparedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeleteAfterUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_Users_PreparedByUserId",
                        column: x => x.PreparedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Orders_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductReturns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReturnDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdditionalNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcessedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProcessedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeleteAfterUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductReturns_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductReturns_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductReturns_Users_ProcessedByUserId",
                        column: x => x.ProcessedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductReturns_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveredByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveredAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderDeliveries_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderDeliveries_Users_DeliveredByUserId",
                        column: x => x.DeliveredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    ProductType = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.CheckConstraint("CK_OrderItems_Quantity_Positive", "[Quantity] > 0");
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderPreparationPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderPreparationPhotos", x => x.Id);
                    table.CheckConstraint("CK_OrderPreparationPhotos_FileSize_Positive", "[FileSizeBytes] > 0");
                    table.ForeignKey(
                        name: "FK_OrderPreparationPhotos_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderPreparationPhotos_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderStatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousStatus = table.Column<int>(type: "int", nullable: true),
                    NewStatus = table.Column<int>(type: "int", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistories_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistories_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductReturnItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductReturnId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    ProductType = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReturnItems", x => x.Id);
                    table.CheckConstraint("CK_ProductReturnItems_Quantity_Positive", "[Quantity] > 0");
                    table.ForeignKey(
                        name: "FK_ProductReturnItems_ProductReturns_ProductReturnId",
                        column: x => x.ProductReturnId,
                        principalTable: "ProductReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductReturnPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductReturnId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReturnPhotos", x => x.Id);
                    table.CheckConstraint("CK_ProductReturnPhotos_FileSize_Positive", "[FileSizeBytes] > 0");
                    table.ForeignKey(
                        name: "FK_ProductReturnPhotos_ProductReturns_ProductReturnId",
                        column: x => x.ProductReturnId,
                        principalTable: "ProductReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductReturnPhotos_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductReturnStatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductReturnId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousStatus = table.Column<int>(type: "int", nullable: true),
                    NewStatus = table.Column<int>(type: "int", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReturnStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductReturnStatusHistories_ProductReturns_ProductReturnId",
                        column: x => x.ProductReturnId,
                        principalTable: "ProductReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductReturnStatusHistories_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DeliveryPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderDeliveryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryPhotos", x => x.Id);
                    table.CheckConstraint("CK_DeliveryPhotos_FileSize_Positive", "[FileSizeBytes] > 0");
                    table.ForeignKey(
                        name: "FK_DeliveryPhotos_OrderDeliveries_OrderDeliveryId",
                        column: x => x.OrderDeliveryId,
                        principalTable: "OrderDeliveries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeliveryPhotos_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Name",
                table: "Customers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryPhotos_CloudinaryPublicId",
                table: "DeliveryPhotos",
                column: "CloudinaryPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryPhotos_OrderDeliveryId",
                table: "DeliveryPhotos",
                column: "OrderDeliveryId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryPhotos_UploadedByUserId",
                table: "DeliveryPhotos",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDeliveries_DeliveredAtUtc",
                table: "OrderDeliveries",
                column: "DeliveredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDeliveries_DeliveredByUserId",
                table: "OrderDeliveries",
                column: "DeliveredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDeliveries_OrderId",
                table: "OrderDeliveries",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId_ProductCode_BatchNumber",
                table: "OrderItems",
                columns: new[] { "OrderId", "ProductCode", "BatchNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderPreparationPhotos_CloudinaryPublicId",
                table: "OrderPreparationPhotos",
                column: "CloudinaryPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderPreparationPhotos_OrderId",
                table: "OrderPreparationPhotos",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPreparationPhotos_UploadedByUserId",
                table: "OrderPreparationPhotos",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CreatedByUserId",
                table: "Orders",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_DeleteAfterUtc",
                table: "Orders",
                column: "DeleteAfterUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderDateUtc",
                table: "Orders",
                column: "OrderDateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PreparedByUserId",
                table: "Orders",
                column: "PreparedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status",
                table: "Orders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_WarehouseId",
                table: "Orders",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_ChangedByUserId",
                table: "OrderStatusHistories",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_OrderId_CreatedAtUtc",
                table: "OrderStatusHistories",
                columns: new[] { "OrderId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnItems_ProductReturnId_ProductCode_BatchNumber",
                table: "ProductReturnItems",
                columns: new[] { "ProductReturnId", "ProductCode", "BatchNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnPhotos_CloudinaryPublicId",
                table: "ProductReturnPhotos",
                column: "CloudinaryPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnPhotos_ProductReturnId",
                table: "ProductReturnPhotos",
                column: "ProductReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnPhotos_UploadedByUserId",
                table: "ProductReturnPhotos",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_CreatedByUserId",
                table: "ProductReturns",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_CustomerId",
                table: "ProductReturns",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_DeleteAfterUtc",
                table: "ProductReturns",
                column: "DeleteAfterUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_ProcessedByUserId",
                table: "ProductReturns",
                column: "ProcessedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_ReturnDateUtc",
                table: "ProductReturns",
                column: "ReturnDateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_Status",
                table: "ProductReturns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturns_WarehouseId",
                table: "ProductReturns",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnStatusHistories_ChangedByUserId",
                table: "ProductReturnStatusHistories",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnStatusHistories_ProductReturnId_CreatedAtUtc",
                table: "ProductReturnStatusHistories",
                columns: new[] { "ProductReturnId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Name",
                table: "Warehouses",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeliveryPhotos");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "OrderPreparationPhotos");

            migrationBuilder.DropTable(
                name: "OrderStatusHistories");

            migrationBuilder.DropTable(
                name: "ProductReturnItems");

            migrationBuilder.DropTable(
                name: "ProductReturnPhotos");

            migrationBuilder.DropTable(
                name: "ProductReturnStatusHistories");

            migrationBuilder.DropTable(
                name: "OrderDeliveries");

            migrationBuilder.DropTable(
                name: "ProductReturns");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Warehouses");
        }
    }
}
