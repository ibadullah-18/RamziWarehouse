using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountFinalizationAndCorrections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate_EntryType",
                table: "CustomerAccountEntries");

            migrationBuilder.DropIndex(
                name: "IX_CustomerAccountEntries_CustomerId_EntryType",
                table: "CustomerAccountEntries");

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalized",
                table: "CustomerAccountEntries",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE e SET IsFinalized = 1 FROM CustomerAccountEntries e INNER JOIN AccountDayClosures c ON e.BusinessDate = c.BusinessDate");

            migrationBuilder.CreateTable(
                name: "AccountEntryAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountEntryAudits", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "BusinessDate", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_AccountEntryAudits_CustomerId",
                table: "AccountEntryAudits",
                column: "CustomerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountEntryAudits");

            migrationBuilder.DropIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate_EntryType",
                table: "CustomerAccountEntries");

            migrationBuilder.DropIndex(
                name: "IX_CustomerAccountEntries_CustomerId_EntryType",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "CustomerAccountEntries");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_BusinessDate_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "BusinessDate", "EntryType" },
                unique: true,
                filter: "[EntryType] = 2");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAccountEntries_CustomerId_EntryType",
                table: "CustomerAccountEntries",
                columns: new[] { "CustomerId", "EntryType" },
                unique: true,
                filter: "[EntryType] = 1");
        }
    }
}
