/* GET /api/habits
   →  { habits: [{ id, name, kind, target, emoji, color, owner }], me, owners, ownerProp }

   노션 Habits DB에서 '활성'이 켜진 습관을 소유자 정보와 함께 가져옵니다. */

import { CFG, queryAll, dbProps, byName, byType, readText, requireToken, fail } from "./_notion.js";

/* "매일" → 매일 7회 / "주3회" → 주 3회 */
export function parseFreq(label) {
  const s = String(label || "").trim();
  if (/매일|daily/i.test(s)) return { kind: "daily", target: 7 };
  const m = s.match(/(\d+)\s*회/) || s.match(/^\s*(\d+)\s*$/);
  if (m) return { kind: "weekly", target: Math.max(1, Math.min(7, Number(m[1]))) };
  return { kind: "daily", target: 7 };
}

const plain = (rich) => (rich || []).map((t) => t.plain_text).join("").trim();

/* 소유자 속성 후보 이름. NOTION_OWNER_PROP 환경변수로 직접 지정할 수도 있습니다. */
const OWNER_NAMES = ["소유자", "담당자", "주인", "사람", "멤버", "이름표", "Owner", "Person", "Member", "Who"];
const OWNER_TYPES = ["select", "status", "multi_select", "people", "rich_text", "formula"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET만 지원합니다." });
  if (!requireToken(res)) return;

  try {
    const props = await dbProps(CFG.habitsDb);
    const used = new Set();
    const forced = process.env.NOTION_OWNER_PROP;

    /* 1단계 — 이름이 정확히 맞는 것부터 전부 확정 */
    if (forced && props[forced]) used.add(forced);
    let pOwner  = forced && props[forced] ? forced : byName(props, OWNER_NAMES, OWNER_TYPES, used);
    let pTitle  = byName(props, ["이름", "Name", "제목"], ["title"], used);
    const pActive = byName(props, ["활성", "Active", "사용"], ["checkbox"], used)
                 || byType(props, ["checkbox"], used);
    let pFreq   = byName(props, ["목표 빈도", "목표빈도", "빈도", "Frequency"], ["select"], used);
    const pColor  = byName(props, ["색상", "Color"], ["select"], used);   // 이름이 맞을 때만

    /* 2단계 — 그래도 못 찾은 필수 항목만 타입으로 추측 (남은 속성 중에서) */
    if (!pTitle) pTitle = byType(props, ["title"], used);
    if (!pOwner) pOwner = byType(props, OWNER_TYPES, used);
    if (!pFreq)  pFreq  = byType(props, ["select"], used);

    if (!pTitle) {
      return res.status(500).json({
        error: "습관 DB에서 제목(title) 속성을 찾지 못했습니다.",
        hint: `현재 DB의 속성: ${Object.keys(props).join(", ") || "(없음)"}`,
      });
    }

    const rows = await queryAll(CFG.habitsDb, {
      ...(pActive ? { filter: { property: pActive, checkbox: { equals: true } } } : {}),
    });

    const habits = rows.map((page) => {
      const p = page.properties || {};
      const freq = parseFreq(pFreq ? p[pFreq]?.select?.name : "");
      return {
        id: page.id,
        name: plain(p[pTitle]?.title) || "(이름 없음)",
        /* 노션 페이지 아이콘이 있으면 그걸 쓰고, 없으면 빈 값으로 두어
           화면에서 습관 이름에 맞는 이모지를 골라 쓰도록 합니다. */
        emoji: page.icon?.type === "emoji" ? page.icon.emoji : "",
        color: pColor ? p[pColor]?.select?.name || "" : "",
        owner: pOwner ? readText(p[pOwner]) : "",
        ...freq,
      };
    });

    /* DB에 등장하는 소유자 목록 (순서 유지) */
    const owners = [...new Set(habits.map((h) => h.owner).filter(Boolean))];

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      habits,
      me: process.env.NOTION_ME || "초록",
      owners,
      ownerProp: pOwner || null,
      allProps: pOwner ? undefined : Object.keys(props), // 소유자를 못 찾았을 때만 진단용으로
    });
  } catch (e) {
    fail(res, e);
  }
}
