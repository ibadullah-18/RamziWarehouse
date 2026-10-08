using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class IdempotentReturnPhotoUploads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UploadOperationId",
                table: "ProductReturnPhotos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductReturnPhotos_ProductReturnId_UploadOperationId",
                table: "ProductReturnPhotos",
                columns: new[] { "ProductReturnId", "UploadOperationId" },
                unique: true,
                filter: "[UploadOperationId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductReturnPhotos_ProductReturnId_UploadOperationId",
                table: "ProductReturnPhotos");

            migrationBuilder.DropColumn(
                name: "UploadOperationId",
                table: "ProductReturnPhotos");
        }
    }
}
