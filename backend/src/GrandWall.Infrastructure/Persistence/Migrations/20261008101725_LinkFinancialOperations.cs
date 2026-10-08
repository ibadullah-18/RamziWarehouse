using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class LinkFinancialOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SettlementId",
                table: "CustomerAccountEntries",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceReturnId",
                table: "CustomerAccountEntries",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SettlementId",
                table: "CustomerAccountEntries");

            migrationBuilder.DropColumn(
                name: "SourceReturnId",
                table: "CustomerAccountEntries");
        }
    }
}
