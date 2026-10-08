using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimpleAccountSettlementsAndReturnCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "ProductReturns",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedAmount",
                table: "ProductReturns",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ReturnPersonId",
                table: "ProductReturns",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnPersonName",
                table: "ProductReturns",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountSettlements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Cash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Card = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Bonus = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ProductReturnId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountSettlements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReturnPersons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnPersons", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountSettlements_CustomerId",
                table: "AccountSettlements",
                column: "CustomerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountSettlements");

            migrationBuilder.DropTable(
                name: "ReturnPersons");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "ProductReturns");

            migrationBuilder.DropColumn(
                name: "AppliedAmount",
                table: "ProductReturns");

            migrationBuilder.DropColumn(
                name: "ReturnPersonId",
                table: "ProductReturns");

            migrationBuilder.DropColumn(
                name: "ReturnPersonName",
                table: "ProductReturns");
        }
    }
}
