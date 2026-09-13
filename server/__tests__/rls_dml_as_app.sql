-- Full DML isolation proof under azrnou_app (FORCE RLS + app.company_id)
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'azrnou_app') THEN
    RAISE EXCEPTION 'azrnou_app missing';
  END IF;
  IF (SELECT rolsuper FROM pg_roles WHERE rolname = 'azrnou_app') THEN
    RAISE EXCEPTION 'azrnou_app must not be superuser';
  END IF;
END $$;

DO $$
DECLARE
  ca UUID;
  cb UUID;
  cust_a UUID;
  cust_b UUID;
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO companies(name, slug) VALUES ('DML A', 'dml-a-' || substr(md5(random()::text),1,8)) RETURNING id INTO ca;
  INSERT INTO companies(name, slug) VALUES ('DML B', 'dml-b-' || substr(md5(random()::text),1,8)) RETURNING id INTO cb;
  INSERT INTO customers(name, company_id) VALUES ('A1', ca) RETURNING id INTO cust_a;
  INSERT INTO customers(name, company_id) VALUES ('B1', cb) RETURNING id INTO cust_b;
  PERFORM set_config('app.test_ca', ca::text, false);
  PERFORM set_config('app.test_cb', cb::text, false);
  PERFORM set_config('app.test_cust_a', cust_a::text, false);
  PERFORM set_config('app.test_cust_b', cust_b::text, false);
END $$;

SET ROLE azrnou_app;

DO $$
DECLARE
  ca UUID := current_setting('app.test_ca')::uuid;
  cb UUID := current_setting('app.test_cb')::uuid;
  cust_a UUID := current_setting('app.test_cust_a')::uuid;
  cust_b UUID := current_setting('app.test_cust_b')::uuid;
  n int;
  new_id UUID;
BEGIN
  PERFORM set_config('app.company_id', ca::text, true);

  SELECT COUNT(*) INTO n FROM customers WHERE id = cust_a;
  IF n <> 1 THEN RAISE EXCEPTION 'A cannot SELECT own customer'; END IF;

  SELECT COUNT(*) INTO n FROM customers WHERE id = cust_b;
  IF n <> 0 THEN RAISE EXCEPTION 'A can SELECT B customer (RLS leak)'; END IF;

  INSERT INTO customers(name, company_id) VALUES ('A2', ca) RETURNING id INTO new_id;
  IF new_id IS NULL THEN RAISE EXCEPTION 'A INSERT own failed'; END IF;

  BEGIN
    INSERT INTO customers(name, company_id) VALUES ('evil', cb);
    RAISE EXCEPTION 'A INSERT into B should fail';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR not_null_violation THEN NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%A INSERT into B%' THEN RAISE; END IF;
  END;

  UPDATE customers SET name = 'A1-updated' WHERE id = cust_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A UPDATE own failed'; END IF;

  UPDATE customers SET name = 'hack' WHERE id = cust_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'A UPDATE B succeeded (leak)'; END IF;

  PERFORM set_config('app.company_id', cb::text, true);
  SELECT COUNT(*) INTO n FROM customers WHERE id = cust_b;
  IF n <> 1 THEN RAISE EXCEPTION 'B cannot SELECT own'; END IF;
  SELECT COUNT(*) INTO n FROM customers WHERE id = cust_a;
  IF n <> 0 THEN RAISE EXCEPTION 'B can SELECT A (leak)'; END IF;

  RAISE NOTICE 'RLS DML as azrnou_app OK for customers';
END $$;

RESET ROLE;
