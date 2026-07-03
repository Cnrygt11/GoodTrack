using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoodTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class ChangeDatePropertiesToDateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE users ALTER COLUMN refresh_token_expiry_time TYPE timestamp with time zone USING nullif(refresh_token_expiry_time, '')::timestamp with time zone;");
            migrationBuilder.Sql("ALTER TABLE user_credits ALTER COLUMN renews_at TYPE timestamp with time zone USING COALESCE(nullif(renews_at, '')::timestamp with time zone, now());");
            migrationBuilder.Sql("ALTER TABLE user_credits ALTER COLUMN plan_started_at TYPE timestamp with time zone USING COALESCE(nullif(plan_started_at, '')::timestamp with time zone, now());");
            migrationBuilder.Sql("ALTER TABLE user_connections ALTER COLUMN connected_at TYPE timestamp with time zone USING COALESCE(nullif(connected_at, '')::timestamp with time zone, now());");
            migrationBuilder.Sql("ALTER TABLE products ALTER COLUMN created_at TYPE timestamp with time zone USING COALESCE(nullif(created_at, '')::timestamp with time zone, now());");
            migrationBuilder.Sql("ALTER TABLE products ALTER COLUMN completed_at TYPE timestamp with time zone USING nullif(completed_at, '')::timestamp with time zone;");

            migrationBuilder.AlterColumn<DateTime>(
                name: "refresh_token_expiry_time",
                table: "users",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "renews_at",
                table: "user_credits",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "plan_started_at",
                table: "user_credits",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "connected_at",
                table: "user_connections",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "completed_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "refresh_token_expiry_time",
                table: "users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "renews_at",
                table: "user_credits",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "plan_started_at",
                table: "user_credits",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "connected_at",
                table: "user_connections",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "created_at",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "completed_at",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);
        }
    }
}
