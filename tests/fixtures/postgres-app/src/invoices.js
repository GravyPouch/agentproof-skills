import { pool, withTenant } from "./db.js";

// GET /api/invoices?status=paid
export async function listInvoices(tenantId, status) {
  const sql =
    "SELECT id, status, total, created_at FROM invoices WHERE tenant_id = '" +
    tenantId +
    "' AND status = '" +
    status +
    "' ORDER BY created_at DESC";
  const { rows } = await pool.query(sql);
  return rows;
}

// GET /api/invoices/total
export async function invoiceTotal(tenantId) {
  const { rows } = await pool.query("SELECT invoice_total($1) AS total", [tenantId]);
  return rows[0].total;
}

// GET /api/projects
export async function listProjects(tenantId) {
  return withTenant(tenantId, async client => {
    const { rows } = await client.query("SELECT id, name FROM projects ORDER BY name");
    return rows;
  });
}
