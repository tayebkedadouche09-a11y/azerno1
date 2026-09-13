-- Non-superuser runtime role for application connections (cannot bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'azrnou_app') THEN
    CREATE ROLE azrnou_app LOGIN PASSWORD 'azrnou_app_change_me' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  ELSE
    ALTER ROLE azrnou_app NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- GRANT CONNECT requires a concrete database name (CURRENT_DATABASE() is invalid syntax here)
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO azrnou_app', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO azrnou_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO azrnou_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO azrnou_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO azrnou_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO azrnou_app;
