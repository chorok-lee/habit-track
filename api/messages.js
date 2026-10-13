/* /api/messages — 별똥별 편지 (서로에게 보내는 응원 메시지)

   GET    ?to=이름            →  { messages:[{id,text,from,to,date,read}], db }
   POST   { from, to, text }  →  편지 보내기
   PATCH  { id }              →  읽음 처리

   저장할 노션 DB는 NOTION_MESSAGES_DB 환경변수로 지정하거나,
   지정하지 않으면 제목에 '편지·응원·letter·message'가 들어간 DB를 찾아 씁니다. */

import { CFG, notion, queryAll, dbProps, byName, requireToken, readText, fail } from "./_notion.js";

let dbId = null, P = null;

async function findDb() {
  if (CFG.messagesDb) return CFG.messagesDb;
  if (dbId) return dbId;
  const r = await notion("/search", {
    method: "POST",
    body: { filter: { value: "database", property: "object" }, page_size: 100 },
  });
  const hit = (r.results || []).find((d) =>
    /편지|응원|letter|message/i.test((d.title || []).map((t) => t.plain_text).join(""))
  );
  if (!hit) {
    const e = new Error("응원 편지를 저장할 노션 데이터베이스를 찾지 못했습니다.");
    e.status = 404;
    e.hint = "노션에 '응원 편지' 데이터베이스를 만들고 Integration에 연결하거나, Vercel에 NOTION_MESSAGES_DB를 등록해주세요.";
    throw e;
  }
  dbId = hit.id;
  return dbId;
}

async function props(id) {
  if (P) return P;
  const p = await dbProps(id);
  const used = new Set();
  /* 내용을 담는 속성 — title일 수도, 그냥 텍스트일 수도 있습니다 (예: '메시지' 텍스트 칸) */
  const pText = byName(p, ["메시지", "내용", "편지", "Message", "Content", "이름", "Name"], ["title", "rich_text"], used)
             || Object.keys(p).find((k) => p[k].type === "title");
  /* 받는사람 — '대상' 하나로 받는사람을 고르는 구성도 지원합니다 */
  const pTo   = byName(p, ["대상", "받는사람", "받는이", "수신", "To", "Receiver", "Target"], ["select", "status", "rich_text", "people"], used);
  /* 보낸사람 칸은 없어도 됩니다. 2인용 앱이라, 없으면 '대상'의 반대쪽 옵션으로 유추합니다 */
  const pFrom = byName(p, ["보낸사람", "보낸이", "발신", "From", "Sender"], ["select", "status", "rich_text", "people"], used);
  const pDate = byName(p, ["보낸날짜", "날짜", "Date", "Sent"], ["date"], used);
  const pRead = byName(p, ["읽음", "확인", "Read"], ["checkbox"], used);

  if (!pText || !pTo) {
    const e = new Error("편지 DB에서 내용·대상(받는사람) 속성을 찾지 못했습니다.");
    e.status = 500;
    e.hint = `현재 DB의 속성: ${Object.keys(p).join(", ") || "(없음)"}`;
    throw e;
  }
  P = { pText, pFrom, pTo, pDate, pRead };
  return P;
}

/* 이름 값을 그 속성 타입에 맞는 형태로 */
function nameValue(type, v) {
  if (type === "select") return { select: { name: v } };
  if (type === "status") return { status: { name: v } };
  if (type === "rich_text") return { rich_text: [{ text: { content: v } }] };
  return { rich_text: [{ text: { content: v } }] };
}

/* 내용 값을 그 속성 타입(title/rich_text)에 맞는 형태로 */
function textValue(type, v) {
  if (type === "title") return { title: [{ text: { content: v } }] };
  return { rich_text: [{ text: { content: v } }] };
}

/* 보낸사람 칸이 없을 때: '대상' 속성의 선택지 중 받는사람이 아닌 쪽을 발신자로 봅니다
   (예: 대상 옵션이 초록/소운 둘 뿐이면, 대상=소운인 편지의 보낸사람은 자동으로 초록) */
function guessFrom(db, pTo, to) {
  const t = db[pTo]?.type;
  const options = t === "select" ? db[pTo]?.select?.options
                : t === "status" ? db[pTo]?.status?.options
                : t === "multi_select" ? db[pTo]?.multi_select?.options
                : null;
  if (!options) return "";
  const others = options.map((o) => o.name).filter((n) => n !== to);
  return others.length === 1 ? others[0] : "";
}

export default async function handler(req, res) {
  if (!requireToken(res)) return;

  try {
    const id = await findDb();
    const db = await dbProps(id);
    const p = await props(id);

    /* ── 받은 편지 ── */
    if (req.method === "GET") {
      const to = (req.query && req.query.to) || CFG.me;
      const rows = await queryAll(id, {
        ...(db[p.pTo].type === "select" || db[p.pTo].type === "status"
          ? { filter: { property: p.pTo, [db[p.pTo].type]: { equals: to } } }
          : {}),
        ...(p.pDate ? { sorts: [{ property: p.pDate, direction: "descending" }] } : {}),
      });

      const messages = rows
        .map((page) => {
          const pr = page.properties || {};
          const toVal = readText(pr[p.pTo]);
          return {
            id: page.id,
            text: readText(pr[p.pText]),
            from: p.pFrom ? readText(pr[p.pFrom]) : guessFrom(db, p.pTo, toVal || to),
            to: toVal,
            date: (p.pDate && pr[p.pDate]?.date?.start) || (page.created_time || "").slice(0, 10),
            read: p.pRead ? !!pr[p.pRead]?.checkbox : false,
          };
        })
        .filter((m) => m.text && (!m.to || m.to === to))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30);

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ messages, canRead: !!p.pRead });
    }

    /* ── 보내기 ── */
    if (req.method === "POST") {
      const b = req.body && typeof req.body === "object" ? req.body : {};
      const text = String(b.text || "").trim().slice(0, 300);
      const from = String(b.from || "").trim();
      const to = String(b.to || "").trim();
      if (!text) return res.status(400).json({ error: "보낼 내용을 입력해주세요." });
      if (!from || !to) return res.status(400).json({ error: "보낸사람과 받는사람이 필요합니다." });

      const properties = {
        [p.pText]: textValue(db[p.pText].type, text),
        [p.pTo]: nameValue(db[p.pTo].type, to),
      };
      /* 보낸사람 칸이 있을 때만 씁니다 — '대상' 하나로만 구성된 DB에서는 건너뜁니다 */
      if (p.pFrom) properties[p.pFrom] = nameValue(db[p.pFrom].type, from);
      if (p.pDate) properties[p.pDate] = { date: { start: new Date().toISOString().slice(0, 10) } };
      if (p.pRead) properties[p.pRead] = { checkbox: false };

      await notion("/pages", { method: "POST", body: { parent: { database_id: id }, properties } });
      return res.status(200).json({ ok: true });
    }

    /* ── 읽음 처리 ── */
    if (req.method === "PATCH") {
      const b = req.body && typeof req.body === "object" ? req.body : {};
      if (!b.id) return res.status(400).json({ error: "id가 필요합니다." });
      if (!p.pRead) return res.status(200).json({ ok: true, skipped: "읽음 속성이 없어 건너뜀" });
      await notion(`/pages/${b.id}`, { method: "PATCH", body: { properties: { [p.pRead]: { checkbox: true } } } });
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: "GET, POST, PATCH만 지원합니다." });
  } catch (e) {
    fail(res, e);
  }
}
