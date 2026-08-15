using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RamziWarehouse.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTelegramOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TelegramOutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Channel = table.Column<int>(type: "int", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    NextAttemptAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastAttemptAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeleteAfterUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RelatedEntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RelatedEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelegramOutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TelegramOutboxPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TelegramOutboxMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelegramOutboxPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TelegramOutboxPhotos_TelegramOutboxMessages_TelegramOutboxMessageId",
                        column: x => x.TelegramOutboxMessageId,
                        principalTable: "TelegramOutboxMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TelegramOutboxMessages_DeleteAfterUtc",
                table: "TelegramOutboxMessages",
                column: "DeleteAfterUtc");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramOutboxMessages_RelatedEntityType_RelatedEntityId",
                table: "TelegramOutboxMessages",
                columns: new[] { "RelatedEntityType", "RelatedEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_TelegramOutboxMessages_Status_NextAttemptAtUtc",
                table: "TelegramOutboxMessages",
                columns: new[] { "Status", "NextAttemptAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TelegramOutboxPhotos_TelegramOutboxMessageId_SortOrder",
                table: "TelegramOutboxPhotos",
                columns: new[] { "TelegramOutboxMessageId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TelegramOutboxPhotos");

            migrationBuilder.DropTable(
                name: "TelegramOutboxMessages");
        }
    }
}
