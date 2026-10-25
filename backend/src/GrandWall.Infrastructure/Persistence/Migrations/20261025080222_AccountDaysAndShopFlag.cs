using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AccountDaysAndShopFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "ProductReturnId",
                table: "AccountSettlements");

            migrationBuilder.AddColumn<bool>(
                name: "IsAccountCustomer",
                table: "Customers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CarryToTomorrow",
                table: "AccountSettlements",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAtUtc",
                table: "AccountSettlements",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "ReturnsKey",
                table: "AccountSettlements",
                type: "nvarchar(2500)",
                maxLength: 2500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountDays",
                columns: table => new
                {
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartedByFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ClosedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ClosedByFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountDays", x => x.BusinessDate);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)");

            // Finished days keep their closure; the old closures table is folded into AccountDays.
            migrationBuilder.Sql(@"
INSERT INTO [AccountDays] ([BusinessDate], [StartedAtUtc], [StartedByUserId], [StartedByFullName], [ClosedAtUtc], [ClosedByUserId], [ClosedByFullName])
SELECT [BusinessDate], [ClosedAtUtc], [RecordedByUserId], [RecordedByFullName], [ClosedAtUtc], [RecordedByUserId], [RecordedByFullName]
FROM [AccountDayClosures]");

            migrationBuilder.DropTable(
                name: "AccountDayClosures");

            // Only Sədərək customers appear in the açot: keep everyone who already has an account.
            migrationBuilder.Sql(@"
UPDATE [Customers] SET [IsAccountCustomer] = 1
WHERE [Id] IN (SELECT DISTINCT [CustomerId] FROM [CustomerAccountEntries])");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountDays");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "IsAccountCustomer",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CarryToTomorrow",
                table: "AccountSettlements");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "AccountSettlements");

            migrationBuilder.DropColumn(
                name: "ReturnsKey",
                table: "AccountSettlements");

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalized",
                table: "CustomerAccountEntries",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductReturnId",
                table: "AccountSettlements",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccountDayClosures",
                columns: table => new
                {
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedByFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
    }
}
