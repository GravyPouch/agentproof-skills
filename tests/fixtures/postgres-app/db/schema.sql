-- Billing schema. Run as the database owner.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE ROLE app_user LOGIN PASSWORD 'change-me' NOSUPERUSER NOBYPASSRLS;

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  name text NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY projects_tenant ON projects
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  status text NOT NULL DEFAULT 'open',
  total numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION invoice_total(p_tenant uuid) RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT coalesce(sum(total), 0) FROM invoices WHERE tenant_id = p_tenant;
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT ON tenants TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects, invoices TO app_user;
