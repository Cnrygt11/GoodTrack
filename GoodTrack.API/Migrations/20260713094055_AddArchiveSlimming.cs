using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddArchiveSlimming : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "slimmed_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_manufacturer_id_archived_at",
                table: "products",
                columns: new[] { "manufacturer_id", "archived_at" });

            migrationBuilder.CreateIndex(
                name: "ix_products_seller_id_archived_at",
                table: "products",
                columns: new[] { "seller_id", "archived_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_products_manufacturer_id_archived_at",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_products_seller_id_archived_at",
                table: "products");

            migrationBuilder.DropColumn(
                name: "slimmed_at",
                table: "products");
        }
    }
}
