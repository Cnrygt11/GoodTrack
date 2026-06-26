using System.Collections.Generic;
using GoodTrack.API.Models;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "catalog_products",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    seller_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    image = table.Column<string>(type: "character varying(7000000)", maxLength: 7000000, nullable: false),
                    manufacturer_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    manufacturer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    length = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    extras = table.Column<Dictionary<string, ExtraValue>>(type: "jsonb", nullable: true),
                    created_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_catalog_products", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "connection_requests",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    sender_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sender_username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    receiver_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    receiver_username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    created_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_connection_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "extra_field_defs",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    options = table.Column<List<string>>(type: "text[]", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_extra_field_defs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "feedbacks",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    user_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    browser_info = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_feedbacks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    image = table.Column<string>(type: "character varying(7000000)", maxLength: 7000000, nullable: true),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    length = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    extras = table.Column<Dictionary<string, ExtraValue>>(type: "jsonb", nullable: true),
                    completed = table.Column<bool>(type: "boolean", nullable: false),
                    is_defective = table.Column<bool>(type: "boolean", nullable: false),
                    is_pending_approval = table.Column<bool>(type: "boolean", nullable: false),
                    is_reproduction = table.Column<bool>(type: "boolean", nullable: false),
                    defect_note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    defect_image = table.Column<string>(type: "character varying(7000000)", maxLength: 7000000, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    logs = table.Column<List<OrderLog>>(type: "jsonb", nullable: false),
                    created_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    completed_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    seller_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    manufacturer_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    seller_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    manufacturer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    cancel_requested = table.Column<bool>(type: "boolean", nullable: false),
                    is_read_by_seller = table.Column<bool>(type: "boolean", nullable: false),
                    is_read_by_mfr = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_products", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    profile_picture = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    bio = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    product_images = table.Column<List<string>>(type: "text[]", nullable: false),
                    keywords = table.Column<List<string>>(type: "text[]", nullable: false),
                    is_visible_to_sellers = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    associated_user_ids = table.Column<List<string>>(type: "text[]", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    verification_token = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    verification_token_expires_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    refresh_token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    refresh_token_expiry_time = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_catalog_products_seller_id",
                table: "catalog_products",
                column: "seller_id");

            migrationBuilder.CreateIndex(
                name: "ix_catalog_products_seller_id_product_code",
                table: "catalog_products",
                columns: new[] { "seller_id", "product_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_connection_requests_receiver_id",
                table: "connection_requests",
                column: "receiver_id");

            migrationBuilder.CreateIndex(
                name: "ix_connection_requests_sender_id",
                table: "connection_requests",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "ix_extra_field_defs_created_by",
                table: "extra_field_defs",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "ix_products_manufacturer_id",
                table: "products",
                column: "manufacturer_id");

            migrationBuilder.CreateIndex(
                name: "ix_products_seller_id",
                table: "products",
                column: "seller_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                table: "users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "catalog_products");

            migrationBuilder.DropTable(
                name: "connection_requests");

            migrationBuilder.DropTable(
                name: "extra_field_defs");

            migrationBuilder.DropTable(
                name: "feedbacks");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
