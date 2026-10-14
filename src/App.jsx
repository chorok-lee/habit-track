import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";

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

/* 습관 이름에서 대표 이모지 고르기.
   노션 페이지에 아이콘을 직접 지정했다면 그게 항상 우선합니다.
   위에서부터 먼저 걸리는 규칙이 이깁니다 — 구체적인 것을 위에 둘 것. */
const EMOJI_RULES = [
  [/취침|자기|잠자|수면|일찍 자|숙면/,            "🌙"],
  [/기상|일어나|아침 기상|모닝/,                  "☀️"],
  [/영어|잉글리시|english|회화|토익|토플|어학/i,  "💬"],
  [/독서|책 |책읽|읽기|도서/,                     "📖"],
  [/글쓰기|일기|블로그|포스팅|아티클|칼럼|작문/,  "✍️"],
  [/회고|돌아보기|감사/,                          "🌱"],
  [/포트폴리오|디자인|피그마|figma|스케치|그림|드로잉/i, "🎨"],
  [/딥다이브|리서치|조사|탐색|기업|채용|공고|서치/, "🔍"],
  [/코딩|개발|프로그래밍|알고리즘|깃|git|커밋/i,  "💻"],
  [/명상|마음챙김|호흡|멍때리기/,                 "🧘"],
  [/요가|스트레칭|필라테스/,                      "🤸"],
  [/러닝|달리기|조깅|마라톤/,                     "👟"],
  [/걷기|산책|만보|계단/,                         "🚶"],
  [/수영/,                                        "🏊"],
  [/등산|하이킹/,                                 "🥾"],
  [/운동|헬스|짐|웨이트|근력|스쿼트|홈트/,        "🏃"],
  [/물 |물마시|수분|하루 물/,                     "💧"],
  [/식단|다이어트|샐러드|채소|야채|단백질|간식/,  "🥗"],
  [/영양제|비타민|유산균|약 먹|복용/,             "💊"],
  [/요리|밥 해|도시락/,                           "🍳"],
  [/청소|정리|설거지|빨래|정돈/,                  "🧹"],
  [/가계부|절약|저축|투자|지출|용돈|재테크/,      "💰"],
  [/공부|학습|스터디|강의|인강|수업|자격증|시험/, "📚"],
  [/피아노|기타|악기|음악|노래|보컬/,             "🎵"],
  [/사진|촬영/,                                   "📷"],
  [/유튜브|넷플릭스|스마트폰|휴대폰|sns|인스타/i, "📵"],
  [/강아지|고양이|반려/,                          "🐾"],
  [/스킨케어|피부|세안/,                          "🧴"],
  [/연락|안부|통화|가족/,                         "📞"],
];
const guessEmoji = (name) => {
  const s = String(name || "");
  for (const [re, e] of EMOJI_RULES) if (re.test(s)) return e;
  return "";
};
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
            <radialGradient id={`neb-${k}`}><stop offset="0" stopColor={c} stopOpacity=".22"/>
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
  if(ratio<=0) return <circle cx={x} cy={y} r={1.6*scale} fill={color} opacity=".35"/>;
  const R=(complete?10:3.5+ratio*4.5)*scale;
  return(
    <g className={complete&&!reduceMotion?"twk":""} style={complete?{animationDelay:`${twinkle}s`}:undefined}>
      <circle cx={x} cy={y} r={R*(complete?2.6:2)} fill={`url(#halo-${k})`} opacity={complete?.85:.35+ratio*.35}/>
      <path d={sparklePath(x,y,R)} fill={complete?"#FFFFFF":color} opacity={complete?1:.55+ratio*.4} filter="url(#glow)"/>
      {complete&&<circle cx={x} cy={y} r={1.6*scale} fill="#fff"/>}
    </g>
  );
}

/* 별자리 선 — 별 둘레에서 끊기고, 둘 다 빛나면 실선·아니면 점선 */
function ConstLines({seq,scale=1,dim=1}){
  return seq.slice(1).map((b,i)=>{
    const a=seq[i];
    const dx=b.p.x-a.p.x,dy=b.p.y-a.p.y,L=Math.hypot(dx,dy)||1;
    const gap=(s)=>(s.complete?11:s.ratio>0?7:4)*scale;
    const ga=gap(a.s),gb=gap(b.s); if(L<=ga+gb) return null;
    const lit=a.s.ratio>0&&b.s.ratio>0, both=a.s.complete&&b.s.complete;
    return <line key={i} x1={a.p.x+dx/L*ga} y1={a.p.y+dy/L*ga} x2={b.p.x-dx/L*gb} y2={b.p.y-dy/L*gb}
      stroke="#fff" strokeWidth={(both?1:0.7)*Math.max(.6,scale)} opacity={(both?.55:lit?.32:.18)*dim}
      strokeDasharray={lit?undefined:`${2*scale} ${3*scale}`} strokeLinecap="round"/>;
  });
}

/* 밤하늘 별 — 스플래시에선 남색→보라 하늘째로, 본 화면에선 거의 검은 배경 위 별만 은은하게 */
function NightBG({vivid=false}){
  const stars=useMemo(()=>Array.from({length:90},(_,i)=>({x:rnd(i,1)*100,y:rnd(i,2)*100,r:.5+rnd(i,3)*1.1,o:.25+rnd(i,4)*.6,d:rnd(i,5)*6})),[]);
  return(
    <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
      background:vivid?"linear-gradient(180deg,#03040B 0%,#070820 45%,#120F3A 80%,#1C1650 100%)":"transparent"}}>
      <svg width="100%" height="100%" style={{position:"absolute",inset:0}}>
        {stars.map((t,i)=><circle key={i} className={i%3===0&&!reduceMotion?"twk":""} cx={`${t.x}%`} cy={`${t.y}%`} r={t.r}
          fill="#fff" opacity={vivid?t.o:t.o*.55} style={{animationDelay:`${t.d}s`}}/>)}
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
const layoutFor = (n) => {
  if (LAYOUTS[n]) return LAYOUTS[n];
  return Array.from({length:n}, (_,i) => {
    const a = (i/n)*Math.PI*2 - Math.PI/2;
    return [Math.cos(a)*36, Math.sin(a)*30];
  });
};

/* 별자리 연결선 순서 (가장 자연스럽게 이어지는 순서) */
const CONNECTION_ORDER = {
  1:[0],2:[0,1],3:[0,2,1],
  4:[0,1,3,2],5:[0,1,2,3,4],
  6:[0,1,5,2,4,3],7:[0,1,2,3,4,5,6],
  8:[0,1,2,3,4,5,6,7],
};
const orderFor = (n) => CONNECTION_ORDER[n] || Array.from({length:n},(_,i)=>i);

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
  const [burst,setBurst]=useState(0);
  const [selStar,setSelStar]=useState(null);
  const prevComplete=useRef(-1);
  const lastToggle=useRef(0);

  /* 노션 연결 상태: loading | notion | local */
  const [sync,setSync]=useState({mode:cache0?"notion":"loading",error:""});
  const [toast,setToast]=useState("");
  const [meName,setMeName]=useState(()=>cache0?.hs.me||DEMO_ME_NAME);        // 노션에서 '나'로 볼 소유자 값
  const [owners,setOwners]=useState(()=>Array.isArray(cache0?.hs.owners)?cache0.hs.owners:[]);   // 노션 DB에 등장하는 소유자 목록
  const [ownerWarn,setOwnerWarn]=useState("");            // 소유자 속성을 못 찾았을 때 안내
  const [staleWarn,setStaleWarn]=useState("");            // 저장해 둔 데이터를 보여주는 중인데 노션 연결이 실패했을 때
  const hsRef=useRef(cache0?.hs||null);                   // 캐시에 함께 저장할 습관 응답
  const olderDone=useRef(false);                          // 1년 치 이전 기록은 세션당 한 번만
  const pending=useRef(new Map());                        // 노션에 저장 중인 체크 — 새로 받은 데이터에 덮이지 않도록

  /* 별똥별 편지 */
  const [letters,setLetters]=useState([]);
  const [modal,setModal]=useState(null);   // {type:"read"|"compose"|"box", letter, to}
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

  const loadFromLocal=()=>{
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
      const list=(Array.isArray(r?.messages)?r.messages:[]).map(m=>({...m,read:m.read||seen.has(m.id)}));
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
    LS.set(CACHE_KEY,JSON.stringify({hs:hsRef.current,logs,savedAt:Date.now()}));
  },[habits,logs,loaded,sync.mode]);
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
  const toggleLog=async(id,d)=>{
    const wasOn=isLogged(id,d);
    lastToggle.current=Date.now();
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
  const friendName=isNotion?(owners.find(o=>o!==meName)||DEMO_FRIEND_NAME):DEMO_FRIEND_NAME;
  /* 소유자가 비어 있는 습관은 내 것으로 봅니다 (화면에서 사라지지 않도록) */
  const myHabits=sortHabits(isNotion?habits.filter(h=>(h.owner||meName)===meName):habits);
  const friendHabits=sortHabits(isNotion?habits.filter(h=>h.owner===friendName):[]);
  const activeHabits=person==="me"?myHabits:friendHabits;

  const myCompleteCount=myHabits.reduce((n,h)=>n+(weekCount(h.id)>=tgtOf(h)?1:0),0);

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

  useEffect(()=>{
    if(!loaded||selDate!==today){prevComplete.current=myCompleteCount;return;}
    /* 직접 체크했을 때만 — 노션에서 새로 받은 데이터로 숫자가 늘어난 건 축하하지 않음 */
    if(prevComplete.current!==-1&&myCompleteCount>prevComplete.current&&Date.now()-lastToggle.current<3000)setBurst(b=>b+1);
    prevComplete.current=myCompleteCount;
  },[myCompleteCount,loaded,selDate,today]);
  useEffect(()=>{if(!burst)return;const t=setTimeout(()=>setBurst(0),2000);return()=>clearTimeout(t);},[burst]);

  const ratioAt=(h,mon)=>{const wd=weekDatesFrom(mon);const c=wd.reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0);return Math.min(1,c/tgtOf(h));};
  const completedIn=(h,a,b)=>{let c=0;for(let i=a;i<b;i++)if(ratioAt(h,addDays(mondayOf(fromISO(today)),-i*7))>=1)c++;return c;};

  /* ── 목표별 주간 회고 데이터 ──────────────────────────────────
     각 칸이 '언제의 기록'인지 화면에서 바로 알 수 있도록,
     칸마다 그 주의 시작일·달성 횟수·목표를 함께 담아서 넘깁니다. */
  const curMon=mondayOf(fromISO(today));
  const curMonISO=toISO(curMon);
  const prevMonISO=toISO(addDays(curMon,-7));
  const WEEKS=6;   // 회고 창: 최근 6주
  const chronicleOf=(h)=>{
    const t=tgtOf(h);
    const cells=Array.from({length:WEEKS},(_,i)=>{
      const mon=addDays(curMon,-(WEEKS-1-i)*7);
      const done=weekDatesFrom(mon).reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0);
      return {mon:toISO(mon),done,target:t,ratio:Math.min(1,done/t),complete:done>=t,current:i===WEEKS-1,
        pre:!startedBy(h,toISO(mon))};   // 목표를 시작하기 전의 주 — '못 한 주'와 다르게 그립니다
    });
    /* 연속·최고 기록 같은 숫자는 막대 모양으로 읽히므로 따로 세지 않습니다.
       ✦ 분모도 시작한 뒤의 주만 셉니다 (2주 전에 시작했으면 ✦ 1/2) */
    return {cells,recent:cells.filter(c=>c.complete).length,window:cells.filter(c=>!c.pre).length};
  };

  /* 특정 주(월~일)의 별 상태 — 지난주 별자리를 다시 그릴 때 씁니다 */
  const starsAtWeek=(list,monISO)=>{
    const wd=weekDatesFrom(fromISO(monISO));
    return list.map(h=>{
      const c=wd.reduce((n,d)=>n+(isLogged(h.id,d)?1:0),0),t=tgtOf(h);
      return {id:h.id,name:h.name,emoji:emojiOf(h),ratio:Math.min(1,c/t),done:c,target:t,complete:c>=t};
    });
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
    <div style={{...accentVars(person==="me"?GREEN:VIOLET),background:"radial-gradient(120% 60% at 50% 0%,rgba(40,36,90,.22) 0%,rgba(0,0,0,0) 60%),linear-gradient(180deg,#040409 0%,#06060E 55%,#0A0918 100%)",minHeight:"100vh",maxWidth:"100%",overflowX:"clip",color:C.ink,fontFamily:"'Pretendard',ui-sans-serif,system-ui,sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        *{box-sizing:border-box}
        html,body{max-width:100%;overflow-x:clip;background:#0A0918}   /* 화면 끝을 넘겨 당겨도 같은 색 */
        .mono{font-variant-numeric:tabular-nums}   /* 폰트는 Pretendard 하나 — 숫자만 폭을 맞춤 */
        button,input,textarea,select{font-family:inherit}
        .tap{cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s,background .25s,box-shadow .25s}
        .tap:active{transform:scale(.96)}
        .row-tap{-webkit-tap-highlight-color:transparent;user-select:none}
        .row-tap:active > span{transform:scale(.9)}
        .btn{transition:opacity .15s,transform .12s;cursor:pointer;-webkit-tap-highlight-color:transparent}.btn:hover{opacity:.85}.btn:active{transform:translateY(1px)}
        .fade{animation:fade .34s ease}
        .sp-line{opacity:0;transform:translateY(12px);animation:spIn .7s cubic-bezier(.2,.8,.2,1) forwards}
        @keyframes spIn{to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.sp-line{animation:none;opacity:1;transform:none}}@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .conf{position:absolute;left:50%;top:44%;width:6px;height:6px;opacity:1;border-radius:50%;animation:cburst 1.4s ease-out forwards}
        @keyframes cburst{to{transform:translate(var(--tx),var(--ty));opacity:0}}
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
        .gl::before,.glass::before,.sky::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;z-index:1;
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
            <div className="sky" style={{marginBottom:12}}>
              <ConstellationSky
                meStars={myStars} frStars={frStars}
                activeColor={activeColor} allComplete={allComplete}
                selStar={selStar} setSelStar={setSelStar}
                burst={burst} person={person}
                meName={meName} friendName={friendName}/>
            </div>

            <ProgressArea C={C} rows={[{who:meName,color:GREEN,items:meProg},{who:friendName,color:VIOLET,items:frProg}]}/>
            {/* 지금 보고 있지 않은 쪽의 달성 소식 — 초록 화면엔 소운, 소운 화면엔 초록 */}
            {person==="me"
              ? <CheerCard C={C} stars={frStars} name={friendName} onPraise={lettersOn?()=>compose(friendName,meName):null}/>
              : <CheerCard C={C} stars={myStars} name={meName} onPraise={lettersOn?()=>compose(meName,friendName):null}/>}

            {/* 날짜 스테퍼 — 위쪽 브리핑(하늘·진행률·소식)과 구획을 분명히 나눔 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"60px 0 12px"}}>
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
                    return {h,on:isLogged(h.id,selDate),sub:wc>=tgt?"완성":`${wc}/${tgt}`,done:wc>=tgt,onTap:()=>toggleLog(h.id,selDate)};})
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
                    <div key={r.h.id} className={r.onTap?"row-tap":""} onClick={r.onTap||undefined}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 10px",
                        borderRadius:14,background:r.on?"rgba(var(--acc-rgb),.07)":"transparent",transition:"background .15s",
                        cursor:r.onTap?"pointer":"default"}}>
                      <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
                        {/* 이모지마다 크기감이 달라 보이지 않도록 같은 원 안에 작게 */}
                        <span style={{width:40,height:40,borderRadius:"50%",background:r.on?"rgba(var(--acc-rgb),.12)":"rgba(255,255,255,.06)",flex:"0 0 auto",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}><span className="emo">{emojiOf(r.h)}</span></span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:600,wordBreak:"keep-all"}}>{r.h.name}</div>
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
            {/* 지난주 → 이번 주 별자리 변화 (작은 기록 카드) */}
            <WeekShift C={C} prevMonISO={prevMonISO} curMonISO={curMonISO}
              meName={meName} friendName={friendName}
              prevMe={starsAtWeek(myHabits.filter(h=>startedBy(h,prevMonISO)),prevMonISO)} curMe={myStars}
              prevFr={isNotion?starsAtWeek(friendHabits.filter(h=>startedBy(h,prevMonISO)),prevMonISO):[]}
              curFr={frStars}/>

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {(isNotion||person==="me")
                ? activeHabits.map(h=>(
                    <ChronicleRow key={h.id} h={h} C={C} col={activeColor} d={chronicleOf(h)}/>
                  ))
                : sortHabits(FRIEND_HABITS).map(h=>(
                    <FriendChronicleRow key={h.id} h={h} C={C} col={VIOLET}/>
                  ))
              }
            </div>
            {personSwitch}
          </div>
        )}
      </div>
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
            <div className="sk" style={{height:100,marginBottom:12}}/>
            <div className="sk" style={{height:32,margin:"60px auto 12px",width:200,borderRadius:999}}/>
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

/* 스플래시 — 밤하늘 위에 인사가 한 줄씩 떠오름: "소운아" → "오늘도 고생했어" (문구는 5개 중 하나) */
const callName=(n)=>{const c=n.charCodeAt(n.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0?`${n}아`:`${n}야`;};
const SPLASH_LINES=["오늘도 고생했어","오늘도 반가워","천천히 가도 괜찮아","오늘의 별을 켜볼까?","어제보다 한 걸음 더"];
function Splash({out,name,color}){
  const [line]=useState(()=>SPLASH_LINES[Math.floor(Math.random()*SPLASH_LINES.length)]);   // 열 때마다 하나씩 돌아가며
  return(
    <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:200,
      opacity:out?0:1,transition:reduceMotion?"none":"opacity .5s ease",pointerEvents:out?"none":"auto"}}>
      <NightBG vivid/>
      <div style={{position:"absolute",left:28,right:28,bottom:"16%",fontSize:32,fontWeight:800,lineHeight:1.3,letterSpacing:"-0.02em"}}>
        <div className="sp-line" style={{animationDelay:".25s",color,textShadow:`0 0 24px ${color}66`}}>{callName(name)}</div>
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
        <div className="gl" style={{...W,maxHeight:"100%",display:"flex",flexDirection:"column",background:"rgba(24,24,32,.94)",position:"relative",borderRadius:20,pointerEvents:"auto",WebkitBackdropFilter:"blur(20px)",backdropFilter:"blur(20px)",
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


function ConstellationSky({meStars,frStars,activeColor,allComplete,selStar,setSelStar,burst,person,meName,friendName}){
  const bg=useMemo(()=>Array.from({length:70},(_,i)=>({x:rnd(i,1)*560,y:rnd(i,2)*296,r:.35+rnd(i,3)*.9,o:.15+rnd(i,4)*.45,d:rnd(i,5)*5})),[]);
  const bokeh=useMemo(()=>Array.from({length:9},(_,i)=>({x:30+rnd(i,7)*500,y:20+rnd(i,8)*256,r:1.6+rnd(i,9)*2.2,o:.18+rnd(i,10)*.25})),[]);

  /* 별자리를 1.7배로 — 각자 반쪽 하늘의 대부분을 채우도록 */
  const SC=1.7, ME_C=[148,152], FR_C=[412,152];
  const mePts = buildPoints(meStars, ME_C, SC);
  const frPts = buildPoints(frStars, FR_C, SC);
  const meAll = meStars.length>0 && meStars.every(s=>s.complete);
  const frAll = frStars.length>0 && frStars.every(s=>s.complete);

  /* 글자는 SVG 밖(HTML)에 실제 px 크기로 — SVG 안에 두면 폰에서 7px까지 줄어듭니다 */
  const lab=(x,col,on)=>({position:"absolute",top:12,left:`${x/560*100}%`,transform:"translateX(-50%)",
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

      <OneStar stars={meStars} pts={mePts} color={GREEN} allComplete={meAll} scale={1.15}
        selStar={person==="me"?selStar:null}
        onSelect={id=>{ if(person==="me") setSelStar(k=>k===id?null:id); }}
        dim={person==="friend"}/>
      <OneStar stars={frStars} pts={frPts} color={VIOLET} allComplete={frAll} scale={1.15}
        selStar={person==="friend"?selStar:null}
        onSelect={id=>{ if(person==="friend") setSelStar(k=>k===id?null:id); }}
        dim={person==="me"}/>

      {burst>0 && <BurstEffect
        cx={person==="me"?ME_C[0]:FR_C[0]} cy={person==="me"?ME_C[1]:FR_C[1]}
        color={person==="me"?GREEN:VIOLET}/>}
    </svg>
  </>);
}

function buildPoints(stars, center, scale=1.0){
  const n=stars.length; if(!n) return [];
  const layout=layoutFor(n);
  return stars.map((s,i)=>({id:s.id, x:center[0]+layout[i][0]*scale, y:center[1]+layout[i][1]*scale}));
}

/* 별자리 컴포넌트: 선 + 별들 */
function OneStar({stars,pts,color,allComplete,selStar,onSelect,dim,scale=1}){
  if(!stars.length||!pts.length) return null;
  const seq=connOrder(stars.length).map(i=>({s:stars[i],p:pts[i]}));
  return(
    <g opacity={dim?0.38:1}>
      <ConstLines seq={seq} scale={scale}/>
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
    <div className="gl" style={{position:"absolute",left:`${pt.x/560*100}%`,top:`${pt.y/296*100}%`,zIndex:2,
      transform:`translate(${tx}, calc(-100% - 16px))`,pointerEvents:"none",
      background:"rgba(16,17,44,.9)",borderRadius:12,padding:"8px 12px",textAlign:"center",whiteSpace:"nowrap",
      WebkitBackdropFilter:"blur(10px)",backdropFilter:"blur(10px)",boxShadow:"0 6px 20px #00000080"}}>
      <div style={{fontSize:14,fontWeight:700,color:"#EEEDF7"}}><span className="emo">{star.emoji}</span> {star.name}</div>
      <div className="mono" style={{fontSize:12,fontWeight:700,color,marginTop:3}}>{star.done}/{star.target} ({pct}%)</div>
    </div>
  );
}

/* 목표를 채운 순간 — 부드러운 빛 번짐과 큰 반짝임 */
function BurstEffect({cx,cy,color}){
  if(reduceMotion) return null;
  return(
    <g style={{pointerEvents:"none"}} className="fade">
      <circle cx={cx} cy={cy} r="90" fill={`url(#neb-${toneKey(color)})`}/>
      <circle cx={cx} cy={cy} r="40" fill={`url(#halo-${toneKey(color)})`} opacity=".8"/>
      <path d={sparklePath(cx,cy,26)} fill="#fff" filter="url(#glow)"/>
    </g>
  );
}

/* ── ProgressArea ── */
function ProgressArea({C,rows}){
  return(
    <div className="gl" style={{...GLASS,borderRadius:16,padding:"18px 16px",marginBottom:12,display:"flex",flexDirection:"column",gap:18,overflow:"hidden"}}>
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


/* ── 지난주 → 이번 주 별자리 변화 ─────────────────────────
   한 주는 월요일에 열려 일요일 23:59에 닫힙니다.
   말로 설명하는 대신 그림으로 보여줍니다 —
   지난주는 실선(확정), 이번 주는 점선(진행 중),
   썸네일 아래 띠의 길이가 그 주에 채운 목표 비율입니다. */
function WeekShift({C,prevMonISO,curMonISO,meName,friendName,prevMe,curMe,prevFr,curFr}){
  const rows=[
    {name:meName||"초록",color:GREEN,past:prevMe,now:curMe},
    {name:friendName||"소운",color:VIOLET,past:prevFr,now:curFr},
  ].filter(r=>r.past.length||r.now.length);
  if(!rows.length) return null;

  /* 날짜 범위 줄과 가운데 화살표는 걷어냈습니다 — 두 칸의 순서만으로 읽힙니다 */
  const head=(t,now)=>(
    <div style={{fontSize:13,fontWeight:700,color:now?C.ink:C.sub}}>{t}</div>
  );

  /* '오늘' 탭의 밤하늘 패널과 같은 비율(560:296)·같은 옅은 외곽선 — 두 탭 첫 화면의 높이가 맞도록 */
  return(
    <div className="gl" style={{...GLASS,borderRadius:20,
      aspectRatio:"560/296",padding:"18px 16px",marginBottom:60,
      display:"grid",gridTemplateColumns:"auto 1fr 1fr",gridTemplateRows:`auto repeat(${rows.length},minmax(0,1fr))`,
      columnGap:10,rowGap:8,alignItems:"center"}}>
      <span/>
      {head("지난주")}
      {head("이번 주",true)}

      {rows.map(r=>(
        <React.Fragment key={r.name}>
          <span style={{fontSize:13,fontWeight:700,color:C.ink,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,
            justifySelf:"start",maxWidth:56,overflow:"hidden"}}>
            {r.name}</span>
          <MiniSky C={C} stars={r.past} color={r.color} past/>
          <MiniSky C={C} stars={r.now} color={r.color}/>
        </React.Fragment>
      ))}
    </div>
  );
}

/* 작은 별자리 썸네일 — 큰 밤하늘과 달리 글로우 없이 담백하게.
   아래쪽 띠가 그 주에 채운 목표 비율입니다. */
function MiniSky({C,stars,color,past}){
  const W=120,H=64;
  const pts=buildPoints(stars,[W/2,H/2],0.6);
  const seq=connOrder(stars.length).map(i=>({s:stars[i],p:pts[i]})).filter(x=>x.p);
  const done=stars.filter(s=>s.complete).length;
  const ratio=stars.length?done/stars.length:0;
  /* 칸 높이에 맞춰 늘어나도록: 바탕은 div, 별은 비율 유지 SVG, 아래 띠는 HTML */
  return(
    <div title={`${done}/${stars.length} 완성`} style={{position:"relative",alignSelf:"stretch",minHeight:0,borderRadius:10,overflow:"hidden",
      background:"radial-gradient(120% 100% at 50% 40%,rgba(18,18,52,.8) 0%,rgba(6,6,20,.9) 70%,rgba(3,3,10,.95) 100%)",opacity:past?0.8:1}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{position:"absolute",left:0,top:0,width:"100%",height:"calc(100% - 12px)"}}>
        <ellipse cx={W/2} cy={H/2} rx="50" ry="30" fill={`url(#neb-${toneKey(color)})`}/>
        <ConstLines seq={seq} scale={0.35}/>
        {stars.map((s,i)=>{const p=pts[i]; return p&&<GlowStar key={s.id} x={p.x} y={p.y} ratio={s.ratio} color={color} complete={s.complete} scale={0.4}/>;})}
      </svg>
      {/* 이 주에 채운 목표 비율 */}
      <div style={{position:"absolute",left:9,right:9,bottom:8,height:3,borderRadius:2,background:"rgba(255,255,255,.08)"}}>
        {ratio>0&&<div style={{width:`${ratio*100}%`,height:"100%",borderRadius:2,background:color,opacity:past?0.75:1,boxShadow:`0 0 8px ${color}88`}}/>}
      </div>
    </div>
  );
}


/* ── 목표별 회고 ── */
const BAR_GAP=5;
/* 6칸 중 i번째부터 n칸을 덮는 위치 (칸 사이 간격 포함) */
const spanPos=(i,n,cols)=>({
  left:`calc((100% - ${(cols-1)*BAR_GAP}px) / ${cols} * ${i} + ${i*BAR_GAP}px)`,
  width:`calc((100% - ${(cols-1)*BAR_GAP}px) / ${cols} * ${n} + ${(n-1)*BAR_GAP}px)`,
});
/* 연속으로 목표를 채운 주 묶음 (2주 이상) → [{start,len}] */
const comboRuns=(cells)=>{
  const out=[];let st=-1;
  cells.forEach((c,i)=>{
    if(c.complete){if(st<0)st=i;}
    else{if(st>=0&&i-st>=2)out.push({start:st,len:i-st});st=-1;}
  });
  if(st>=0&&cells.length-st>=2)out.push({start:st,len:cells.length-st});
  return out;
};

function ChronicleRow({h,C,col,d}){
  /* 막대 높이 = 그 주의 달성률. 꽉 찬 막대 = 그 주 목표 달성.
     연속으로 채운 주들은 칸을 나누지 않고 하나로 이어 '콤보'로 보여줍니다. */
  const H=38, n=d.cells.length;
  const runs=comboRuns(d.cells);
  const inRun=new Set(runs.flatMap(r=>Array.from({length:r.len},(_,k)=>r.start+k)));
  const lastRun=runs.length?runs[runs.length-1]:null;
  /* 주차 레이블의 '월'은 달이 바뀌는 칸에만 — 12px로 한 줄에 넣기 위해.
     첫 칸에도 붙이되, 바로 다음 칸에서 달이 바뀌면(긴 레이블 두 개가 붙음) 생략 */
  const months=d.cells.map(c=>weekOfMonth(c.mon).m);
  const starts=months.map((m,i)=>i>0&&m!==months[i-1]);
  const showMonth=months.map((m,i)=>i===0?!starts[1]:starts[i]);
  return(
    <div className="gl" style={{...GLASS,borderRadius:16,padding:"18px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:700,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
        {/* 가장 최근의 연속 달성 — 막대 안 대신 제목 오른쪽에 */}
        {lastRun&&<span style={{fontSize:13,flex:"0 0 auto",fontWeight:700,color:C.ink}}>{lastRun.len}주 연속</span>}
      </div>

      <div style={{position:"relative"}}>
        <div style={{display:"flex",gap:BAR_GAP}}>
          {d.cells.map((c,i)=>(
            /* 시작 전의 주는 빗금 + 흐리게 — 비어 있는 '못 한 주'와 구분됩니다 */
            <div key={i} title={`${weekRangeLabel(c.mon)} ${c.pre?"시작 전":`${c.done}/${c.target}`}`}
              style={{flex:1,minWidth:0,height:H,borderRadius:6,position:"relative",overflow:"hidden",
                background:c.pre
                  ?"repeating-linear-gradient(135deg,#ffffff0a 0 2px,transparent 2px 6px)"
                  :inRun.has(i)?"transparent":C.lineSoft,   // 콤보 칸은 위 블록이 반투명이라 아래 칸 경계가 비치지 않도록
                opacity:c.pre?0.5:1}}>
              {!c.pre&&!inRun.has(i)&&<div style={{position:"absolute",left:0,right:0,bottom:0,
                height:`${Math.max(c.ratio*100, c.ratio>0?12:0)}%`,
                background:col}}/>}   {/* 반투명 없이 단색 — 달성률은 막대 높이로 */}
            </div>
          ))}
        </div>
        {/* 콤보: 연속 달성한 주들을 한 덩어리로 */}
        {runs.map(r=>(
          <div key={r.start} title={`${r.len}주 연속 달성`}
            style={{position:"absolute",top:0,height:H,...spanPos(r.start,r.len,n),background:col,borderRadius:6,boxShadow:`0 0 16px ${col}55`}}/>
        ))}
      </div>

      <div data-wk style={{display:"flex",gap:BAR_GAP,marginTop:6}}>
        {d.cells.map((c,i)=>{
          const wk=weekOfMonth(c.mon);
          return(
            /* 긴 "10월 1주차"는 칸보다 조금 넓어서 양옆 여백으로 살짝 넘칩니다(이웃은 짧은 "n주차"라 안 겹침) */
            <div key={i} style={{flex:1,minWidth:0,display:"flex",justifyContent:"center",whiteSpace:"nowrap",
              letterSpacing:"-0.02em",fontSize:"clamp(11px, 3.4vw, 12px)",color:c.current?C.ink:C.sub,fontWeight:c.current?700:500,
              opacity:c.pre?0.4:c.current?1:0.75}}>
              {showMonth[i]?`${wk.m}월 ${wk.w}주차`:`${wk.w}주차`}
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
