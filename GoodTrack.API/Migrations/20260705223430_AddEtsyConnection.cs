using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEtsyConnection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "etsy_connections",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    etsy_shop_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    etsy_shop_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    api_key_keystring = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    api_key_shared_secret = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    access_token = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    refresh_token = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    token_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    webhook_signing_secret = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_etsy_connections", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_etsy_connections_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "etsy_connections");
        }
    }
}
