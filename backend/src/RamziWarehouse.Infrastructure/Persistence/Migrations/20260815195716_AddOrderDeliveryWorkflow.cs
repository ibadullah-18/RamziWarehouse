using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RamziWarehouse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderDeliveryWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "DeliveredAtUtc",
                table: "OrderDeliveries",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAtUtc",
                table: "OrderDeliveries",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDeliveries_StartedAtUtc",
                table: "OrderDeliveries",
                column: "StartedAtUtc");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderDeliveries_DeliveryTime",
                table: "OrderDeliveries",
                sql: "[DeliveredAtUtc] IS NULL OR [DeliveredAtUtc] >= [StartedAtUtc]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OrderDeliveries_StartedAtUtc",
                table: "OrderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderDeliveries_DeliveryTime",
                table: "OrderDeliveries");

            migrationBuilder.DropColumn(
                name: "StartedAtUtc",
                table: "OrderDeliveries");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DeliveredAtUtc",
                table: "OrderDeliveries",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);
        }
    }
}
