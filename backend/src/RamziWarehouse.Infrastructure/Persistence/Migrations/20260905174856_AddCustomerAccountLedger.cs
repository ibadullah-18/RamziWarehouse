using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RamziWarehouse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerAccountLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerAccountEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryType = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordedByFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RecordedByRole = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerAccountEntries", x => x.Id);
                    table.CheckConstraint("CK_CustomerAccountEntries_Amount_Positive", "[Amount] > 0");
                    table.CheckConstraint("CK_CustomerAccountEntries_EntryType_Valid", "[EntryType] IN (1, 2, 3)");
                    table.ForeignKey(
                        name: "FK_CustomerAccountEntries_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomerAccountEntries_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "BusinessDate" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "BusinessDate", "EntryType" },
                unique: true,
                filter: "[EntryType] = 2");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_CreatedAtUtc",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "EntryType" },
                unique: true,
                filter: "[EntryType] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_RecordedByUserId",
                table: "CustomerAccountEntries",
                column: "RecordedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerAccountEntries");
        }
    }
}
