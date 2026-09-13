ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE app_settings ADD PRIMARY KEY (company_id, key);
CREATE INDEX IF NOT EXISTS idx_app_settings_company_key ON app_settings(company_id, key);
