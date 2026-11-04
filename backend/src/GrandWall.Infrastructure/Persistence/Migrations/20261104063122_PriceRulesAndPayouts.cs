using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PriceRulesAndPayouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.CreateTable(
                name: "CustomerPriceRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CodePrefix = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerPriceRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerPriceRules_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerPriceRules_CustomerId_CodePrefix",
                table: "CustomerPriceRules",
                columns: new[] { "CustomerId", "CodePrefix" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerPriceRules");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)");
        }
    }
}
