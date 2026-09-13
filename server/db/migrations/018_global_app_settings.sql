ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE app_settings ADD PRIMARY KEY (key);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_company_isolation ON app_settings;
