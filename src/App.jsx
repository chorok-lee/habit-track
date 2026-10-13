import React, { useState, useEffect, useMemo, useRef } from "react";

/* ────────────────────────────────────────────────────────────
   습관 별자리 — 1인 1별자리 구조
   별 1개 = 습관 1개. 별의 밝기 = 주간 달성률(0→1).
   별들이 하나로 이어진 별자리. 전체 달성 시 폭발 광채.
   나 / 소운 전환 스위치.
──────────────────────────────────────────────────────────── */

const GREEN  = "#34D9A0";
const VIOLET = "#9B8CFF";
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
const subjName = (n) => hasBatchim(n) ? `${n}이가` : `${n}가`;
const tgtOf = (h) => h.kind==="daily" ? 7 : h.target;
/* 주 7회(매일) → 주 1회 순으로, 같은 주기면 가나다순 */
const sortHabits = (list) => [...(list||[])].sort((a,b)=>{
  const ta=tgtOf(a), tb=tgtOf(b);
  if(ta!==tb) return tb-ta;
  return String(a.name||"").localeCompare(String(b.name||""),"ko");
});
function migrateHabits(stored){const ids=DEFAULT_HABITS.map(d=>d.id);return [...DEFAULT_HABITS,...stored.filter(s=>!ids.includes(s.id))];}

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
  const [cache0]=useState(readCache);      // 지난번 데이터 — 있으면 로딩 없이 바로 보여줌
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
  const compose=(to)=>setModal({type:"compose",to:to||partner});
  const closeLetter=()=>setModal(null);
  const sendLetter=async(to,text)=>{
    setSending(true);
    try{
      await api("/api/messages",{method:"POST",body:JSON.stringify({from:who,to:to,text:text})});
      setModal(null); setToast("별똥별을 보냈어요");
    }catch(e){ setToast(e.message||"보내지 못했어요."); }
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

  const C={bg:"#0B0C12",surface:"#15171F",surface2:"#1D2029",ink:"#ECEDF2",sub:"#9A9CAA",line:"#282B36",lineSoft:"#22242E"};

  return (
    <div style={{background:C.bg,minHeight:"100vh",maxWidth:"100%",overflowX:"clip",color:C.ink,fontFamily:"'Pretendard',ui-sans-serif,system-ui,sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box}
        html,body{max-width:100%;overflow-x:clip}
        .mono{font-family:'Space Mono',monospace;font-variant-numeric:tabular-nums}
        .tap{cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s,background .25s,box-shadow .25s}
        .tap:active{transform:scale(.96)}
        .btn{transition:opacity .15s,transform .12s;cursor:pointer}.btn:hover{opacity:.85}.btn:active{transform:translateY(1px)}
        .fade{animation:fade .34s ease}@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .conf{position:absolute;left:50%;top:44%;width:6px;height:6px;opacity:1;border-radius:50%;animation:cburst 1.4s ease-out forwards}
        @keyframes cburst{to{transform:translate(var(--tx),var(--ty));opacity:0}}
        .glow-pulse{animation:gp 2.4s ease-in-out infinite}@keyframes gp{0%,100%{opacity:.7}50%{opacity:1}}
        /* ── 로딩: 별자리가 이어지는 애니메이션 + 실제 화면과 같은 자리의 뼈대 ── */
        .sk{border-radius:16px;background:linear-gradient(90deg,#15171F 0%,#1C1F28 45%,#15171F 90%);
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
        .navbar{position:sticky;top:0;z-index:10;background:#0B0C12}
        input.txt,select{font-family:inherit}
        .sky{position:relative;border-radius:20px;overflow:hidden;
          background:radial-gradient(140% 110% at 50% 40%,#0e1020 0%,#080910 55%,#030305 100%);
          box-shadow:inset 0 0 0 1px #ffffff0d,0 8px 40px #00000060}
        .pa-row{scrollbar-width:none;-ms-overflow-style:none;
          -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent);
          mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent)}
        .pa-row::-webkit-scrollbar{display:none}

        /* ── 별똥별 편지 ── */
        .lt-wrap{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:26px}
        .lt-scrim{position:absolute;inset:0;background:#04050A;opacity:0;
          animation:ltScrim 360ms cubic-bezier(.4,0,.2,1) 200ms forwards}
        @keyframes ltScrim{to{opacity:.58;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}}
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
        .glass{background:linear-gradient(158deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.05) 44%,rgba(255,255,255,.085) 100%);
          -webkit-backdrop-filter:blur(26px) saturate(150%);backdrop-filter:blur(26px) saturate(150%);
          border:1px solid rgba(255,255,255,.16);border-radius:26px;
          box-shadow:0 26px 64px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.24)}
        .lt-card{padding:28px 24px;min-height:272px;display:flex;flex-direction:column}
        .lt-from{font-size:10.5px;color:rgba(255,255,255,.56);text-align:center;margin:0}
        .lt-msg{font-size:17px;font-weight:700;line-height:1.78;color:#F3F5FC;text-align:center;margin:auto 0;
          white-space:pre-line;word-break:keep-all;text-shadow:0 1px 12px rgba(0,0,0,.35)}
        .lt-acts{display:flex;flex-direction:column;align-items:center;gap:15px;margin-top:22px}
        .lt-a1{background:#FFE6B0;color:#1A1405;font-size:13px;font-weight:700;padding:12px 40px;border:none;
          border-radius:999px;box-shadow:0 6px 22px rgba(255,230,176,.22);cursor:pointer;font-family:inherit}
        .lt-a2{background:none;border:none;font-size:12px;color:rgba(255,255,255,.34);cursor:pointer;
          padding:4px 8px;font-family:inherit}
        .lt-fade{opacity:0;transform:translateY(9px)}
        .lt-fade.f1{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1451ms forwards}
        .lt-fade.f2{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1521ms forwards}
        .lt-fade.f3{animation:ltFade 260ms cubic-bezier(.4,0,.2,1) 1591ms forwards}
        @keyframes ltFade{to{opacity:1;transform:none}}
        .lt-ta{width:100%;min-height:104px;resize:none;background:rgba(255,255,255,.06);color:#F3F5FC;
          border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:13px 14px;font-size:14px;
          line-height:1.7;font-family:inherit;outline:none}
        .lt-ta::placeholder{color:rgba(255,255,255,.3)}
        .lt-chip{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#D6DAE8;
          border-radius:999px;padding:7px 12px;font-size:11.5px;cursor:pointer;font-family:inherit}
        .lt-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 2px;
          border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer;text-align:left;width:100%;
          background:none;border-left:0;border-right:0;border-top:0;font-family:inherit;color:inherit}
        .lt-dot{width:6px;height:6px;border-radius:50%;background:#FFE6B0;flex:0 0 auto}
        @media(prefers-reduced-motion:reduce){
          .lt-meteor,.lt-flare{display:none}
          .lt-scrim,.lt-stack,.lt-fade{animation-duration:1ms!important;animation-delay:0ms!important}
        }
      `}</style>

      <div className="wrap">
        <header style={{paddingTop:28,paddingBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h1 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.02em",margin:0}}>습관 별자리 ✨</h1>
            {/* 최상단 우측 페이지 전환 토글 */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
            {lettersOn&&
              <button className="btn" onClick={openBox} aria-label="받은 편지"
                style={{position:"relative",background:C.surface,border:`1px solid ${C.line}`,borderRadius:11,
                  width:34,height:32,color:"#FFE6B0",fontSize:13,lineHeight:1,padding:0}}>
                ✦
                {unread.length>0&&<span style={{position:"absolute",top:5,right:6,width:6,height:6,
                  borderRadius:"50%",background:"#FFE6B0",boxShadow:"0 0 6px #FFE6B0"}}/>}
              </button>}
            <div style={{display:"flex",gap:3,background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,padding:3}}>
              {[["me",meName,GREEN],["friend",friendName,VIOLET]].map(([k,l,col])=>(
                <button key={k} className="btn" onClick={()=>{setPerson(k);setSelStar(null);}}
                  style={{padding:"5px 14px",borderRadius:9,border:"none",fontSize:13,fontWeight:700,
                    background:person===k?col:"transparent",
                    color:person===k?"#0B0C12":C.sub,
                    boxShadow:person===k?`0 1px 8px ${col}44`:"none",
                    transition:"background .18s,color .18s,box-shadow .18s"}}>{l}</button>
              ))}
            </div>
            </div>
          </div>
          {notice&&
            <div style={{marginTop:10,background:"#2A2113",border:"1px solid #4A3A18",borderRadius:12,
              padding:"10px 13px",fontSize:12,color:"#E8C879",lineHeight:1.55}}>
              {notice}
            </div>}
        </header>

        <nav className="navbar" style={{display:"flex",gap:22,borderBottom:`1px solid ${C.line}`,marginBottom:20}}>
          {[["sky","밤하늘"],["review","회고"]].map(([k,l])=>(
            <button key={k} className="btn" onClick={()=>setTab(k)} style={{background:"none",border:"none",padding:"10px 0",fontSize:15,
              fontWeight:tab===k?700:500,color:tab===k?C.ink:C.sub,
              borderBottom:tab===k?`2.5px solid ${C.ink}`:"2.5px solid transparent",marginBottom:-1}}>{l}</button>
          ))}
        </nav>

        {booting&&<LoadingView C={C} tab={tab}/>}

        {!booting&&tab==="sky"&&(
          <div className="fade">
            {/* 밤하늘 히어로 */}
            <div className="sky" style={{marginBottom:16}}>
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
              ? <CheerCard C={C} stars={frStars} name={friendName} color={VIOLET}/>
              : <CheerCard C={C} stars={myStars} name={meName} color={GREEN}/>}

            {/* 날짜 스테퍼 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"18px 0 12px"}}>
              <button className="btn" onClick={()=>setSelDate(toISO(addDays(fromISO(selDate),-1)))} style={arrowBtn(C)}>←</button>
              <div style={{fontSize:14.5,fontWeight:700}}>{fromISO(selDate).getMonth()+1}월 {fromISO(selDate).getDate()}일 ({WD[(fromISO(selDate).getDay()+6)%7]})</div>
              <button className="btn" onClick={()=>{const n=addDays(fromISO(selDate),1);if(n<=new Date())setSelDate(toISO(n));}}
                style={{...arrowBtn(C),opacity:selDate>=today?0.3:1}}>→</button>
            </div>

            {/* 습관 카드 — 노션 모드에서는 양쪽 다 실제 기록, 양쪽 다 체크 가능 */}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {(isNotion||person==="me")
                ? activeHabits.map(h=>{
                    const on=isLogged(h.id,selDate),wc=weekCount(h.id),tgt=tgtOf(h),done=wc>=tgt;
                    const col=activeColor;
                    return(
                      <div key={h.id} className="tap" onClick={()=>toggleLog(h.id,selDate)}
                        style={{background:on?col+"1c":C.surface,border:`1.5px solid ${on?col:C.line}`,
                          borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",
                          boxShadow:on?`0 3px 14px ${col}22`:"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:20,filter:on?"none":"grayscale(.4) opacity(.8)"}}>{emojiOf(h)}</span>
                          <div>
                            <div style={{fontSize:15,fontWeight:600}}>{h.name}</div>
                            <div className="mono" style={{fontSize:11.5,color:done?col:C.sub,marginTop:3,fontWeight:done?700:400}}>
                              {done?"이번 주 완성 ✦":`이번 주 ${wc}/${tgt}`}
                            </div>
                          </div>
                        </div>
                        <span style={{width:28,height:28,borderRadius:9,flex:"0 0 auto",border:`2px solid ${on?col:C.line}`,
                          background:on?col:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                          color:"#0B0C12",fontSize:15,fontWeight:800}}>{on?"✓":""}</span>
                      </div>
                    );
                  })
                : sortHabits(FRIEND_HABITS).map(h=>{
                    const tgt=tgtOf(h),done=h.done>=tgt;
                    return(
                      <div key={h.id} style={{background:C.surface,border:`1.5px solid ${done?VIOLET:C.line}`,
                        borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",
                        boxShadow:done?`0 3px 14px ${VIOLET}22`:"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:20}}>{emojiOf(h)}</span>
                          <div>
                            <div style={{fontSize:15,fontWeight:600}}>{h.name}</div>
                            <div className="mono" style={{fontSize:11.5,color:done?VIOLET:C.sub,marginTop:3,fontWeight:done?700:400}}>
                              {done?"이번 주 완성 ✦":`이번 주 ${h.done}/${tgt}`}
                            </div>
                          </div>
                        </div>
                        <span style={{width:28,height:28,borderRadius:9,flex:"0 0 auto",border:`2px solid ${done?VIOLET:C.line}`,
                          background:done?VIOLET:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                          color:"#0B0C12",fontSize:15,fontWeight:800}}>{done?"✓":""}</span>
                      </div>
                    );
                  })
              }
              {isNotion&&activeHabits.length===0&&
                <div style={{background:C.surface,border:`1px dashed ${C.line}`,borderRadius:16,padding:"18px 16px",
                  fontSize:13,color:C.sub,lineHeight:1.6,textAlign:"center"}}>
                  소유자가 <b style={{color:C.ink,fontWeight:600}}>{person==="me"?meName:friendName}</b>인 습관이 노션에 없어요.
                  {owners.length>0&&<><br/><span className="mono" style={{fontSize:11.5}}>DB에 있는 소유자: {owners.join(" · ")}</span></>}
                </div>}
            </div>

            {lettersOn&&
              <button className="btn" onClick={()=>compose(person==="me"?partner:friendName)}
                style={{width:"100%",marginTop:14,padding:"13px 0",borderRadius:14,fontSize:13.5,fontWeight:600,
                  color:"#1A1405",background:"#FFE6B0",border:"none",boxShadow:"0 6px 22px rgba(255,230,176,.16)"}}>
                {(person==="me"?partner:friendName)}에게 별똥별 보내기
              </button>}

            {/* 노션 모드에서는 목록을 노션에서 관리하므로, 눌러도 안내만 나오던 버튼을 감춥니다 */}
            {!isNotion&&<>
              <button className="btn" onClick={()=>setShowManage(s=>!s)}
                style={{background:"none",border:"none",color:C.sub,fontSize:12.5,marginTop:16,padding:4}}>
                {showManage?"닫기":"습관 추가 · 정리"}
              </button>
              {showManage&&<Manage C={C} habits={habits} setHabits={setHabits}/>}
            </>}
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

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {(isNotion||person==="me")
                ? activeHabits.map(h=>(
                    <ChronicleRow key={h.id} h={h} C={C} col={activeColor} d={chronicleOf(h)}/>
                  ))
                : sortHabits(FRIEND_HABITS).map(h=>(
                    <FriendChronicleRow key={h.id} h={h} C={C} col={VIOLET}/>
                  ))
              }
            </div>
          </div>
        )}
      </div>
      {modal&&modal.type==="read"&&
        <LetterModal letter={modal.letter} onClose={closeLetter}
          onReply={()=>setModal({type:"compose",to:modal.letter.from||partner})}/>}
      {modal&&modal.type==="compose"&&
        <ComposeSheet C={C} to={modal.to} sending={sending}
          onClose={()=>setModal(null)} onSend={(txt)=>sendLetter(modal.to,txt)}/>}
      {modal&&modal.type==="box"&&
        <LetterBox C={C} letters={letters} who={who} owners={owners.length>1?owners:[meName,friendName]}
          onPick={(l)=>setModal({type:"read",letter:l})} onClose={()=>setModal(null)}
          onOwner={setOwnerOfDevice}/>}
      {toast&&<Toast C={C} text={toast}/>}
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
      <div className="sky" style={{marginBottom:16}}>
        <svg viewBox="0 0 560 296" width="100%" style={{display:"block"}} aria-hidden="true">
          {bg.map((s,i)=><circle key={i} className="ld-bg" cx={s.x} cy={s.y} r={s.r} fill="#b0b8d8"
            style={{animationDelay:`${s.d}s`}}/>)}
          {LD_STARS.slice(1).map((p,i)=>{
            const a=LD_STARS[i];
            return <line key={i} className="ld-line" pathLength="1" x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]}
              stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" style={{animationDelay:`${i*step}s`}}/>;
          })}
          {LD_STARS.map((p,i)=>(
            <g key={i} className="ld-star" style={{animationDelay:`${Math.max(0,i-0.6)*step}s`}}>
              <circle cx={p[0]} cy={p[1]} r="7" fill={GREEN} opacity=".18"/>
              <circle cx={p[0]} cy={p[1]} r="2.6" fill="#fff"/>
            </g>
          ))}
          <text key={slow?"s":"f"} className="ld-msg" x="280" y="236" textAnchor="middle" fontSize="13" fill={C.sub}
            style={{fontFamily:"'Pretendard',sans-serif"}}>
            {slow?"노션에서 기록을 가져오고 있어요":"별을 불러오는 중이에요"}
          </text>
        </svg>
      </div>
      {/* 실제 화면 자리에 맞춘 뼈대 */}
      {tab==="sky"
        ? <>
            <div className="sk" style={{height:92,marginBottom:14}}/>
            <div className="sk" style={{height:42,margin:"18px 0 12px",borderRadius:12}}/>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {[0,1,2,3].map(i=><div key={i} className="sk" style={{height:64,animationDelay:`${i*0.08}s`}}/>)}
            </div>
          </>
        : <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[0,1,2].map(i=><div key={i} className="sk" style={{height:118,animationDelay:`${i*0.08}s`}}/>)}
          </div>}
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
          <p className="lt-from lt-fade f1">{(letter.from||"어딘가")} 은하에서 도착한 편지</p>
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

function ComposeSheet({C,to,onClose,onSend,sending}){
  const [text,setText]=useState("");
  const ref=useRef(null);
  useEffect(()=>{const t=setTimeout(()=>ref.current&&ref.current.focus(),320);return()=>clearTimeout(t);},[]);
  const left=300-text.length;
  return (
    <div className="lt-wrap" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lt-scrim" style={{animationDelay:"0ms"}}/>
      <div className="lt-stack lt-now" onClick={e=>e.stopPropagation()}>
        <div className="glass" style={{padding:"22px 20px"}}>
          <p style={{fontSize:11,color:"rgba(255,255,255,.56)",textAlign:"center",margin:"0 0 14px"}}>
            {to} 은하로 보낼 편지
          </p>
          <textarea id="lt-text" ref={ref} className="lt-ta" value={text} maxLength={300}
            onChange={e=>setText(e.target.value)} placeholder="짧아도 괜찮아요. 한 줄이면 충분해요."/>
          <div style={{textAlign:"right",fontSize:10.5,color:"rgba(255,255,255,.3)",marginTop:9}}>{left}자 남음</div>
        </div>
        <div className="lt-acts">
          <button className="lt-a1" disabled={!text.trim()||sending}
            style={{opacity:(!text.trim()||sending)?0.45:1}}
            onClick={()=>onSend(text.trim())}>{sending?"보내는 중…":"별똥별로 보내기"}</button>
          <button className="lt-a2" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function LetterBox({C,letters,who,owners,onPick,onClose,onOwner}){
  return (
    <div className="lt-wrap" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lt-scrim" style={{animationDelay:"0ms"}}/>
      <div className="lt-stack lt-now" onClick={e=>e.stopPropagation()}>
        <div className="glass" style={{padding:"20px 18px",maxHeight:"62vh",overflowY:"auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:700,color:"#F3F5FC"}}>지난 편지</span>
            <label style={{fontSize:10.5,color:"rgba(255,255,255,.45)",display:"flex",alignItems:"center",gap:6}}>
              이 기기의 주인
              <select id="lt-owner" value={who} onChange={e=>onOwner(e.target.value)}
                style={{background:"rgba(255,255,255,.08)",color:"#EDEFF7",border:"1px solid rgba(255,255,255,.14)",
                  borderRadius:8,padding:"4px 7px",fontSize:11,fontFamily:"inherit"}}>
                {owners.filter(Boolean).map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>
          {letters.length===0
            ? <p style={{fontSize:12.5,color:"rgba(255,255,255,.4)",lineHeight:1.7,margin:"14px 0 6px"}}>
                아직 도착한 편지가 없어요.
              </p>
            : letters.map(l=>(
                <button key={l.id} className="lt-row" onClick={()=>onPick(l)}>
                  <span style={{minWidth:0}}>
                    <span style={{display:"block",fontSize:12.5,color:"#E9ECF6",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.text}</span>
                    <span style={{display:"block",fontSize:10.5,color:"rgba(255,255,255,.36)",marginTop:3}}>
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
      maxWidth:"min(92vw,420px)",background:C.surface2,border:`1px solid ${C.line}`,borderRadius:12,
      padding:"11px 15px",fontSize:13,color:C.ink,boxShadow:"0 8px 30px #00000070",lineHeight:1.5}}>{text}</div>
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
  const bg=useMemo(()=>Array.from({length:60},(_,i)=>{
    const a=Math.sin(i*12.9898+1)*43758.5453,b=Math.sin(i*78.233+2)*43758.5453;
    const rx=a-Math.floor(a),ry=b-Math.floor(b);
    return{x:(rx*560).toFixed(1),y:(ry*296).toFixed(1),r:(0.4+(Math.sin(i*3.7)*0.5+0.5)*0.9).toFixed(2),o:(0.08+rx*0.22).toFixed(2)};
  }),[]);

  const ME_C=[148,152], FR_C=[412,152];
  const mePts = buildPoints(meStars, ME_C, 1.0);
  const frPts = buildPoints(frStars, FR_C, 1.0);
  const meAll = meStars.length>0 && meStars.every(s=>s.complete);
  const frAll = frStars.length>0 && frStars.every(s=>s.complete);

  return(
    <svg viewBox="0 0 560 296" width="100%" style={{display:"block"}} onClick={()=>setSelStar(null)}>
      {bg.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#b0b8d8" opacity={s.o} style={{pointerEvents:"none"}}/>)}

      {/* 구분선 */}
      <line x1="280" y1="24" x2="280" y2="272" stroke="#ffffff" strokeWidth="1" strokeDasharray="1 7" opacity="0.12" style={{pointerEvents:"none"}}/>

      {/* 영역 라벨 */}
      {/* person이 "both"면 양쪽 다 밝게 — 주간 기록에서 두 사람을 나란히 볼 때 */}
      <text x="148" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill={GREEN}
        opacity={person==="friend"?0.35:0.95} style={{fontFamily:"'Pretendard',sans-serif",pointerEvents:"none"}}>{meName||"초록"}</text>
      <text x="412" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill={VIOLET}
        opacity={person==="me"?0.35:0.95} style={{fontFamily:"'Pretendard',sans-serif",pointerEvents:"none"}}>{friendName||"소운"}</text>

      {/* 나 별자리 — 선택 시 밝게, 아니면 약간 dim */}
      <OneStar stars={meStars} pts={mePts} color={GREEN} allComplete={meAll}
        selStar={person==="me"?selStar:null}
        onSelect={id=>{ if(person==="me") setSelStar(k=>k===id?null:id); }}
        dim={person==="friend"}/>

      {/* 소운 별자리 */}
      <OneStar stars={frStars} pts={frPts} color={VIOLET} allComplete={frAll}
        selStar={person==="friend"?selStar:null}
        onSelect={id=>{ if(person==="friend") setSelStar(k=>k===id?null:id); }}
        dim={person==="me"}/>

      {selStar && <StarTooltip
        star={(person==="me"?meStars:frStars).find(s=>s.id===selStar)}
        pt={(person==="me"?mePts:frPts).find(p=>p.id===selStar)}
        color={person==="me"?GREEN:VIOLET}/>}

      {burst>0 && <BurstEffect
        cx={person==="me"?ME_C[0]:FR_C[0]} cy={person==="me"?ME_C[1]:FR_C[1]}
        color={person==="me"?GREEN:VIOLET}/>}
    </svg>
  );
}

function buildPoints(stars, center, scale=1.0){
  const n=stars.length; if(!n) return [];
  const layout=layoutFor(n);
  return stars.map((s,i)=>({id:s.id, x:center[0]+layout[i][0]*scale, y:center[1]+layout[i][1]*scale}));
}

/* 별자리 컴포넌트: 선 + 별들 */
function OneStar({stars,pts,color,allComplete,selStar,onSelect,dim}){
  if(!stars.length||!pts.length) return null;
  const n=stars.length;
  const order=connOrder(n);
  const ordered=order.map(i=>({star:stars[i],pt:pts[i]}));
  const baseOp=dim?0.25:1;

  return(
    <g opacity={baseOp}>
      {/* 연결선 */}
      {ordered.slice(1).map(({pt:p},i)=>{
        const a=ordered[i].pt, b=p;
        const aR=ordered[i].star.ratio, bR=ordered[i+1]?.star.ratio??0;
        const bright=(aR>0.3&&bR>0.3), lineBright=Math.min(aR,bR);
        return(
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={color} strokeWidth={allComplete?1.6:bright?1.2:0.6}
            opacity={allComplete?0.75:lineBright*0.55+0.05} strokeLinecap="round"/>
        );
      })}

      {/* 별 */}
      {stars.map((s,i)=>{
        const pt=pts[i];
        const isSel=selStar===s.id;
        return(
          <g key={s.id} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();onSelect(s.id);}}>
            <circle cx={pt.x} cy={pt.y} r={24} fill="transparent"/>
            {isSel&&<circle cx={pt.x} cy={pt.y} r={16} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity=".5"/>}
            <PlanetStar x={pt.x} y={pt.y} ratio={s.ratio} color={color} complete={s.complete} allComplete={allComplete}/>
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

/* 별(행성) — 밝기가 ratio에 따라 변함 */
function PlanetStar({x,y,ratio,color,complete,allComplete}){
  /* ratio 0→1: 핵 크기, 글로우 반경, 광채 길이 모두 선형 증가 */
  const core    = 2.2 + ratio*3.2;          // 핵 반경
  const glow1   = core + 2 + ratio*6;       // 1차 글로우
  const glow2   = glow1 + ratio*10;         // 2차 글로우
  const spike   = 4 + ratio*14;             // 십자 광채 길이
  const sw      = 0.8 + ratio*1.4;         // 광채 두께
  const coreOp  = 0.25 + ratio*0.75;       // 핵 불투명도
  const g1Op    = ratio*0.30;
  const g2Op    = ratio*0.12;
  const lineOp  = ratio*0.80;
  const cls     = allComplete&&complete ? "glow-pulse" : "";

  return(
    <g className={cls}>
      {/* 2차 글로우 (멀리 퍼지는 빛) */}
      {ratio>0.1&&<circle cx={x} cy={y} r={glow2} fill={color} opacity={g2Op}/>}
      {/* 1차 글로우 */}
      {ratio>0.05&&<circle cx={x} cy={y} r={glow1} fill={color} opacity={g1Op}/>}
      {/* 십자 광채 */}
      {ratio>0.15&&<>
        <line x1={x} y1={y-spike} x2={x} y2={y+spike} stroke={color} strokeWidth={sw} opacity={lineOp} strokeLinecap="round"/>
        <line x1={x-spike} y1={y} x2={x+spike} y2={y} stroke={color} strokeWidth={sw} opacity={lineOp} strokeLinecap="round"/>
        {ratio>0.5&&<>
          <line x1={x-spike*.6} y1={y-spike*.6} x2={x+spike*.6} y2={y+spike*.6} stroke={color} strokeWidth={sw*.5} opacity={lineOp*.5} strokeLinecap="round"/>
          <line x1={x+spike*.6} y1={y-spike*.6} x2={x-spike*.6} y2={y+spike*.6} stroke={color} strokeWidth={sw*.5} opacity={lineOp*.5} strokeLinecap="round"/>
        </>}
      </>}
      {/* 핵 */}
      <circle cx={x} cy={y} r={core} fill={complete?"#ffffff":color} opacity={coreOp}/>
      {complete&&<circle cx={x} cy={y} r={core*.5} fill="#ffffff" opacity="0.9"/>}
    </g>
  );
}

/* 별 툴팁 */
function StarTooltip({star,pt,color}){
  if(!star||!pt) return null;
  const pct=Math.round(star.ratio*100);
  const label=`${star.emoji} ${star.name}`;
  const w=Math.max(80,label.length*11+20);
  const ty=pt.y-52; const tx=Math.max(8,Math.min(552-w,pt.x-w/2));
  return(
    <g style={{pointerEvents:"none"}}>
      <rect x={tx} y={ty} width={w} height={44} rx={10} fill="#14151f" stroke="#2e3148" strokeWidth="1"/>
      <text x={tx+w/2} y={ty+18} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#ECEDF2" style={{fontFamily:"'Pretendard',sans-serif"}}>{label}</text>
      <text x={tx+w/2} y={ty+34} textAnchor="middle" fontSize="10.5" fill={color} fontWeight="700" style={{fontFamily:"'Space Mono',monospace"}}>{star.done}/{star.target} ({pct}%)</text>
      <path d={`M${pt.x-5},${ty+44} L${pt.x+5},${ty+44} L${pt.x},${ty+50} Z`} fill="#14151f"/>
    </g>
  );
}

/* 전체 달성 폭발 */
function BurstEffect({cx,cy,color}){
  if(reduceMotion) return null;
  const rays=Array.from({length:12},(_,i)=>{
    const a=(i/12)*Math.PI*2;
    const len=30+Math.random()*50;
    return{x2:cx+Math.cos(a)*len,y2:cy+Math.sin(a)*len,op:0.4+Math.random()*.5};
  });
  return(
    <g style={{pointerEvents:"none"}}>
      <circle cx={cx} cy={cy} r="60" fill={color} opacity="0.08"/>
      <circle cx={cx} cy={cy} r="30" fill={color} opacity="0.14"/>
      {rays.map((r,i)=><line key={i} x1={cx} y1={cy} x2={r.x2} y2={r.y2} stroke={color} strokeWidth="1.2" opacity={r.op} strokeLinecap="round"/>)}
      <circle cx={cx} cy={cy} r="8" fill="#ffffff" opacity="0.9"/>
    </g>
  );
}

/* ── ProgressArea ── */
function ProgressArea({C,rows}){
  return(
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:"14px 16px",marginBottom:14,display:"flex",flexDirection:"column",gap:14,overflow:"hidden"}}>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"flex",alignItems:"flex-start",gap:12,minWidth:0}}>
          {/* 이름을 그대로 적습니다 — 보는 사람에 따라 '나'가 달라지므로 */}
          <span style={{minWidth:30,height:26,padding:"0 9px",borderRadius:13,background:row.color,color:"#0B0C12",
            fontSize:11.5,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",
            flex:"0 0 auto",marginTop:4,whiteSpace:"nowrap"}}>{row.who}</span>
          {/* 한 줄로 고정하고, 다 못 담으면 좌우로 스와이프해서 봅니다 */}
          <div className="pa-row" style={{display:"flex",flexWrap:"nowrap",gap:9,flex:1,minWidth:0,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
            {row.items.map(it=>(
              <div key={it.key} style={{flex:"0 0 auto",width:40,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                <span style={{fontSize:15,opacity:it.complete?1:.8}}>{it.emoji}</span>
                <div style={{width:"100%",height:5,borderRadius:3,background:C.lineSoft,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round(it.ratio*100)}%`,background:it.color,borderRadius:3,transition:"width .45s ease",boxShadow:it.complete?`0 0 7px ${it.color}`:"none"}}/>
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
function CheerCard({C,stars,name,color}){
  const done=(stars||[]).filter(s=>s.complete);
  if(!done.length) return null;
  return(
    <div style={{display:"flex",alignItems:"center",gap:9,background:C.surface,border:`1px solid ${C.line}`,
      borderRadius:14,padding:"10px 13px",marginBottom:14}}>
      <span style={{display:"flex",gap:3,flex:"0 0 auto"}}>
        {done.slice(0,3).map(f=><span key={f.id} style={{fontSize:14}}>{f.emoji}</span>)}
      </span>
      <div style={{fontSize:12.5,lineHeight:1.5,color:C.sub,wordBreak:"keep-all"}}>
        {subjName(name)} 이번 주에 <b style={{color,fontWeight:700}}>{done.length}개</b> 목표를 채웠어요
      </div>
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

  const head=(t,d)=>(
    <div style={{minWidth:0}}>
      <div className="mono" style={{fontSize:10,color:C.sub,fontWeight:700}}>{t}</div>
      <div className="mono" style={{fontSize:8.5,color:C.sub,opacity:.6,marginTop:1}}>{d}</div>
    </div>
  );

  return(
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
      padding:"13px 14px 14px",marginBottom:16,
      display:"grid",gridTemplateColumns:"auto 1fr auto 1fr",columnGap:7,rowGap:9,alignItems:"center"}}>
      <span/>
      {head("지난주",weekRangeLabel(prevMonISO))}
      <span/>
      {head("이번 주",weekRangeLabel(curMonISO))}

      {rows.map(r=>(
        <React.Fragment key={r.name}>
          <span style={{fontSize:10.5,fontWeight:700,color:r.color,whiteSpace:"nowrap",
            justifySelf:"start",maxWidth:38,overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
          <MiniSky C={C} stars={r.past} color={r.color} past/>
          <span style={{color:C.sub,fontSize:11,opacity:.6}}>→</span>
          <MiniSky C={C} stars={r.now} color={r.color}/>
        </React.Fragment>
      ))}
    </div>
  );
}

/* 작은 별자리 썸네일 — 큰 밤하늘과 달리 글로우 없이 담백하게.
   아래쪽 띠가 그 주에 채운 목표 비율입니다. */
function MiniSky({C,stars,color,past}){
  const W=120,H=80,BAR_Y=70,BAR_X=9,BAR_W=W-BAR_X*2;
  const pts=buildPoints(stars,[W/2,(BAR_Y-6)/2+3],0.52);
  const seq=connOrder(stars.length).map(i=>({s:stars[i],p:pts[i]})).filter(x=>x.p);
  const done=stars.filter(s=>s.complete).length;
  const ratio=stars.length?done/stars.length:0;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",borderRadius:9,
      background:"radial-gradient(120% 100% at 50% 40%,#10131f 0%,#07080e 70%,#04050a 100%)",
      border:past?`1px solid ${C.line}`:`1px dashed ${color}77`,
      opacity:past?0.85:1}}>
      <title>{`${done}/${stars.length} 완성`}</title>
      {seq.slice(1).map((x,i)=>{
        const a=seq[i].p,b=x.p,m=Math.min(seq[i].s.ratio,x.s.ratio);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color}
          strokeWidth={m>0.3?0.8:0.4} opacity={m*0.5+0.08} strokeLinecap="round"/>;
      })}
      {stars.map((s,i)=>{
        const p=pts[i]; if(!p) return null;
        const r=1.0+s.ratio*1.9;
        return(
          <g key={s.id}>
            {s.complete&&<circle cx={p.x} cy={p.y} r={r*2.6} fill={color} opacity={0.2}/>}
            <circle cx={p.x} cy={p.y} r={r} fill={s.complete?"#FFFFFF":color} opacity={s.complete?1:0.25+s.ratio*0.7}/>
          </g>
        );
      })}
      {/* 이 주에 채운 목표 비율 */}
      <rect x={BAR_X} y={BAR_Y} width={BAR_W} height="3" rx="1.5" fill="#FFFFFF" opacity="0.08"/>
      {ratio>0&&<rect x={BAR_X} y={BAR_Y} width={BAR_W*ratio} height="3" rx="1.5" fill={color} opacity={past?0.75:1}/>}
    </svg>
  );
}


/* ── 목표별 회고 ── */
function ChronicleRow({h,C,col,d}){
  /* 숫자와 설명을 걷어내고, 막대 높이로 그 주의 달성률을 보여줍니다.
     꽉 찬 막대 = 그 주 목표 달성. 점선 = 아직 진행 중인 이번 주. */
  const H=38;
  return(
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:"13px 15px 11px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:9}}>
        <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
          <span style={{fontSize:16,flex:"0 0 auto"}}>{emojiOf(h)}</span>
          <span style={{fontSize:14,fontWeight:700,wordBreak:"keep-all"}}>{h.name}</span>
        </div>
        {d.window>0&&<span className="mono" style={{fontSize:11,flex:"0 0 auto",fontWeight:700,
          color:d.recent>0?col:C.sub,opacity:d.recent>0?1:.6}}>✦ {d.recent}/{d.window}</span>}
      </div>

      <div style={{display:"flex",gap:5,alignItems:"flex-start"}}>
        {d.cells.map((c,i)=>{
          const wk=weekOfMonth(c.mon);
          return(
            <div key={i} style={{flex:1,minWidth:0}}>
              {/* 시작 전의 주는 빗금 + 흐리게 — 비어 있는 '못 한 주'와 구분됩니다 */}
              <div title={`${weekRangeLabel(c.mon)} ${c.pre?"시작 전":`${c.done}/${c.target}`}`}
                style={{height:H,borderRadius:6,position:"relative",overflow:"hidden",
                  background:c.pre
                    ?"repeating-linear-gradient(135deg,#ffffff0a 0 2px,transparent 2px 6px)"
                    :C.lineSoft,
                  opacity:c.pre?0.5:1,
                  outline:c.current?`1.5px dashed ${col}99`:"none",outlineOffset:-1}}>
                {!c.pre&&<div style={{position:"absolute",left:0,right:0,bottom:0,
                  height:`${Math.max(c.ratio*100, c.ratio>0?12:0)}%`,
                  background:c.complete?col:col+"55",
                  boxShadow:c.complete?`0 0 10px ${col}66`:"none"}}/>}
              </div>
              {/* 주차 레이블 — 한 줄. 폰 폭에서도 칸 안에 들어가도록 글자 간격을 살짝 좁힘 */}
              <div style={{textAlign:"center",marginTop:5,whiteSpace:"nowrap",letterSpacing:"-0.04em",
                fontSize:9,color:c.current?col:C.sub,fontWeight:c.current?700:500,
                opacity:c.pre?0.4:c.current?1:0.75}}>
                {wk.m}월 {wk.w}주차
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
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:"15px 17px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:17}}>{emojiOf(h)}</span><span style={{fontSize:14.5,fontWeight:700}}>{h.name}</span></div>
        <span className="mono" style={{fontSize:12,color:h.done>=tgt?col:C.sub,fontWeight:700}}>{h.done}/{tgt}{h.done>=tgt?" ✦":""}</span>
      </div>
      <div style={{height:6,borderRadius:3,background:C.lineSoft,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.round(Math.min(1,h.done/tgt)*100)}%`,background:col,borderRadius:3,boxShadow:h.done>=tgt?`0 0 8px ${col}`:"none"}}/>
      </div>
    </div>
  );
}
/* ── Manage ── */
function Manage({C,habits,setHabits}){
  const [name,setName]=useState(""),[emoji,setEmoji]=useState("⭐"),[kind,setKind]=useState("daily"),[target,setTarget]=useState(3);
  const add=()=>{if(!name.trim())return;setHabits(p=>[...p,{id:"h"+Date.now(),name:name.trim(),emoji:emoji||"⭐",kind,target:kind==="daily"?7:Math.max(1,Math.min(6,target))}]);setName("");setEmoji("⭐");};
  return(
    <div className="fade" style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:16,marginTop:8}}>
      {habits.map(h=>(
        <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0"}}>
          <span style={{display:"flex",alignItems:"center",gap:9,fontSize:14}}><span style={{fontSize:16}}>{emojiOf(h)}</span>{h.name}<span className="mono" style={{color:C.sub,fontSize:11}}>{h.kind==="daily"?"매일":`주${h.target}`}</span></span>
          <button className="btn" onClick={()=>setHabits(p=>p.filter(x=>x.id!==h.id))} style={{background:"none",border:"none",color:C.sub,fontSize:13}}>삭제</button>
        </div>
      ))}
      <div style={{borderTop:`1px solid ${C.lineSoft}`,marginTop:8,paddingTop:12,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <input className="txt" value={emoji} onChange={e=>setEmoji(e.target.value.slice(0,2))} style={inp(C,{width:46,textAlign:"center"})}/>
        <input className="txt" value={name} onChange={e=>setName(e.target.value)} placeholder="새 습관 이름" style={inp(C,{flex:"1 1 120px"})}/>
        <select value={kind} onChange={e=>setKind(e.target.value)} style={inp(C,{})}><option value="daily">매일</option><option value="weekly">주 N회</option></select>
        {kind==="weekly"&&<select value={target} onChange={e=>setTarget(Number(e.target.value))} style={inp(C,{})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>주{n}</option>)}</select>}
        <button className="btn" onClick={add} style={{background:GREEN,color:"#0B0C12",border:"none",borderRadius:9,padding:"9px 16px",fontSize:14,fontWeight:700}}>추가</button>
      </div>
    </div>
  );
}
function arrowBtn(C){return{background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,width:42,height:42,fontSize:16,color:C.ink,lineHeight:1};}
function inp(C,extra){return{border:`1px solid ${C.line}`,borderRadius:9,padding:"9px 11px",fontSize:14,background:C.surface2,color:C.ink,fontFamily:"inherit",outline:"none",...extra};}
