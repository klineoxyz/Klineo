-- Store encrypted exchange credentials as base64 TEXT to avoid bytea
-- serialization issues with Supabase/PostgREST (Buffer/bytea in JSON).
-- Read encrypted_config_b64 first; fallback to encrypted_config (bytea) for legacy rows.

ALTER TABLE public.user_exchange_connections
  ADD COLUMN IF NOT EXISTS encrypted_config_b64 TEXT;

COMMENT ON COLUMN public.user_exchange_connections.encrypted_config_b64 IS 'Base64-encoded encrypted API credentials; preferred over encrypted_config bytea for reliable read/write via PostgREST';
