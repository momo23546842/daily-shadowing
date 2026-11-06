import { sql, ensureSchema, checkPasscode, fail } from "./_lib.js";

// POST /api/practice  { "date": "YYYY-MM-DD", "done": true }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!checkPasscode(req, res)) return;
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const date = body && body.date;
  const done = body && body.done;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || typeof done !== "boolean") {
    return res.status(400).json({ error: "bad_request" });
  }
  try {
    await ensureSchema();
    await sql()`
      insert into practice (date, done) values (${date}::date, ${done})
      on conflict (date) do update set done = excluded.done, updated_at = now()`;
    res.status(200).json({ ok: true, date, done });
  } catch (e) {
    fail(res, e);
  }
}
