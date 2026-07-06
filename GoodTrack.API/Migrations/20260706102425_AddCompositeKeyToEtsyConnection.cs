using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCompositeKeyToEtsyConnection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "pk_etsy_connections",
                table: "etsy_connections");

            migrationBuilder.AddPrimaryKey(
                name: "pk_etsy_connections",
                table: "etsy_connections",
                columns: new[] { "user_id", "etsy_shop_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "pk_etsy_connections",
                table: "etsy_connections");

            migrationBuilder.AddPrimaryKey(
                name: "pk_etsy_connections",
                table: "etsy_connections",
                column: "user_id");
        }
    }
}
