using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEtsyOrderMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "customer_name",
                table: "products",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "etsy_receipt_id",
                table: "products",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "etsy_transaction_id",
                table: "products",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shipping_address",
                table: "products",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_seller_id_etsy_receipt_id",
                table: "products",
                columns: new[] { "seller_id", "etsy_receipt_id" });

            migrationBuilder.CreateIndex(
                name: "ix_products_seller_id_etsy_transaction_id",
                table: "products",
                columns: new[] { "seller_id", "etsy_transaction_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_products_seller_id_etsy_receipt_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_products_seller_id_etsy_transaction_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "customer_name",
                table: "products");

            migrationBuilder.DropColumn(
                name: "etsy_receipt_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "etsy_transaction_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "shipping_address",
                table: "products");
        }
    }
}
