/* /api/notes — 습관 메모 (날짜 + 습관마다 하나)

   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD  →  { notes: [{ id, date, habitId, text }] }
   PUT  { habitId, date, text }         →  저장 (있으면 고치고, 없으면 만들고, 비우면 보관 처리)

   메모는 '체크 기록'과 따로 둡니다 — 기록 DB는 행이 있으면 체크한 날이라,
   체크하지 않은 날의 메모("오늘은 야근이라 못 함")도 남길 수 있도록. */

import { CFG, notion, queryAll, dbProps, findProp, requireToken, fail } from "./_notion.js";

let cached = null;
async function noteProps() {
  if (cached) return cached;
  const props = await dbProps(CFG.notesDb);
  const used = new Set();
  const pText = findProp(props, ["메모", "내용", "Note", "Memo"], "title", used);
  const pDate = findProp(props, ["날짜", "Date"], "date", used);
  const pHabit = findProp(props, ["습관", "Habit", "Habits"], "relation", used);
  if (!pText || !pDate || !pHabit) {
    const e = new Error("메모 DB에서 메모(제목)·날짜·습관(relation) 속성을 찾지 못했습니다.");
    e.status = 500;
    e.hint = `현재 DB의 속성: ${Object.keys(props).join(", ") || "(없음)"}`;
    throw e;
  }
  cached = { pText, pDate, pHabit };
  return cached;
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const plain = (rich) => (rich || []).map((t) => t.plain_text).join("");

export default async function handler(req, res) {
  if (!requireToken(res)) return;
  try {
    const P = await noteProps();

    if (req.method === "GET") {
      const { from, to } = req.query || {};
      const and = [];
      if (isDate(from)) and.push({ property: P.pDate, date: { on_or_after: from } });
      if (isDate(to)) and.push({ property: P.pDate, date: { on_or_before: to } });
      const rows = await queryAll(CFG.notesDb, and.length ? { filter: { and } } : {});
      const notes = rows
        .map((page) => {
          const p = page.properties || {};
          return {
            id: page.id,
            date: p[P.pDate]?.date?.start?.slice(0, 10) || "",
            habitId: p[P.pHabit]?.relation?.[0]?.id || "",
            text: plain(p[P.pText]?.title),
          };
        })
        .filter((n) => n.date && n.habitId && n.text.trim());
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ notes });
    }

    if (req.method === "PUT") {
      const b = req.body && typeof req.body === "object" ? req.body : {};
      const habitId = b.habitId, date = b.date, text = String(b.text || "").trim().slice(0, 1000);
      if (!habitId || !isDate(date)) return res.status(400).json({ error: "habitId와 date(YYYY-MM-DD)가 필요합니다." });

      const existing = await queryAll(CFG.notesDb, {
        filter: { and: [
          { property: P.pDate, date: { equals: date } },
          { property: P.pHabit, relation: { contains: habitId } },
        ] },
      });

      if (!text) {   // 비우면 보관 처리 (노션 API엔 영구 삭제가 없음)
        for (const row of existing) await notion(`/pages/${row.id}`, { method: "PATCH", body: { archived: true } });
        return res.status(200).json({ ok: true, deleted: existing.length });
      }
      const title = { [P.pText]: { title: [{ text: { content: text } }] } };
      if (existing.length) {
        await notion(`/pages/${existing[0].id}`, { method: "PATCH", body: { properties: title } });
        for (const extra of existing.slice(1)) await notion(`/pages/${extra.id}`, { method: "PATCH", body: { archived: true } });
        return res.status(200).json({ ok: true, id: existing[0].id });
      }
      const page = await notion("/pages", {
        method: "POST",
        body: {
          parent: { database_id: CFG.notesDb },
          properties: { ...title, [P.pDate]: { date: { start: date } }, [P.pHabit]: { relation: [{ id: habitId }] } },
        },
      });
      return res.status(200).json({ ok: true, id: page.id });
    }

    res.status(405).json({ error: "GET, PUT만 지원합니다." });
  } catch (e) {
    fail(res, e);
  }
}
