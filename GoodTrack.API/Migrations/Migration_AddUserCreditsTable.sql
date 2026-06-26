-- Migration: Create user_credits table and map relationships/indexes (snake_case)

CREATE TABLE IF NOT EXISTS user_credits (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    credits INTEGER NOT NULL,
    plan_started_at TEXT NOT NULL,
    renews_at TEXT NOT NULL,
    CONSTRAINT pk_user_credits PRIMARY KEY (id),
    CONSTRAINT fk_user_credits_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Unique index to prevent duplicate credit entries per user
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_credits_user_id ON user_credits (user_id);
