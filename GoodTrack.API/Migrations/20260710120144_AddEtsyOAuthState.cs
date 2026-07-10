using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEtsyOAuthState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "etsy_oauth_states",
                columns: table => new
                {
                    state = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    user_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    code_verifier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    callback_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    frontend_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_etsy_oauth_states", x => x.state);
                    table.ForeignKey(
                        name: "fk_etsy_oauth_states_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_etsy_oauth_states_expires_at",
                table: "etsy_oauth_states",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_etsy_oauth_states_user_id",
                table: "etsy_oauth_states",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "etsy_oauth_states");
        }
    }
}
