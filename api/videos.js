import { sql, ensureSchema, syncVideos, checkPasscode, fail } from "./_lib.js";

// GET /api/videos → 動画一覧（新しい順）と練習記録
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  if (!checkPasscode(req, res)) return;
  try {
    await ensureSchema();
    await syncVideos();
    const rows = await sql()`
      select to_char(v.date, 'YYYY-MM-DD') as date, v.weekday, v.theme, v.accent, v.title,
             v.channel, v.url, v.duration, v.reason, v.phrases, v.tip,
             coalesce(p.done, false) as done
      from videos v left join practice p on p.date = v.date
      order by v.date desc
      limit 500`;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ videos: rows });
  } catch (e) {
    fail(res, e);
  }
}
