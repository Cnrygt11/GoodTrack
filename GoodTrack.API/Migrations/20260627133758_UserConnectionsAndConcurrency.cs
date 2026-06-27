using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class UserConnectionsAndConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "associated_user_ids",
                table: "users");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "users",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "user_connections",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false, defaultValueSql: "gen_random_uuid()::text"),
                    seller_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    manufacturer_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    connected_at = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_connections", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_user_connections_seller_id_manufacturer_id",
                table: "user_connections",
                columns: new[] { "seller_id", "manufacturer_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_connections");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "users");

            migrationBuilder.AddColumn<List<string>>(
                name: "associated_user_ids",
                table: "users",
                type: "text[]",
                nullable: false);
        }
    }
}
