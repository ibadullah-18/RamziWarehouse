using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrandWall.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReturnCodeRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReturnCodeRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    RequiredLength = table.Column<int>(type: "int", nullable: true),
                    SecondDigitMustBeZero = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnCodeRules", x => x.Id);
                });

            // The rule asked for: four-digit codes whose second digit is 0 (1019, 5012). Admin can change it.
            migrationBuilder.Sql("INSERT INTO [ReturnCodeRules] ([Id], [RequiredLength], [SecondDigitMustBeZero]) VALUES (1, 4, 1)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReturnCodeRules");
        }
    }
}
