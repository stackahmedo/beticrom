-- Migration 0001: Core Authentication, RBAC, Audit Logs, Settings & Durable Background Jobs
-- Non-destructive, idempotent PostgreSQL 16+ schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified timestamp update trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USERS, SESSIONS, MFA & PASSWORD RECOVERY
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id UUID UNIQUE, -- Optional link to Supabase auth.users.id
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,           -- scrypt hash when using standalone auth
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'EN',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_mfa_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  backup_codes_hash JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. GRANULAR RBAC (ROLES, PERMISSIONS, MAPPINGS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- e.g. 'orders.read', 'orders.update', 'refunds.create'
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions (module);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role_id);

-- Protect the final active Super Admin from accidental deletion or privilege removal
CREATE OR REPLACE FUNCTION prevent_last_super_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_super_role_id UUID;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_super_role_id FROM roles WHERE slug = 'super_admin' LIMIT 1;
  IF v_super_role_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'user_roles' THEN
    IF OLD.role_id = v_super_role_id THEN
      SELECT COUNT(*) INTO v_remaining_count
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.role_id = v_super_role_id
        AND ur.user_id <> OLD.user_id
        AND u.status = 'active'
        AND u.deleted_at IS NULL;

      IF v_remaining_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove super_admin role from the last active Super Admin account';
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_TABLE_NAME = 'users' THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = OLD.id AND role_id = v_super_role_id) THEN
      IF TG_OP = 'DELETE' OR NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL THEN
        SELECT COUNT(*) INTO v_remaining_count
        FROM user_roles ur
        JOIN users u ON u.id = ur.user_id
        WHERE ur.role_id = v_super_role_id
          AND ur.user_id <> OLD.id
          AND u.status = 'active'
          AND u.deleted_at IS NULL;

        IF v_remaining_count = 0 THEN
          RAISE EXCEPTION 'Cannot deactivate or delete the last active Super Admin account';
        END IF;
      END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_last_super_admin_role ON user_roles;
CREATE TRIGGER trg_protect_last_super_admin_role
BEFORE DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION prevent_last_super_admin_removal();

DROP TRIGGER IF EXISTS trg_protect_last_super_admin_user ON users;
CREATE TRIGGER trg_protect_last_super_admin_user
BEFORE UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_last_super_admin_removal();

-- ============================================================================
-- 3. IMMUTABLE AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,         -- e.g. 'product.updated', 'order.status_changed', 'role.deleted'
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);

-- ============================================================================
-- 4. CONFIGURABLE STORE SETTINGS & FEATURE FLAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'general', 'seo', 'payment', 'email', 'shipping', 'order', 'return', 'notifications', 'integrations', 'feature_flags'
  value JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_settings_category ON store_settings (category);

-- ============================================================================
-- 5. DURABLE BACKGROUND JOB QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'product_import', 'product_export', 'bulk_product_update', 'email_dispatch', 'report_export'
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_queue ON background_jobs (status, run_after) WHERE status IN ('queued', 'running');
