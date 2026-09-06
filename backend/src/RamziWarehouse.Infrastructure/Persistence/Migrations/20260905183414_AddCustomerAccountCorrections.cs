using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RamziWarehouse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerAccountCorrections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3, 4, 5)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CustomerAccountEntries_EntryType_Valid",
                table: "CustomerAccountEntries",
                sql: "[EntryType] IN (1, 2, 3)");
        }
    }
}
