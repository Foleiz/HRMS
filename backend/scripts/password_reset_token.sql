-- =============================================================================
-- Migration: Password Reset Token Table (Self-Service Password Reset)
-- =============================================================================

CREATE TABLE IF NOT EXISTS hrms.password_reset_token (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_account_id BIGINT NOT NULL REFERENCES hrms.user_account(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_token ON hrms.password_reset_token(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_user_id ON hrms.password_reset_token(user_account_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_otp ON hrms.password_reset_token(user_account_id, otp_code);
