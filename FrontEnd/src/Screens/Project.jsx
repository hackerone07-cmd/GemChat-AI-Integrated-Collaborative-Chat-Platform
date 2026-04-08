import React, {
  useEffect, useState, useContext, useRef, useCallback, useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "../Config/axios.config.js";
import {
  initializeSocket, receiveMessage, sendMessage, disconnectSocket,
} from "../Config/socket.config.js";
import { UserContext } from "../Context/user.context";
import { getWebcontainer } from "../Config/Webcontainer.js";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#151515",sidebar:"#1d1d1d",actBar:"#151515",header:"#1d1d1d",panel:"#1d1d1d",
  border:"#2d2d2d",borderFaint:"#252525",text:"#d4d4d4",textMid:"#858585",textDim:"#525252",
  accent:"#6c47ff",accentHov:"#7c5cff",accentSoft:"rgba(108,71,255,0.12)",accentBrd:"rgba(108,71,255,0.35)",
  green:"#50fa7b",greenSoft:"rgba(80,250,123,0.12)",red:"#ff5555",redSoft:"rgba(255,85,85,0.1)",
  yellow:"#ffb86c",tabBg:"#1d1d1d",tabActive:"#151515",tabHov:"#222",input:"#111",statusBar:"#6c47ff",
};

// ─── Language map ─────────────────────────────────────────────────────────────
const EXT_TO_LANG={
  js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",
  py:"python",rb:"ruby",java:"java",cpp:"cpp",cc:"cpp",cxx:"cpp",
  c:"c",h:"c",cs:"csharp",go:"go",rs:"rust",php:"php",kt:"kotlin",
  swift:"swift",scala:"scala",hs:"haskell",lua:"lua",pl:"perl",r:"r",
  sh:"shell",bash:"shell",zsh:"shell",html:"html",htm:"html",css:"css",
  scss:"scss",sass:"scss",json:"json",yaml:"yaml",yml:"yaml",toml:"ini",
  xml:"xml",md:"markdown",sql:"sql",dockerfile:"dockerfile",tf:"hcl",
  vue:"html",svelte:"html",txt:"plaintext",
};
const getLang=(f="")=>EXT_TO_LANG[f.split(".").pop()?.toLowerCase()||""]||"plaintext";

// ─── File type dot colours ────────────────────────────────────────────────────
const EXT_COL={
  js:"#f1e05a",jsx:"#61dafb",ts:"#3178c6",tsx:"#61dafb",py:"#3572a5",java:"#b07219",
  cpp:"#f34b7d",c:"#555",cs:"#178600",go:"#00add8",rs:"#dea584",rb:"#701516",
  php:"#4f5d95",kt:"#a97bff",swift:"#fa7343",html:"#e34c26",css:"#264de4",
  scss:"#c6538c",json:"#cbcb41",yaml:"#cc1010",yml:"#cc1010",md:"#083fa1",
  sql:"#e38c00",sh:"#89e051",bash:"#89e051",txt:"#4a4a4a",dockerfile:"#0db7ed",
};
const extCol=(name="")=>EXT_COL[name.split(".").pop()?.toLowerCase()||""]||"#555";
const Dot=({name,s=9})=>(
  <span style={{display:"inline-block",width:s,height:s,borderRadius:2,background:extCol(name),flexShrink:0}}/>
);

// ─── Wandbox runners ──────────────────────────────────────────────────────────
const WB={
  cpp:"gcc-head",c:"gcc-head",java:"openjdk-head",python:"cpython-3.12.0",
  javascript:"nodejs-head",typescript:"typescript-5.0.4",go:"go-1.21.5",
  rust:"rust-1.74.0",ruby:"ruby-3.2.2",php:"php-8.2.13",kotlin:"kotlin-1.9.20",
  swift:"swift-5.9.1",shell:"bash",haskell:"ghc-9.6.3",lua:"lua-5.4.4",
  perl:"perl-5.38.0",scala:"scala-3.3.1",r:"r-4.3.1",csharp:"mono-6.12.0.200",
};
const WB_OPTS={cpp:"-std=c++17",c:"-x c -std=c11"};
const wandbox=async(code,lang)=>{
  const compiler=WB[lang];
  if (!compiler) throw new Error(`"${lang}" not runnable in browser`);
  if (lang==="java") code=code.replace(/public\s+class\s+\w+/g,"public class Main");
  const res=await fetch("https://wandbox.org/api/compile.json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({compiler,code,options:WB_OPTS[lang]||"","compiler-option-raw":WB_OPTS[lang]||""})});
  if (!res.ok) throw new Error(`Wandbox error ${res.status}`);
  return res.json();
};

// ─── Cursor colours ───────────────────────────────────────────────────────────
const CURS_COLS=["#ff79c6","#50fa7b","#ffb86c","#8be9fd","#bd93f9","#ff5555","#f1fa8c","#6272a4","#ff6e6e","#69ff47"];
const colFor=(email="")=>{let h=0;for(let i=0;i<email.length;i++)h=(h*31+email.charCodeAt(i))>>>0;return CURS_COLS[h%CURS_COLS.length];};

// ─── One-click React scaffold ─────────────────────────────────────────────────
const REACT_SCAFFOLD = {
  "package.json": {
    lang:"json",
    content:JSON.stringify({
      name:"my-react-app",private:true,version:"0.0.0",type:"module",
      scripts:{dev:"vite",build:"vite build",preview:"vite preview"},
      dependencies:{react:"^18.3.1","react-dom":"^18.3.1"},
      devDependencies:{vite:"^5.4.2","@vitejs/plugin-react":"^4.3.1"},
    },null,2)+"\n",
  },
  "vite.config.js":{
    lang:"javascript",
    content:`import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`,
  },
  "index.html":{
    lang:"html",
    content:`<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`,
  },
  "src/main.jsx":{
    lang:"javascript",
    content:`import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App.jsx'\n\ncreateRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n`,
  },
  "src/App.jsx":{
    lang:"javascript",
    content:`import { useState } from 'react'\nimport './App.css'\n\nfunction App() {\n  const [count, setCount] = useState(0)\n\n  return (\n    <div className="app">\n      <h1>⚡ React + Vite</h1>\n      <div className="card">\n        <button onClick={() => setCount(c => c + 1)}>\n          count is {count}\n        </button>\n        <p>Edit <code>src/App.jsx</code> and save to see live updates</p>\n      </div>\n    </div>\n  )\n}\n\nexport default App\n`,
  },
  "src/App.css":{
    lang:"css",
    content:`.app {\n  max-width: 640px;\n  margin: 0 auto;\n  padding: 2rem;\n  text-align: center;\n  font-family: system-ui, sans-serif;\n  background: #1a1a2e;\n  min-height: 100vh;\n  color: #e2e8f0;\n}\nh1 { font-size: 2.5rem; margin-bottom: 1rem; }\n.card {\n  padding: 2rem;\n  border: 1px solid #6c47ff44;\n  border-radius: 12px;\n  background: rgba(108,71,255,0.08);\n}\nbutton {\n  border-radius: 8px; border: 1px solid #6c47ff;\n  padding: 0.6em 1.4em; font-size: 1em; font-weight: 600;\n  background: #6c47ff; color: white; cursor: pointer;\n  transition: background 0.2s;\n}\nbutton:hover { background: #7c5cff; }\ncode { color: #50fa7b; background: #0d0d0d; padding: 2px 6px; border-radius: 4px; }\n`,
  },
  "src/index.css":{
    lang:"css",
    content:`*, *::before, *::after { box-sizing: border-box; }\nbody { margin: 0; background: #151515; }\n`,
  },
};

// ─── Context menu ─────────────────────────────────────────────────────────────
const CTX=({x,y,items,close})=>{
  const r=useRef(null);
  useEffect(()=>{
    const h=e=>{if(r.current&&!r.current.contains(e.target))close();};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[close]);
  return(
    <div ref={r} style={{position:"fixed",left:x,top:y,zIndex:9999,background:"#2a2a2a",border:`1px solid ${C.border}`,borderRadius:6,minWidth:175,padding:"3px 0",boxShadow:"0 12px 32px rgba(0,0,0,0.7)",fontFamily:"system-ui,sans-serif"}}>
      {items.map((it,i)=>it==="---"
        ?<div key={i} style={{height:1,background:C.border,margin:"3px 0"}}/>
        :<button key={i} onClick={()=>{it.action();close();}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 14px",background:"none",border:"none",color:it.danger?C.red:C.text,fontSize:12,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}
          onMouseEnter={e=>e.currentTarget.style.background="#333"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}
        ><span style={{color:C.textMid,fontSize:11,width:13}}>{it.icon}</span>{it.label}</button>
      )}
    </div>
  );
};

// ─── New item dialog ──────────────────────────────────────────────────────────
const NewDlg=({type,parent,ok,cancel})=>{
  const [v,setV]=useState("");const inp=useRef(null);
  useEffect(()=>inp.current?.focus(),[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#242424",border:`1px solid ${C.border}`,borderRadius:10,padding:"22px 24px",width:340,boxShadow:"0 24px 64px rgba(0,0,0,0.8)",fontFamily:"system-ui,sans-serif"}}>
        <p style={{color:C.textMid,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>New {type==="folder"?"Folder":"File"}{parent?` in ${parent}/`:""}</p>
        <input ref={inp} value={v} onChange={e=>setV(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&v.trim())ok(v.trim());if(e.key==="Escape")cancel();}}
          placeholder={type==="folder"?"folder-name":"filename.jsx"}
          style={{width:"100%",padding:"9px 12px",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"'Fira Code','JetBrains Mono',monospace"}}
          onFocus={e=>e.target.style.borderColor=C.accent}
          onBlur={e=>e.target.style.borderColor=C.border}
        />
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={cancel} style={{flex:1,padding:"8px",borderRadius:6,cursor:"pointer",background:"transparent",border:`1px solid ${C.border}`,color:C.textMid,fontSize:12,fontFamily:"inherit"}}>Cancel</button>
          <button onClick={()=>v.trim()&&ok(v.trim())} style={{flex:1,padding:"8px",borderRadius:6,cursor:"pointer",border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Create</button>
        </div>
      </div>
    </div>
  );
};

// ─── File tree node ───────────────────────────────────────────────────────────
const FNode=({node,depth,active,onSel,onDel,onRen,onNF,onNFold})=>{
  const [exp,setExp]=useState(depth<2);
  const [ren,setRen]=useState(false);
  const [rv,setRv]=useState(node.name);
  const [hov,setHov]=useState(false);
  const [ctx,setCtx]=useState(null);
  const inp=useRef(null);
  useEffect(()=>{if(ren)inp.current?.focus();},[ren]);
  const isFile=node.type==="file";
  const isAct=isFile&&active===node.fullPath;
  const pl=depth*13+(isFile?20:8);
  const ctxItems=isFile
    ?[{icon:"✏",label:"Rename",action:()=>setRen(true)},{icon:"🗑",label:"Delete",action:()=>onDel(node.fullPath,"file"),danger:true}]
    :[{icon:"📄",label:"New File",action:()=>onNF(node.fullPath||node.name)},{icon:"📁",label:"New Folder",action:()=>onNFold(node.fullPath||node.name)},"---",{icon:"✏",label:"Rename",action:()=>setRen(true)},{icon:"🗑",label:"Delete",action:()=>onDel(node.fullPath||node.name,"dir"),danger:true}];
  return(
    <div>
      <div
        onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtx({x:e.clientX,y:e.clientY});}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        onClick={()=>isFile?onSel(node.fullPath):setExp(v=>!v)}
        style={{height:26,paddingLeft:pl,paddingRight:6,display:"flex",alignItems:"center",gap:5,cursor:"pointer",userSelect:"none",background:isAct?"rgba(108,71,255,0.15)":hov?"rgba(255,255,255,0.04)":"transparent",borderLeft:isAct?`2px solid ${C.accent}`:"2px solid transparent",transition:"background 0.1s"}}
      >
        {!isFile&&<span style={{color:C.textDim,fontSize:9,width:9,flexShrink:0}}>{exp?"▾":"▸"}</span>}
        {isFile?<Dot name={node.name} s={8}/>:<span style={{fontSize:12,flexShrink:0}}>{exp?"📂":"📁"}</span>}
        {ren
          ?<input ref={inp} value={rv} onChange={e=>setRv(e.target.value)}
              onBlur={()=>{setRen(false);if(rv.trim()&&rv!==node.name)onRen(node.fullPath||node.name,rv.trim(),node.type);else setRv(node.name);}}
              onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape"){setRen(false);setRv(node.name);}}}
              onClick={e=>e.stopPropagation()}
              style={{flex:1,background:"#1a1a1a",border:`1px solid ${C.accent}`,borderRadius:3,color:C.text,fontSize:12,padding:"1px 5px",outline:"none",fontFamily:"'Fira Code',monospace"}}
            />
          :<span style={{flex:1,color:isAct?"#c4b5fd":C.text,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{node.name}</span>
        }
        {isFile&&hov&&!ren&&<span style={{color:C.textDim,fontSize:9,textTransform:"uppercase",flexShrink:0}}>{node.name.split(".").pop()}</span>}
      </div>
      {!isFile&&exp&&node.children&&(
        <div>
          {Object.values(node.children)
            .sort((a,b)=>{if(a.type!==b.type)return a.type==="dir"?-1:1;return a.name.localeCompare(b.name);})
            .map(ch=><FNode key={ch.name+(ch.fullPath||"")} node={ch} depth={depth+1} active={active} onSel={onSel} onDel={onDel} onRen={onRen} onNF={onNF} onNFold={onNFold}/>)
          }
        </div>
      )}
      {ctx&&<CTX x={ctx.x} y={ctx.y} items={ctxItems} close={()=>setCtx(null)}/>}
    </div>
  );
};

// ─── Editor tab bar ───────────────────────────────────────────────────────────
const EditorTabs=({tabs,active,onSel,onClose})=>(
  <div style={{display:"flex",alignItems:"stretch",background:C.tabBg,borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0,scrollbarWidth:"none",height:36}}>
    {tabs.map(tab=>{
      const name=tab.split("/").pop();const act=tab===active;
      return(
        <div key={tab} onClick={()=>onSel(tab)} style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",cursor:"pointer",flexShrink:0,background:act?C.tabActive:C.tabBg,borderRight:`1px solid ${C.border}`,borderTop:act?`2px solid ${C.accent}`:"2px solid transparent",borderBottom:act?`1px solid ${C.tabActive}`:"none",transition:"background 0.1s"}}
          onMouseEnter={e=>{if(!act)e.currentTarget.style.background=C.tabHov;}}
          onMouseLeave={e=>{if(!act)e.currentTarget.style.background=C.tabBg;}}
        >
          <Dot name={name} s={8}/>
          <span style={{color:act?C.text:C.textMid,fontSize:12,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"system-ui,sans-serif"}}>{name}</span>
          <span onClick={e=>{e.stopPropagation();onClose(tab);}} style={{color:"transparent",fontSize:14,lineHeight:1,padding:"1px 2px",borderRadius:3,marginLeft:1,cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redSoft;}}
            onMouseLeave={e=>{e.currentTarget.style.color="transparent";e.currentTarget.style.background="none";}}
          >×</span>
        </div>
      );
    })}
  </div>
);

// ─── Right panel tab ──────────────────────────────────────────────────────────
const RPTab=({label,active,onClick,badge})=>(
  <button onClick={onClick} style={{padding:"0 16px",height:"100%",background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:500,letterSpacing:"0.02em",color:active?C.text:C.textMid,borderBottom:active?`2px solid ${C.accent}`:"2px solid transparent",transition:"all 0.1s",position:"relative",fontFamily:"system-ui,sans-serif"}}
    onMouseEnter={e=>{if(!active)e.currentTarget.style.color=C.text;}}
    onMouseLeave={e=>{if(!active)e.currentTarget.style.color=C.textMid;}}
  >
    {label}
    {badge>0&&<span style={{position:"absolute",top:7,right:4,minWidth:15,height:15,background:C.red,borderRadius:999,fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:"white",padding:"0 3px"}}>{badge>99?"99+":badge}</span>}
  </button>
);

// ─── Activity bar icon ────────────────────────────────────────────────────────
const ABt=({ico,label,active,onClick})=>(
  <button title={label} onClick={onClick} style={{width:44,height:44,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:active?"#d4d4d4":C.textDim,borderLeft:active?`2px solid ${C.accent}`:"2px solid transparent"}}
    onMouseEnter={e=>e.currentTarget.style.color=C.text}
    onMouseLeave={e=>e.currentTarget.style.color=active?C.text:C.textDim}
  >{ico}</button>
);

// ─── Avatar stack ─────────────────────────────────────────────────────────────
const AvStack=({users})=>(
  <div style={{display:"flex",alignItems:"center"}}>
    {users.slice(0,5).map((u,i)=>{
      const c=colFor(u.email);const n=u.username||u.email?.split("@")[0]||"?";
      return(
        <div key={u._id||u.email} title={n} style={{width:22,height:22,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:9,color:"#000",border:`2px solid ${C.header}`,marginLeft:i?-7:0,zIndex:5-i,cursor:"default",transition:"transform 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2) translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform=""}
        >{n.charAt(0).toUpperCase()}</div>
      );
    })}
    {users.length>5&&<span style={{color:C.textMid,fontSize:10,marginLeft:6}}>+{users.length-5}</span>}
  </div>
);

// ─── Unique ID counter ───────────────────────────────────────────────────────
// Date.now() + Math.random() can collide when called in the same ms.
// A module-level counter guarantees uniqueness within the session.
let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

const normalizeStoredFiles = (rawTree = {}) => {
  const loaded = {};
  Object.entries(rawTree)
    .filter(([, value]) => value && typeof value === "object")
    .forEach(([path, value]) => {
      loaded[path] = {
        content: value.content ?? "",
        lang: value.lang || getLang(path),
      };
    });
  return loaded;
};

const normalizeStoredMessages = (messages = [], myEmail = "") =>
  (Array.isArray(messages) ? messages : []).map((m) => ({
    id: m._id || `${m.sender || "user"}_${m.timestamp || uid()}_${uid()}`,
    sender: m.sender,
    senderUsername: m.senderUsername || m.sender,
    message: m.message,
    timestamp: m.timestamp,
    isAI: m.isAI,
    dir: m.sender === myEmail ? "out" : "in",
    read: m.sender === myEmail,
  }));

const PROJECT_CACHE_KEY = "activeProject";
const REACT_PREVIEW_EXTS = new Set(["js", "jsx", "ts", "tsx", "html", "css", "scss", "sass"]);

const isReactPreviewFile = (path = "", fileMap = {}) => {
  if (!fileMap["package.json"] || !fileMap["src/App.jsx"]) return false;
  const cleanPath = path.replace(/^\//, "");
  const ext = cleanPath.split(".").pop()?.toLowerCase() || "";

  if (cleanPath === "package.json" || cleanPath === "vite.config.js" || cleanPath === "index.html") {
    return true;
  }

  if (cleanPath.startsWith("src/") || cleanPath.startsWith("public/")) {
    return REACT_PREVIEW_EXTS.has(ext);
  }

  return false;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
const Project=()=>{
  const location=useLocation();const navigate=useNavigate();
  const cachedProject=(()=>{
    try{return JSON.parse(localStorage.getItem(PROJECT_CACHE_KEY) || "null");}catch{return null;}
  })();
  const projectId=location.state?.project?._id??location.state?.projectId??cachedProject?._id??cachedProject?.projectId;
  const [projectName,setProjectName]=useState(location.state?.project?.name??cachedProject?.name??"untitled");

  const {user}=useContext(UserContext);
  const [cu]=useState(()=>{try{return JSON.parse(localStorage.getItem("user"))??null;}catch{return null;}});
  const myEmail=user?.email||cu?.email||"you";
  const myUsername=user?.username||cu?.username||myEmail.split("@")[0];
  const myUserId=user?._id||cu?._id;

  // ── Files ────────────────────────────────────────────────────────────────────
  const [files,setFiles]=useState({});
  const [active,setActive]=useState(null);
  const [tabs,setTabs]=useState([]);
  const [dlg,setDlg]=useState(null);

  // ── Collab ───────────────────────────────────────────────────────────────────
  const [online,setOnline]=useState([]);
  const [cursors,setCursors]=useState({});
  const [members,setMembers]=useState([]);
  const [admins,setAdmins]=useState([]);
  const amAdmin=myUserId&&admins.includes(myUserId.toString());

  // ── UI panels ────────────────────────────────────────────────────────────────
  const [panel,setPanel]=useState("files");
  const [sideOpen,setSideOpen]=useState(true);
  const [rpTab,setRpTab]=useState("console");
  const [rpWidth,setRpWidth]=useState(370);        // ← resizable right panel
  const rpDragRef=useRef(null);

  // ── Invite ───────────────────────────────────────────────────────────────────
  const [inviteOpen,setInviteOpen]=useState(false);
  const [inviteCode,setInviteCode]=useState("");
  const [copied,setCopied]=useState(false);

  // ── Editor ───────────────────────────────────────────────────────────────────
  const [curPos,setCurPos]=useState({line:1,col:1});
  const [loading,setLoading]=useState(true);
  const edRef=useRef(null);const moRef=useRef(null);
  const decRef=useRef([]);const debRef=useRef(null);const supRef=useRef(false);

  // ── Chat — proper unread tracking ────────────────────────────────────────────
  const [chatInput,setChatInput]=useState("");
  const [msgs,setMsgs]=useState([]);
  const [unreadCount,setUnreadCount]=useState(0);  // ← only unread since last open
  const chatBox=useRef(null);
  // When user switches TO chat tab → clear unread
  useEffect(()=>{
    if(rpTab==="chat"){
      setUnreadCount(0);
      setMsgs(p=>p.map(m=>({...m,read:true})));
    }
  },[rpTab]);

  // ── Terminal / Console ───────────────────────────────────────────────────────
  const [lines,setLines]=useState([]);
  const [running,setRunning]=useState(false);
  const termRef=useRef(null);
  const shellRef=useRef(null);

  // ── WebContainer + preview ───────────────────────────────────────────────────
  const [previewUrl,setPreviewUrl]=useState("");
  const [previewSrc,setPreviewSrc]=useState(null);
  const [scaffolding,setScaffolding]=useState(false);

  // Refs so async WebContainer callbacks always read the latest values
  // without needing to be in useCallback dependency arrays
  const filesRef     = useRef({});      // always mirrors files state
  const wcMountedRef = useRef(false);   // true once mount() has succeeded
  const serverReadyOff = useRef(null);  // cleanup fn for server-ready listener
  const installedPkgRef = useRef(null); // skip reinstall when package.json is unchanged

  // Keep filesRef in sync with files state
  useEffect(()=>{ filesRef.current = files; }, [files]);

  const saveWholeTree = useCallback(async (tree) => {
    if(!projectId)return;
    await axios.put(`/projects/${projectId}/files`,{fileTree:tree});
  },[projectId]);

  useEffect(()=>{
    if(location.state?.project?._id){
      try{
        localStorage.setItem(PROJECT_CACHE_KEY,JSON.stringify({
          _id: location.state.project._id,
          name: location.state.project.name ?? "untitled",
        }));
      }catch{}
    }
  },[location.state]);

  // ── Search ───────────────────────────────────────────────────────────────────
  const [sq,setSq]=useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const addLine=useCallback((t,type="output")=>setLines(p=>[...p,{t:String(t),type,id:uid()}]),[]);
  const clrLines=()=>setLines([]);
  const lc=t=>({command:"#f0c040",error:C.red,success:C.green,info:"#89dceb",warning:C.yellow}[t]||"#ccc");

  // ── File tree ────────────────────────────────────────────────────────────────
  const tree=useMemo(()=>{
    const r={type:"dir",name:"/",fullPath:"",children:{}};
    Object.keys(files).forEach(path=>{
      const parts=path.replace(/^\//,"").split("/").filter(Boolean);
      let c=r;
      parts.forEach((p,i)=>{
        if(i===parts.length-1){c.children[p]={type:"file",name:p,fullPath:path};}
        else{if(!c.children[p]){const fp=parts.slice(0,i+1).join("/");c.children[p]={type:"dir",name:p,fullPath:fp,children:{}};}c=c.children[p];}
      });
    });
    return r;
  },[files]);

  const activeFile=active?files[active]:null;
  const activeLang=active?getLang(active):"plaintext";

  const searchRes=useMemo(()=>{
    if(!sq.trim())return[];
    const q=sq.toLowerCase();
    return Object.entries(files).flatMap(([path,f])=>(f.content||"").split("\n").map((ln,i)=>ln.toLowerCase().includes(q)?{path,line:i+1,text:ln.trim()}:null).filter(Boolean)).slice(0,60);
  },[sq,files]);

  // ── Open/close tabs ──────────────────────────────────────────────────────────
  const openFile=useCallback(path=>{
    if(!files[path])return;
    setActive(path);setTabs(p=>p.includes(path)?p:[...p,path]);
  },[files]);
  const closeTab=useCallback(path=>{
    setTabs(p=>{const n=p.filter(t=>t!==path);if(active===path)setActive(n[n.length-1]||null);return n;});
  },[active]);

  // ── File starters ─────────────────────────────────────────────────────────────
  const STARTS={
    javascript:"// New file\nconsole.log('Hello!');\n",
    typescript:"const greet=(n:string):string=>`Hello, ${n}!`;\nconsole.log(greet('World'));\n",
    python:"# New file\nprint('Hello!')\n",
    java:n=>`public class ${n.replace(/\.\w+$/,"")} {\n    public static void main(String[] args) {\n        System.out.println("Hello!");\n    }\n}\n`,
    cpp:"#include <iostream>\nusing namespace std;\nint main(){\n    cout << \"Hello!\" << endl;\n    return 0;\n}\n",
    c:"#include <stdio.h>\nint main(){\n    printf(\"Hello!\\n\");\n    return 0;\n}\n",
    go:`package main\nimport "fmt"\nfunc main(){\n    fmt.Println("Hello!")\n}\n`,
    rust:`fn main(){\n    println!("Hello!");\n}\n`,
    html:n=>`<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${n}</title>\n  <style>body{margin:0;font-family:system-ui;background:#1c1c1c;color:#d4d4d4;}</style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
    css:n=>`/* ${n} */\nbody{margin:0;background:#1c1c1c;color:#d4d4d4;font-family:system-ui;}\n`,
  };
  const starter=(name,lang)=>{const s=STARTS[lang];return s?typeof s==="function"?s(name):s:"";};

  // ── CRUD — every mutation persists to DB immediately ─────────────────────────
  const createFile=useCallback((par,raw)=>{
    const name=raw.trim();const fp=par?`${par}/${name}`:name;
    if(files[fp]){alert(`"${fp}" already exists`);return;}
    const lang=getLang(name);const content=starter(name,lang);
    setFiles(p=>({...p,[fp]:{content,lang}}));
    openFile(fp);
    // Persist to DB
    axios.patch(`/projects/${projectId}/files/${encodeURIComponent(fp)}`,{content,lang}).catch(console.error);
    sendMessage("file-created",{projectId,path:fp,content,lang});
  },[files,openFile,projectId]);

  const createFolder=useCallback((par,raw)=>{
    const name=raw.trim();const fp=par?`${par}/${name}`:name;
    const kp=`${fp}/.gitkeep`;
    if(files[kp]){alert(`"${fp}" exists`);return;}
    setFiles(p=>({...p,[kp]:{content:"",lang:"plaintext"}}));
    // Persist placeholder to DB so folder survives refresh
    axios.patch(`/projects/${projectId}/files/${encodeURIComponent(kp)}`,{content:"",lang:"plaintext"}).catch(console.error);
    sendMessage("file-created",{projectId,path:kp,content:"",lang:"plaintext"});
  },[files,projectId]);

  const deleteItem=useCallback((path,type)=>{
    if(!window.confirm(`Delete "${path.split("/").pop()}"?`))return;
    setFiles(p=>{const n={...p};if(type==="dir")Object.keys(n).forEach(k=>{if(k.startsWith(path+"/"))delete n[k];});else delete n[path];return n;});
    setTabs(p=>type==="dir"?p.filter(t=>!t.startsWith(path+"/")):p.filter(t=>t!==path));
    if(active===path||(type==="dir"&&active?.startsWith(path+"/")))setActive(null);
    // Persist deletion to DB
    axios.delete(`/projects/${projectId}/files/${encodeURIComponent(path)}?type=${type}`).catch(console.error);
    sendMessage("file-deleted",{projectId,path,type});
  },[active,projectId]);

  const renameItem=useCallback((old,nn,type)=>{
    const parts=old.split("/");parts[parts.length-1]=nn;const np=parts.join("/");
    if(files[np]){alert(`"${np}" exists`);return;}
    // Build new file map
    const updatedFiles={};
    Object.entries(files).forEach(([k,v])=>{
      if(type==="file"){
        updatedFiles[k===old?np:k]=k===old?{...v,lang:getLang(nn)}:v;
      } else {
        updatedFiles[k.startsWith(old+"/")?k.replace(old,np):k]=v;
      }
    });
    setFiles(updatedFiles);
    setTabs(p=>p.map(t=>t===old?np:t));
    if(active===old)setActive(np);
    // Persist rename: delete old, save new keys
    axios.delete(`/projects/${projectId}/files/${encodeURIComponent(old)}?type=${type}`).catch(console.error);
    const toSave=Object.entries(updatedFiles).filter(([k])=>type==="file"?k===np:k.startsWith(np+"/"));
    toSave.forEach(([k,v])=>axios.patch(`/projects/${projectId}/files/${encodeURIComponent(k)}`,{content:v.content,lang:v.lang}).catch(console.error));
    sendMessage("file-renamed",{projectId,oldPath:old,newPath:np,type});
  },[files,active,projectId]);

  // ── Convert flat { "src/foo.jsx": ... } → WebContainer nested tree ────────────
  // WebContainer mount() requires:  { src: { directory: { "foo.jsx": { file: {...} } } } }
  // NOT a flat map like:            { "src/foo.jsx": { file: {...} } }
  const toWcTree = (flatFiles) => {
    const tree = {};
    Object.entries(flatFiles).forEach(([path, f]) => {
      const parts = path.replace(/^\//, "").split("/").filter(Boolean);
      let node = tree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          // leaf → file
          node[part] = { file: { contents: f.content || "" } };
        } else {
          // intermediate → directory
          if (!node[part]) node[part] = { directory: {} };
          node = node[part].directory;
        }
      });
    });
    return tree;
  };

  // ── Run React project in WebContainer → live preview in Browser tab ───────────
  // FIXES:
  // 1. Uses filesRef.current instead of files state → no longer in useCallback deps
  //    → function is NEVER recreated on every keystroke (was the npm-install loop cause)
  // 2. Removes old server-ready listener before adding new one → no duplicate listeners
  // 3. wcMountedRef tracks whether FS is ready for writeFile calls
  const runWebContainerWith = useCallback(async (fileMap) => {
    // Kill any running process first
    if (shellRef.current) {
      try { await shellRef.current.kill(); } catch {}
      shellRef.current = null;
    }
    // Remove any previous server-ready listener
    if (serverReadyOff.current) {
      try { serverReadyOff.current(); } catch {}
      serverReadyOff.current = null;
    }

    setRunning(true);
    wcMountedRef.current = false;
    clrLines(); setRpTab("console");
    addLine("⏳  Booting WebContainer (first load ~5s)...", "info");

    let instance;
    try {
      instance = await getWebcontainer();
    } catch (e) {
      addLine(`✗  WebContainer boot failed: ${e.message}`, "error");
      addLine("   COOP/COEP headers required — check vite.config.js", "warning");
      setRunning(false); return;
    }

    try {
      // Use explicitly passed fileMap, OR fall back to the ref (always latest)
      const src = fileMap ?? filesRef.current;
      const mountTree = toWcTree(src);
      await instance.mount(mountTree);
      wcMountedRef.current = true;   // FS is live — onChange can now writeFile

      const packageJsonContent = src["package.json"]?.content ?? "";
      const needsInstall = installedPkgRef.current !== packageJsonContent;
      if (needsInstall) {
        addLine("📦  npm install...", "info");

        const ip = await instance.spawn("npm", ["install"]);
        ip.output.pipeTo(new WritableStream({
          write(chunk) {
            // Use queueMicrotask so React state updates don't block the stream
            const line = String(chunk).trim();
            if (line) queueMicrotask(() => addLine(line, "output"));
          },
        }));
        const installExit = await ip.exit;
        if (installExit !== 0) {
          addLine("✗  npm install failed — check package.json", "error");
          setRunning(false); return;
        }

        installedPkgRef.current = packageJsonContent;
        addLine("✓  Dependencies installed", "success");
      } else {
        addLine("✓  Using cached dependencies", "success");
      }
      addLine("🚀  Starting Vite dev server...", "info");

      const sp = await instance.spawn("npm", ["run", "dev"]);
      shellRef.current = sp;
      sp.output.pipeTo(new WritableStream({
        write(chunk) {
          const line = String(chunk).trim();
          if (line) queueMicrotask(() => addLine(line, "output"));
        },
      }));

      // Register server-ready ONCE — store the off() so we can remove it next run
      const handler = (_port, url) => {
        addLine(`✓  Server ready → ${url}`, "success");
        setPreviewSrc(url);
        setPreviewUrl(url);
        setRpTab("browser");
        setRunning(false);
      };
      instance.on("server-ready", handler);
      serverReadyOff.current = () => instance.off?.("server-ready", handler);

      // If the dev server exits unexpectedly
      sp.exit.then(code => {
        if (code != null) {
          addLine(code === 0 ? "  ✓ process exited" : `  ✗ process exited with code ${code}`, code === 0 ? "success" : "error");
          setRunning(false);
        }
      });
    } catch (e) {
      addLine(`✗  ${e.message}`, "error");
      setRunning(false);
    }
  // Only addLine — no files/wc state in deps. filesRef always has latest files.
  }, [addLine]);

  // ── Kill the running WebContainer process (dev server) ────────────────────────
  const killProcess = useCallback(async () => {
    if (!shellRef.current) return;
    addLine("^C  stopping server...", "warning");
    try { await shellRef.current.kill(); } catch { }
    shellRef.current = null;
    setRunning(false);
    setPreviewSrc(null);
  }, [addLine]);
  // ── One-click React scaffold ──────────────────────────────────────────────────
  const scaffoldReact=useCallback(async()=>{
    if(scaffolding||running)return;   // guard — prevent double-click spawning two npm installs
    setScaffolding(true);
    clrLines();setRpTab("console");
    addLine("⚛  Setting up React + Vite project...","info");

    const newFiles={};
    Object.entries(REACT_SCAFFOLD).forEach(([path,f])=>{
      newFiles[path]={content:f.content,lang:f.lang};
    });

    // 1. Update local state so editor shows files immediately
    setFiles(p=>({...p,...newFiles}));
    setActive("src/App.jsx");
    setTabs(["src/App.jsx","src/main.jsx","src/App.css","index.html","package.json"]);

    // 2. Persist ALL files to DB in one request → survive page refresh
    try{
      await axios.put(`/projects/${projectId}/files`,{fileTree:newFiles});
      addLine("✓  Files saved to database","success");
    }catch(e){
      addLine("⚠  DB save failed — files exist this session only","warning");
      console.error("scaffold save:",e);
    }

    // 3. Broadcast to collaborators
    Object.entries(newFiles).forEach(([path,f])=>{
      sendMessage("file-created",{projectId,path,content:f.content,lang:f.lang});
    });

    addLine("   src/App.jsx  src/main.jsx  package.json","output");
    addLine("   index.html   vite.config.js  src/App.css","output");
    addLine("","output");

    // 4. Boot WebContainer → live preview
    //    setScaffolding(false) in finally so button stays disabled the whole time
    //    Prevents double-click opening two parallel npm install processes
    try{
      await runWebContainerWith(newFiles);
    }finally{
      setScaffolding(false);
    }
  },[scaffolding,running,projectId,runWebContainerWith,clrLines,addLine]);

  // ── Right panel drag resize — works BOTH ways (increase AND decrease) ─────────
  const startRpDrag=useCallback(e=>{
    e.preventDefault();
    // Disable text selection globally during drag so the mouse doesn't get stuck
    document.body.style.userSelect="none";
    document.body.style.cursor="col-resize";

    const onMove=mv=>{
      const nextWidth = window.innerWidth - mv.clientX;
      setRpWidth(Math.max(240,Math.min(Math.floor(window.innerWidth*0.6),nextWidth)));
    };
    const onUp=()=>{
      document.body.style.userSelect="";
      document.body.style.cursor="";
      document.removeEventListener("mousemove",onMove);
      document.removeEventListener("mouseup",onUp);
    };
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  },[]);

  // ── Cursor decorations ────────────────────────────────────────────────────────
  const updateDecs=useCallback(()=>{
    if(!edRef.current||!moRef.current||!active)return;
    const mo=moRef.current,ed=edRef.current,model=ed.getModel();
    if(!model)return;
    const decs=Object.entries(cursors).filter(([e])=>e!==myEmail).map(([email,pos])=>{
      const col=colFor(email);const nm=online.find(u=>u.email===email)?.username||email.split("@")[0];
      const cls=`rc-${email.replace(/[^a-z0-9]/gi,"_")}`;
      if(!document.getElementById(cls)){
        const s=document.createElement("style");s.id=cls;
        s.textContent=`.${cls}{border-left:2px solid ${col};position:relative;}.${cls}::before{content:"${nm}";position:absolute;top:-18px;left:0;background:${col};color:#000;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none;z-index:100;}`;
        document.head.appendChild(s);
      }
      const line=Math.max(1,Math.min(pos.line||1,model.getLineCount()));
      const col2=Math.max(1,pos.col||1);
      return{range:new mo.Range(line,col2,line,col2),options:{className:cls,stickiness:1}};
    });
    decRef.current=ed.deltaDecorations(decRef.current,decs);
  },[cursors,myEmail,active,online]);
  useEffect(()=>updateDecs(),[updateDecs]);

  // ── Monaco mount ─────────────────────────────────────────────────────────────
  const onMount=useCallback((ed,mo)=>{
    edRef.current=ed;moRef.current=mo;
    ed.onDidChangeCursorPosition(({position})=>{
      setCurPos({line:position.lineNumber,col:position.column});
      sendMessage("cursor-move",{projectId,email:myEmail,username:myUsername,filename:active,line:position.lineNumber,col:position.column});
    });
  },[projectId,myEmail,myUsername,active]);

  const onChange=useCallback(v=>{
    if(supRef.current||!active)return;
    const newContent=v??"";
    setFiles(p=>({...p,[active]:{...p[active],content:newContent}}));
    clearTimeout(debRef.current);
    debRef.current=setTimeout(()=>{
      // 1. Persist to DB
      axios.patch(`/projects/${projectId}/files/${encodeURIComponent(active)}`,
        {content:newContent,lang:activeLang}).catch(console.error);
      // 2. Push to WebContainer FS → Vite HMR auto-reloads
      //    ONLY when mount() has already completed — wcMountedRef guards this.
      //    Calling getWebcontainer() before mount boots the container prematurely
      //    and fs.writeFile on an unmounted FS throws silently-corrupting errors.
      if(wcMountedRef.current){
        getWebcontainer().then(inst=>
          inst.fs.writeFile(active,newContent).catch(()=>{})
        ).catch(()=>{});
      }
      // 3. Broadcast to collaborators
      sendMessage("code-change",{projectId,filename:active,code:newContent,language:activeLang});
    },400);
  },[active,activeLang,projectId]);

  useEffect(()=>{
    if(!projectId){
      navigate("/dashboard");
    }
  },[projectId,navigate]);

  useEffect(()=>{
    if(!projectId)return;
    const flushPendingFileTree=()=>{
      if(debRef.current){
        clearTimeout(debRef.current);
        debRef.current=null;
      }
      if(Object.keys(filesRef.current).length===0)return;
      saveWholeTree(filesRef.current).catch(console.error);
    };
    window.addEventListener("beforeunload",flushPendingFileTree);
    window.addEventListener("pagehide",flushPendingFileTree);
    return()=>{
      window.removeEventListener("beforeunload",flushPendingFileTree);
      window.removeEventListener("pagehide",flushPendingFileTree);
      flushPendingFileTree();
    };
  },[projectId,saveWholeTree]);

  // ── Socket + project load ─────────────────────────────────────────────────────
  useEffect(()=>{
    if(!projectId)return;
    initializeSocket(projectId);

    receiveMessage("message-history",h=>{
      if(!Array.isArray(h))return;
      setMsgs(normalizeStoredMessages(h,myEmail));
    });
    receiveMessage("project-message",d=>{
      const isOut=d.sender===myEmail;
      setMsgs(p=>[...p,{...d,senderUsername:d.senderUsername||d.sender,dir:isOut?"out":"in",id:uid(),read:isOut}]);
      // Only increment unread if chat tab is NOT active and message is incoming
      if(!isOut){
        setUnreadCount(c=>{
          // Check current rpTab by reading DOM — avoids stale closure
          const chatActive=document.querySelector("[data-rptab='chat']")?.dataset?.active==="true";
          return chatActive?c:c+1;
        });
      }
      if(d.isAI){
        try{
          const p=JSON.parse(d.message);
          if(p?.fileTree){const nf={};Object.entries(p.fileTree).forEach(([fn,n])=>{nf[fn]={content:n?.file?.contents??"",lang:getLang(fn)};});setFiles(pr=>({...pr,...nf}));const f=Object.keys(nf)[0];if(f)openFile(f);}
        }catch{}
      }
    });
    receiveMessage("members-list",m=>setMembers(Array.isArray(m)?m:[]));
    receiveMessage("user-connected",({user:u})=>setOnline(p=>p.some(x=>x._id===u._id)?p:[...p,u]));
    receiveMessage("user-disconnected",({user:u})=>{setOnline(p=>p.filter(x=>x._id!==u._id));setCursors(p=>{const n={...p};delete n[u.email];return n;});});
    receiveMessage("cursor-move",({email,username,filename,line,col})=>{if(email===myEmail)return;setCursors(p=>({...p,[email]:{filename,line,col,username}}));});
    receiveMessage("code-update",({filename,code,language})=>{
      if(!filename)return;
      setFiles(p=>({...p,[filename]:{content:code??"",lang:language||getLang(filename)}}));
      // Only write to WC filesystem if it's actually mounted
      if(wcMountedRef.current){
        getWebcontainer().then(inst=>inst.fs.writeFile(filename,code??"").catch(()=>{})).catch(()=>{});
      }
      if(edRef.current&&active===filename){
        supRef.current=true;
        const m=edRef.current.getModel();
        if(m&&m.getValue()!==code){const pos=edRef.current.getPosition();edRef.current.executeEdits("remote",[{range:m.getFullModelRange(),text:code??""}]);if(pos)edRef.current.setPosition(pos);}
        supRef.current=false;
      }
    });
    receiveMessage("file-created",({path,content,lang})=>setFiles(p=>({...p,[path]:{content:content??"",lang:lang||getLang(path)}})));
    receiveMessage("file-deleted",({path,type})=>{setFiles(p=>{const n={...p};if(type==="dir")Object.keys(n).forEach(k=>{if(k.startsWith(path+"/"))delete n[k];});else delete n[path];return n;});setTabs(p=>type==="dir"?p.filter(t=>!t.startsWith(path+"/")):p.filter(t=>t!==path));});
    receiveMessage("file-renamed",({oldPath,newPath,type})=>{setFiles(p=>{const n={...p};if(type==="file"){n[newPath]={...n[oldPath],lang:getLang(newPath)};delete n[oldPath];}else{Object.keys(n).forEach(k=>{if(k.startsWith(oldPath+"/")){n[k.replace(oldPath,newPath)]=n[k];delete n[k];}});}return n;});setTabs(p=>p.map(t=>t===oldPath?newPath:t));});
    receiveMessage("kicked",({projectId:pid})=>{if(pid===projectId){alert("You were removed.");navigate("/dashboard");}});
    receiveMessage("project-deleted",({projectId:pid})=>{if(pid===projectId){alert("Project deleted.");navigate("/dashboard");}});
    receiveMessage("member-removed",({userId})=>setMembers(p=>p.filter(m=>m._id!==userId)));
    receiveMessage("member-promoted",({userId})=>setAdmins(p=>[...new Set([...p,userId])]));

    let mounted=true;
    axios.get(`/projects/get-project/${projectId}`).then(r=>{
      if(!mounted)return;
      const proj=r.data?.project;
      if(proj?.name)setProjectName(proj.name);
      if(proj?.inviteCode)setInviteCode(proj.inviteCode);
      if(proj?.admins)setAdmins(proj.admins.map(a=>(a._id||a).toString()));
      if(proj?.users&&Array.isArray(proj.users))setMembers(proj.users.map(u=>({_id:u._id||u,email:u.email||"",username:u.username||(u.email?.split("@")[0]||"")})));
      if(Array.isArray(proj?.messages))setMsgs(normalizeStoredMessages(proj.messages,myEmail));

      const loaded = normalizeStoredFiles(proj?.fileTree);
      const sortedPaths = Object.keys(loaded).sort();
      if (sortedPaths.length > 0) {
        setFiles(loaded);
        setTabs(sortedPaths);
        setActive(sortedPaths[0]);
      }
    }).catch(console.error).finally(()=>mounted&&setLoading(false));
    return()=>{mounted=false;disconnectSocket();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[projectId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(()=>{const b=chatBox.current;if(b)requestAnimationFrame(()=>b.scrollTop=b.scrollHeight);},[msgs]);
  useEffect(()=>{if(termRef.current)termRef.current.scrollTop=termRef.current.scrollHeight;},[lines]);
  // ── Send chat message ─────────────────────────────────────────────────────────
  const sendMsg=()=>{
    if(!chatInput.trim())return;
    const p={message:chatInput.trim(),sender:myEmail,senderUsername:myUsername,timestamp:new Date().toISOString()};
    sendMessage("project-message",p);
    setMsgs(pr=>[...pr,{...p,dir:"out",id:uid(),read:true}]);
    setChatInput("");
  };

  // ── Run current file ──────────────────────────────────────────────────────────
  const run=async()=>{
    if(!active||running)return;
    const code=files[active]?.content||"",lang=activeLang;
    clrLines();setRpTab("console");
    if(isReactPreviewFile(active, files)){
      // Web project → WebContainer
      await runWebContainerWith(null);return;
    }
    setRunning(true);
    addLine(`$ run ${active.split("/").pop()}`,"command");addLine("","output");
    if(!WB[lang]){addLine(`⚠  "${lang}" not supported for execution`,"warning");setRunning(false);return;}
    try{
      addLine(`  compiling (${WB[lang]})...`,"info");
      const r=await wandbox(code,lang);
      const co=(r.compiler_output||"")+(r.compiler_error||""),so=r.program_output||"",se=r.program_error||"",ex=parseInt(r.status??"0",10);
      if(co.trim()){addLine("  ── compile ─────────────────────────","info");co.split("\n").forEach(l=>{if(l.trim())addLine(l,l.toLowerCase().includes("error")?"error":"warning");});}
      if(so.trim()){addLine("  ── output ──────────────────────────","info");so.split("\n").forEach(l=>addLine(l,"output"));}
      if(se.trim()){addLine("  ── stderr ──────────────────────────","error");se.split("\n").forEach(l=>l.trim()&&addLine(l,"error"));}
      if(!so.trim()&&!se.trim()&&!co.trim())addLine("  (no output)","info");
      addLine("","output");
      addLine(ex===0?"  ✓ exited 0":"  ✗ exited with error",ex===0?"success":"error");
    }catch(e){addLine(`✗ ${e.message}`,"error");}
    finally{setRunning(false);}
  };

  const copyCode=()=>navigator.clipboard.writeText(inviteCode).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  const removeMember=async(id,n)=>{if(!window.confirm(`Remove "${n}"?`))return;try{await axios.delete(`/projects/${projectId}/members/${id}`);setMembers(p=>p.filter(m=>m._id!==id));}catch(e){alert(e.response?.data?.error||"Failed");}};
  const promote=async(id,n)=>{if(!window.confirm(`Promote "${n}" to admin?`))return;try{await axios.put(`/projects/${projectId}/promote/${id}`);setAdmins(p=>[...new Set([...p,id])]);}catch(e){alert(e.response?.data?.error||"Failed");}};
  const leaveProject=async()=>{if(!window.confirm("Leave this project?"))return;try{await axios.post(`/projects/${projectId}/exit`);navigate("/dashboard");}catch(e){alert(e.response?.data?.error||"Failed");}};
  const openDlg=(type,parent="")=>setDlg({type,parent});
  const fc=Object.keys(files).length;
  const hasReact=files["package.json"]&&files["src/App.jsx"];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,color:C.text,overflow:"hidden",fontFamily:"system-ui,-apple-system,sans-serif"}}>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div style={{height:40,background:C.header,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 0 0 12px",gap:0,flexShrink:0,zIndex:20}}>
        <button onClick={()=>navigate("/dashboard")} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 9px",background:"none",border:"none",cursor:"pointer",borderRadius:5,color:C.textMid,fontSize:12}}
          onMouseEnter={e=>{e.currentTarget.style.background="#2a2a2a";e.currentTarget.style.color=C.text;}}
          onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.textMid;}}
        >← Dashboard</button>
        <span style={{color:C.border,margin:"0 6px",fontSize:16}}>›</span>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>
          <span style={{fontSize:13,fontWeight:600}}>{projectName}</span>
        </div>
        {active&&<><span style={{color:C.border,margin:"0 8px",fontSize:13}}>›</span><span style={{fontSize:12,color:C.textMid,fontFamily:"'Fira Code',monospace"}}>{active.split("/").pop()}</span></>}
        <div style={{flex:1}}/>

        {/* One-click React setup */}
        {!hasReact&&(
          <button onClick={scaffoldReact} disabled={scaffolding} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:scaffolding?"#2a2a2a":"rgba(97,218,251,0.12)",border:"1px solid rgba(97,218,251,0.35)",borderRadius:6,color:scaffolding?C.textDim:"#61dafb",fontSize:12,fontWeight:600,cursor:scaffolding?"not-allowed":"pointer",marginRight:8,transition:"all 0.15s"}}
            onMouseEnter={e=>{if(!scaffolding){e.currentTarget.style.background="rgba(97,218,251,0.2)";}}}
            onMouseLeave={e=>{if(!scaffolding){e.currentTarget.style.background="rgba(97,218,251,0.12)";}}}
            title="Create a complete React + Vite project in one click"
          >
            {scaffolding?"⏳ Setting up…":"⚛ New React App"}
          </button>
        )}

        {online.length>0&&<div style={{marginRight:10}}><AvStack users={online}/></div>}

        <button onClick={()=>setInviteOpen(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.textMid,fontSize:12,cursor:"pointer",marginRight:8}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.textDim;e.currentTarget.style.color=C.text;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMid;}}
        >⑂ Share</button>

        <button onClick={run} disabled={!active||running} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 18px",background:!active||running?"#2a2a2a":C.accent,border:"none",borderRadius:0,color:"white",fontSize:12,fontWeight:600,cursor:!active||running?"not-allowed":"pointer",height:40,opacity:!active||running?0.5:1,borderLeft:`1px solid ${C.border}`,transition:"background 0.15s"}}
          onMouseEnter={e=>{if(active&&!running)e.currentTarget.style.background=C.accentHov;}}
          onMouseLeave={e=>{if(active&&!running)e.currentTarget.style.background=C.accent;}}
        >{running?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>◌</span> Running…</>:<>▶ Run</>}</button>
      </div>

      {/* ═══ BODY ═════════════════════════════════════════════════════════════ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── ACTIVITY BAR ─────────────────── */}
        <div style={{width:44,background:C.actBar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4,flexShrink:0}}>
          <ABt ico="🗂" label="Files"   active={panel==="files"&&sideOpen}  onClick={()=>{if(panel==="files")setSideOpen(v=>!v);else{setPanel("files");setSideOpen(true);}}}/>
          <ABt ico="🔍" label="Search"  active={panel==="search"&&sideOpen} onClick={()=>{if(panel==="search")setSideOpen(v=>!v);else{setPanel("search");setSideOpen(true);}}}/>
          <div style={{flex:1}}/>
          <ABt ico="👥" label="Members" active={panel==="members"&&sideOpen} onClick={()=>{if(panel==="members")setSideOpen(v=>!v);else{setPanel("members");setSideOpen(true);}}}/>
          <ABt ico="⚙"  label="Profile" active={false} onClick={()=>navigate("/profile")}/>
        </div>

        {/* ── SIDEBAR ──────────────────────── */}
        {sideOpen&&(
          <div style={{width:234,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>

            {/* Files panel */}
            {panel==="files"&&(<>
              <div style={{height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",borderBottom:`1px solid ${C.borderFaint}`,flexShrink:0}}>
                <span style={{color:C.textMid,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>{projectName}</span>
                <div style={{display:"flex",gap:1}}>
                  {[["📄+","New file",()=>openDlg("file","")],["📁+","New folder",()=>openDlg("folder","")]].map(([ico,lbl,fn])=>(
                    <button key={lbl} title={lbl} onClick={fn} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:12,padding:"3px 5px",borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color=C.text}
                      onMouseLeave={e=>e.currentTarget.style.color=C.textDim}
                    >{ico}</button>
                  ))}
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",paddingTop:3}}>
                {fc===0?(
                  <div style={{padding:"24px 14px",textAlign:"center"}}>
                    <p style={{color:C.textDim,fontSize:12,marginBottom:14,lineHeight:1.7}}>No files yet.</p>
                    {/* React scaffold prompt */}
                    <button onClick={scaffoldReact} disabled={scaffolding} style={{width:"100%",padding:"9px",background:"rgba(97,218,251,0.1)",border:"1px solid rgba(97,218,251,0.3)",borderRadius:6,color:"#61dafb",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:8,fontFamily:"inherit"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(97,218,251,0.18)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(97,218,251,0.1)"}
                    >⚛ New React App</button>
                    <button onClick={()=>openDlg("file","")} style={{width:"100%",padding:"9px",background:C.accentSoft,border:`1px solid ${C.accentBrd}`,borderRadius:6,color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(108,71,255,0.2)"}
                      onMouseLeave={e=>e.currentTarget.style.background=C.accentSoft}
                    >+ New File</button>
                  </div>
                ):(
                  Object.values(tree.children)
                    .sort((a,b)=>{if(a.type!==b.type)return a.type==="dir"?-1:1;return a.name.localeCompare(b.name);})
                    .map(ch=><FNode key={ch.name+(ch.fullPath||"")} node={ch} depth={0} active={active} onSel={openFile} onDel={deleteItem} onRen={renameItem} onNF={p=>openDlg("file",p)} onNFold={p=>openDlg("folder",p)}/>)
                )}
              </div>
              <div style={{borderTop:`1px solid ${C.borderFaint}`,padding:"5px 12px",color:C.textDim,fontSize:10,flexShrink:0}}>{fc} file{fc!==1?"s":""}</div>
            </>)}

            {/* Search panel */}
            {panel==="search"&&(<>
              <div style={{height:36,display:"flex",alignItems:"center",padding:"0 12px",borderBottom:`1px solid ${C.borderFaint}`,flexShrink:0}}>
                <span style={{color:C.textMid,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Search</span>
              </div>
              <div style={{padding:"8px 8px 4px"}}>
                <input value={sq} onChange={e=>setSq(e.target.value)} placeholder="Search in files…" style={{width:"100%",padding:"7px 10px",background:C.input,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=C.accent}
                  onBlur={e=>e.target.style.borderColor=C.border}
                />
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {sq&&searchRes.length===0&&<p style={{color:C.textDim,fontSize:12,padding:"10px 12px"}}>No results</p>}
                {searchRes.map((r,i)=>(
                  <div key={i} onClick={()=>openFile(r.path)} style={{padding:"5px 12px",cursor:"pointer",borderBottom:`1px solid ${C.borderFaint}`}}
                    onMouseEnter={e=>e.currentTarget.style.background="#252525"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    <div style={{display:"flex",gap:5,marginBottom:2,alignItems:"center"}}><Dot name={r.path.split("/").pop()} s={7}/><span style={{color:C.textMid,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.path}<span style={{color:C.textDim}}>:{r.line}</span></span></div>
                    <span style={{color:C.text,fontSize:11,fontFamily:"'Fira Code',monospace",display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.text.slice(0,55)}{r.text.length>55?"…":""}</span>
                  </div>
                ))}
              </div>
            </>)}

            {/* Members panel */}
            {panel==="members"&&(<>
              <div style={{height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",borderBottom:`1px solid ${C.borderFaint}`,flexShrink:0}}>
                <span style={{color:C.textMid,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Members ({members.length})</span>
                <button onClick={leaveProject} style={{fontSize:10,padding:"2px 8px",borderRadius:4,cursor:"pointer",background:C.redSoft,border:`1px solid rgba(255,85,85,0.3)`,color:C.red,fontFamily:"inherit",fontWeight:600}}>Leave</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
                {members.map(m=>{
                  const mid=m._id?.toString()||"";const name=m.username||m.email?.split("@")[0]||"?";
                  const isMe=m.email===myEmail;const isOn=online.some(u=>u._id===m._id||u.email===m.email);
                  const isAd=admins.includes(mid);const cc=colFor(m.email);
                  return(
                    <div key={mid||m.email} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:isMe?"rgba(108,71,255,0.07)":"transparent"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:cc,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:10,color:"#000",flexShrink:0,position:"relative"}}>
                        {name.charAt(0).toUpperCase()}
                        <div style={{position:"absolute",bottom:0,right:0,width:7,height:7,borderRadius:"50%",background:isOn?C.green:"#3a3a3a",border:`1.5px solid ${C.sidebar}`}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{color:C.text,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
                          {isAd&&<span style={{fontSize:7,padding:"1px 4px",borderRadius:3,background:C.accentSoft,color:C.accent,border:`1px solid ${C.accentBrd}`,letterSpacing:"0.05em",textTransform:"uppercase",flexShrink:0}}>admin</span>}
                          {isMe&&<span style={{color:C.textDim,fontSize:9,flexShrink:0}}>(you)</span>}
                        </div>
                        <span style={{color:C.textDim,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{m.email}</span>
                      </div>
                      {amAdmin&&!isMe&&!isAd&&(
                        <div style={{display:"flex",gap:3,flexShrink:0}}>
                          <button onClick={()=>promote(mid,name)} style={{fontSize:9,padding:"2px 5px",borderRadius:3,cursor:"pointer",background:C.accentSoft,border:`1px solid ${C.accentBrd}`,color:C.accent,fontFamily:"inherit",fontWeight:600}}>↑</button>
                          <button onClick={()=>removeMember(mid,name)} style={{fontSize:9,padding:"2px 5px",borderRadius:3,cursor:"pointer",background:C.redSoft,border:`1px solid rgba(255,85,85,0.3)`,color:C.red,fontFamily:"inherit",fontWeight:600}}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* ── EDITOR ───────────────────────── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0,background:C.bg}}>
          {tabs.length>0&&<EditorTabs tabs={tabs} active={active} onSel={openFile} onClose={closeTab}/>}
          <div style={{flex:1,overflow:"hidden",position:"relative"}}>
            {!active?(
              <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:C.bg,userSelect:"none"}}>
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="10" fill="#1e1e1e"/><path d="M14 20h28M14 28h20M14 36h24" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/><circle cx="41" cy="36" r="7" fill="#151515" stroke={C.accent} strokeWidth="2"/><path d="M39 36h4M41 34v4" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round"/></svg>
                <p style={{color:C.textMid,fontSize:13}}>Open a file to start editing</p>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={scaffoldReact} disabled={scaffolding} style={{padding:"7px 16px",background:"rgba(97,218,251,0.1)",border:"1px solid rgba(97,218,251,0.3)",borderRadius:6,color:"#61dafb",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(97,218,251,0.2)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(97,218,251,0.1)"}
                  >⚛ New React App</button>
                  <button onClick={()=>openDlg("file","")} style={{padding:"7px 16px",background:C.accentSoft,border:`1px solid ${C.accentBrd}`,borderRadius:6,color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ New File</button>
                </div>
              </div>
            ):(
              <Editor
                key={active} height="100%"
                language={activeLang} value={activeFile?.content??""}
                theme="vs-dark" onMount={onMount} onChange={onChange}
                options={{
                  fontSize:13,fontFamily:"'Fira Code','JetBrains Mono','Cascadia Code',Menlo,monospace",
                  fontLigatures:true,lineNumbers:"on",minimap:{enabled:false},
                  scrollBeyondLastLine:false,wordWrap:"off",tabSize:2,insertSpaces:true,
                  folding:true,bracketPairColorization:{enabled:true},autoIndent:"full",
                  formatOnPaste:true,suggestOnTriggerCharacters:true,
                  quickSuggestions:{other:true,comments:false,strings:false},
                  parameterHints:{enabled:true},renderLineHighlight:"line",
                  cursorBlinking:"smooth",smoothScrolling:true,padding:{top:12},
                  scrollbar:{vertical:"auto",horizontal:"auto",verticalScrollbarSize:5,horizontalScrollbarSize:5},
                  overviewRulerBorder:false,codeLens:false,
                }}
              />
            )}
          </div>
        </div>

        {/* ── DRAG RESIZE HANDLE — drag left/right to resize the panel ─── */}
        <div
          onMouseDown={startRpDrag}
          title="Drag to resize"
          style={{
            width:5, background:"transparent", cursor:"col-resize",
            flexShrink:0, position:"relative", zIndex:5,
            transition:"background 0.15s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
        />

        {/* ═══════════════════════════════════════════════════════
            RIGHT PANEL — Browser / Console / Chat
            ═══════════════════════════════════════════════════════ */}
        <div style={{width:rpWidth,background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>

          {/* Tab bar */}
          <div style={{height:36,background:C.tabBg,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"stretch",flexShrink:0,paddingLeft:4}}>
            <RPTab label="Browser" active={rpTab==="browser"} onClick={()=>setRpTab("browser")}/>
            <RPTab label="Console" active={rpTab==="console"} onClick={()=>setRpTab("console")} badge={!running&&rpTab!=="console"?lines.filter(l=>l.type==="error").length:0}/>
            <RPTab label="Chat"    active={rpTab==="chat"}    onClick={()=>setRpTab("chat")} badge={unreadCount}
              data-rptab="chat" data-active={rpTab==="chat"}
            />
          </div>

          {/* ── Browser ─────────────────────────────── */}
          {rpTab==="browser"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:"#1a1a1a",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                <button onClick={()=>previewSrc&&setPreviewSrc(v=>v+"?r="+Date.now())} title="Reload" style={{background:"none",border:"none",color:C.textMid,cursor:"pointer",fontSize:14,padding:"2px 4px",borderRadius:3}}
                  onMouseEnter={e=>e.currentTarget.style.color=C.text}
                  onMouseLeave={e=>e.currentTarget.style.color=C.textMid}
                >↺</button>
                <div style={{flex:1,display:"flex",alignItems:"center",gap:6,background:C.input,border:`1px solid ${C.border}`,borderRadius:5,padding:"4px 10px"}}>
                  {previewSrc&&<span style={{color:C.green,fontSize:9}}>●</span>}
                  <input value={previewUrl} onChange={e=>setPreviewUrl(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")setPreviewSrc(previewUrl);}}
                    placeholder="No server running — click ▶ Run"
                    style={{flex:1,background:"none",border:"none",color:previewSrc?C.text:C.textDim,fontSize:11,outline:"none",fontFamily:"'Fira Code',monospace"}}
                  />
                </div>
                {previewSrc&&(
                  <button onClick={()=>window.open(previewSrc,"_blank")} title="Open in new tab" style={{background:"none",border:"none",color:C.textMid,cursor:"pointer",fontSize:13,padding:"2px 4px"}}
                    onMouseEnter={e=>e.currentTarget.style.color=C.text}
                    onMouseLeave={e=>e.currentTarget.style.color=C.textMid}
                  >↗</button>
                )}
              </div>
              <div style={{flex:1,overflow:"hidden",background:previewSrc?"#fff":"#0d0d0d"}}>
                {previewSrc?(
                  <iframe src={previewSrc} style={{width:"100%",height:"100%",border:"none"}} title="preview" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"/>
                ):(
                  <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
                    <div style={{fontSize:36}}>🌐</div>
                    <p style={{color:C.textDim,fontSize:12,textAlign:"center",lineHeight:1.7}}>No preview yet.<br/><span style={{color:C.textMid}}>Run a web project to see it here.</span></p>
                    {!hasReact&&(
                      <button onClick={scaffoldReact} style={{padding:"7px 16px",background:"rgba(97,218,251,0.1)",border:"1px solid rgba(97,218,251,0.3)",borderRadius:6,color:"#61dafb",fontSize:12,fontWeight:700,cursor:"pointer"}}>⚛ Setup React App</button>
                    )}
                    {hasReact&&(
                      <button onClick={run} disabled={running} style={{padding:"6px 14px",background:running?"#2a2a2a":C.accent,border:"none",borderRadius:5,color:"white",fontSize:11,fontWeight:600,cursor:running?"not-allowed":"pointer"}}>
                        {running?"Running…":"▶ Run now"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Console — output for Wandbox (other langs) or React dev server ── */}
          {rpTab==="console"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Toolbar */}
              <div style={{height:30,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {running&&<><span style={{color:C.yellow,fontSize:9,animation:"spin 1s linear infinite"}}>◌</span><span style={{color:C.yellow,fontSize:10,fontWeight:600}}>Running</span></>}
                  {!running&&lines.length>0&&lines[lines.length-1]?.type==="success"&&<><span style={{color:C.green,fontSize:9}}>●</span><span style={{color:C.green,fontSize:10}}>Done</span></>}
                  {!running&&lines.filter(l=>l.type==="error").length>0&&<><span style={{color:C.red,fontSize:9}}>●</span><span style={{color:C.red,fontSize:10}}>{lines.filter(l=>l.type==="error").length} error{lines.filter(l=>l.type==="error").length!==1?"s":""}</span></>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {/* Show Restart only when dev server is active */}
                  {hasReact&&shellRef.current&&!running&&(
                    <button onClick={()=>runWebContainerWith(null)} style={{background:C.accentSoft,border:`1px solid ${C.accentBrd}`,color:C.accent,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:600}}>↺ Restart</button>
                  )}
                  {running&&hasReact&&(
                    <button onClick={killProcess} style={{background:C.redSoft,border:`1px solid rgba(255,85,85,0.4)`,color:C.red,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:600}}>■ Stop</button>
                  )}
                  <button onClick={clrLines} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:"2px 6px",borderRadius:3}}
                    onMouseEnter={e=>e.currentTarget.style.color=C.text}
                    onMouseLeave={e=>e.currentTarget.style.color=C.textDim}
                  >Clear</button>
                </div>
              </div>

              {/* Output — Wandbox results or React dev server output */}
              <div ref={termRef} style={{flex:1,overflowY:"auto",padding:"10px 12px",background:"#0d0d0d",fontFamily:"'Fira Code','JetBrains Mono',Menlo,monospace",fontSize:12,lineHeight:1.65}}>
                {lines.length===0&&(
                  <span style={{color:C.textDim}}>
                    {hasReact
                      ? "Click ▶ Run to start the React dev server → live preview in Browser tab"
                      : "Click ▶ Run to execute the active file via Wandbox"}
                  </span>
                )}
                {lines.map(l=>(
                  <div key={l.id} style={{color:lc(l.type),whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{l.t}</div>
                ))}
                {!running&&lines.length>0&&<span style={{color:C.green,animation:"blink 1s step-end infinite"}}>█</span>}
              </div>
            </div>
          )}

          {/* ── Chat ─────────────────────────────────── */}
          {rpTab==="chat"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div ref={chatBox} style={{flex:1,overflowY:"auto",padding:"12px 10px",display:"flex",flexDirection:"column",gap:10}}>
                {msgs.length===0?(
                  <div style={{color:C.textDim,fontSize:12,textAlign:"center",marginTop:24,lineHeight:1.7}}>
                    No messages yet.<br/><span style={{fontSize:11}}>Type <code style={{background:"#252525",padding:"1px 5px",borderRadius:3,color:C.accent}}>@ai</code> to ask the AI.</span>
                  </div>
                ):msgs.map(m=>{
                  const isOut=m.dir==="out"||m.sender===myEmail;
                  const isAI=m.sender==="AI Assistant";
                  // Mark unread incoming messages with a subtle indicator
                  const isUnread=!isOut&&!m.read;
                  let txt=m.message;
                  if(isAI){try{txt=JSON.parse(m.message)?.text||m.message;}catch{}}
                  const cc=colFor(m.sender);
                  return(
                    <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isOut?"flex-end":"flex-start"}}>
                      {!isOut&&(
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                          <span style={{color:cc,fontSize:10,fontWeight:700,paddingLeft:3}}>{m.senderUsername||m.sender?.split("@")[0]}</span>
                          {isUnread&&<span style={{width:5,height:5,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>}
                        </div>
                      )}
                      <div style={{maxWidth:"85%",padding:"8px 11px",borderRadius:isOut?"12px 12px 3px 12px":"12px 12px 12px 3px",background:isOut?C.accent:isAI?"rgba(108,71,255,0.1)":"#282828",border:isAI?`1px solid ${C.accentBrd}`:"none",fontSize:12,lineHeight:1.55,color:isOut?"white":C.text}}>{txt}</div>
                      <span style={{color:C.textDim,fontSize:9,marginTop:2,paddingLeft:3,paddingRight:3,textAlign:isOut?"right":"left"}}>
                        {new Date(m.timestamp||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Input */}
              <div style={{padding:"8px",borderTop:`1px solid ${C.border}`,flexShrink:0,display:"flex",gap:6}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
                  placeholder="Message or @ai …"
                  style={{flex:1,padding:"8px 11px",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12,outline:"none",fontFamily:"system-ui,sans-serif"}}
                  onFocus={e=>e.target.style.borderColor=C.accent}
                  onBlur={e=>e.target.style.borderColor=C.border}
                />
                <button onClick={sendMsg} style={{width:32,height:32,borderRadius:8,border:"none",flexShrink:0,background:C.accent,color:"white",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accentHov}
                  onMouseLeave={e=>e.currentTarget.style.background=C.accent}
                >↑</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STATUS BAR ═══════════════════════════════════════════════════════ */}
      <div style={{height:22,background:C.statusBar,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",flexShrink:0,fontFamily:"system-ui,sans-serif",fontSize:11,color:"rgba(255,255,255,0.85)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}>⑂ main</span>
          <span style={{opacity:0.65}}>{projectName}</span>
          {hasReact&&<span style={{background:"rgba(97,218,251,0.2)",color:"#61dafb",padding:"0 6px",borderRadius:3,fontSize:10,fontWeight:600}}>React</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {online.length>0&&<span style={{opacity:0.8}}>👥 {online.length} online</span>}
          {active&&<><span style={{opacity:0.7}}>Ln {curPos.line}, Col {curPos.col}</span><span style={{fontWeight:600}}>{activeLang.charAt(0).toUpperCase()+activeLang.slice(1)}</span></>}
          <span style={{opacity:0.5}}>UTF-8</span>
        </div>
      </div>

      {/* ═══ MODALS ════════════════════════════════════════════════════════════ */}
      {inviteOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setInviteOpen(false)}>
          <div style={{background:"#242424",border:`1px solid ${C.border}`,borderRadius:12,padding:"28px",maxWidth:360,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.8)",fontFamily:"system-ui,sans-serif"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{color:C.text,fontWeight:600,fontSize:15}}>Share — {projectName}</span>
              <button onClick={()=>setInviteOpen(false)} style={{background:"none",border:"none",color:C.textMid,cursor:"pointer",fontSize:18}}>×</button>
            </div>
            <p style={{color:C.textMid,fontSize:12,marginBottom:18,lineHeight:1.65}}>Anyone with this code can join via <strong style={{color:C.accent}}>Dashboard → Join project</strong></p>
            <div style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"13px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <code style={{fontFamily:"'Fira Code',monospace",fontSize:14,letterSpacing:"0.1em",color:C.accent}}>{inviteCode||"Loading…"}</code>
              <button onClick={copyCode} style={{background:copied?C.greenSoft:C.accentSoft,border:`1px solid ${copied?"rgba(80,250,123,0.3)":C.accentBrd}`,color:copied?C.green:C.accent,borderRadius:5,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                {copied?"✓ Copied":"Copy"}
              </button>
            </div>
            <p style={{color:C.textDim,fontSize:10,lineHeight:1.5}}>Keep this private. Only share with trusted collaborators.</p>
          </div>
        </div>
      )}

      {dlg&&(
        <NewDlg type={dlg.type} parent={dlg.parent}
          ok={name=>{if(dlg.type==="file")createFile(dlg.parent,name);else createFolder(dlg.parent,name);setDlg(null);}}
          cancel={()=>setDlg(null)}
        />
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *::-webkit-scrollbar{width:4px;height:4px}
        *::-webkit-scrollbar-track{background:transparent}
        *::-webkit-scrollbar-thumb{background:#2d2d2d;border-radius:2px}
        *::-webkit-scrollbar-thumb:hover{background:#3d3d3d}
      `}</style>
    </div>
  );
};

export default Project;
