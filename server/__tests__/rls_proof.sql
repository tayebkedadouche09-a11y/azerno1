-- AZRNOU RLS / isolation proof (run after migrations 001-023)
\set ON_ERROR_STOP on

DO $$
DECLARE
  is_super boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'azrnou_app') THEN
    RAISE NOTICE 'azrnou_app missing — migration 023 may not have applied; soft skip role checks';
  ELSE
    SELECT rolsuper INTO is_super FROM pg_roles WHERE rolname = 'azrnou_app';
    IF is_super THEN
      RAISE EXCEPTION 'azrnou_app must NOT be superuser';
    END IF;
    RAISE NOTICE 'azrnou_app exists and is_not_superuser OK';
  END IF;
END $$;

DO $$
DECLARE
  ca UUID;
  cb UUID;
  cust_a UUID;
  cust_b UUID;
  leak int;
BEGIN
  INSERT INTO companies(name, slug)
  VALUES ('Proof Co A', 'proof-a-' || substr(md5(random()::text), 1, 10))
  RETURNING id INTO ca;
  INSERT INTO companies(name, slug)
  VALUES ('Proof Co B', 'proof-b-' || substr(md5(random()::text), 1, 10))
  RETURNING id INTO cb;

  INSERT INTO customers(name, company_id) VALUES ('Cust A', ca) RETURNING id INTO cust_a;
  INSERT INTO customers(name, company_id) VALUES ('Cust B', cb) RETURNING id INTO cust_b;

  SELECT COUNT(*) INTO leak FROM customers WHERE id = cust_b AND company_id = ca;
  IF leak <> 0 THEN
    RAISE EXCEPTION 'cross-company customer leak A->B';
  END IF;

  SELECT COUNT(*) INTO leak FROM customers WHERE id = cust_a AND company_id = cb;
  IF leak <> 0 THEN
    RAISE EXCEPTION 'cross-company customer leak B->A';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = cust_a AND company_id = ca) THEN
    RAISE EXCEPTION 'company A cannot see its customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = cust_b AND company_id = cb) THEN
    RAISE EXCEPTION 'company B cannot see its customer';
  END IF;

  RAISE NOTICE 'two-company customer isolation OK (%, %)', ca, cb;
END $$;

SELECT c.relname AS table_name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'customers','orders','payments','product_variants','purchases','expenses',
    'deliveries','invoices','audit_logs'
  )
ORDER BY 1;
