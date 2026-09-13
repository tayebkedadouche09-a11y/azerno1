-- Manual/CI RLS proof (run as superuser after migrations)
DO $$
DECLARE
  ca UUID;
  cb UUID;
  cust UUID;
BEGIN
  INSERT INTO companies(name, slug) VALUES ('RLS A', 'rls-a-' || substr(md5(random()::text),1,8)) RETURNING id INTO ca;
  INSERT INTO companies(name, slug) VALUES ('RLS B', 'rls-b-' || substr(md5(random()::text),1,8)) RETURNING id INTO cb;
  INSERT INTO customers(name, company_id) VALUES ('RLS Cust', ca) RETURNING id INTO cust;
  IF EXISTS (SELECT 1 FROM customers WHERE id = cust AND company_id = cb) THEN
    RAISE EXCEPTION 'cross-company leak';
  END IF;
END $$;
