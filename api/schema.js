/* GET /api/schema
   노션 DB가 실제로 어떤 속성을 갖고 있는지 그대로 보여주는 진단용 주소입니다.
   브라우저에서 https://(내주소)/api/schema 를 열면 됩니다.
   연동이 안 될 때 어디가 어긋났는지 확인할 때 쓰세요. */

import { CFG, notion, dbProps, requireToken, fail } from "./_notion.js";

const summarize = (props) =>
  Object.entries(props).map(([name, v]) => ({
    name,
    type: v.type,
    ...(v.type === "select" || v.type === "status"
      ? { options: (v[v.type]?.options || []).map((o) => o.name) }
      : {}),
    ...(v.type === "multi_select"
      ? { options: (v.multi_select?.options || []).map((o) => o.name) }
      : {}),
  }));

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET만 지원합니다." });
  if (!requireToken(res)) return;

  try {
    const [habits, logs] = await Promise.all([dbProps(CFG.habitsDb), dbProps(CFG.logsDb)]);

    /* 편지 DB는 없을 수도 있으므로 실패해도 전체를 막지 않습니다 */
    let 편지DB = { 상태: "찾지 못함 — 노션에 '응원 편지' DB를 만들고 Integration에 연결해주세요" };
    try {
      let mid = CFG.messagesDb;
      if (!mid) {
        const r = await notion("/search", { method: "POST", body: { filter: { value: "database", property: "object" }, page_size: 100 } });
        const hit = (r.results || []).find((d) => /편지|응원|letter|message/i.test((d.title || []).map((t) => t.plain_text).join("")));
        if (hit) mid = hit.id;
      }
      if (mid) 편지DB = { id: mid, 속성: summarize(await dbProps(mid)) };
    } catch (e) { 편지DB = { 상태: "확인 실패: " + e.message }; }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      습관DB: { id: CFG.habitsDb, 속성: summarize(habits) },
      기록DB: { id: CFG.logsDb, 속성: summarize(logs) },
      편지DB,
      설정: {
        NOTION_ME: process.env.NOTION_ME || "(미설정 → 기본값 '초록')",
        NOTION_OWNER_PROP: process.env.NOTION_OWNER_PROP || "(미설정 → 자동 탐색)",
        NOTION_MESSAGES_DB: process.env.NOTION_MESSAGES_DB || "(미설정 → 제목으로 자동 탐색)",
      },
    });
  } catch (e) {
    fail(res, e);
  }
}
