using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "CustomerAccountEntries",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountDayClosures",
                columns: table => new
                {
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordedByFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountDayClosures", x => x.BusinessDate);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5, 6, 7)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountDayClosures");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "CustomerAccountEntries");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5)");
        }
    }
}
