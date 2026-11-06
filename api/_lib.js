import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";

let sqlClient = null;
let schemaReady = null;

export function sql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

// テーブルが無ければ作る（初回アクセス時に一度だけ）
export function ensureSchema() {
  if (!schemaReady) {
    const db = sql();
    schemaReady = (async () => {
      await db`
        create table if not exists videos (
          date      date primary key,
          weekday   text,
          theme     text,
          accent    text,
          title     text not null,
          channel   text,
          url       text not null,
          duration  text,
          reason    text,
          phrases   jsonb not null default '[]'::jsonb,
          tip       text,
          updated_at timestamptz not null default now()
        )`;
      await db`
        create table if not exists practice (
          date      date primary key,
          done      boolean not null default false,
          updated_at timestamptz not null default now()
        )`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

// data/videos.json（毎朝GitHubに追加される）をNeonに取り込む
export async function syncVideos() {
  let list = [];
  try {
    list = JSON.parse(readFileSync(join(process.cwd(), "data", "videos.json"), "utf8"));
  } catch {
    return;
  }
  const valid = list.filter(
    (v) => v && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && v.title && isYouTube(v.url)
  );
  if (!valid.length) return;
  await sql()`
    insert into videos (date, weekday, theme, accent, title, channel, url, duration, reason, phrases, tip)
    select date, weekday, theme, accent, title, channel, url, duration, reason, coalesce(phrases, '[]'::jsonb), tip
    from jsonb_to_recordset(${JSON.stringify(valid)}::jsonb) as x(
      date date, weekday text, theme text, accent text, title text, channel text,
      url text, duration text, reason text, phrases jsonb, tip text)
    on conflict (date) do update set
      weekday = excluded.weekday, theme = excluded.theme, accent = excluded.accent,
      title = excluded.title, channel = excluded.channel, url = excluded.url,
      duration = excluded.duration, reason = excluded.reason, phrases = excluded.phrases,
      tip = excluded.tip, updated_at = now()
    where (videos.title, videos.url, videos.reason, videos.tip, videos.phrases)
      is distinct from (excluded.title, excluded.url, excluded.reason, excluded.tip, excluded.phrases)`;
}

export function isYouTube(u) {
  return typeof u === "string" && /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(u);
}

// 合言葉チェック（APP_PASSCODE が未設定なら誰でも利用可）
export function checkPasscode(req, res) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return true;
  const given = String(req.headers["x-passcode"] || "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a, b)) return true;
  res.status(401).json({ error: "passcode" });
  return false;
}

export function fail(res, e) {
  console.error(e);
  const msg = String(e && e.message || e);
  res.status(500).json({ error: msg.includes("DATABASE_URL") ? "no_database" : "server" });
}
