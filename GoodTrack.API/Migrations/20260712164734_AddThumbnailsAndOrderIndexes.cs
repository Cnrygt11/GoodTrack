using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddThumbnailsAndOrderIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "profile_thumbnail",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_image",
                table: "products",
                type: "character varying(500000)",
                maxLength: 500000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_image",
                table: "catalog_products",
                type: "character varying(500000)",
                maxLength: 500000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_manufacturer_id_status_created_at",
                table: "products",
                columns: new[] { "manufacturer_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_products_seller_id_status_created_at",
                table: "products",
                columns: new[] { "seller_id", "status", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_products_manufacturer_id_status_created_at",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_products_seller_id_status_created_at",
                table: "products");

            migrationBuilder.DropColumn(
                name: "profile_thumbnail",
                table: "users");

            migrationBuilder.DropColumn(
                name: "thumbnail_image",
                table: "products");

            migrationBuilder.DropColumn(
                name: "thumbnail_image",
                table: "catalog_products");
        }
    }
}
