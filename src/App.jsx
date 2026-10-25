import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { guessEmoji } from "../api/_emoji.js";

/* ────────────────────────────────────────────────────────────
   습관 별자리 — 1인 1별자리 구조
   별 1개 = 습관 1개. 별의 밝기 = 주간 달성률(0→1).
   별들이 하나로 이어진 별자리. 전체 달성 시 폭발 광채.
   나 / 소운 전환 스위치.
──────────────────────────────────────────────────────────── */

const GREEN  = "#FFE08A";   // 초록 — 별빛 옐로 (Primary와 같은 색)
const VIOLET = "#C8A6FF";   // 소운 — 라벤더
const HABITS_VERSION = 2;

const DEFAULT_HABITS = [
  { id:"sleep",  name:"11시 취침",           kind:"daily",  target:7, emoji:"🌙" },
  { id:"wake",   name:"7시 기상",             kind:"daily",  target:7, emoji:"☀️" },
  { id:"eng",    name:"30분 영어 공부",        kind:"weekly", target:3, emoji:"💬" },
  { id:"folio",  name:"포트폴리오 케이스 1개", kind:"weekly", target:1, emoji:"🎨" },
  { id:"search", name:"기업 1곳 딥다이브",     kind:"weekly", target:1, emoji:"🔍" },
  { id:"move",   name:"30분 운동",             kind:"weekly", target:3, emoji:"🏃" },
];

const FRIEND_HABITS = [
  { id:"sleep",   name:"11시 취침",  kind:"daily",  target:7, emoji:"🌙", done:5 },
  { id:"wake",    name:"7시 기상",   kind:"daily",  target:7, emoji:"☀️", done:6 },
  { id:"eng",     name:"영어 공부",  kind:"weekly", target:3, emoji:"💬", done:3 },
  { id:"f_med",   name:"명상",       kind:"weekly", target:5, emoji:"🧘", done:5 },
  { id:"f_write", name:"글쓰기",     kind:"weekly", target:2, emoji:"✍️", done:1 },
  { id:"move",    name:"30분 운동",  kind:"weekly", target:3, emoji:"🏃", done:3 },
];

/* 노션 연결 전(로컬 모드)에 쓰는 이름. 노션 모드에서는 DB의 소유자 값으로 대체됩니다. */
const DEMO_ME_NAME = "초록";
const DEMO_FRIEND_NAME = "소운";

/* 습관 이모지 — 노션 페이지 아이콘이 기준. 서버가 아이콘이 빈 습관에 이름에 맞는 이모지를 넣어두고,
   노션에서 아이콘을 바꾸면 그대로 따라갑니다. 여기선 로컬 모드·아이콘이 이미지인 경우의 대체값. */
const emojiOf = (h) => h.emoji || guessEmoji(h.name) || "⭐";
const hasBatchim = (s) => { const c=s.charCodeAt(s.length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0; };
/* 받침 있으면 '으로'(ㄹ 받침은 '로'), 없으면 '로' — 초록으로, 소운으로 */
const withRo = (n) => { const c=n.charCodeAt(n.length-1); if(c<0xAC00||c>0xD7A3) return `${n}(으)로`;
  const jong=(c-0xAC00)%28; return `${n}${jong===0||jong===8?"로":"으로"}`; };
const subjName = (n) => hasBatchim(n) ? `${n}이가` : `${n}가`;   // 초록 → 초록이가, 소운 → 소운이가
const tgtOf = (h) => h.kind==="daily" ? 7 : h.target;
/* 주 7회(매일) → 주 1회 순으로, 같은 주기면 가나다순 */
const sortHabits = (list) => [...(list||[])].sort((a,b)=>{
  const ta=tgtOf(a), tb=tgtOf(b);
  if(ta!==tb) return tb-ta;
  return String(a.name||"").localeCompare(String(b.name||""),"ko");
});
function migrateHabits(stored){const ids=DEFAULT_HABITS.map(d=>d.id);return [...DEFAULT_HABITS,...stored.filter(s=>!ids.includes(s.id))];}

/* ── 그래픽 공통 ───────────────────────────────────────────
   별 = 오목한 네 꼭지 반짝임(sparkle) + 부드러운 빛 번짐(halo).
   선 = 별 둘레에서 끊기는 가는 흰 선(성도 스타일). 배경 = 성운 그라데이션. */
const sparklePath=(x,y,R)=>{const k=R*0.16;return `M${x} ${y-R}C${x+k} ${y-k} ${x+k} ${y-k} ${x+R} ${y}C${x+k} ${y+k} ${x+k} ${y+k} ${x} ${y+R}C${x-k} ${y+k} ${x-k} ${y+k} ${x-R} ${y}C${x-k} ${y-k} ${x-k} ${y-k} ${x} ${y-R}Z`;};
const toneKey=(c)=>c===VIOLET?"v":"y";
/* 결정적 의사난수 — 새로고침해도 같은 하늘 */
const rnd=(i,s=1)=>{const a=Math.sin(i*12.9898+s*78.233)*43758.5453;return a-Math.floor(a);};

/* 모든 SVG가 함께 쓰는 정의(빛 번짐·성운 그라데이션·글로우 필터). 앱에 한 번만 둡니다 */
function SkyDefs(){
  return(
    <svg width="0" height="0" style={{position:"absolute"}} aria-hidden="true">
      <defs>
        {[["y",GREEN],["v",VIOLET]].map(([k,c])=>(
          <React.Fragment key={k}>
            <radialGradient id={`halo-${k}`}><stop offset="0" stopColor="#fff" stopOpacity=".9"/>
              <stop offset=".25" stopColor={c} stopOpacity=".55"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>
            <radialGradient id={`neb-${k}`}><stop offset="0" stopColor={c} stopOpacity=".3"/>
              <stop offset=".55" stopColor={c} stopOpacity=".07"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>
          </React.Fragment>
        ))}
        <radialGradient id="neb-warm"><stop offset="0" stopColor="#B07A55" stopOpacity=".22"/>
          <stop offset="1" stopColor="#B07A55" stopOpacity="0"/></radialGradient>
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bokeh" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>
      </defs>
    </svg>
  );
}

/* 별 하나 — 달성률(0→1)에 따라 희미한 점 → 작은 반짝임 → 빛나는 큰 반짝임 */
function GlowStar({x,y,ratio,color,complete,scale=1,twinkle=0}){
  const k=toneKey(color);
  if(ratio<=0) return <circle cx={x} cy={y} r={1.6*scale} fill={color} opacity=".6"/>;
  const R=(complete?10:3.5+ratio*4.5)*scale;
  return(
    <g className={complete&&!reduceMotion?"twk":""} style={complete?{animationDelay:`${twinkle}s`}:undefined}>
      <circle cx={x} cy={y} r={R*(complete?2.6:2)} fill={`url(#halo-${k})`} opacity={complete?.85:.35+ratio*.35}/>
      <path d={sparklePath(x,y,R)} fill={complete?"#FFFFFF":color} opacity={complete?1:.55+ratio*.4} filter="url(#glow)"/>
      {complete&&<circle cx={x} cy={y} r={1.6*scale} fill="#fff"/>}
    </g>
  );
}

/* 별자리 선 — 별 둘레에서 끊기고, 둘 다 빛나면 실선·아니면 점선.
   pairs = [[{s,p},{s,p}], …] 이어줄 별 두 개씩 */
function ConstLines({pairs,scale=1,dim=1}){
  return pairs.map(([a,b],i)=>{
    const dx=b.p.x-a.p.x,dy=b.p.y-a.p.y,L=Math.hypot(dx,dy)||1;
    const gap=(s)=>(s.complete?11:s.ratio>0?7:4)*scale;
    const ga=gap(a.s),gb=gap(b.s); if(L<=ga+gb) return null;
    const lit=a.s.ratio>0&&b.s.ratio>0, both=a.s.complete&&b.s.complete;
    return <line key={i} x1={a.p.x+dx/L*ga} y1={a.p.y+dy/L*ga} x2={b.p.x-dx/L*gb} y2={b.p.y-dy/L*gb}
      stroke="#fff" strokeWidth={(both?1:0.7)*Math.max(.6,scale)} opacity={(both?.7:lit?.45:.28)*dim}
      strokeDasharray={lit?undefined:`${2*scale} ${3*scale}`} strokeLinecap="round"/>;
  });
}

/* 밤하늘 별 — 스플래시에선 남색→보라 하늘째로, 본 화면에선 거의 검은 배경 위 별만 은은하게 */
function NightBG({vivid=false}){
  const stars=useMemo(()=>Array.from({length:90},(_,i)=>({x:rnd(i,1)*100,y:rnd(i,2)*100,r:.5+rnd(i,3)*1.1,o:.25+rnd(i,4)*.6,d:rnd(i,5)*6})),[]);
  return(
    <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
      background:vivid?"linear-gradient(180deg,#040409 0%,#09080F 45%,#15111F 78%,#211A2C 100%)":"transparent"}}>
      <svg width="100%" height="100%" style={{position:"absolute",inset:0}}>
        {stars.map((t,i)=><circle key={i} className={vivid&&i%3===0&&!reduceMotion?"twk":""} cx={`${t.x}%`} cy={`${t.y}%`} r={vivid?t.r:t.r*.75}
          fill="#fff" opacity={vivid?t.o:t.o*.22} style={{animationDelay:`${t.d}s`}}/>)}
      </svg>
    </div>
  );
}

/* 별자리 레이아웃: n개의 별을 자연스러운 별자리 형태로 배치 (중심 기준 상대좌표) */
const LAYOUTS = {
  1: [[0,0]],
  2: [[-36,8],[36,-8]],
  3: [[-38,14],[0,-22],[38,14]],
  4: [[-34,20],[-10,-22],[18,-10],[36,22]],
  5: [[-38,-10],[-16,24],[14,-26],[38,8],[4,24]],
  6: [[-36,16],[-16,-24],[12,26],[36,-10],[20,-28],[-6,4]],
  7: [[-38,8],[-22,-24],[0,26],[20,-20],[38,4],[18,28],[-16,14]],
  8: [[-40,0],[-24,-26],[-6,20],[16,-22],[36,8],[28,30],[6,-4],[-20,26]],
};
/* 9개 이상 — 실제 별자리 모양을 빌려옵니다. 선은 듬성듬성, 가지는 적게 (진짜 성도처럼).
   좌표 범위 x ±48, y ±33. edges = 이어줄 별 번호 쌍 */
const SKY_FIGURES = {
  /* 사자자리 — 꼬리(데네볼라)·몸통 삼각형·머리의 낫 모양 */
  9:{pts:[[-46,6],[-18,-6],[-16,12],[22,16],[24,2],[20,-10],[26,-22],[38,-30],[44,-18]],
     edges:[[0,1],[0,2],[1,2],[1,5],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]},
  /* 쌍둥이자리 — 카스토르·폴룩스 두 몸이 나란히 */
  10:{pts:[[-34,-26],[-16,-30],[-24,-6],[-2,-10],[-12,14],[12,8],[-4,30],[10,32],[28,22],[42,28]],
     edges:[[0,1],[0,2],[2,4],[4,6],[4,7],[1,3],[3,5],[5,8],[5,9],[2,3]]},
  /* 처녀자리 — 길게 뻗은 팔과 스피카 */
  11:{pts:[[-46,-6],[-32,8],[-16,10],[-6,-4],[8,-12],[0,24],[20,-2],[30,-24],[36,-8],[46,-16],[22,14]],
     edges:[[0,1],[1,2],[2,3],[3,4],[4,7],[3,6],[6,8],[8,9],[6,10],[2,5]]},
  /* 황소자리 — 히아데스의 V, 긴 뿔 두 개, 플레이아데스 쪽 등줄기 */
  12:{pts:[[14,10],[4,2],[-8,-8],[-34,-28],[2,18],[-14,14],[-42,-2],[26,-2],[34,-14],[42,-28],[30,20],[44,28]],
     edges:[[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[0,7],[7,8],[8,9],[7,10],[10,11]]},
  /* 큰곰자리 — 북두칠성 국자 + 머리 + 다리 */
  13:{pts:[[-46,-20],[-34,-26],[-22,-22],[-10,-14],[-6,2],[14,2],[12,-16],[28,-24],[44,-18],[-14,18],[-24,30],[24,18],[36,28]],
     edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3],[6,7],[7,8],[4,9],[9,10],[5,11],[11,12]]},
  /* 오리온자리 — 어깨·허리띠 세 별·발, 몽둥이와 방패 */
  14:{pts:[[-14,-20],[12,-18],[-2,-32],[-8,0],[0,-2],[8,-4],[-14,26],[16,24],[-28,-26],[-40,-32],[2,12],[32,-28],[38,-12],[34,6]],
     edges:[[2,0],[2,1],[0,3],[1,5],[3,4],[4,5],[3,6],[5,7],[0,8],[8,9],[4,10],[1,12],[11,12],[12,13]]},
  /* 전갈자리 — 집게에서 안타레스를 지나 갈고리 꼬리까지 */
  15:{pts:[[40,-30],[46,-16],[42,-2],[30,-14],[20,-12],[10,-6],[2,0],[-6,6],[-12,16],[-16,26],[-26,32],[-36,30],[-44,22],[-46,10],[-38,4]],
     edges:[[0,3],[1,3],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14]]},
  /* 궁수자리 — 찻주전자 몸통·뚜껑·주둥이·손잡이, 활과 화살 */
  16:{pts:[[-10,-6],[8,-8],[10,10],[-8,12],[-2,-22],[28,4],[-24,-8],[-26,10],[30,-20],[42,-28],[-36,-20],[-46,-28],[-38,22],[-46,30],[16,26],[6,32]],
     edges:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,1],[1,5],[2,5],[0,6],[6,7],[7,3],[1,8],[8,9],[6,10],[10,11],[7,12],[12,13],[2,14],[14,15]]},
};
/* 16개 넘게 — 궁수자리에 남는 별을 위쪽 은하수 줄기처럼 이어 붙임 */
const figureFor = (n) => {
  if (SKY_FIGURES[n]) return SKY_FIGURES[n];
  const base=SKY_FIGURES[16], k=n-16;
  const pts=[...base.pts], edges=[...base.edges];
  for(let i=0;i<k;i++){
    const t=k===1?.5:i/(k-1);
    pts.push([-30+t*60, -34+Math.sin(t*Math.PI)*-4+(i%2?4:0)]);
    edges.push(i===0?[4,16]:[15+i,16+i]);
  }
  return {pts,edges};
};
/* mirror: 오른쪽(소운) 별자리는 좌우를 뒤집어 같은 개수여도 다른 하늘처럼 */
const layoutFor = (n, mirror=false) => {
  const pts = LAYOUTS[n] || figureFor(n).pts;
  return mirror ? pts.map(([x,y])=>[-x,y]) : pts;
};

const toISO=(d)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};
const fromISO=(s)=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const mondayOf=(d)=>{const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;};
const weekDatesFrom=(mon)=>Array.from({length:7},(_,i)=>toISO(addDays(mon,i)));
const WD=["월","화","수","목","금","토","일"];
/* 한 주는 월요일에 시작해서 일요일 23:59에 닫힙니다 */
const fmtMD=(iso)=>{const d=fromISO(iso);return `${d.getMonth()+1}/${d.getDate()}`;};
const weekRangeLabel=(monISO)=>`${fmtMD(monISO)}–${fmtMD(toISO(addDays(fromISO(monISO),6)))}`;
/* "10월 3주차" — 월요일~일요일 주가 두 달에 걸치면 목요일이 속한 달로 셉니다
   (달력의 일반적인 주차 규칙). 9/28–10/4 주는 목요일이 10/1이라 10월 1주차. */
const weekOfMonth=(monISO)=>{const th=addDays(fromISO(monISO),3);return {m:th.getMonth()+1,w:Math.ceil(th.getDate()/7)};};
/* 노션 시각(UTC, 예: 2026-09-16T05:12:00.000Z) 또는 날짜 → 이 기기 기준 YYYY-MM-DD */
const localISO=(s)=>{if(!s)return "";if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const d=new Date(s);return isNaN(d)?"":toISO(d);};
const reduceMotion=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ── 저장 계층 ───────────────────────────────────────────────
   1순위: 노션 (앱 내부 /api 경유 — 토큰은 서버에만 존재)
   2순위: 브라우저 localStorage (노션 미설정·오류 시 자동 전환)
─────────────────────────────────────────────────────────── */
const LS={
  get(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  set(k,v){try{localStorage.setItem(k,v);}catch(e){}},
};

/* 노션 편지 DB에 '읽음' 칸이 없을 때를 위한 안전장치 —
   이 기기에서 이미 연 편지 id를 기억해뒀다가, 서버가 읽음 여부를 못 알려줘도
   다시 들어올 때마다 같은 편지가 또 뜨지 않도록 합니다. */
const SEEN_KEY="hr_seen_letters";
const getSeen=()=>{try{return new Set(JSON.parse(LS.get(SEEN_KEY)||"[]"));}catch(e){return new Set();}};
const addSeen=(id)=>{
  const s=getSeen(); s.add(id);
  LS.set(SEEN_KEY, JSON.stringify([...s].slice(-200))); // 최근 200개만 보관
};

async function api(path,opts={}){
  const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});
  let data=null; try{data=await r.json();}catch(e){}
  if(!r.ok) throw new Error(data?.hint||data?.error||`요청 실패 (${r.status})`);
  return data;
}

/* 마지막으로 노션에서 받은 데이터를 이 기기에 저장해 두었다가,
   다음에 열 때 그걸로 화면을 바로 띄우고 노션 최신 내용으로 조용히 바꿉니다. */
const CACHE_KEY="hr_cache_v1";
const readCache=()=>{
  try{const c=JSON.parse(LS.get(CACHE_KEY)||"null");return c&&Array.isArray(c.hs?.habits)&&c.hs.habits.length&&c.logs?c:null;}
  catch(e){return null;}
};
/* 처음엔 최근 8주만 받아 화면을 띄우고(회고 6주 + 지난주), 1년 치 나머지는 뒤에서 이어 받습니다 */
const RECENT_WEEKS=8;
/* fresh가 덮는 날짜 구간(from 이후 / to 이전)은 fresh로 교체, 나머지는 기존 값 유지 */
const mergeLogs=(prev,fresh,{from,to})=>{
  const out={};
  for(const k of Object.keys(prev))if((from&&k<from)||(to&&k>to))out[k]=prev[k];
  return {...out,...fresh};
};

/* 노션 기록 배열 → { "YYYY-MM-DD": [습관id, ...] } */
function logsToMap(rows){
  const out={};
  for(const row of rows||[]){
    if(!row?.date||!row?.habitId) continue;
    if(!out[row.date]) out[row.date]=[];
    out[row.date].push(row.habitId);
  }
  return out;
}

export default function App(){
  const [cache0]=useState(readCache);
  /* 스플래시: 인사 두 줄이 차례로 떠오른 뒤(약 2.4초) 0.5초에 걸쳐 사라짐 (데이터는 그 사이 뒤에서 불러옴) */
  const [splash,setSplash]=useState("on");   // on → out → off
  useEffect(()=>{
    const a=setTimeout(()=>setSplash("out"),2400), b=setTimeout(()=>setSplash("off"),2900);
    return()=>{clearTimeout(a);clearTimeout(b);};
  },[]);      // 지난번 데이터 — 있으면 로딩 없이 바로 보여줌
  const [habits,setHabits]=useState(()=>cache0?cache0.hs.habits:[]);   // 판정 전에는 비워둠 (예시 데이터 깜빡임 방지)
  const [logs,setLogs]=useState(()=>cache0?cache0.logs:{});
  const [tab,setTab]=useState("sky");
  const [person,setPerson]=useState(()=>{try{return localStorage.getItem("hr_person")||"me";}catch{return "me";}});
  const [selDate,setSelDate]=useState(toISO(new Date()));
  const [loaded,setLoaded]=useState(!!cache0);
  const [showManage,setShowManage]=useState(false);
  const [cheer,setCheer]=useState(null);   // 이번 주 목표를 채운 순간의 축하 {key,h,x,y}
  const [selStar,setSelStar]=useState(null);

  /* 노션 연결 상태: loading | notion | local */
  const [sync,setSync]=useState({mode:cache0?"notion":"loading",error:""});
  const [toast,setToast]=useState("");
  const [meName,setMeName]=useState(()=>cache0?.hs.me||DEMO_ME_NAME);        // 노션에서 '나'로 볼 소유자 값
  const [owners,setOwners]=useState(()=>Array.isArray(cache0?.hs.owners)?cache0.hs.owners:[]);   // 노션 DB에 등장하는 소유자 목록
  const [ownerWarn,setOwnerWarn]=useState("");            // 소유자 속성을 못 찾았을 때 안내
  const [habitsDb,setHabitsDb]=useState(()=>cache0?.hs.habitsDb||"");   // '해빗 수정하기'가 열 노션 DB
  const [staleWarn,setStaleWarn]=useState("");            // 저장해 둔 데이터를 보여주는 중인데 노션 연결이 실패했을 때
  const hsRef=useRef(cache0?.hs||null);                   // 캐시에 함께 저장할 습관 응답
  const olderDone=useRef(false);                          // 1년 치 이전 기록은 세션당 한 번만
  const pending=useRef(new Map());                        // 노션에 저장 중인 체크 — 새로 받은 데이터에 덮이지 않도록

  /* 별똥별 편지 */
  const [letters,setLetters]=useState([]);
  const [modal,setModal]=useState(null);   // {type:"read"|"compose"|"box", letter, to}
  /* 습관 메모 — { "습관id|YYYY-MM-DD": "메모" }. 노션 '습관 메모' DB(없거나 연결 전이면 조용히 꺼짐) */
  const [notes,setNotes]=useState(()=>cache0?.notes||{});
  const [notesOn,setNotesOn]=useState(()=>!!cache0?.notes);
  const [noteFor,setNoteFor]=useState(null);   // {h, date} — 메모 작성 창
  /* 습관 상세 — 주소에 #habit/<id>를 붙여 폰의 뒤로가기로 닫히게 */
  const hashId=()=>{const m=(window.location.hash||"").match(/^#habit\/(.+)$/);return m?decodeURIComponent(m[1]):null;};
  const [detailId,setDetailId]=useState(hashId);
  const pushedDetail=useRef(false);
  useEffect(()=>{const on=()=>setDetailId(hashId());window.addEventListener("popstate",on);return()=>window.removeEventListener("popstate",on);},[]);
  const openDetail=(id)=>{window.history.pushState({hd:1},"",`#habit/${encodeURIComponent(id)}`);pushedDetail.current=true;setDetailId(id);};
  const closeDetail=()=>{
    if(pushedDetail.current){pushedDetail.current=false;window.history.back();}
    else{window.history.replaceState(null,"",window.location.pathname+window.location.search);setDetailId(null);}
  };
  const [sending,setSending]=useState(false);
  const [deviceMe,setDeviceMe]=useState(()=>{try{return localStorage.getItem("hr_me")||"";}catch{return "";}});

  /* 저장 중이거나, 이 조회를 시작한 뒤에 한 체크를 새로 받은 기록 위에 다시 얹기
     (조회 요청이 체크 저장보다 먼저 나갔다면 그 응답엔 체크가 빠져 있으므로) */
  const withPending=(map,started)=>{
    for(const [key,v] of pending.current)if(!v.inflight&&v.at<started)pending.current.delete(key);
    if(!pending.current.size)return map;
    const out={...map};
    for(const [key,{on}] of pending.current){
      const [id,d]=key.split("|");const day=out[d]||[];
      const next=on?(day.includes(id)?day:[...day,id]):day.filter(x=>x!==id);
      if(next.length)out[d]=next;else delete out[d];
    }
    return out;
  };

  const loadFromNotion=async()=>{
    const now=new Date(),to=toISO(now),started=Date.now();
    const from=toISO(addDays(mondayOf(now),-(RECENT_WEEKS-1)*7));   // 최근 8주만 먼저
    const [hs,ls]=await Promise.all([api("/api/habits"),api(`/api/logs?from=${from}&to=${to}`)]);
    if(!Array.isArray(hs?.habits)||!hs.habits.length)
      throw new Error("노션에서 가져온 습관이 없어요. '활성' 체크가 켜진 습관이 있는지 확인해주세요.");
    hsRef.current=hs;
    setHabits(hs.habits);
    /* 직전이 로컬 모드였다면 그 기록은 섞지 않음 */
    setLogs(prev=>withPending(mergeLogs(sync.mode==="local"?{}:prev,logsToMap(ls?.logs),{from,to}),started));
    setMeName(hs.me||DEMO_ME_NAME);
    if(hs.habitsDb) setHabitsDb(hs.habitsDb);
    setOwners(Array.isArray(hs.owners)?hs.owners:[]);
    setOwnerWarn(
      !hs.ownerProp
        ? `습관 DB에서 소유자 속성을 찾지 못해 탭을 나눌 수 없어요. 현재 속성: ${(hs.allProps||[]).join(", ")}`
        : !hs.owners?.length
          ? "습관들의 소유자 값이 비어 있어요. 노션에서 각 습관에 소유자를 지정해주세요."
          : !hs.owners.includes(hs.me||DEMO_ME_NAME)
            ? `'${hs.me||DEMO_ME_NAME}' 소유의 습관이 없어요. 노션의 소유자 값은 ${hs.owners.join(", ")} 입니다.`
            : ""
    );
    return {me:hs.me||DEMO_ME_NAME,from};
  };

  /* 8주보다 오래된 기록(최근 1년)은 화면을 띄운 뒤 뒤에서 받아 합칩니다 */
  const loadOlder=async(recentFrom)=>{
    if(olderDone.current)return;
    const from=toISO(addDays(mondayOf(new Date()),-53*7));
    const to=toISO(addDays(fromISO(recentFrom),-1)),started=Date.now();
    try{
      const ls=await api(`/api/logs?from=${from}&to=${to}`);
      setLogs(prev=>withPending(mergeLogs(prev,logsToMap(ls?.logs),{from,to}),started));
      olderDone.current=true;
    }catch(e){ /* 다음에 앱으로 돌아올 때 다시 시도 */ }
  };

  const noteKey=(id,d)=>`${id}|${d}`;
  const loadNotes=async()=>{
    try{
      const from=toISO(addDays(mondayOf(new Date()),-53*7)),to=toISO(new Date());
      const r=await api(`/api/notes?from=${from}&to=${to}`);
      const m={}; for(const n of r?.notes||[]) m[noteKey(n.habitId,n.date)]=n.text;
      setNotes(m); setNotesOn(true);
    }catch(e){ setNotesOn(false); }
  };
  /* 저장: 화면 먼저 바꾸고 노션에 기록, 실패하면 되돌림. 빈 글이면 삭제 */
  const saveNote=async(h,d,text)=>{
    const k=noteKey(h.id,d), before=notes[k]||"", t=text.trim();
    setNotes(prev=>{const n={...prev}; if(t) n[k]=t; else delete n[k]; return n;});
    if(sync.mode!=="notion"){ return true; }
    try{ await api("/api/notes",{method:"PUT",body:JSON.stringify({habitId:h.id,date:d,text:t})}); return true; }
    catch(e){
      setNotes(prev=>{const n={...prev}; if(before) n[k]=before; else delete n[k]; return n;});
      setToast(e.message||"메모를 저장하지 못했어요."); return false;
    }
  };
  const openNote=(h,d)=>{
    if(sync.mode==="notion"&&!notesOn){ setToast("노션 '습관 메모' DB에 Integration을 연결하면 메모를 쓸 수 있어요"); return; }
    primeKeyboard(); setNoteFor({h,date:d});
  };

  const loadFromLocal=()=>{
    try{const n=JSON.parse(LS.get("hr_notes")||"{}");setNotes(n);setNotesOn(true);}catch(e){}
    const h=LS.get("hr_habits"),l=LS.get("hr_logs");
    const v=Number(LS.get("hr_version"))||1;
    if(h){try{let p=JSON.parse(h);if(v<HABITS_VERSION)p=migrateHabits(p);setHabits(p);}catch{setHabits(DEFAULT_HABITS);}}
    else setHabits(DEFAULT_HABITS);
    if(l)try{setLogs(JSON.parse(l));}catch{}
    LS.set("hr_version",String(HABITS_VERSION));
  };

  const lastLoad=useRef(0);
  /* 편지 기능은 노션 DB가 없으면 조용히 꺼집니다 */
  const loadLetters=async(who)=>{
    try{
      const r=await api("/api/messages?to="+encodeURIComponent(who));
      const seen=getSeen();
      /* 보낸 지 7일이 지난 편지는 읽은 것으로 — 날짜로만 판단해서 어느 기기에서나 같게 */
      const weekAgo=toISO(addDays(new Date(),-7));
      const list=(Array.isArray(r?.messages)?r.messages:[]).map(m=>({...m,read:m.read||seen.has(m.id)||(!!m.date&&String(m.date).slice(0,10)<weekAgo)}));
      setLetters(list);
    }catch(e){ setLetters([]); }
  };

  const refresh=async()=>{
    try{
      const info=await loadFromNotion();
      setSync({mode:"notion",error:""});
      setStaleWarn("");
      loadLetters((LS.get("hr_me")||info.me||DEMO_ME_NAME));
      loadOlder(info.from);
      loadNotes();
    }
    catch(e){
      /* 이미 노션 데이터(저장해 둔 것 포함)를 보여주는 중이면 그대로 두고 한 줄만 알림 */
      if(sync.mode==="notion") setStaleWarn("노션에 연결하지 못해 마지막으로 불러온 기록을 보여주고 있어요.");
      else { loadFromLocal(); setSync({mode:"local",error:e.message||"노션에 연결하지 못했어요."}); }
    }
    finally{ setLoaded(true); lastLoad.current=Date.now(); }
  };
  const refreshRef=useRef(refresh); refreshRef.current=refresh;

  useEffect(()=>{refresh();},[]);

  /* 새로고침 버튼 대신, 앱으로 돌아올 때 노션 내용을 알아서 다시 불러옵니다.
     (노션에서 습관을 고치고 앱으로 돌아오면 반영됨) */
  useEffect(()=>{
    const back=()=>{
      if(document.visibilityState!=="visible")return;
      if(Date.now()-lastLoad.current<20000)return;   // 너무 잦은 재조회 방지
      refreshRef.current();
    };
    document.addEventListener("visibilitychange",back);
    window.addEventListener("focus",back);
    return()=>{document.removeEventListener("visibilitychange",back);window.removeEventListener("focus",back);};
  },[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),3800);return()=>clearTimeout(t);},[toast]);
  /* 로컬 모드일 때만 브라우저에 저장 (노션 모드는 노션이 원본) */
  useEffect(()=>{if(loaded&&sync.mode==="local")LS.set("hr_habits",JSON.stringify(habits));},[habits,loaded,sync.mode]);
  useEffect(()=>{if(loaded&&sync.mode==="local")LS.set("hr_logs",JSON.stringify(logs));},[logs,loaded,sync.mode]);
  /* 노션 모드: 다음에 바로 띄울 수 있도록 마지막 데이터를 저장 */
  useEffect(()=>{
    if(!loaded||sync.mode!=="notion"||!hsRef.current)return;
    LS.set(CACHE_KEY,JSON.stringify({hs:hsRef.current,logs,notes:notesOn?notes:undefined,savedAt:Date.now()}));
  },[habits,logs,notes,notesOn,loaded,sync.mode]);
  useEffect(()=>{if(loaded&&sync.mode==="local")LS.set("hr_notes",JSON.stringify(notes));},[notes,loaded,sync.mode]);
  useEffect(()=>{try{localStorage.setItem("hr_person",person);}catch(e){}},[person]);

  const today=toISO(new Date());
  const selMon=mondayOf(fromISO(selDate)),weekStart=toISO(selMon);
  const weekDates=useMemo(()=>weekDatesFrom(selMon),[weekStart]);
  const isLogged=(id,d)=>(logs[d]||[]).includes(id);
  const applyToggle=(id,d)=>setLogs(prev=>{
    const day=prev[d]||[];const next=day.includes(id)?day.filter(x=>x!==id):[...day,id];
    const out={...prev,[d]:next};if(!next.length)delete out[d];return out;
  });
  /* 체크 → 화면 먼저 바꾸고(낙관적 업데이트) 노션에 기록. 실패하면 되돌림 */
  /* 길게 누르기(0.45초) → 메모. 짧게 누르기 → 체크. 길게 누른 뒤 손을 뗄 때 창을 열어 키보드가 뜨게 */
  const press=useRef({t:null,armed:false,x:0,y:0,skip:false});
  const [pressing,setPressing]=useState(null);
  const longPress=(h,onTap)=>({
    onPointerDown:(e)=>{const p=press.current;clearTimeout(p.t);p.armed=false;p.x=e.clientX;p.y=e.clientY;
      p.t=setTimeout(()=>{p.armed=true;setPressing(h.id);try{window.getSelection()?.removeAllRanges();navigator.vibrate&&navigator.vibrate(12);}catch(_){}} ,450);},
    onPointerMove:(e)=>{const p=press.current;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>10){clearTimeout(p.t);if(!p.armed)p.t=null;}},
    onPointerUp:()=>{const p=press.current;clearTimeout(p.t);if(p.armed){p.armed=false;p.skip=true;setPressing(null);openNote(h,selDate);}},
    onPointerCancel:()=>{const p=press.current;clearTimeout(p.t);p.armed=false;setPressing(null);},
    onContextMenu:(e)=>e.preventDefault(),
    onDragStart:(e)=>e.preventDefault(),
    onClick:(e)=>{const p=press.current;if(p.skip){p.skip=false;return;}onTap(e);},
  });

  /* el: 누른 행 — 체크칸 자리에서 별이 터져 나오도록 */
  const toggleLog=async(id,d,el)=>{
    const wasOn=isLogged(id,d);
    /* 이 체크로 그 주의 목표 횟수를 딱 채웠다면 축하 */
    const h=habits.find(x=>x.id===id);
    if(!wasOn&&h&&weekCount(id,weekDatesFrom(mondayOf(fromISO(d))))+1===tgtOf(h)){
      const r=(el?.lastElementChild||el)?.getBoundingClientRect?.();
      setCheer({key:Date.now(),h,x:r?r.left+r.width/2:window.innerWidth/2,y:r?r.top+r.height/2:window.innerHeight/2});
    }
    applyToggle(id,d);
    if(sync.mode!=="notion") return;
    const key=`${id}|${d}`;
    const mark={on:!wasOn,at:Date.now(),inflight:true};
    pending.current.set(key,mark);
    try{
      await api("/api/logs",{method:wasOn?"DELETE":"POST",body:JSON.stringify({habitId:id,date:d})});
      mark.inflight=false;   // 다음 조회가 시작되면 정리됨
    }catch(e){
      if(pending.current.get(key)===mark)pending.current.delete(key);
      applyToggle(id,d);
      setToast(e.message||"노션에 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };
  const weekCount=(id,wd=weekDates)=>wd.reduce((n,d)=>n+(isLogged(id,d)?1:0),0);

  /* 습관별 시작일 = 노션 시작일(또는 생성일)과 가장 이른 기록 중 빠른 쪽.
     생성일보다 앞선 날짜로 기록을 채워 넣었어도 그 기록이 '시작 전'으로 가려지지 않도록. */
  const firstLog=useMemo(()=>{
    const out={};
    for(const d of Object.keys(logs).sort())for(const id of logs[d])if(!out[id])out[id]=d;
    return out;
  },[logs]);
  const startOf=(h)=>{
    const a=localISO(h.start),b=firstLog[h.id]||"";
    return a&&b?(a<b?a:b):a;   // 시작일을 모르면(로컬 모드 등) 비워둬서 가리지 않음
  };
  /* 그 주(월~일)가 끝나기 전에 시작한 습관인가 */
  const startedBy=(h,monISO)=>{const s=startOf(h);return !s||s<=toISO(addDays(fromISO(monISO),6));};

  /* ── 소유자별 분리 ──────────────────────────────────────────
     노션 모드: 습관의 '소유자' 값으로 나/상대를 나눔
     로컬 모드: 소유자 정보가 없으므로 전부 내 것 + 상대는 예시 데이터
  ──────────────────────────────────────────────────────── */
  const isNotion=sync.mode==="notion";
  const habitsUrl=`https://www.notion.so/${String(habitsDb||"19760626b3fd4df8bc4cf8c651701e0f").replace(/-/g,"")}`;
  const friendName=isNotion?(owners.find(o=>o!==meName)||DEMO_FRIEND_NAME):DEMO_FRIEND_NAME;
  /* 소유자가 비어 있는 습관은 내 것으로 봅니다 (화면에서 사라지지 않도록) */
  const myHabits=sortHabits(isNotion?habits.filter(h=>(h.owner||meName)===meName):habits);
  const friendHabits=sortHabits(isNotion?habits.filter(h=>h.owner===friendName):[]);
  const activeHabits=person==="me"?myHabits:friendHabits;
  const detailHabit=detailId?habits.find(h=>h.id===detailId)||null:null;


  /* 이 기기의 주인 — 편지는 이 이름 앞으로 온 것만 보여줍니다 */
  const who=deviceMe||meName;
  const partner=owners.find(o=>o!==who)||friendName;
  const unread=letters.filter(l=>!l.read);
  const lettersOn=isNotion&&(letters.length>0||owners.length>1);

  const openBox=()=>setModal({type:"box"});
  /* from: 보내는 사람. 칭찬하기는 지금 보고 있는 화면의 주인이 상대에게 보냅니다 */
  const compose=(to,from)=>{primeKeyboard();setModal({type:"compose",to:to||partner,from});};
  const closeLetter=()=>setModal(null);
  /* 성공하면 true — 창은 작성 화면이 별똥별 연출을 끝낸 뒤 닫습니다 */
  const sendLetter=async(to,text,from)=>{
    setSending(true);
    try{
      await api("/api/messages",{method:"POST",body:JSON.stringify({from:from||who,to:to,text:text})});
      return true;
    }catch(e){ setToast(e.message||"보내지 못했어요."); return false; }
    finally{ setSending(false); }
  };
  const setOwnerOfDevice=(name)=>{
    setDeviceMe(name); LS.set("hr_me",name); loadLetters(name);
  };

  /* 편지를 연 순간 읽음 처리 — 닫든 답장하든 다시 뜨지 않도록 */
  useEffect(()=>{
    if(!modal||modal.type!=="read"||!modal.letter||modal.letter.read)return;
    const l=modal.letter;
    addSeen(l.id);
    setLetters(prev=>prev.map(x=>x.id===l.id?{...x,read:true}:x));
    api("/api/messages",{method:"PATCH",body:JSON.stringify({id:l.id})}).catch(()=>{});
  },[modal]);

  /* 안 읽은 편지가 있으면 진입할 때 한 번 열어줍니다 */
  useEffect(()=>{
    if(modal||!letters.length)return;
    const un=letters.find(l=>!l.read);
    if(un)setModal({type:"read",letter:un});
  },[letters]);

  /* 상대 쪽 습관이 하나도 없으면 빈 화면에 머무르지 않도록 내 탭으로 되돌림 */
  useEffect(()=>{
    if(isNotion&&person==="friend"&&friendHabits.length===0) setPerson("me");
  },[isNotion,friendHabits.length,person]);

  useEffect(()=>{if(!cheer)return;const t=setTimeout(()=>setCheer(null),reduceMotion?2200:2600);return()=>clearTimeout(t);},[cheer]);

  const ratioAt=(h,mon)=>{const wd=weekDatesFrom(mon);const c=wd.reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0);return Math.min(1,c/tgtOf(h));};
  const completedIn=(h,a,b)=>{let c=0;for(let i=a;i<b;i++)if(ratioAt(h,addDays(mondayOf(fromISO(today)),-i*7))>=1)c++;return c;};

  /* ── 목표별 주간 회고 데이터 ──────────────────────────────────
     각 칸이 '언제의 기록'인지 화면에서 바로 알 수 있도록,
     칸마다 그 주의 시작일·달성 횟수·목표를 함께 담아서 넘깁니다. */
  const curMon=mondayOf(fromISO(today));

  /* ── 페이스: 지난주 이맘때 vs 지금 (같은 요일까지만 공정하게 비교) ── */
  const paceOf=(list)=>{
    if(!list.length) return null;
    const todayIdx=(fromISO(today).getDay()+6)%7;                 // 월=0 … 일=6
    const dayCount=(iso)=>list.reduce((n,h)=>n+(isLogged(h.id,iso)?1:0),0);
    const cumul=(mon)=>{let c=0;return weekDatesFrom(mon).map(d=>(c+=dayCount(d)));};
    const cur=cumul(curMon), prev=cumul(addDays(curMon,-7));
    const now=cur[todayIdx], then=prev[todayIdx];
    /* 다음 한 걸음: 오늘 아직 안 했고 이번 주 목표가 남은 습관 중 남은 횟수가 가장 적은 것 */
    const curWeek=weekDatesFrom(curMon);
    const left=(h)=>tgtOf(h)-curWeek.reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0);
    const next=list.filter(h=>!isLogged(h.id,today)&&left(h)>0).sort((a,b)=>left(a)-left(b))[0]||null;
    /* 이 속도면 채울 수 있는 목표 수 */
    const onTrack=list.filter(h=>{const wc=tgtOf(h)-left(h);return wc/(todayIdx+1)*7>=tgtOf(h);}).length;
    /* 최고 기록 주 (불러온 1년 안, 이번 주 제외) */
    let best=0,bestMon=null;
    for(let i=1;i<=52;i++){
      const mon=addDays(curMon,-7*i);
      const tot=weekDatesFrom(mon).reduce((n,d)=>n+dayCount(d),0);
      if(tot>best){best=tot;bestMon=toISO(mon);}
    }
    return {todayIdx,cur,prev,now,then,diff:now-then,next,onTrack,total:list.length,best,bestMon,
      projected:now/(todayIdx+1)*7};
  };
  /* ── 습관 하나의 기록 통계 — 잔디밭 목록·상세 페이지가 함께 씀 ──
     칸 상태: full(목표 채운 주의 체크) · part(아직 못 채운 주의 체크) · empty · pre(시작 전) · future
     연속: 매일 습관은 '일', 주 N회 습관은 '주' 단위 (오늘/이번 주가 아직 비어 있어도 끊긴 걸로 보지 않음) */
  const habitStats=(h)=>{
    const t=tgtOf(h), daily=t>=7;
    const startISO=startOf(h)||toISO(addDays(fromISO(today),-364));
    const weekCnt={};
    const cntOf=(mon)=>{const k=toISO(mon);if(weekCnt[k]==null)weekCnt[k]=weekDatesFrom(mon).reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0);return weekCnt[k];};
    const cell=(iso)=>{
      if(iso>today) return "future";
      if(iso<startISO) return "pre";
      if(!isLogged(h.id,iso)) return "empty";
      return cntOf(mondayOf(fromISO(iso)))>=t?"full":"part";
    };
    /* 날짜 순회 (시작일 ~ 오늘, 최대 1년) */
    const days=[]; for(let d=fromISO(startISO>toISO(addDays(fromISO(today),-364))?startISO:toISO(addDays(fromISO(today),-364)));toISO(d)<=today;d=addDays(d,1)) days.push(toISO(d));
    const logged=days.filter(d=>isLogged(h.id,d));
    let cur=0,best=0;
    if(daily){
      let run=0; for(const d of days){ run=isLogged(h.id,d)?run+1:0; best=Math.max(best,run); }
      let i=days.length-1; if(i>=0&&!isLogged(h.id,days[i])) i--;          // 오늘 아직이면 어제부터
      while(i>=0&&isLogged(h.id,days[i])){cur++;i--;}
    }else{
      const mons=[]; for(let m=mondayOf(fromISO(days[0]||today));toISO(m)<=today;m=addDays(m,7)) mons.push(m);
      let run=0; for(const m of mons){ run=cntOf(m)>=t?run+1:0; best=Math.max(best,run); }
      let i=mons.length-1; if(i>=0&&cntOf(mons[i])<t) i--;                 // 이번 주 진행 중이면 지난주부터
      while(i>=0&&cntOf(mons[i])>=t){cur++;i--;}
    }
    const wc=cntOf(curMon);
    /* 최근 12주(이번 주 제외, 시작 이후) 중 목표를 채운 주 */
    let ok=0,elig=0; for(let i=1;i<=12;i++){const m=addDays(curMon,-7*i); if(toISO(addDays(m,6))<startISO) continue; elig++; if(cntOf(m)>=t) ok++;}
    return {h,t,daily,unit:daily?"일":"주",cell,cur,best,total:logged.length,startISO,
      wc,weekPct:Math.min(1,wc/t),ok,elig,rate:elig?ok/elig:null,
      records:[...logged].reverse(),todayOn:isLogged(h.id,today),started:startISO<=today,
      noteOf:(iso)=>notes[`${h.id}|${iso}`]||"",
      notesList:Object.keys(notes).filter(k=>k.startsWith(h.id+"|")).map(k=>({date:k.slice(h.id.length+1),text:notes[k]}))
        .sort((a,b)=>a.date<b.date?1:-1)};
  };


  /* 현재 사람의 별 데이터 (노션 모드에서는 상대 쪽도 실제 기록으로 계산) */
  const starOf=(h)=>{const c=weekCount(h.id),t=tgtOf(h);return {id:h.id,name:h.name,emoji:emojiOf(h),ratio:Math.min(1,c/t),done:c,target:t,complete:c>=t};};
  const myStars=myHabits.map(starOf);
  const frStars=isNotion
    ? friendHabits.map(starOf)
    : sortHabits(FRIEND_HABITS).map(h=>{const t=tgtOf(h),d=h.done;return {id:h.id,name:h.name,emoji:emojiOf(h),ratio:Math.min(1,d/t),done:d,target:t,complete:d>=t};});
  const activeStars=person==="me"?myStars:frStars;
  const activeColor=person==="me"?GREEN:VIOLET;
  const allComplete=activeStars.length>0&&activeStars.every(s=>s.complete);

  /* 프로그레스바 */
  const meProg=myStars.map(s=>({key:s.id,emoji:s.emoji,ratio:s.ratio,complete:s.complete,color:GREEN}));
  const frProg=frStars.map(s=>({key:s.id,emoji:s.emoji,ratio:s.ratio,complete:s.complete,color:VIOLET}));

  /* 노션인지 로컬인지 판정되기 전에는 아무 습관도 그리지 않습니다.
     (예시 데이터가 잠깐 스쳐 보이던 문제) */
  const booting=!loaded||sync.mode==="loading";

  /* 평소에는 아무 표시도 하지 않고, 뭔가 어긋났을 때만 한 줄 알립니다. */
  const notice = sync.mode==="local"
    ? (sync.error || "노션에 연결하지 못해 이 기기에만 저장되고 있어요.")
    : (isNotion && (staleWarn || ownerWarn)) || "";

  /* 초록/소운 전환 — 한 번 고르면 기기에 저장되니 화면 맨 아래에 둡니다 */
  const personSwitch=(()=>{
    const curName=person==="me"?meName:friendName;
    const other=person==="me"?"friend":"me", otherName=person==="me"?friendName:meName;
    return(
      <div style={{marginTop:60,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12,width:"100%",fontSize:15,whiteSpace:"nowrap"}}>
          <span style={{flex:1,height:1,background:"#262A34"}}/>
          <span><b style={{fontWeight:700,color:"#ECEDF2"}}>{curName}</b><span style={{color:"#9A9CAA"}}>의 기록</span></span>
          <span style={{flex:1,height:1,background:"#262A34"}}/>
        </div>
        <button className="btn" onClick={()=>{setPerson(other);setSelStar(null);window.scrollTo({top:0,behavior:"smooth"});}}
          style={{...BTN_FILL,display:"flex",alignItems:"center",gap:8,padding:"10px 18px",fontSize:14}}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13"/>
          </svg>
          {withRo(otherName)} 바꾸기
        </button>
      </div>
    );
  })();

  const C={bg:"transparent",surface:"rgba(17,19,46,.62)",surface2:"rgba(255,255,255,.08)",ink:"#EEEDF7",sub:"#A3A2BD",line:"rgba(255,255,255,.12)",lineSoft:"rgba(255,255,255,.08)"};

  return (
    <div style={{...accentVars(person==="me"?GREEN:VIOLET),background:"radial-gradient(120% 60% at 50% 0%,rgba(40,36,90,.14) 0%,rgba(0,0,0,0) 60%),linear-gradient(180deg,#040409 0%,#06060E 55%,#0A0918 100%)",minHeight:"100vh",maxWidth:"100%",overflowX:"clip",color:C.ink,fontFamily:"'Pretendard',ui-sans-serif,system-ui,sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        *{box-sizing:border-box}
        html{background:#040409}   /* 상태 표시줄·위로 당겼을 때 = 화면 맨 위 색 */
        html,body{max-width:100%;overflow-x:clip}
        body{background:linear-gradient(180deg,#040409 0%,#0A0918 100%)}
        .mono{font-variant-numeric:tabular-nums}   /* 폰트는 Pretendard 하나 — 숫자만 폭을 맞춤 */
        button,input,textarea,select{font-family:inherit}
        .tap{cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s,background .25s,box-shadow .25s}
        .tap:active{transform:scale(.96)}
        /* 길게 눌러도 글자가 선택·돋보기·공유 메뉴로 잡히지 않게 — 자식까지 전부 (iOS는 -webkit- 접두사만 들음) */
        .row-tap,.row-tap *{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
        .row-tap:active > span{transform:scale(.9)}
        .btn{transition:opacity .15s,transform .12s;cursor:pointer;-webkit-tap-highlight-color:transparent}.btn:hover{opacity:.85}.btn:active{transform:translateY(1px)}
        .fade{animation:fade .34s ease}
        .sp-line{opacity:0;transform:translateY(12px);animation:spIn .7s cubic-bezier(.2,.8,.2,1) forwards}
        @keyframes spIn{to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.sp-line{animation:none;opacity:1;transform:none}}@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .conf{position:absolute;left:50%;top:44%;width:6px;height:6px;opacity:1;border-radius:50%;animation:cburst 1.4s ease-out forwards}
        @keyframes cburst{to{transform:translate(var(--tx),var(--ty));opacity:0}}
        /* 목표 달성 축하 */
        .gc-bit{opacity:0;animation:gcBit 1.1s cubic-bezier(.15,.75,.3,1) forwards}
        @keyframes gcBit{0%{opacity:1;transform:translate(0,0) scale(.3) rotate(0)}60%{opacity:1}
          100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1) rotate(var(--rot))}}
        .gc-ring{opacity:0;animation:gcRing .8s ease-out forwards}
        @keyframes gcRing{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(2.2)}}
        .gc-scrim{opacity:0;animation:gcScrim 2.6s ease forwards}
        @keyframes gcScrim{0%{opacity:0}12%,80%{opacity:1}100%{opacity:0}}
        .gc-card{transform:translate(-50%,-50%);animation:gcCard 2.6s ease forwards}
        @keyframes gcCard{0%{opacity:0;transform:translate(-50%,-38%) scale(.85)}14%{opacity:1;transform:translate(-50%,-50%) scale(1)}
          80%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-56%) scale(.98)}}
        .gc-star{animation:gcStar 2.6s cubic-bezier(.2,.8,.2,1) forwards}
        @keyframes gcStar{0%{transform:scale(0) rotate(-90deg)}22%{transform:scale(1.15) rotate(8deg)}34%,100%{transform:scale(1) rotate(0)}}
        @media(prefers-reduced-motion:reduce){.gc-card{animation:none}.gc-scrim{animation:none;opacity:1}}
        .glow-pulse{animation:gp 2.4s ease-in-out infinite}@keyframes gp{0%,100%{opacity:.7}50%{opacity:1}}
        /* ── 로딩: 별자리가 이어지는 애니메이션 + 실제 화면과 같은 자리의 뼈대 ── */
        .sk{border-radius:16px;background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.09) 45%,rgba(255,255,255,.04) 90%);
          background-size:220% 100%;animation:sk 1.5s ease-in-out infinite}
        @keyframes sk{from{background-position:110% 0}to{background-position:-110% 0}}
        .ld-line{stroke-dasharray:1;stroke-dashoffset:1;animation:ldDraw 2.8s cubic-bezier(.4,0,.2,1) infinite}
        @keyframes ldDraw{0%{stroke-dashoffset:1;opacity:.9}45%,78%{stroke-dashoffset:0;opacity:.9}100%{stroke-dashoffset:0;opacity:0}}
        .ld-star{opacity:.15;animation:ldStar 2.8s ease-in-out infinite}
        @keyframes ldStar{0%{opacity:.15}20%,78%{opacity:1}100%{opacity:.15}}
        .ld-bg{animation:ldTw 3.2s ease-in-out infinite}
        @keyframes ldTw{0%,100%{opacity:.25}50%{opacity:.9}}
        .ld-msg{animation:fade .5s ease}
        @media(prefers-reduced-motion:reduce){.tap,.btn,.fade,.conf,.glow-pulse{transition:none;animation:none}
          .sk,.ld-bg,.ld-msg{animation:none}.ld-line{animation:none;stroke-dashoffset:0;opacity:.6}.ld-star{animation:none;opacity:1}}
        .wrap{max-width:600px;margin:0 auto;padding:0 18px 96px}
        .navbar{position:sticky;top:0;z-index:10;background:rgba(4,5,14,.55);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
        /* 글래스 테두리 — iOS처럼 거의 고른 밝기, 위쪽만 아주 살짝 더 밝게 */
        /* 빛 테두리는 떠 있는 면(편지 모달·별 툴팁)에만 — 카드·버튼·패널엔 넣지 않음 */
        .gl.edge::before,.glass::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;z-index:1;
          background:linear-gradient(170deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.13) 45%,rgba(255,255,255,.11) 75%,rgba(255,255,255,.15) 100%);
          -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
          mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
        .twk{animation:twk 4.5s ease-in-out infinite}@keyframes twk{0%,100%{opacity:1}50%{opacity:.45}}
        /* 이모지 — 색을 빼서 한 가지 색처럼 */
        .emo{filter:grayscale(1) brightness(1.35) contrast(.85);opacity:.92}
        input.txt,select{font-family:inherit}
        .sky{position:relative;border-radius:20px;overflow:hidden;background:radial-gradient(130% 110% at 50% 35%,rgba(16,16,48,.75) 0%,rgba(5,6,18,.85) 60%,rgba(3,3,10,.9) 100%)!important;
          background:radial-gradient(140% 110% at 50% 40%,#0e1020 0%,#080910 55%,#030305 100%);
          box-shadow:0 8px 40px #00000060}   /* 옅은 외곽선 — 높이에 영향 없도록 inset */
        .pa-row{scrollbar-width:none;-ms-overflow-style:none;
          -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent);
          mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent)}
        .pa-row::-webkit-scrollbar{display:none}

        /* ── 별똥별 편지 ── */
        .lt-wrap{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:26px}
        .lt-scrim{position:absolute;inset:0;background:#04050A;opacity:0;
          animation:ltScrim 360ms cubic-bezier(.4,0,.2,1) 200ms forwards}
        @keyframes ltScrim{to{opacity:.86}}
        .lt-meteor{position:absolute;left:50%;top:calc(50% - 54px);width:0;height:0;pointer-events:none;
          animation:ltRun 720ms cubic-bezier(.16,.8,.3,1) 326ms both}
        @keyframes ltRun{0%{transform:translate3d(348px,-235px,0);opacity:0}9%{opacity:1}100%{transform:translate3d(0,0,0);opacity:1}}
        .lt-meteor .tail{position:absolute;left:0;top:-1.5px;height:3px;width:170px;border-radius:2px;
          transform:rotate(-34deg);transform-origin:0 50%;
          background:linear-gradient(90deg,#FFE6B0 0%,rgba(155,140,255,.62) 34%,rgba(155,140,255,0) 100%);
          animation:ltTail 240ms cubic-bezier(.4,0,.2,1) 1046ms forwards}
        @keyframes ltTail{to{width:0;opacity:0}}
        .lt-meteor .core{position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;
          background:radial-gradient(circle,#fff 0%,#FFE6B0 38%,rgba(255,230,176,0) 72%);
          animation:ltCore 320ms cubic-bezier(.4,0,.2,1) 1046ms forwards}
        @keyframes ltCore{40%{transform:scale(2.6)}100%{transform:scale(0);opacity:0}}
        .lt-flare{position:absolute;left:50%;top:calc(50% - 54px);width:220px;height:220px;margin:-110px 0 0 -110px;
          border-radius:50%;pointer-events:none;opacity:0;
          background:radial-gradient(circle,rgba(255,236,196,.55) 0%,rgba(155,140,255,.20) 38%,rgba(155,140,255,0) 68%);
          animation:ltFlare 470ms ease-out 1046ms forwards}
        @keyframes ltFlare{0%{opacity:0;transform:scale(.35)}28%{opacity:.95;transform:scale(.9)}100%{opacity:0;transform:scale(1.25)}}
        .lt-stack{position:relative;width:100%;max-width:300px;opacity:0;transform:scale(.86);transform-origin:50% 36%;
          animation:ltCard 300ms cubic-bezier(.2,.9,.25,1) 1286ms forwards}
        @keyframes ltCard{to{opacity:1;transform:scale(1)}}
        .lt-now{animation-delay:0ms!important}
        /* 편지 카드 — 글래스(반투명·블러) 대신 플랫: 불투명한 단색 면, 그림자 없음 */
        .glass{background:rgba(24,24,32,.94);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-radius:20px;position:relative}
        .lt-card{padding:18px 16px;min-height:240px;display:flex;flex-direction:column}
        .lt-from{font-size:13px;color:#9A9CAA;text-align:center;margin:0}
        .lt-msg{font-size:17px;font-weight:700;line-height:1.78;color:#F3F5FC;text-align:center;margin:auto 0;
          white-space:pre-line;word-break:keep-all}
        .lt-acts{display:flex;flex-direction:column;align-items:center;gap:15px;margin-top:22px}
        .lt-a1{background:var(--acc);color:var(--on-acc);box-shadow:0 0 22px rgba(var(--acc-rgb),.3);font-size:15px;font-weight:700;padding:13px 40px;border:none;
          border-radius:999px;cursor:pointer;font-family:inherit}
        .lt-a2{background:none;border:none;font-size:14px;color:#9A9CAA;cursor:pointer;
          padding:4px 8px;font-family:inherit}
        .lt-fade{opacity:0;transform:translateY(9px)}
        .lt-fade.f1{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1451ms forwards}
        .lt-fade.f2{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1521ms forwards}
        .lt-fade.f3{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1591ms forwards}
        @keyframes ltFade{to{opacity:1;transform:none}}
        .lt-ta{width:100%;min-height:104px;resize:none;background:#23262F;color:#F3F5FC;
          border:none;border-radius:14px;padding:13px 14px;font-size:15px;
          line-height:1.7;font-family:inherit;outline:none}
        .lt-ta::placeholder{color:#6B6E7A}
        textarea::placeholder{color:#6B6E7A}
        .lt-chip{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#D6DAE8;
          border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer;font-family:inherit}
        .lt-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 2px;
          border-bottom:1px solid #262A34;cursor:pointer;text-align:left;width:100%;
          background:none;border-left:0;border-right:0;border-top:0;font-family:inherit;color:inherit}
        /* 보낸 뒤: 별똥별이 보내기 버튼에서 오른쪽 위로 날아감 */
        .send-meteor{position:absolute;left:50%;bottom:40px;width:120px;height:2px;border-radius:2px;pointer-events:none;
          transform-origin:100% 50%;
          background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.85) 100%);
          animation:sendFly .8s cubic-bezier(.3,.6,.2,1) forwards}
        .send-meteor::after{content:"";position:absolute;right:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:#fff;
          box-shadow:0 0 12px 4px rgba(255,255,255,.6)}
        @keyframes sendFly{0%{transform:translate(-50%,0) rotate(-35deg) scaleX(.2);opacity:0}
          15%{opacity:1}100%{transform:translate(40vw,-70vh) rotate(-35deg) scaleX(1);opacity:0}}
        .lt-dot{width:6px;height:6px;border-radius:50%;background:#FFFFFF;flex:0 0 auto}
        @media(prefers-reduced-motion:reduce){
          .lt-meteor,.lt-flare{display:none}
          .lt-scrim,.lt-stack,.lt-fade{animation-duration:1ms!important;animation-delay:0ms!important}
        }
      `}</style>

      <NightBG/>
      <SkyDefs/>
      <div className="wrap" style={{position:"relative",zIndex:1}}>
        {/* 헤더 — 일반적인 앱 헤더 형식: 가운데 화면 전환, 오른쪽 편지함 */}
        <header className="navbar" style={{paddingTop:16,paddingBottom:16,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center"}}>
            <span/>
            <div className="gl" role="tablist" style={{...GLASS,borderRadius:999,display:"flex",gap:3,padding:3}}>
              {[["sky","오늘"],["review","회고"]].map(([k,l])=>(
                <button key={k} role="tab" aria-selected={tab===k} className="btn" onClick={()=>setTab(k)}
                  style={{padding:"7px 20px",borderRadius:999,border:"none",fontSize:15,fontWeight:700,
                    background:tab===k?"rgba(var(--acc-rgb),.18)":"transparent",color:tab===k?"var(--acc)":C.sub,
                    boxShadow:tab===k?"0 0 16px rgba(var(--acc-rgb),.18)":"none",
                    transition:"background .18s,color .18s,box-shadow .18s"}}>{l}</button>
              ))}
            </div>
            <div style={{justifySelf:"end"}}>
              {lettersOn&&
                <button className="btn" onClick={openBox} aria-label="받은 편지"
                  style={{...BTN_FILL,position:"relative",width:40,height:40,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <StarIcon size={22}/>
                  {unread.length>0&&<span style={{position:"absolute",top:5,right:5,width:7,height:7,
                    borderRadius:"50%",background:"#FFFFFF"}}/>}
                </button>}
            </div>
          </div>
          {notice&&
            <div style={{marginTop:12,background:"#2A2113",borderRadius:12,
              padding:"18px 16px",fontSize:13,color:"#E8C879",lineHeight:1.55}}>
              {notice}
            </div>}
        </header>

        {booting&&<LoadingView C={C} tab={tab}/>}

        {!booting&&tab==="sky"&&(
          <div className="fade">
            {/* 밤하늘 히어로 */}
            {/* 별자리 + 습관 진행률을 한 패널로 — 아래쪽은 회색 그라데이션으로 자연스럽게 이어짐 */}
            <div className="sky" style={{marginBottom:12}}>
              {/* 툴팁·이름표 위치(%)가 그래픽 높이 기준이 되도록 그래픽만 감쌈 */}
              <div style={{position:"relative"}}>
                <ConstellationSky
                  meStars={myStars} frStars={frStars}
                  activeColor={activeColor} allComplete={allComplete}
                  selStar={selStar} setSelStar={setSelStar}
                  person={person}
                  meName={meName} friendName={friendName}/>
              </div>
              <ProgressArea C={C} embedded rows={[{who:meName,color:GREEN,items:meProg},{who:friendName,color:VIOLET,items:frProg}]}/>
            </div>
            {/* 지금 보고 있지 않은 쪽의 달성 소식 — 초록 화면엔 소운, 소운 화면엔 초록 */}
            {person==="me"
              ? <CheerCard C={C} stars={frStars} name={friendName} onPraise={lettersOn?()=>compose(friendName,meName):null}/>
              : <CheerCard C={C} stars={myStars} name={meName} onPraise={lettersOn?()=>compose(meName,friendName):null}/>}

            {/* 날짜 스테퍼 — 위쪽 브리핑(하늘·진행률·소식)과 구획을 분명히 나눔 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"40px 0 12px"}}>
              <button className="btn" onClick={()=>setSelDate(toISO(addDays(fromISO(selDate),-1)))} style={arrowBtn(C)}>←</button>
              <div style={{fontSize:16,fontWeight:700,minWidth:118,textAlign:"center"}}>{fromISO(selDate).getMonth()+1}월 {fromISO(selDate).getDate()}일 ({WD[(fromISO(selDate).getDay()+6)%7]})</div>
              <button className="btn" onClick={()=>{const n=addDays(fromISO(selDate),1);if(n<=new Date())setSelDate(toISO(n));}}
                style={{...arrowBtn(C),opacity:selDate>=today?0.3:1}}>→</button>
            </div>

            {/* 습관 목록 — 카드 하나 안에 항목을 나란히, 항목 사이는 가는 구분선.
                노션 모드에서는 양쪽 다 실제 기록, 양쪽 다 체크 가능 */}
            {(()=>{
              const rows=(isNotion||person==="me")
                ? activeHabits.map(h=>{const wc=weekCount(h.id),tgt=tgtOf(h);
                    return {h,on:isLogged(h.id,selDate),sub:wc>=tgt?"완성":`${wc}/${tgt}`,done:wc>=tgt,onTap:(e)=>toggleLog(h.id,selDate,e?.currentTarget)};})
                : sortHabits(FRIEND_HABITS).map(h=>{const tgt=tgtOf(h),d=h.done>=tgt;
                    return {h,on:d,sub:d?"완성":`${h.done}/${tgt}`,done:d,onTap:null};});
              if(!rows.length) return isNotion&&
                <div className="gl" style={{...GLASS,borderRadius:20,padding:"18px 16px",
                  fontSize:14,color:C.sub,lineHeight:1.6,textAlign:"center"}}>
                  소유자가 <b style={{color:C.ink,fontWeight:600}}>{person==="me"?meName:friendName}</b>인 습관이 노션에 없어요.
                  {owners.length>0&&<><br/><span className="mono" style={{fontSize:12}}>DB에 있는 소유자: {owners.join(" · ")}</span></>}
                </div>;
              return(
                /* 항목 사이는 구분선 없이 여백만. 체크한 항목은 행 자체에 배경이 깔려 한눈에 구분 */
                <div className="gl" style={{...GLASS,borderRadius:20,padding:6,display:"flex",flexDirection:"column",gap:4}}>
                  {rows.map((r,i)=>(
                    <div key={r.h.id} className={r.onTap?"row-tap":""} {...(r.onTap?longPress(r.h,r.onTap):{})}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 10px",
                        borderRadius:14,background:pressing===r.h.id?"rgba(var(--acc-rgb),.14)":r.on?"rgba(var(--acc-rgb),.07)":"transparent",
                        transform:pressing===r.h.id?"scale(.985)":"none",transition:"background .15s,transform .15s",
                        cursor:r.onTap?"pointer":"default"}}>
                      <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
                        {/* 이모지마다 크기감이 달라 보이지 않도록 같은 원 안에 작게 */}
                        <span style={{width:40,height:40,borderRadius:"50%",background:r.on?"rgba(var(--acc-rgb),.12)":"rgba(255,255,255,.06)",flex:"0 0 auto",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}><span className="emo">{emojiOf(r.h)}</span></span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:600,wordBreak:"keep-all"}}>{r.h.name}
                            {notes[noteKey(r.h.id,selDate)]&&<span title="메모 있음" style={{display:"inline-block",width:6,height:6,borderRadius:"50%",
                              background:"var(--acc)",marginLeft:7,verticalAlign:"middle",position:"relative",top:-1}}/>}</div>
                          <div className="mono" style={{fontSize:13,color:r.done?C.ink:C.sub,marginTop:3,fontWeight:r.done?700:400}}>{r.sub}</div>
                        </div>
                      </div>
                      <span style={{width:28,height:28,borderRadius:9,flex:"0 0 auto",border:r.on?"none":"2px solid rgba(255,255,255,.2)",
                        background:r.on?"var(--acc)":"transparent",boxShadow:r.on?"0 0 14px rgba(var(--acc-rgb),.55)":"none",display:"flex",alignItems:"center",justifyContent:"center",
                        color:"var(--on-acc)",fontSize:15,fontWeight:800,transition:"background .15s"}}>{r.on?"✓":""}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {lettersOn&&
              <button className="btn" onClick={()=>person==="me"?compose(partner):compose(meName,friendName)}
                style={{...BTN_PRIMARY,width:"100%",marginTop:12,padding:"15px 0",fontSize:15}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}><StarIcon size={18}/>{(person==="me"?partner:meName)}에게 별똥별 보내기</span>
              </button>}

            {/* 습관 목록은 노션에서 관리 — 습관 DB를 바로 엽니다 (노션 앱이 있으면 앱으로) */}
            {isNotion&&
              <a href={habitsUrl} target="_blank" rel="noopener noreferrer"
                style={{display:"block",width:"fit-content",margin:"14px auto 0",padding:"8px 12px",fontSize:14,fontWeight:400,
                  color:"rgba(163,162,189,.7)",textDecoration:"none"}}>
                해빗 수정하기
              </a>}

            {/* 노션 모드에서는 목록을 노션에서 관리하므로, 눌러도 안내만 나오던 버튼을 감춥니다 */}
            {!isNotion&&<>
              <button className="btn" onClick={()=>setShowManage(s=>!s)}
                style={{background:"none",border:"none",color:C.sub,fontSize:14,marginTop:16,padding:4}}>
                {showManage?"닫기":"습관 추가 · 정리"}
              </button>
              {showManage&&<Manage C={C} habits={habits} setHabits={setHabits}/>}
            </>}
            {personSwitch}
          </div>
        )}

        {!booting&&tab==="review"&&(
          <div className="fade">
            {/* 지난주 이맘때 vs 지금 — 과거의 나를 이기고 싶게 */}
            <PaceCard C={C} p={paceOf(activeHabits)} color={activeColor}/>

            {(isNotion||person==="me")
              ? activeHabits.length>0&&
                /* 습관별 잔디밭 — 카드 하나 안에 차례로, 행을 누르면 상세 페이지 */
                <div className="gl" style={{...GLASS,borderRadius:20,padding:"6px 6px",display:"flex",flexDirection:"column",gap:2}}>
                  {activeHabits.map(h=>(
                    <HabitGrassRow key={h.id} C={C} st={habitStats(h)} today={today} onOpen={()=>openDetail(h.id)}/>
                  ))}
                </div>
              : <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {sortHabits(FRIEND_HABITS).map(h=>(
                    <FriendChronicleRow key={h.id} h={h} C={C} col={VIOLET}/>
                  ))}
                </div>}
            {personSwitch}
          </div>
        )}
      </div>
      {noteFor&&<NoteSheet C={C} h={noteFor.h} date={noteFor.date} initial={notes[noteKey(noteFor.h.id,noteFor.date)]||""}
        onClose={()=>setNoteFor(null)} onSave={(t)=>saveNote(noteFor.h,noteFor.date,t)}/>}
      {detailHabit&&<HabitDetail C={C} st={habitStats(detailHabit)} today={today} isNotion={isNotion}
        onClose={closeDetail} onCheckToday={()=>toggleLog(detailHabit.id,today)}/>}
      {modal&&modal.type==="read"&&
        <LetterModal letter={modal.letter} onClose={closeLetter}
          onReply={()=>compose(modal.letter.from||partner)}/>}
      {modal&&modal.type==="compose"&&
        <ComposeSheet C={C} to={modal.to} sending={sending}
          onClose={()=>setModal(null)} onSend={(txt)=>sendLetter(modal.to,txt,modal.from)}
          onSent={()=>{setModal(null);setToast("별똥별을 보냈어요");}}/>}
      {modal&&modal.type==="box"&&
        <LetterBox C={C} letters={letters} who={who} owners={owners.length>1?owners:[meName,friendName]}
          onPick={(l)=>setModal({type:"read",letter:l})} onClose={()=>setModal(null)}
          onOwner={setOwnerOfDevice}/>}
      {cheer&&<GoalCheer key={cheer.key} c={cheer}/>}
      {toast&&<Toast C={C} text={toast}/>}
      {splash!=="off"&&<Splash out={splash==="out"} name={person==="me"?meName:friendName} color={person==="me"?GREEN:VIOLET}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   로딩 화면
   빈 하늘 아래에 글자만 있던 것을 → 하늘 안에서 별자리가 이어지는 애니메이션으로.
   아래에는 실제 화면과 같은 자리·크기의 뼈대를 깔아서, 데이터가 오면
   화면이 튀지 않고 그 자리에 그대로 채워집니다.
   오래 걸리면 문구를 바꿔 멈춘 게 아니라는 걸 알려줍니다.
══════════════════════════════════════════════════════════ */
const LD_STARS=[[214,118],[252,92],[292,120],[330,96],[352,140],[300,166],[248,160]];
function LoadingView({C,tab}){
  const [slow,setSlow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setSlow(true),3500);return()=>clearTimeout(t);},[]);
  const bg=useMemo(()=>Array.from({length:34},(_,i)=>{
    const a=Math.sin(i*12.9898+1)*43758.5453,b=Math.sin(i*78.233+2)*43758.5453;
    const rx=a-Math.floor(a),ry=b-Math.floor(b);
    return {x:(rx*560).toFixed(1),y:(ry*296).toFixed(1),r:(0.5+rx*0.8).toFixed(2),d:(ry*3).toFixed(2)};
  }),[]);
  const n=LD_STARS.length, step=2.8/(n+2);   // 별이 하나씩 이어지는 간격
  return(
    <div className="fade" role="status" aria-live="polite">
      <div className="sky" style={{marginBottom:12}}>
        <svg viewBox="0 0 560 296" width="100%" style={{display:"block"}} aria-hidden="true">
          <ellipse cx="280" cy="140" rx="160" ry="110" fill="url(#neb-y)"/>
          {bg.map((s,i)=><circle key={i} className="ld-bg" cx={s.x} cy={s.y} r={s.r} fill="#D8DCF5"
            style={{animationDelay:`${s.d}s`}}/>)}
          {LD_STARS.slice(1).map((p,i)=>{
            const a=LD_STARS[i];
            return <line key={i} className="ld-line" pathLength="1" x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]}
              stroke="#fff" strokeOpacity=".45" strokeWidth=".9" strokeLinecap="round" style={{animationDelay:`${i*step}s`}}/>;
          })}
          {LD_STARS.map((p,i)=>(
            <g key={i} className="ld-star" style={{animationDelay:`${Math.max(0,i-0.6)*step}s`}}>
              <circle cx={p[0]} cy={p[1]} r="13" fill="url(#halo-y)" opacity=".7"/>
              <path d={sparklePath(p[0],p[1],6)} fill="#fff" filter="url(#glow)"/>
            </g>
          ))}
        </svg>
        <p key={slow?"s":"f"} className="ld-msg" style={{position:"absolute",left:0,right:0,bottom:"16%",margin:0,
          textAlign:"center",fontSize:14,color:C.sub}}>
          {slow?"노션에서 기록을 가져오고 있어요":"별을 불러오는 중이에요"}
        </p>
      </div>
      {/* 실제 화면 자리에 맞춘 뼈대 */}
      {tab==="sky"
        ? <>
            <div className="sk" style={{height:32,margin:"40px auto 12px",width:200,borderRadius:999}}/>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              <div className="sk" style={{height:296,borderRadius:20}}/>
            </div>
          </>
        : <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[0,1,2].map(i=><div key={i} className="sk" style={{height:118,animationDelay:`${i*0.08}s`}}/>)}
          </div>}
    </div>
  );
}

/* 스플래시 — 밤하늘 위에 인사가 한 줄씩 떠오름: "소운아," → "오늘도 수고 많았어" (문구는 5개 중 하나) */
const callName=(n)=>{const c=n.charCodeAt(n.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0?`${n}아`:`${n}야`;};
const SPLASH_LINES=["오늘도 수고 많았어","오늘 하루는 어땠어?","왔구나, 기다리고 있었어","천천히 해도 괜찮아","오늘도 반가워"];
function Splash({out,name,color}){
  const [line]=useState(()=>SPLASH_LINES[Math.floor(Math.random()*SPLASH_LINES.length)]);   // 열 때마다 하나씩 돌아가며
  return(
    <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:200,
      opacity:out?0:1,transition:reduceMotion?"none":"opacity .5s ease",pointerEvents:out?"none":"auto"}}>
      <NightBG vivid/>
      <div style={{position:"absolute",left:28,right:28,bottom:"18%",fontSize:22,fontWeight:500,lineHeight:1.5,letterSpacing:"-0.01em"}}>
        <div className="sp-line" style={{animationDelay:".25s",color,fontWeight:600}}>{callName(name)},</div>
        <div className="sp-line" style={{animationDelay:".95s",color:"#F3F2FA"}}>{line}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   알림 토스트
══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   별똥별 편지 — 도착 / 쓰기 / 지난 편지
══════════════════════════════════════════════════════════ */

function LetterModal({letter,onClose,onReply}){
  useEffect(()=>{
    const esc=(e)=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",esc);
    return()=>document.removeEventListener("keydown",esc);
  },[onClose]);
  return (
    <div className="lt-wrap" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lt-scrim"/>
      <div className="lt-flare"/>
      <div className="lt-meteor"><div className="tail"/><div className="core"/></div>
      <div className="lt-stack" onClick={e=>e.stopPropagation()}>
        <div className="glass lt-card">
          <p className="lt-from lt-fade f1">{(letter.from||"누군가")}의 편지</p>
          <p className="lt-msg lt-fade f2">{letter.text}</p>
        </div>
        <div className="lt-acts lt-fade f3">
          <button className="lt-a1" onClick={onReply}>답장 보내기</button>
          <button className="lt-a2" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* iOS 사파리는 '누른 그 순간'의 focus()에만 키보드를 띄웁니다.
   그래서 누를 때 숨은 입력칸에 먼저 포커스를 주고(키보드가 열림),
   작성 화면이 그려지면 실제 입력칸으로 포커스를 옮깁니다(키보드 유지). */
let kbProxy=null;
function primeKeyboard(){
  try{
    if(!kbProxy){
      kbProxy=document.createElement("input");
      kbProxy.setAttribute("aria-hidden","true"); kbProxy.tabIndex=-1;
      Object.assign(kbProxy.style,{position:"fixed",top:"0",left:"0",width:"1px",height:"1px",opacity:"0",
        fontSize:"16px",border:"0",padding:"0",pointerEvents:"none"});
      document.body.appendChild(kbProxy);
    }
    kbProxy.focus({preventScroll:true});
  }catch(e){}
}

/* 키보드를 뺀 '보이는 화면' 크기 — 하단 버튼을 키보드 바로 위에 붙이는 데 씁니다 */
function useVisualViewport(){
  const get=()=>{const v=window.visualViewport;return v?{h:v.height,top:v.offsetTop}:{h:window.innerHeight,top:0};};
  const [vp,setVp]=useState(get);
  useEffect(()=>{
    const v=window.visualViewport; if(!v) return;
    const on=()=>setVp(get());
    v.addEventListener("resize",on); v.addEventListener("scroll",on);
    return()=>{v.removeEventListener("resize",on);v.removeEventListener("scroll",on);};
  },[]);
  return vp;
}

/* 습관 메모 — 별똥별 편지와 같은 모달. 저장 버튼은 키보드 바로 위 */
function NoteSheet({C,h,date,initial,onClose,onSave}){
  const [text,setText]=useState(initial);
  const [busy,setBusy]=useState(false);
  const ref=useRef(null);
  const vp=useVisualViewport();
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;el.focus({preventScroll:true});const n=el.value.length;el.setSelectionRange(n,n);},[]);
  useEffect(()=>{ const o=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.body.style.overflow=o;}; },[]);
  useEffect(()=>{const esc=(e)=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",esc);return()=>document.removeEventListener("keydown",esc);},[onClose]);
  const d=fromISO(date), changed=text.trim()!==initial.trim();
  const save=async(t)=>{setBusy(true);const ok=await onSave(t);setBusy(false);if(ok)onClose();};
  const W={width:"100%",maxWidth:440};
  return(
    <div role="dialog" aria-modal="true" aria-label={`${h.name} 메모`}
      style={{position:"fixed",left:0,right:0,top:vp.top,height:vp.h,zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 16px 0"}}>
      <div onClick={()=>{if(!changed)onClose();}} style={{position:"absolute",inset:0,background:"rgba(4,5,10,.86)",animation:reduceMotion?"none":"fade .18s ease"}}/>
      <div style={{flex:1,minHeight:0,display:"flex",alignItems:"center",justifyContent:"center",...W,position:"relative",pointerEvents:"none"}}>
        <div className="gl edge" style={{...W,maxHeight:"100%",display:"flex",flexDirection:"column",background:"rgba(24,24,32,.94)",position:"relative",
          borderRadius:20,pointerEvents:"auto",WebkitBackdropFilter:"blur(20px)",backdropFilter:"blur(20px)",padding:"18px 16px",animation:reduceMotion?"none":"fade .18s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div>
              <div style={{fontSize:13,color:C.sub,marginTop:4}}>{d.getMonth()+1}월 {d.getDate()}일 {DAYS[(d.getDay()+6)%7]}요일 메모</div>
            </div>
            <button className="btn" onClick={onClose} style={{...BTN_FILL,height:36,padding:"0 14px",fontSize:14,flex:"0 0 auto"}}>취소</button>
          </div>
          <textarea ref={ref} value={text} maxLength={1000} onChange={e=>setText(e.target.value)}
            placeholder="오늘 이 습관은 어땠어요?" aria-label="메모 내용"
            style={{flex:1,minHeight:140,width:"100%",resize:"none",background:"transparent",border:"none",outline:"none",
              color:C.ink,fontSize:17,lineHeight:1.7,fontFamily:"inherit",padding:0}}/>
          {initial&&<button className="btn" onClick={()=>save("")} disabled={busy}
            style={{alignSelf:"flex-start",background:"none",border:"none",padding:"8px 0 0",fontSize:14,color:"rgba(163,162,189,.7)",fontFamily:"inherit"}}>메모 지우기</button>}
        </div>
      </div>
      <div style={{...W,position:"relative",flex:"0 0 auto",padding:"12px 0 calc(12px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
        <button className="btn" disabled={!changed||busy} onMouseDown={e=>e.preventDefault()} onClick={()=>save(text)}
          style={{...BTN_PRIMARY,display:"block",width:"100%",padding:"15px 0",fontSize:16,pointerEvents:"auto",
            ...(changed&&!busy?{}:{background:"#34343F",color:"#8C8B9E",boxShadow:"none",cursor:"default"})}}>
          {busy?"저장하는 중…":"저장"}
        </button>
      </div>
    </div>
  );
}

/* 별똥별 보내기 — 가운데 모달(기존보다 넓게). 열리자마자 입력 상태, 보내기 버튼은 키보드 바로 위에 떠 있음 */
function ComposeSheet({C,to,onClose,onSend,onSent,sending}){
  const [text,setText]=useState("");
  const [sent,setSent]=useState(false);   // 보낸 뒤 별똥별 연출
  const ref=useRef(null);
  const vp=useVisualViewport();
  useLayoutEffect(()=>{ ref.current&&ref.current.focus({preventScroll:true}); },[]);
  useEffect(()=>{ const o=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.body.style.overflow=o;}; },[]);
  useEffect(()=>{
    const esc=(e)=>{if(e.key==="Escape"&&!sent)onClose();};
    document.addEventListener("keydown",esc); return()=>document.removeEventListener("keydown",esc);
  });
  const send=async()=>{
    const ok=await onSend(text.trim());
    if(!ok) return;
    if(ref.current) ref.current.blur();
    setSent(true);
    setTimeout(onSent, reduceMotion?0:900);
  };
  const left=300-text.length, canSend=!!text.trim()&&!sending&&!sent;
  const W={width:"100%",maxWidth:440};

  return(
    /* 키보드를 뺀 '보이는 화면' 안에 모달 + 하단 버튼을 배치 */
    <div role="dialog" aria-modal="true" aria-label={`${to}에게 편지 쓰기`}
      style={{position:"fixed",left:0,right:0,top:vp.top,height:vp.h,zIndex:100,display:"flex",flexDirection:"column",
        alignItems:"center",padding:"16px 16px 0",opacity:sent?0:1,transition:sent?"opacity .3s ease .55s":"none"}}>
      {/* 바깥을 눌러 닫기 — 쓰던 글이 있으면 실수로 날리지 않도록 무시 */}
      <div onClick={()=>{if(!text.trim()&&!sent)onClose();}}
        style={{position:"absolute",inset:0,background:"rgba(4,5,10,.86)",animation:reduceMotion?"none":"fade .18s ease"}}/>
      {/* 배치용 래퍼는 클릭을 통과시켜, 모달 바깥을 누르면 뒤의 어두운 면이 받도록 */}
      <div style={{flex:1,minHeight:0,display:"flex",alignItems:"center",justifyContent:"center",...W,position:"relative",pointerEvents:"none"}}>
        <div className="gl edge" style={{...W,maxHeight:"100%",display:"flex",flexDirection:"column",background:"rgba(24,24,32,.94)",position:"relative",borderRadius:20,pointerEvents:"auto",WebkitBackdropFilter:"blur(20px)",backdropFilter:"blur(20px)",
          padding:"18px 16px",animation:reduceMotion?"none":"fade .18s ease"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
            <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.02em",margin:0}}>{to}에게</h2>
            <button className="btn" onClick={()=>{if(!sent)onClose();}}
              style={{...BTN_FILL,height:36,padding:"0 14px",fontSize:14}}>취소</button>
          </div>
          {/* 상자 속 상자 없이 — 모달 면 위에 바로 씀 */}
          <textarea ref={ref} value={text} maxLength={300} onChange={e=>setText(e.target.value)}
            placeholder="한 줄이면 충분해요" aria-label="편지 내용"
            style={{flex:1,minHeight:140,width:"100%",resize:"none",background:"transparent",border:"none",outline:"none",
              color:C.ink,fontSize:17,lineHeight:1.7,fontFamily:"inherit",padding:0}}/>
          {left<=50&&<div className="mono" style={{textAlign:"right",fontSize:13,color:left<=10?"#E8C879":C.sub,marginTop:6}}>{left}자 남음</div>}
        </div>
      </div>
      {/* 보내기 — 화면 아래(키보드가 열리면 그 바로 위)에 떠 있는 버튼 */}
      <div style={{...W,position:"relative",flex:"0 0 auto",padding:"12px 0 calc(12px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
        <button className="btn" disabled={!canSend} onMouseDown={e=>e.preventDefault()} onClick={send}
          style={{...BTN_PRIMARY,display:"block",width:"100%",padding:"15px 0",fontSize:16,pointerEvents:"auto",
            ...(canSend||sent?{}:{background:"#34343F",color:"#8C8B9E",boxShadow:"none",cursor:"default"})}}>
          {sent?"보냈어요":sending?"보내는 중…":"별똥별로 보내기"}
        </button>
      </div>
      {sent&&!reduceMotion&&<div className="send-meteor"/>}
    </div>
  );
}

function LetterBox({C,letters,who,owners,onPick,onClose,onOwner}){
  return (
    <div className="lt-wrap" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lt-scrim" style={{animationDelay:"0ms"}}/>
      <div className="lt-stack lt-now" onClick={e=>e.stopPropagation()}>
        <div className="glass" style={{padding:"18px 16px",maxHeight:"62vh",overflowY:"auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:16,fontWeight:700,color:"#F3F5FC"}}>지난 편지</span>
            <label style={{fontSize:12,color:"#9A9CAA",display:"flex",alignItems:"center",gap:6}}>
              이 기기의 주인
              <select id="lt-owner" value={who} onChange={e=>onOwner(e.target.value)}
                style={{background:"#23262F",color:"#EDEFF7",border:"none",
                  borderRadius:8,padding:"5px 8px",fontSize:13,fontFamily:"inherit"}}>
                {owners.filter(Boolean).map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>
          {letters.length===0
            ? <p style={{fontSize:14,color:"#9A9CAA",lineHeight:1.7,margin:"14px 0 6px"}}>
                아직 도착한 편지가 없어요.
              </p>
            : letters.map(l=>(
                <button key={l.id} className="lt-row" onClick={()=>onPick(l)}>
                  <span style={{minWidth:0}}>
                    <span style={{display:"block",fontSize:15,color:"#E9ECF6",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.text}</span>
                    <span style={{display:"block",fontSize:12,color:"#9A9CAA",marginTop:3}}>
                      {l.from} · {l.date}
                    </span>
                  </span>
                  {!l.read&&<span className="lt-dot"/>}
                </button>
              ))}
        </div>
        <div className="lt-acts"><button className="lt-a2" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  );
}

/* 이번 주 목표를 채운 순간 — 체크칸에서 별 조각이 흩어지고, 가운데에 큰 별이 떠오르며 축하 문구.
   화면 터치는 막지 않고(pointer-events:none) 2.6초 뒤 저절로 사라집니다 */
function GoalCheer({c}){
  const {h,x,y}=c;
  const bits=useMemo(()=>Array.from({length:12},(_,i)=>{
    const a=i/12*Math.PI*2+rnd(i,c.key%97)*.5, d=46+rnd(i,c.key%89+1)*54;
    return {dx:Math.cos(a)*d, dy:Math.sin(a)*d-18, r:4+rnd(i,c.key%83+2)*6, rot:(rnd(i,5)-.5)*220, delay:rnd(i,6)*.12};
  }),[c.key]);
  const freq=h.kind==="daily"?"매일":`주 ${h.target}회`;
  return(
    <div aria-live="polite" style={{position:"fixed",inset:0,zIndex:60,pointerEvents:"none"}}>
      {/* 아래 글자와 겹쳐 읽히지 않도록 화면을 잠깐 어둡게 — 가운데일수록 더 */}
      <div className="gc-scrim" style={{position:"absolute",inset:0,
        background:"radial-gradient(70% 45% at 50% 40%,rgba(4,4,9,.9) 0%,rgba(4,4,9,.72) 55%,rgba(4,4,9,.55) 100%)"}}/>
      {!reduceMotion&&<svg width="100%" height="100%" style={{position:"absolute",inset:0,overflow:"visible"}}>
        <circle cx={x} cy={y} r="34" fill="none" stroke="var(--acc)" strokeWidth="1.5" className="gc-ring"
          style={{transformOrigin:`${x}px ${y}px`}}/>
        {bits.map((b,i)=>(
          <g key={i} className="gc-bit" style={{"--dx":`${b.dx}px`,"--dy":`${b.dy}px`,"--rot":`${b.rot}deg`,
            transformOrigin:`${x}px ${y}px`,animationDelay:`${b.delay}s`}}>
            <path d={sparklePath(x,y,b.r)} fill={i%3===0?"#fff":"var(--acc)"} filter="url(#glow)"/>
          </g>
        ))}
      </svg>}
      <div className="gc-card" style={{position:"absolute",left:"50%",top:"40%",display:"flex",flexDirection:"column",alignItems:"center",
        textAlign:"center",width:"min(80vw,300px)"}}>
        <svg width="132" height="132" viewBox="-66 -66 132 132" style={{overflow:"visible"}}>
          <circle r="64" fill="rgba(var(--acc-rgb),.16)" filter="url(#bokeh)"/>
          <circle r="34" fill="rgba(var(--acc-rgb),.35)" filter="url(#bokeh)"/>
          <g className={reduceMotion?"":"gc-star"}>
            <path d={sparklePath(0,0,40)} fill="var(--acc)" filter="url(#glow)"/>
            <path d={sparklePath(0,0,22)} fill="#fff" opacity=".9"/>
          </g>
          <path d={sparklePath(42,-34,7)} fill="#fff" className={reduceMotion?"":"twk"}/>
          <path d={sparklePath(-46,26,5)} fill="var(--acc)" className={reduceMotion?"":"twk"} style={{animationDelay:"1.1s"}}/>
        </svg>
        <div style={{marginTop:4,fontSize:20,fontWeight:800,color:"#fff",textShadow:"0 2px 16px #000"}}>이번 주 목표 달성!</div>
        <div style={{marginTop:6,fontSize:14,fontWeight:600,color:"var(--acc)",textShadow:"0 2px 12px #000",
          maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          <span className="emo">{emojiOf(h)}</span> {h.name}</div>
        <div className="mono" style={{marginTop:4,fontSize:13,color:"#C9C8DD",textShadow:"0 2px 12px #000"}}>{freq} 완성 · 별 하나가 환하게 켜졌어요</div>
      </div>
    </div>
  );
}

function Toast({C,text}){
  return (
    <div className="fade" style={{position:"fixed",left:"50%",bottom:22,transform:"translateX(-50%)",zIndex:50,
      maxWidth:"min(92vw,420px)",background:"rgba(26,27,62,.96)",borderRadius:12,
      padding:"12px 16px",fontSize:14,color:C.ink,boxShadow:"0 8px 30px #00000070",lineHeight:1.5}}>{text}</div>
  );
}

/* ══════════════════════════════════════════════════════════
   밤하늘: 1인 1별자리 SVG
   나(좌) + 소운(우) 동시에 그려지며, 각자 이어진 별자리 1개.
   별의 밝기 = 해당 습관의 주간 달성률.
   선택한 별 위에 툴팁.
   allComplete 시 번쩍이는 폭발 연출.
══════════════════════════════════════════════════════════ */


function ConstellationSky({meStars,frStars,activeColor,allComplete,selStar,setSelStar,person,meName,friendName}){
  const bg=useMemo(()=>Array.from({length:70},(_,i)=>({x:rnd(i,1)*560,y:rnd(i,2)*296,r:.35+rnd(i,3)*.9,o:.15+rnd(i,4)*.45,d:rnd(i,5)*5})),[]);
  const bokeh=useMemo(()=>Array.from({length:9},(_,i)=>({x:30+rnd(i,7)*500,y:20+rnd(i,8)*256,r:1.6+rnd(i,9)*2.2,o:.18+rnd(i,10)*.25})),[]);

  /* 별자리를 1.7배로 — 각자 반쪽 하늘의 대부분을 채우도록 */
  const SC=2.38, ME_C=[148,158], FR_C=[412,158];   // 1.7 → 2.38 (1.4배)
  const mePts = buildPoints(meStars, ME_C, SC);
  const frPts = buildPoints(frStars, FR_C, SC);
  const meAll = meStars.length>0 && meStars.every(s=>s.complete);
  const frAll = frStars.length>0 && frStars.every(s=>s.complete);

  /* 글자는 SVG 밖(HTML)에 실제 px 크기로 — SVG 안에 두면 폰에서 7px까지 줄어듭니다 */
  const lab=(x,col,on)=>({position:"absolute",top:22,left:`${x/560*100}%`,transform:"translateX(-50%)",
    fontSize:13,fontWeight:700,color:col,opacity:on?0.95:0.4,pointerEvents:"none",whiteSpace:"nowrap",
    textShadow:on?`0 0 12px ${col}88`:"none"});
  const tip=selStar&&(()=>{
    const star=(person==="me"?meStars:frStars).find(s=>s.id===selStar);
    const pt=(person==="me"?mePts:frPts).find(p=>p.id===selStar);
    return star&&pt?{star,pt}:null;
  })();
  return(<>
    <span style={lab(ME_C[0],GREEN,person!=="friend")}>{meName||"초록"}</span>
    <span style={lab(FR_C[0],VIOLET,person!=="me")}>{friendName||"소운"}</span>
    {tip&&<StarTooltip star={tip.star} pt={tip.pt} color={person==="me"?GREEN:VIOLET}/>}
    <svg viewBox="0 0 560 296" width="100%" style={{display:"block"}} onClick={()=>setSelStar(null)}>
      {/* 성운 — 각자의 색으로 은은하게 + 가운데 따뜻한 빛 */}
      <ellipse cx="280" cy="150" rx="170" ry="120" fill="url(#neb-warm)"/>
      <ellipse cx={ME_C[0]} cy={ME_C[1]} rx="150" ry="115" fill="url(#neb-y)" opacity={person==="friend"?.5:1}/>
      <ellipse cx={FR_C[0]} cy={FR_C[1]} rx="150" ry="115" fill="url(#neb-v)" opacity={person==="me"?.5:1}/>
      {/* 배경 별: 작은 별 + 초점이 흐린 큰 별 */}
      {bg.map((t,i)=><circle key={i} className={i%4===0&&!reduceMotion?"twk":""} cx={t.x} cy={t.y} r={t.r} fill="#D8DCF5" opacity={t.o}
        style={{pointerEvents:"none",animationDelay:`${t.d}s`}}/>)}
      {bokeh.map((t,i)=><circle key={"b"+i} cx={t.x} cy={t.y} r={t.r} fill="#fff" opacity={t.o} filter="url(#bokeh)" style={{pointerEvents:"none"}}/>)}

      <OneStar stars={meStars} pts={mePts} color={GREEN} allComplete={meAll} scale={1.6}
        selStar={person==="me"?selStar:null}
        onSelect={id=>{ if(person==="me") setSelStar(k=>k===id?null:id); }}
        dim={person==="friend"}/>
      <OneStar stars={frStars} pts={frPts} color={VIOLET} allComplete={frAll} scale={1.6}
        selStar={person==="friend"?selStar:null}
        onSelect={id=>{ if(person==="friend") setSelStar(k=>k===id?null:id); }}
        dim={person==="me"}/>

    </svg>
  </>);
}

function buildPoints(stars, center, scale=1.0){
  const n=stars.length; if(!n) return [];
  const layout=layoutFor(n, center[0]>280);
  return stars.map((s,i)=>({id:s.id, x:center[0]+layout[i][0]*scale, y:center[1]+layout[i][1]*scale}));
}

/* 별자리 컴포넌트: 선 + 별들 */
function OneStar({stars,pts,color,allComplete,selStar,onSelect,dim,scale=1}){
  if(!stars.length||!pts.length) return null;
  const node=(i)=>({s:stars[i],p:pts[i]});
  const order=connOrder(stars.length);
  const pairs=LAYOUTS[stars.length]
    ? order.slice(1).map((b,k)=>[node(order[k]),node(b)])
    : figureFor(stars.length).edges.map(([a,b])=>[node(a),node(b)]);
  return(
    <g opacity={dim?0.6:1}>
      <ConstLines pairs={pairs} scale={scale}/>
      {stars.map((s,i)=>{
        const pt=pts[i];
        return(
          <g key={s.id} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();onSelect(s.id);}}>
            <circle cx={pt.x} cy={pt.y} r={26} fill="transparent"/>
            {selStar===s.id&&<circle cx={pt.x} cy={pt.y} r={20*scale} fill="none" stroke="#fff" strokeWidth=".8" strokeDasharray="2 3" opacity=".5"/>}
            <GlowStar x={pt.x} y={pt.y} ratio={s.ratio} color={color} complete={s.complete} scale={scale} twinkle={rnd(i,11)*4}/>
          </g>
        );
      })}
    </g>
  );
}

function connOrder(n){
  const orders={
    1:[0],2:[0,1],3:[0,1,2],4:[0,1,3,2],5:[0,1,2,3,4],
    6:[0,5,1,4,2,3],7:[0,1,2,3,4,5,6],8:[0,1,2,3,4,5,6,7],
  };
  return orders[n]||Array.from({length:n},(_,i)=>i);
}

/* 별 툴팁 — HTML로 그려서 폰에서도 읽히는 크기 유지. 별 위에 뜨고, 양 끝에선 안쪽으로 붙습니다 */
function StarTooltip({star,pt,color}){
  const pct=Math.round(star.ratio*100);
  const edge=pt.x<110?"left":pt.x>450?"right":"center";
  const tx=edge==="left"?"-18px":edge==="right"?"calc(-100% + 18px)":"-50%";
  return(
    <div className="gl edge" style={{position:"absolute",left:`${pt.x/560*100}%`,top:`${pt.y/296*100}%`,zIndex:2,
      transform:`translate(${tx}, calc(-100% - 16px))`,pointerEvents:"none",
      background:"rgba(16,17,44,.9)",borderRadius:12,padding:"8px 12px",textAlign:"center",whiteSpace:"nowrap",
      WebkitBackdropFilter:"blur(10px)",backdropFilter:"blur(10px)",boxShadow:"0 6px 20px #00000080"}}>
      <div style={{fontSize:14,fontWeight:700,color:"#EEEDF7"}}><span className="emo">{star.emoji}</span> {star.name}</div>
      <div className="mono" style={{fontSize:12,fontWeight:700,color,marginTop:3}}>{star.done}/{star.target} ({pct}%)</div>
    </div>
  );
}

/* ── ProgressArea ── */
function ProgressArea({C,rows,embedded=false}){
  return(
    <div className={embedded?undefined:"gl"} style={{...(embedded
        ? {position:"relative",marginTop:-28,padding:"34px 16px 18px",
           background:"linear-gradient(180deg,rgba(150,150,170,0) 0%,rgba(150,150,170,.07) 45%,rgba(150,150,170,.12) 100%)"}
        : {...GLASS,borderRadius:16,padding:"18px 16px",marginBottom:12}),
      display:"flex",flexDirection:"column",gap:18,overflow:"hidden"}}>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"flex",alignItems:"flex-start",gap:12,minWidth:0}}>
          {/* 이름을 그대로 적습니다 — 보는 사람에 따라 '나'가 달라지므로 */}
          <span style={{width:52,height:26,display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:700,
            color:C.ink,flex:"0 0 auto",marginTop:4,whiteSpace:"nowrap",overflow:"hidden"}}>
            {row.who}</span>
          {/* 한 줄로 고정하고, 다 못 담으면 좌우로 스와이프해서 봅니다 */}
          <div className="pa-row" style={{display:"flex",flexWrap:"nowrap",gap:9,flex:1,minWidth:0,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
            {row.items.map(it=>(
              <div key={it.key} style={{flex:"0 0 auto",width:40,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                <span className="emo" style={{fontSize:15}}>{it.emoji}</span>
                <div style={{width:"100%",height:5,borderRadius:3,background:C.lineSoft,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round(it.ratio*100)}%`,background:it.color,borderRadius:3,transition:"width .45s ease"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 상대가 이번 주에 채운 목표 알림 (양쪽 화면 모두) ──
   반응 이모지 버튼은 뺐습니다 — 어디에도 전달되지 않는 장식이었고,
   진짜 응원은 아래 '별똥별 보내기'로 보냅니다. */
function CheerCard({C,stars,name,onPraise}){
  const n=(stars||[]).filter(s=>s.complete).length;
  if(!n) return null;
  return(
    <div className="gl" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,...GLASS,
      borderRadius:16,padding:"18px 16px",marginBottom:12}}>
      <div style={{fontSize:14,lineHeight:1.5,color:C.ink,wordBreak:"keep-all"}}>
        {subjName(name)} 습관 {n}개를 쭉 지켰어요
      </div>
      {onPraise&&
        <button className="btn" onClick={onPraise}
          style={{...BTN_FILL,flex:"0 0 auto",padding:"8px 14px",fontSize:13}}>칭찬하기</button>}
    </div>
  );
}


/* ── 페이스 카드: 지난주 이맘때 vs 지금 ─────────────────────
   ① 같은 요일까지만 비교한 헤드라인 숫자  ② 월→일 누적 선(지난주 점선 / 이번 주 실선)
   ③ 오늘 할 한 걸음  ④ 최고 기록에 가까울 때만 기록 안내 */
const DAYS=["월","화","수","목","금","토","일"];
function PaceCard({C,p,color}){
  const [hi,setHi]=useState(null);          // 그래프에서 가리킨 요일 (마우스 올림·탭)
  if(!p) return null;
  const {todayIdx,cur,prev,now,then,diff,next,onTrack,total,best,bestMon,projected}=p;
  const W=560,H=150,PX=24,PT=18,PB=14;
  const max=Math.max(prev[6],now,best?Math.min(best,Math.max(prev[6],now)*1.4):0,1);
  const X=(i)=>PX+(W-PX*2)*i/6, Y=(v)=>PT+(H-PT-PB)*(1-v/max);
  const pts=(arr,n)=>arr.slice(0,n).map((v,i)=>`${X(i)},${Y(v)}`).join(" ");

  /* 글은 줄이고 숫자·칩으로: 큰 숫자 + 짧은 라벨 / 범례에 횟수 / 다음 행동 칩 / 최고 기록 배지 */
  const big=diff>0?`+${diff}`:diff===0?"=":`${diff}`;
  const label=diff>0?"지난주 이맘때보다 더 체크했어요":diff===0?"지난주 이맘때와 똑같아요":"지난주 이맘때보다 덜 했어요";
  const wk=bestMon&&weekOfMonth(bestMon);
  /* 기록이 너무 작으면(3번 미만) 숨김 */
  /* 최고 기록 — 이번 주가 지난 모든 주보다 많으면 축하, 아니면 최고 주와 횟수 */
  const isBest=now>0&&now>best;

  return(
    <div className="gl" style={{...GLASS,borderRadius:20,padding:"18px 16px",marginBottom:12,
      display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontSize:40,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1,color:"var(--acc)",fontVariantNumeric:"tabular-nums"}}>{big}</span>
            {diff!==0&&<span style={{fontSize:18,fontWeight:700,color:"var(--acc)"}}>번</span>}
          </div>
          <div style={{fontSize:13,color:C.sub,marginTop:6}}>{label}</div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",marginTop:16}}>
        <div style={{position:"relative"}}
          onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;
            setHi(Math.max(0,Math.min(6,Math.round((x-PX)/((W-PX*2)/6)))));}}
          onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;
            setHi(Math.max(0,Math.min(6,Math.round((x-PX)/((W-PX*2)/6)))));}}
          onPointerLeave={e=>{if(e.pointerType==="mouse")setHi(null);}}>
        {/* 툴팁 — 그 요일까지의 누적 체크 수 */}
        {hi!=null&&
          <div style={{position:"absolute",left:`${X(hi)/W*100}%`,top:0,zIndex:2,pointerEvents:"none",
            transform:`translate(${hi<=1?"-12%":hi>=5?"-88%":"-50%"},-100%)`,whiteSpace:"nowrap",
            background:"rgba(20,20,28,.94)",borderRadius:10,padding:"8px 12px",fontSize:12,lineHeight:1.6,
            boxShadow:"0 6px 20px rgba(0,0,0,.5)"}}>
            <div style={{fontWeight:700,color:C.ink,marginBottom:2}}>{DAYS[hi]}요일까지</div>
            <div style={{color:"var(--acc)"}}>이번 주 <b>{hi<=todayIdx?`${cur[hi]}회`:"–"}</b></div>
            <div style={{color:C.sub}}>지난주 <b style={{color:C.ink}}>{prev[hi]}회</b></div>
          </div>}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible",touchAction:"pan-y"}} aria-hidden="true">
          {hi!=null&&<line x1={X(hi)} x2={X(hi)} y1={PT-8} y2={H-PB+4} stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="3 4"/>}
          {hi!=null&&<circle cx={X(hi)} cy={Y(prev[hi])} r="5" fill="#fff" fillOpacity=".6"/>}
          {hi!=null&&hi<=todayIdx&&hi!==todayIdx&&<circle cx={X(hi)} cy={Y(cur[hi])} r="5.5" fill={color}/>}
          {/* 지난주: 옅은 점선 (한 주 전체) */}
          <polyline points={pts(prev,7)} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2"
            strokeDasharray="5 6" strokeLinecap="round" strokeLinejoin="round"/>
          {/* 이번 주: 강조색 실선 (오늘까지) */}
          <polyline points={pts(cur,todayIdx+1)} fill="none" stroke={color} strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" style={{filter:`drop-shadow(0 0 6px ${color}88)`}}/>
          {/* 오늘 위치에 빛나는 별 */}
          <GlowStar x={X(todayIdx)} y={Y(now)} ratio={1} color={color} complete scale={1}/>
        </svg>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:`6px ${PX/W*100}% 0`,fontSize:12}}>
          {DAYS.map((d,i)=><span key={d} style={{width:0,display:"flex",justifyContent:"center",
            color:i===todayIdx?C.ink:C.sub,fontWeight:i===todayIdx?700:500,opacity:i>todayIdx?.5:1}}>{d}</span>)}
        </div>
      </div>

      {(isBest||best>0)&&
        <div style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
          padding:"12px 16px",borderRadius:14,background:"rgba(var(--acc-rgb),.1)",fontSize:14}}>
          {isBest
            ? <span style={{fontWeight:700,color:"var(--acc)"}}>🏆 이번 주가 최고 기록이에요!</span>
            : <><span style={{color:C.sub}}>🏆 최고 기록</span>
                <span style={{fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>{wk.m}월 {wk.w}주차 · {best}회</span></>}
        </div>}
    </div>
  );
}

/* ── 잔디밭 ─────────────────────────────────────────────
   세로 7칸(월~일) × N주. 칸 크기는 폭에 맞춰 늘어남(그리드 1fr + 정사각형). */
const GRASS_BG={full:"var(--acc)",part:"rgba(var(--acc-rgb),.38)",empty:"rgba(255,255,255,.07)",
  pre:"rgba(255,255,255,.025)",future:"transparent"};
/* 메모한 날 — 칸 가운데 작은 점 (진한 칸 위에선 어둡게, 나머지는 밝게) */
const NoteDot=({st})=><i style={{position:"absolute",left:"50%",top:"50%",width:"30%",height:"30%",minWidth:3,minHeight:3,
  transform:"translate(-50%,-50%)",borderRadius:"50%",background:st==="full"?"rgba(0,0,0,.55)":"#fff",opacity:st==="full"?1:.9}}/>;
function Grass({cell,endISO,weeks,today,gap=3,radius=3,showMonths=false,showDays=false,note=()=>false}){
  const endMon=mondayOf(fromISO(endISO));
  const cols=Array.from({length:weeks},(_,i)=>addDays(endMon,-(weeks-1-i)*7));
  /* 그 주에 1일이 있으면(또는 첫 칸이면) 월 표시 */
  const monthAt=cols.map((m,i)=>{const d=weekDatesFrom(m).find(x=>x.endsWith("-01"));return d?fromISO(d).getMonth()+1:i===0?m.getMonth()+1:null;});
  const lab={fontSize:12,color:"#A3A2BD",lineHeight:1,whiteSpace:"nowrap"};
  /* 요일 라벨·월 라벨·칸을 한 그리드에 넣어 항상 줄이 맞도록 (열 단위로 채움) */
  const kids=[];
  if(showDays){
    if(showMonths) kids.push(<span key="dm"/>);
    DAYS.forEach((d,i)=>kids.push(<span key={"d"+i} style={{...lab,display:"flex",alignItems:"center",paddingRight:4,visibility:i%2===0?"visible":"hidden"}}>{d}</span>));
  }
  cols.forEach((m,ci)=>{
    if(showMonths) kids.push(<span key={"m"+ci} style={{...lab,width:0,overflow:"visible",alignSelf:"end"}}>{monthAt[ci]?`${monthAt[ci]}월`:""}</span>);
    weekDatesFrom(m).forEach(iso=>{
      const st=cell(iso);
      kids.push(<span key={iso} title={iso} style={{position:"relative",aspectRatio:"1",borderRadius:radius,background:GRASS_BG[st],
        boxShadow:iso===today?"0 0 0 1.5px rgba(255,255,255,.85)":st==="full"?"0 0 6px rgba(var(--acc-rgb),.35)":"none"}}>{note(iso)&&<NoteDot st={st}/>}</span>);
    });
  });
  return(
    <div style={{display:"grid",gridTemplateColumns:`${showDays?"auto ":""}repeat(${weeks},minmax(0,1fr))`,
      gridTemplateRows:`${showMonths?"16px ":""}repeat(7,auto)`,gridAutoFlow:"column",columnGap:gap,rowGap:gap,minWidth:0}}>
      {kids}
    </div>
  );
}

/* 회고 목록의 한 행 — 이름 + 연속 기록 | 최근 3주(주 3줄 × 월~일) 작은 잔디 · 누르면 상세 */
function HabitGrassRow({C,st,today,onOpen}){
  const mon0=addDays(mondayOf(fromISO(today)),-14);
  const weeks=[0,1,2].map(i=>weekDatesFrom(addDays(mon0,i*7)));
  return(
    <button className="btn row-tap" onClick={onOpen} aria-label={`${st.h.name} 자세히 보기`}
      style={{display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",background:"transparent",border:"none",color:"inherit",
        padding:"12px 10px",borderRadius:14,fontFamily:"inherit"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{st.h.name}</div>
        <div style={{fontSize:13,fontWeight:700,marginTop:4,color:st.cur>0?"var(--acc)":C.sub}}>
          {st.cur>0?`🔥 ${st.cur}${st.unit} 연속`:`이번 주 ${Math.min(st.wc,st.t)}/${st.t}`}</div>
      </div>
      <div aria-hidden="true" style={{display:"grid",gridTemplateColumns:"repeat(7,12px)",gap:3,flex:"0 0 auto"}}>
        {weeks.flat().map(iso=>{const k=st.cell(iso);return <span key={iso} title={iso} style={{position:"relative",width:12,height:12,borderRadius:3,
          background:GRASS_BG[k],boxShadow:iso===today?"0 0 0 1.5px rgba(255,255,255,.85)":k==="full"?"0 0 6px rgba(var(--acc-rgb),.35)":"none"}}>{st.noteOf(iso)&&<NoteDot st={k}/>}</span>;})}
      </div>
      <span aria-hidden="true" style={{fontSize:18,color:C.sub,lineHeight:1,flex:"0 0 auto"}}>›</span>
    </button>
  );
}

/* ── 습관 상세 페이지 ── 큰 잔디 · 통계 타일 4개 · 월별 기록 */
const PAGE_WEEKS=22;
function HabitDetail({C,st,today,isNotion,onClose,onCheckToday}){
  const [page,setPage]=useState(0);          // 0 = 이번 주에서 끝나는 22주, 1 = 그 이전 22주 …
  const maxPage=Math.floor(52/PAGE_WEEKS);
  const endISO=toISO(addDays(mondayOf(fromISO(today)),-7*PAGE_WEEKS*page+6));
  const startISO=toISO(addDays(fromISO(endISO),-(7*PAGE_WEEKS-1)));
  const md=(iso)=>{const d=fromISO(iso);return `${d.getMonth()+1}월 ${d.getDate()}일`;};
  useEffect(()=>{ const o=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.body.style.overflow=o;}; },[]);
  useEffect(()=>{const esc=(e)=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",esc);return()=>document.removeEventListener("keydown",esc);},[onClose]);

  /* 기록 = 메모를 남긴 날만, 월별로 */
  const byMonth=[]; for(const n of st.notesList){const k=n.date.slice(0,7);let g=byMonth[byMonth.length-1];if(!g||g.k!==k){g={k,items:[]};byMonth.push(g);}g.items.push(n);}
  const circle={...BTN_FILL,width:40,height:40,padding:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,textDecoration:"none"};
  const tile=(icon,label,big,foot,extra)=>(
    <div className="gl" style={{...GLASS,borderRadius:20,padding:"18px 16px",display:"flex",flexDirection:"column",minHeight:148}}>
      <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{icon} {label}</div>
      <div style={{fontSize:40,fontWeight:800,letterSpacing:"-0.02em",color:"var(--acc)",margin:"auto 0 6px",fontVariantNumeric:"tabular-nums"}}>{big}</div>
      {extra}
      <div style={{fontSize:12,color:C.sub}}>{foot}</div>
    </div>
  );
  return(
    <div role="dialog" aria-modal="true" aria-label={`${st.h.name} 기록`}
      style={{position:"fixed",inset:0,zIndex:90,overflowY:"auto",WebkitOverflowScrolling:"touch",
        background:"linear-gradient(180deg,#040409 0%,#06060E 55%,#0A0918 100%)",animation:reduceMotion?"none":"fade .2s ease"}}>
      <div className="wrap" style={{paddingTop:16}}>
        {/* 헤더: 뒤로 · 이름 · 노션에서 수정 */}
        <div style={{display:"grid",gridTemplateColumns:"40px 1fr 40px",alignItems:"center",gap:12,marginBottom:20}}>
          <button className="btn" onClick={onClose} aria-label="뒤로" style={circle}>‹</button>
          <div style={{textAlign:"center",fontSize:17,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            <span className="emo" style={{marginRight:6}}>{emojiOf(st.h)}</span>{st.h.name}
          </div>
          {isNotion
            ? <a href={`https://www.notion.so/${String(st.h.id).replace(/-/g,"")}`} target="_blank" rel="noopener noreferrer"
                aria-label="노션에서 수정" style={circle}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </a>
            : <span/>}
        </div>

        {/* 큰 잔디 + 기간 넘김 */}
        <div className="gl" style={{...GLASS,borderRadius:20,padding:"18px 16px 14px",marginBottom:12}}>
          <Grass cell={st.cell} endISO={endISO} weeks={PAGE_WEEKS} today={today} showMonths showDays note={(iso)=>!!st.noteOf(iso)}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14}}>
            <button className="btn" onClick={()=>setPage(p=>Math.min(maxPage,p+1))} disabled={page>=maxPage} aria-label="이전 기간"
              style={{...circle,width:34,height:34,opacity:page>=maxPage?.35:1}}>‹</button>
            <span style={{fontSize:13,color:C.sub}}>{md(startISO)} — {md(endISO>today?today:endISO)}</span>
            <button className="btn" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} aria-label="다음 기간"
              style={{...circle,width:34,height:34,opacity:page===0?.35:1}}>›</button>
          </div>
          {st.started&&!st.todayOn&&page===0&&
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:14,paddingTop:14,
              borderTop:"1px solid rgba(255,255,255,.08)"}}>
              <span style={{fontSize:14,color:C.ink}}>오늘 칸이 비어 있어요</span>
              <button className="btn" onClick={onCheckToday} style={{...BTN_FILL,padding:"8px 14px",fontSize:13}}>오늘 체크하기</button>
            </div>}
        </div>

        {/* 통계 타일 2×2 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:60}}>
          {tile("🔥","연속",`${st.cur}${st.unit}`,`최고 ${st.best}${st.unit}`)}
          {tile("✓","총 체크",st.total,`시작 ${md(st.startISO)}`)}
          {tile("🎯","이번 주 목표",`${Math.min(st.wc,st.t)}/${st.t}`,st.wc>=st.t?"이번 주 목표 달성!":`${st.t-st.wc}번 남았어요`,
            <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,.08)",marginBottom:8,overflow:"hidden"}}>
              <div style={{width:`${st.weekPct*100}%`,height:"100%",background:"var(--acc)",borderRadius:2}}/></div>)}
          {tile("⭐","달성률",st.rate==null?"–":`${Math.round(st.rate*100)}%`,st.elig?`최근 ${st.elig}주 중 ${st.ok}주 달성`:"아직 지난 기록이 없어요")}
        </div>

        {/* 월별 기록 */}
        <div style={{fontSize:20,fontWeight:700,marginBottom:12}}>기록</div>
        {byMonth.length===0
          ? <div style={{fontSize:14,color:C.sub,lineHeight:1.6}}>아직 남긴 메모가 없어요.<br/>오늘 탭에서 습관을 길게 누르면 메모할 수 있어요.</div>
          : byMonth.slice(0,6).map(g=>{
              const [y,m]=g.k.split("-");
              return(
                <div key={g.k} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"0 2px 8px"}}>
                    <span style={{fontSize:14,color:C.sub}}>{y}년 {Number(m)}월</span>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--on-acc)",background:"var(--acc)",borderRadius:999,padding:"2px 9px"}}>{g.items.length}</span>
                  </div>
                  <div className="gl" style={{...GLASS,borderRadius:16,padding:"4px 16px"}}>
                    {g.items.map((n,i)=>{const d=fromISO(n.date);return(
                      <div key={n.date} style={{padding:"14px 0",borderTop:i?"1px solid rgba(255,255,255,.06)":"none"}}>
                        <div style={{fontSize:12,color:C.sub,marginBottom:4}}>{d.getMonth()+1}월 {d.getDate()}일 {DAYS[(d.getDay()+6)%7]}요일</div>
                        <div style={{fontSize:15,lineHeight:1.6,color:C.ink,whiteSpace:"pre-line",wordBreak:"keep-all"}}>{n.text}</div>
                      </div>);})}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function FriendChronicleRow({h,C,col}){
  const tgt=tgtOf(h);
  return(
    <div className="gl" style={{...GLASS,borderRadius:16,padding:"18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><span className="emo" style={{fontSize:17}}>{emojiOf(h)}</span><span style={{fontSize:14.5,fontWeight:700}}>{h.name}</span></div>
        <span className="mono" style={{fontSize:12,color:h.done>=tgt?col:C.sub,fontWeight:700}}>{h.done}/{tgt}{h.done>=tgt?" ✦":""}</span>
      </div>
      <div style={{height:6,borderRadius:3,background:C.lineSoft,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.round(Math.min(1,h.done/tgt)*100)}%`,background:col,borderRadius:3}}/>
      </div>
    </div>
  );
}
/* ── Manage ── */
function Manage({C,habits,setHabits}){
  const [name,setName]=useState(""),[emoji,setEmoji]=useState("⭐"),[kind,setKind]=useState("daily"),[target,setTarget]=useState(3);
  const add=()=>{if(!name.trim())return;setHabits(p=>[...p,{id:"h"+Date.now(),name:name.trim(),emoji:emoji||"⭐",kind,target:kind==="daily"?7:Math.max(1,Math.min(6,target))}]);setName("");setEmoji("⭐");};
  return(
    <div className="fade gl" style={{...GLASS,borderRadius:16,padding:"18px 16px",marginTop:8}}>
      {habits.map(h=>(
        <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0"}}>
          <span style={{display:"flex",alignItems:"center",gap:9,fontSize:14}}><span className="emo" style={{fontSize:16}}>{emojiOf(h)}</span>{h.name}<span className="mono" style={{color:C.sub,fontSize:11}}>{h.kind==="daily"?"매일":`주${h.target}`}</span></span>
          <button className="btn" onClick={()=>setHabits(p=>p.filter(x=>x.id!==h.id))} style={{background:"none",border:"none",color:C.sub,fontSize:13}}>삭제</button>
        </div>
      ))}
      <div style={{borderTop:`1px solid ${C.lineSoft}`,marginTop:8,paddingTop:12,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <input className="txt" value={emoji} onChange={e=>setEmoji(e.target.value.slice(0,2))} style={inp(C,{width:46,textAlign:"center"})}/>
        <input className="txt" value={name} onChange={e=>setName(e.target.value)} placeholder="새 습관 이름" style={inp(C,{flex:"1 1 120px"})}/>
        <select value={kind} onChange={e=>setKind(e.target.value)} style={inp(C,{})}><option value="daily">매일</option><option value="weekly">주 N회</option></select>
        {kind==="weekly"&&<select value={target} onChange={e=>setTarget(Number(e.target.value))} style={inp(C,{})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>주{n}</option>)}</select>}
        <button className="btn" onClick={add} style={{...BTN_PRIMARY,padding:"9px 18px",fontSize:14}}>추가</button>
      </div>
    </div>
  );
}
/* 버튼 체계 — 콘텐츠(면으로 채운 둥근 사각형 카드)와 모양부터 다르게 보이도록 버튼은 전부 알약형.
   primary: 강조색 단색 버튼 (화면당 하나), secondary: 강조색 반투명 채움 + 강조색 글자 */
/* 반짝이는 별 아이콘 — 글자(✦)는 기기마다 작고 다르게 보여서 SVG로 */
function StarIcon({size=20}){
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{display:"block"}}>
    <path d={sparklePath(12,12,10.5)} fill="currentColor"/></svg>;
}
const BTN_PRIMARY={background:"var(--acc)",color:"var(--on-acc)",border:"none",borderRadius:999,fontWeight:700,fontFamily:"inherit",cursor:"pointer",
  boxShadow:"0 0 22px rgba(var(--acc-rgb),.3)"};   // 플랫 — 그라데이션·안쪽 하이라이트 없이 단색 + 은은한 빛
/* secondary 채움색 = 상단 오늘/회고 토글의 선택 안 된 칸(트랙) 색 */
/* 카드 — 글래스: 아주 옅은 반투명 면 + 흐림 + 그라데이션 빛 테두리(.gl) */
const GLASS={background:"rgba(255,255,255,.045)",position:"relative",
  WebkitBackdropFilter:"blur(16px)",backdropFilter:"blur(16px)"};   // 테두리는 className="gl"의 그라데이션 링
/* Primary는 지금 보는 사람의 색 — 초록 화면은 별빛 옐로, 소운 화면은 라벤더.
   앱 루트에 CSS 변수로 깔고, 버튼·체크·탭은 모두 이 변수를 씁니다 */
const accentVars=(c)=>c===VIOLET
  ?{"--acc":"#C8A6FF","--acc-rgb":"200,166,255","--on-acc":"#1B1233"}
  :{"--acc":"#FFE08A","--acc-rgb":"255,224,138","--on-acc":"#231B00"};
const FILL_2="rgba(var(--acc-rgb),.14)";
/* secondary — 옐로 반투명 채움 + 옐로 글자 (선 없음) */
const BTN_FILL={background:FILL_2,color:"var(--acc)",border:"none",borderRadius:999,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
  WebkitBackdropFilter:"blur(12px)",backdropFilter:"blur(12px)"};
function arrowBtn(C){return{...BTN_FILL,width:32,height:32,fontSize:14,lineHeight:1,padding:0};}
function inp(C,extra){return{border:`1px solid ${C.line}`,borderRadius:9,padding:"9px 11px",fontSize:14,background:C.surface2,color:C.ink,fontFamily:"inherit",outline:"none",...extra};}
