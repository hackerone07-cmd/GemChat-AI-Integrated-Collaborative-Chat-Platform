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

// ─────────────────────────────────────────────────────────────────────────────
// Language detection from file extension
// ─────────────────────────────────────────────────────────────────────────────
const EXT_TO_LANG = {
  js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
  py:"python", rb:"ruby", java:"java", cpp:"cpp", cc:"cpp", cxx:"cpp",
  c:"c", h:"c", cs:"csharp", go:"go", rs:"rust", php:"php", kt:"kotlin",
  swift:"swift", scala:"scala", hs:"haskell", lua:"lua", pl:"perl",
  r:"r", sh:"shell", bash:"shell", zsh:"shell", fish:"shell",
  html:"html", htm:"html", css:"css", scss:"scss", sass:"scss",
  json:"json", yaml:"yaml", yml:"yaml", toml:"ini", xml:"xml",
  md:"markdown", sql:"sql", dockerfile:"dockerfile", tf:"hcl",
  vue:"html", svelte:"html", txt:"plaintext",
};

const getLang = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANG[ext] || "plaintext";
};

// Monaco → Wandbox language map
const WANDBOX_COMPILERS = {
  cpp:"gcc-head", c:"gcc-head", java:"openjdk-head",
  python:"cpython-3.12.0", javascript:"nodejs-head",
  typescript:"typescript-5.0.4", go:"go-1.21.5",
  rust:"rust-1.74.0", ruby:"ruby-3.2.2", php:"php-8.2.13",
  kotlin:"kotlin-1.9.20", swift:"swift-5.9.1", shell:"bash",
  haskell:"ghc-9.6.3", lua:"lua-5.4.4", perl:"perl-5.38.0",
  scala:"scala-3.3.1", r:"r-4.3.1", csharp:"mono-6.12.0.200",
};

const WANDBOX_OPTS = {
  cpp:"-std=c++17", c:"-x c -std=c11",
};

const runWithWandbox = async (code, lang) => {
  const compiler = WANDBOX_COMPILERS[lang];
  if (!compiler) throw new Error(`"${lang}" execution not supported`);
  if (lang === "java") code = code.replace(/public\s+class\s+\w+/g, "public class Main");
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler, code,
      options: WANDBOX_OPTS[lang] || "",
      "compiler-option-raw": WANDBOX_OPTS[lang] || "",
    }),
  });
  if (!res.ok) throw new Error(`Wandbox error ${res.status}`);
  return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// User colours for cursors — deterministic from email
// ─────────────────────────────────────────────────────────────────────────────
const CURSOR_COLORS = [
  "#f87171","#fb923c","#facc15","#4ade80","#22d3ee",
  "#818cf8","#e879f9","#f472b6","#34d399","#60a5fa",
];
const colorFor = (email = "") => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
};

// ─────────────────────────────────────────────────────────────────────────────
// File icon by extension
// ─────────────────────────────────────────────────────────────────────────────
const FILE_ICONS = {
  js:"🟨", jsx:"⚛️", ts:"🔷", tsx:"⚛️", py:"🐍", java:"☕", cpp:"⚙️", c:"⚙️",
  cs:"💜", go:"🔵", rs:"🦀", rb:"❤️", php:"🐘", kt:"🟣", swift:"🧡",
  html:"🌐", css:"🎨", scss:"🎨", json:"📋", yaml:"📋", yml:"📋",
  md:"📝", sql:"🗄️", sh:"🖥️", bash:"🖥️", txt:"📄", dockerfile:"🐳",
};
const fileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || "📄";
};

// ─────────────────────────────────────────────────────────────────────────────
// Context-menu component
// ─────────────────────────────────────────────────────────────────────────────
const ContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "fixed", left: x, top: y, zIndex: 9999,
      background: "#1e293b", border: "1px solid rgba(99,102,241,0.3)",
      borderRadius: 8, minWidth: 160, padding: "4px 0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "3px 0" }} />
        ) : (
          <button key={i} onClick={() => { item.action(); onClose(); }} style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "7px 14px", background: "none",
            border: "none", color: item.danger ? "#f87171" : "#d1d5db",
            fontSize: 12, cursor: "pointer", textAlign: "left",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// New file / folder dialog
// ─────────────────────────────────────────────────────────────────────────────
const NewItemDialog = ({ type, parentPath, onConfirm, onCancel }) => {
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid rgba(99,102,241,0.35)",
        borderRadius: 14, padding: "24px 28px", width: 360,
        boxShadow: "0 0 60px rgba(99,102,241,0.2)",
      }}>
        <h3 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          New {type === "folder" ? "folder" : "file"}
        </h3>
        {parentPath && (
          <p style={{ color: "#475569", fontSize: 11, marginBottom: 14 }}>
            in {parentPath}/
          </p>
        )}
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); if (name.trim()) onConfirm(name.trim()); }
            if (e.key === "Escape") onCancel();
          }}
          placeholder={type === "folder" ? "folder-name" : "filename.py"}
          style={{
            width: "100%", padding: "10px 14px",
            background: "rgba(30,41,59,0.8)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 8, color: "#f1f5f9", fontSize: 14,
            outline: "none", boxSizing: "border-box",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "9px", borderRadius: 7, cursor: "pointer",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", fontSize: 13, fontWeight: 600,
          }}>Cancel</button>
          <button onClick={() => name.trim() && onConfirm(name.trim())} style={{
            flex: 1, padding: "9px", borderRadius: 7, cursor: "pointer", border: "none",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "white", fontSize: 13, fontWeight: 700,
          }}>Create</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FileTree node
// ─────────────────────────────────────────────────────────────────────────────
const FileTreeNode = ({
  node, depth, activeFilename, onSelect, onDelete, onRename, onNewFile, onNewFolder,
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.name);
  const [ctx, setCtx] = useState(null);
  const renameRef = useRef(null);

  useEffect(() => { if (renaming) renameRef.current?.focus(); }, [renaming]);

  const isActive = node.type === "file" && activeFilename === node.fullPath;
  const indent   = depth * 14;

  const handleCtx = (e) => {
    e.preventDefault(); e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const ctxItems = node.type === "dir"
    ? [
        { icon: "📄", label: "New file",   action: () => onNewFile(node.fullPath || node.name) },
        { icon: "📁", label: "New folder", action: () => onNewFolder(node.fullPath || node.name) },
        "---",
        { icon: "✏️", label: "Rename",     action: () => setRenaming(true) },
        { icon: "🗑", label: "Delete",      action: () => onDelete(node.fullPath || node.name, "dir"), danger: true },
      ]
    : [
        { icon: "✏️", label: "Rename",   action: () => setRenaming(true) },
        { icon: "🗑", label: "Delete",   action: () => onDelete(node.fullPath, "file"), danger: true },
      ];

  return (
    <div>
      {/* Node row */}
      <div
        onContextMenu={handleCtx}
        style={{
          paddingLeft: indent + 8, paddingRight: 8,
          paddingTop: 4, paddingBottom: 4,
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", borderRadius: 5, userSelect: "none",
          background: isActive ? "rgba(99,102,241,0.2)" : "transparent",
          transition: "background 0.12s",
        }}
        onMouseEnter={e => !isActive && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          if (node.type === "dir") setExpanded(v => !v);
          else onSelect(node.fullPath);
        }}
      >
        {/* Expand chevron for dirs */}
        {node.type === "dir" && (
          <span style={{ color: "#475569", fontSize: 10, width: 10, flexShrink: 0 }}>
            {expanded ? "▾" : "▸"}
          </span>
        )}

        {/* Icon */}
        <span style={{ fontSize: 13, flexShrink: 0 }}>
          {node.type === "dir" ? (expanded ? "📂" : "📁") : fileIcon(node.name)}
        </span>

        {/* Name or rename input */}
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={() => { setRenaming(false); if (renameVal.trim() && renameVal !== node.name) onRename(node.fullPath || node.name, renameVal.trim(), node.type); else setRenameVal(node.name); }}
            onKeyDown={e => {
              if (e.key === "Enter") { e.currentTarget.blur(); }
              if (e.key === "Escape") { setRenaming(false); setRenameVal(node.name); }
            }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: "rgba(30,41,59,0.9)",
              border: "1px solid rgba(99,102,241,0.5)",
              borderRadius: 4, color: "#f1f5f9", fontSize: 12,
              padding: "1px 6px", outline: "none",
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
            }}
          />
        ) : (
          <span style={{
            color: isActive ? "#c7d2fe" : "#cbd5e1",
            fontSize: 12, flex: 1, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
          }}>
            {node.name}
          </span>
        )}

        {/* Inline lang badge */}
        {node.type === "file" && (
          <span style={{
            color: "#475569", fontSize: 9, letterSpacing: "0.04em",
            textTransform: "uppercase", flexShrink: 0,
          }}>
            {(node.name.split(".").pop() || "").slice(0, 4)}
          </span>
        )}
      </div>

      {/* Children */}
      {node.type === "dir" && expanded && node.children && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
              <FileTreeNode
                key={child.name + (child.fullPath || "")}
                node={child} depth={depth + 1}
                activeFilename={activeFilename}
                onSelect={onSelect} onDelete={onDelete}
                onRename={onRename} onNewFile={onNewFile} onNewFolder={onNewFolder}
              />
            ))}
        </div>
      )}

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} items={ctxItems} onClose={() => setCtx(null)} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, activeFilename, onSelect, onClose }) => (
  <div style={{
    display: "flex", alignItems: "center", overflowX: "auto",
    background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.06)",
    scrollbarWidth: "none", flexShrink: 0,
  }}>
    {tabs.map(tab => {
      const isActive = tab === activeFilename;
      const name = tab.split("/").pop();
      return (
        <div key={tab} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", cursor: "pointer", flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          background: isActive ? "#1e293b" : "transparent",
          borderBottom: isActive ? "2px solid #6366f1" : "2px solid transparent",
          transition: "background 0.12s",
        }}
          onClick={() => onSelect(tab)}
          onMouseEnter={e => !isActive && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: 12 }}>{fileIcon(name)}</span>
          <span style={{
            color: isActive ? "#e2e8f0" : "#64748b",
            fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code',monospace",
            maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {name}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onClose(tab); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#475569", fontSize: 14, padding: "0 2px", lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
            onMouseLeave={e => e.currentTarget.style.color = "#475569"}
          >
            ×
          </button>
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Online user pill
// ─────────────────────────────────────────────────────────────────────────────
const OnlinePill = ({ users }) => (
  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
    {users.slice(0, 5).map(u => {
      const color = colorFor(u.email);
      const name  = u.username || u.email?.split("@")[0] || "?";
      return (
        <div key={u._id || u.email} title={name} style={{
          width: 24, height: 24, borderRadius: "50%",
          background: color, display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 700, fontSize: 10,
          color: "#000", border: "2px solid #1e293b",
          marginLeft: -6, transition: "transform 0.2s",
          cursor: "default", flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2) translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      );
    })}
    {users.length > 5 && (
      <span style={{ color: "#64748b", fontSize: 11, marginLeft: 2 }}>
        +{users.length - 5}
      </span>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Project component
// ─────────────────────────────────────────────────────────────────────────────
const Project = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const projectId = location.state?.project?._id ?? location.state?.projectId;
  const projectName = location.state?.project?.name ?? "Project";

  const { user } = useContext(UserContext);
  const [currentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) ?? null; }
    catch { return null; }
  });
  const myEmail    = user?.email || currentUser?.email || "you";
  const myUsername = user?.username || currentUser?.username || myEmail.split("@")[0];
  const myUserId   = user?._id || currentUser?._id;

  // ── Files ─────────────────────────────────────────────────────────────────
  const [files, setFiles]           = useState({});  // { "path/file.js": { content, lang } }
  const [activeFilename, setActiveFilename] = useState(null);
  const [openTabs, setOpenTabs]     = useState([]);
  const [newItemDialog, setNewItemDialog] = useState(null); // { type, parentPath }

  // ── Collaboration ─────────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers]     = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({}); // { email: { line, col } }
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectAdmins, setProjectAdmins]   = useState([]);
  const amIAdmin = myUserId && projectAdmins.includes(myUserId.toString());

  // ── UI ────────────────────────────────────────────────────────────────────
  const [membersOpen, setMembersOpen]   = useState(false);
  const [inviteCode, setInviteCode]     = useState("");
  const [inviteOpen, setInviteOpen]     = useState(false);
  const [copied, setCopied]             = useState(false);
  const [chatOpen, setChatOpen]         = useState(true);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [message, setMessage]       = useState("");
  const [messages, setMessages]     = useState([]);
  const messageBoxRef               = useRef(null);

  // ── Terminal ──────────────────────────────────────────────────────────────
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalOpen, setTerminalOpen]   = useState(false);
  const [isRunning, setIsRunning]         = useState(false);
  const terminalRef                       = useRef(null);

  // ── WebContainer ─────────────────────────────────────────────────────────
  const [webcontainer, setWebcontainer] = useState(null);
  const [iframeUrl, setIframeUrl]       = useState(null);

  // ── Monaco ────────────────────────────────────────────────────────────────
  const editorRef           = useRef(null);  // IStandaloneCodeEditor
  const monacoRef           = useRef(null);  // monaco instance
  const decorationsRef      = useRef([]);    // cursor decoration IDs
  const syncTimeoutRef      = useRef(null);  // debounce timer
  const suppressSyncRef     = useRef(false); // prevent echo on remote update

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addLine = useCallback((text, type = "output") => {
    setTerminalLines(prev => [...prev, { text: String(text), type, id: Date.now() + Math.random() }]);
  }, []);
  const clearTerminal = () => setTerminalLines([]);
  const lineColor = (t) => ({ command:"#f0c040", error:"#f87171", success:"#4ade80", info:"#7dd3fc", warning:"#fb923c" }[t] || "#d1d5db");

  // ── File tree builder ─────────────────────────────────────────────────────
  const fileTree = useMemo(() => {
    const root = { type: "dir", name: "/", fullPath: "", children: {} };
    Object.keys(files).forEach(path => {
      const parts = path.replace(/^\//, "").split("/").filter(Boolean);
      let cursor = root;
      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1;
        if (isLast) {
          cursor.children[part] = { type: "file", name: part, fullPath: path };
        } else {
          if (!cursor.children[part]) {
            const fp = parts.slice(0, idx + 1).join("/");
            cursor.children[part] = { type: "dir", name: part, fullPath: fp, children: {} };
          }
          cursor = cursor.children[part];
        }
      });
    });
    return root;
  }, [files]);

  // ── Active file content ───────────────────────────────────────────────────
  const activeFile = activeFilename ? files[activeFilename] : null;
  const activeLang = activeFilename ? getLang(activeFilename) : "plaintext";

  // ── Open a file in tabs ───────────────────────────────────────────────────
  const openFile = useCallback((path) => {
    if (!files[path]) return;
    setActiveFilename(path);
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
  }, [files]);

  const closeTab = useCallback((path) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== path);
      if (activeFilename === path) setActiveFilename(next[next.length - 1] || null);
      return next;
    });
  }, [activeFilename]);

  // ── Create file ───────────────────────────────────────────────────────────
  const createFile = useCallback((parentPath, rawName) => {
    const name    = rawName.trim();
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    if (files[fullPath]) { alert(`"${fullPath}" already exists`); return; }
    const lang    = getLang(name);
    const starter = {
      javascript: "// New file\nconsole.log('Hello!');\n",
      typescript: "// New file\nconst greet = (name: string): string => `Hello, ${name}!`;\n",
      python:     "# New file\nprint('Hello!')\n",
      java:       `public class ${name.replace(/\.\w+$/, "")} {\n    public static void main(String[] args) {\n        System.out.println("Hello!");\n    }\n}\n`,
      cpp:        "#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello!\" << endl;\n    return 0;\n}\n",
      c:          "#include <stdio.h>\nint main() {\n    printf(\"Hello!\\n\");\n    return 0;\n}\n",
      go:         `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello!")\n}\n`,
      rust:       `fn main() {\n    println!("Hello!");\n}\n`,
      html:       `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>Hello!</h1>\n</body>\n</html>\n`,
      css:        `/* ${name} */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n`,
    }[lang] || "";

    const newFiles = { ...files, [fullPath]: { content: starter, lang } };
    setFiles(newFiles);
    openFile(fullPath);
    sendMessage("file-created", { projectId, path: fullPath, content: starter, lang });
  }, [files, openFile, projectId]);

  // ── Create folder ─────────────────────────────────────────────────────────
  const createFolder = useCallback((parentPath, rawName) => {
    const name    = rawName.trim();
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    // Folders are implicit in the tree — add a placeholder .gitkeep
    const keepPath = `${fullPath}/.gitkeep`;
    if (files[keepPath]) { alert(`"${fullPath}" already exists`); return; }
    setFiles(prev => ({ ...prev, [keepPath]: { content: "", lang: "plaintext" } }));
    sendMessage("file-created", { projectId, path: keepPath, content: "", lang: "plaintext" });
  }, [files, projectId]);

  // ── Delete file / folder ──────────────────────────────────────────────────
  const deleteItem = useCallback((path, type) => {
    if (!window.confirm(`Delete "${path.split("/").pop()}"?`)) return;
    setFiles(prev => {
      const next = { ...prev };
      if (type === "dir") {
        Object.keys(next).forEach(k => { if (k.startsWith(path + "/") || k === path) delete next[k]; });
      } else {
        delete next[path];
      }
      return next;
    });
    setOpenTabs(prev => type === "dir"
      ? prev.filter(t => !t.startsWith(path + "/") && t !== path)
      : prev.filter(t => t !== path));
    if (activeFilename === path || (type === "dir" && activeFilename?.startsWith(path + "/")))
      setActiveFilename(null);
    sendMessage("file-deleted", { projectId, path, type });
  }, [activeFilename, projectId]);

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameItem = useCallback((oldPath, newName, type) => {
    const parts   = oldPath.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");
    if (files[newPath]) { alert(`"${newPath}" already exists`); return; }

    setFiles(prev => {
      const next = { ...prev };
      if (type === "file") {
        next[newPath] = { ...next[oldPath], lang: getLang(newName) };
        delete next[oldPath];
      } else {
        Object.keys(next).forEach(k => {
          if (k.startsWith(oldPath + "/")) {
            next[k.replace(oldPath, newPath)] = next[k];
            delete next[k];
          }
        });
      }
      return next;
    });
    setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
    if (activeFilename === oldPath) setActiveFilename(newPath);
    sendMessage("file-renamed", { projectId, oldPath, newPath, type });
  }, [files, activeFilename, projectId]);

  // ── Remote cursor decorations ─────────────────────────────────────────────
  const updateCursorDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current || !activeFilename) return;
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const model  = editor.getModel();
    if (!model) return;

    const newDecs = Object.entries(remoteCursors)
      .filter(([email]) => email !== myEmail)
      .map(([email, pos]) => {
        const color = colorFor(email);
        const name  = onlineUsers.find(u => u.email === email)?.username || email.split("@")[0];
        const line  = Math.max(1, Math.min(pos.line || 1, model.getLineCount()));
        const col   = Math.max(1, pos.col || 1);

        // inject keyframe for this color once
        const cssClass = `cursor-${email.replace(/[^a-z0-9]/gi, "_")}`;
        if (!document.getElementById(cssClass)) {
          const style = document.createElement("style");
          style.id = cssClass;
          style.textContent = `
            .${cssClass}-cursor { border-left: 2px solid ${color}; position: relative; }
            .${cssClass}-cursor::before {
              content: "${name}"; position: absolute; top: -18px; left: 0;
              background: ${color}; color: #000; font-size: 10px; font-weight: 700;
              padding: 1px 6px; border-radius: 3px; white-space: nowrap;
              pointer-events: none; z-index: 100;
            }
            .${cssClass}-selection { background: ${color}22; }
          `;
          document.head.appendChild(style);
        }

        return {
          range: new monaco.Range(line, col, line, col),
          options: {
            className: `${cssClass}-cursor`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        };
      });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecs);
  }, [remoteCursors, myEmail, activeFilename, onlineUsers]);

  useEffect(() => { updateCursorDecorations(); }, [updateCursorDecorations]);

  // ── Monaco editor mount ───────────────────────────────────────────────────
  const handleEditorMount = useCallback((editorInstance, monacoInstance) => {
    editorRef.current  = editorInstance;
    monacoRef.current  = monacoInstance;

    // Emit cursor position on move
    editorInstance.onDidChangeCursorPosition(({ position }) => {
      sendMessage("cursor-move", {
        projectId,
        email:    myEmail,
        username: myUsername,
        filename: activeFilename,
        line:     position.lineNumber,
        col:      position.column,
      });
    });
  }, [projectId, myEmail, myUsername, activeFilename]);

  // ── Monaco onChange — debounced sync ─────────────────────────────────────
  const handleEditorChange = useCallback((value) => {
    if (suppressSyncRef.current || !activeFilename) return;
    setFiles(prev => ({
      ...prev,
      [activeFilename]: { ...prev[activeFilename], content: value ?? "" },
    }));
    clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      sendMessage("code-change", {
        projectId, filename: activeFilename, code: value ?? "", language: activeLang,
      });
    }, 300);
  }, [activeFilename, activeLang, projectId]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    initializeSocket(projectId);
    getWebcontainer().then(c => setWebcontainer(c)).catch(() => {});

    // ── Message history ────────────────────────────────────────────────────
    receiveMessage("message-history", (history) => {
      if (!Array.isArray(history)) return;
      setMessages(history.map(m => ({
        id: m._id || Date.now() + Math.random(),
        sender: m.sender, senderUsername: m.senderUsername || m.sender,
        message: m.message, timestamp: m.timestamp,
        isAI: m.isAI, direction: m.sender === myEmail ? "outgoing" : "incoming",
      })));
    });

    // ── Live messages ──────────────────────────────────────────────────────
    receiveMessage("project-message", (data) => {
      setMessages(prev => [...prev, {
        ...data, senderUsername: data.senderUsername || data.sender,
        direction: "incoming", id: Date.now() + Math.random(),
      }]);
      if (data.isAI) {
        try {
          const parsed = JSON.parse(data.message);
          if (parsed?.fileTree) {
            const newFiles = {};
            Object.entries(parsed.fileTree).forEach(([filename, node]) => {
              const content = node?.file?.contents ?? "";
              newFiles[filename] = { content, lang: getLang(filename) };
            });
            setFiles(prev => ({ ...prev, ...newFiles }));
            const firstFile = Object.keys(newFiles)[0];
            if (firstFile) openFile(firstFile);
          }
        } catch { /* not JSON */ }
      }
    });

    // ── Members list ──────────────────────────────────────────────────────
    receiveMessage("members-list", (members) => {
      setProjectMembers(Array.isArray(members) ? members : []);
    });

    receiveMessage("user-connected", ({ user: u }) => {
      setOnlineUsers(prev => prev.some(x => x._id === u._id) ? prev : [...prev, u]);
    });

    receiveMessage("user-disconnected", ({ user: u }) => {
      setOnlineUsers(prev => prev.filter(x => x._id !== u._id));
      setRemoteCursors(prev => { const n = {...prev}; delete n[u.email]; return n; });
    });

    // ── Cursor moves ──────────────────────────────────────────────────────
    receiveMessage("cursor-move", ({ email, username, filename, line, col }) => {
      if (email === myEmail) return;
      setRemoteCursors(prev => ({ ...prev, [email]: { filename, line, col, username } }));
    });

    // ── File sync ─────────────────────────────────────────────────────────
    receiveMessage("code-update", ({ filename, code, language }) => {
      if (!filename) return;
      setFiles(prev => ({
        ...prev,
        [filename]: { content: code ?? "", lang: language || getLang(filename) },
      }));
      // If this file is open in Monaco, update without re-mounting
      if (editorRef.current && activeFilename === filename) {
        suppressSyncRef.current = true;
        const model = editorRef.current.getModel();
        if (model && model.getValue() !== code) {
          const pos = editorRef.current.getPosition();
          editorRef.current.executeEdits("remote", [{
            range: model.getFullModelRange(),
            text: code ?? "",
          }]);
          if (pos) editorRef.current.setPosition(pos);
        }
        suppressSyncRef.current = false;
      }
    });

    receiveMessage("file-created", ({ path, content, lang }) => {
      setFiles(prev => ({ ...prev, [path]: { content: content ?? "", lang: lang || getLang(path) } }));
    });

    receiveMessage("file-deleted", ({ path, type }) => {
      setFiles(prev => {
        const n = { ...prev };
        if (type === "dir") Object.keys(n).forEach(k => { if (k.startsWith(path + "/")) delete n[k]; });
        else delete n[path];
        return n;
      });
      setOpenTabs(prev => type === "dir" ? prev.filter(t => !t.startsWith(path + "/")) : prev.filter(t => t !== path));
    });

    receiveMessage("file-renamed", ({ oldPath, newPath, type }) => {
      setFiles(prev => {
        const n = { ...prev };
        if (type === "file") {
          n[newPath] = { ...n[oldPath], lang: getLang(newPath) };
          delete n[oldPath];
        } else {
          Object.keys(n).forEach(k => {
            if (k.startsWith(oldPath + "/")) {
              n[k.replace(oldPath, newPath)] = n[k];
              delete n[k];
            }
          });
        }
        return n;
      });
      setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
    });

    // ── Admin events ──────────────────────────────────────────────────────
    receiveMessage("kicked",          ({ projectId: pid }) => {
      if (pid === projectId) { alert("You were removed from this project."); navigate("/dashboard"); }
    });
    receiveMessage("project-deleted", ({ projectId: pid }) => {
      if (pid === projectId) { alert("This project was deleted."); navigate("/dashboard"); }
    });
    receiveMessage("member-removed",  ({ userId }) => {
      setProjectMembers(prev => prev.filter(m => m._id !== userId));
    });
    receiveMessage("member-promoted", ({ userId }) => {
      setProjectAdmins(prev => [...new Set([...prev, userId])]);
    });

    // ── HTTP fetch ────────────────────────────────────────────────────────
    let mounted = true;
    Promise.all([
      axios.get("/users/all"),
      projectId ? axios.get(`/projects/get-project/${projectId}`).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
    ]).then(([usersRes, projRes]) => {
      if (!mounted) return;
      const proj = projRes.data?.project;
      if (proj?.inviteCode) setInviteCode(proj.inviteCode);
      if (proj?.admins)    setProjectAdmins(proj.admins.map(a => (a._id || a).toString()));
      if (proj?.users && Array.isArray(proj.users)) {
        setProjectMembers(proj.users.map(u => ({
          _id: u._id || u, email: u.email || "", username: u.username || (u.email?.split("@")[0] || ""),
        })));
      }
      // Load shared code from DB into files
      if (proj?.sharedCode && proj.sharedCode !== "// Start coding here...\n") {
        const defaultFile = "main.js";
        setFiles(prev => Object.keys(prev).length === 0
          ? { [defaultFile]: { content: proj.sharedCode, lang: "javascript" } }
          : prev
        );
      }
    }).catch(console.error).finally(() => mounted && setLoading(false));

    return () => { mounted = false; disconnectSocket(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [loading, setLoading] = useState(true);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const box = messageBoxRef.current;
    if (box) requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
  }, [messages]);

  useEffect(() => {
    if (terminalRef.current)
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessageHandler = () => {
    if (!message.trim()) return;
    const payload = {
      message: message.trim(), sender: myEmail,
      senderUsername: myUsername, timestamp: new Date().toISOString(),
    };
    sendMessage("project-message", payload);
    setMessages(prev => [...prev, { ...payload, direction: "outgoing", id: Date.now() + Math.random() }]);
    setMessage("");
  };

  // ── Run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!activeFilename || isRunning) return;
    const code = files[activeFilename]?.content || "";
    const lang = activeLang;
    clearTerminal();
    setTerminalOpen(true);
    setIsRunning(true);
    addLine(`$ Run: ${activeFilename.split("/").pop()}`, "command");
    addLine("", "output");

    // JS + package.json → WebContainer
    const hasPackageJson = Object.keys(files).includes("package.json");
    if (lang === "javascript" && hasPackageJson && webcontainer) {
      try {
        const mountFiles = {};
        Object.entries(files).forEach(([path, f]) => {
          mountFiles[path] = { file: { contents: f.content || "" } };
        });
        await webcontainer.mount(mountFiles);
        addLine("📦 Running npm install...", "info");
        if (window._startProc) { try { await window._startProc.kill(); } catch {} }
        const installProc = await webcontainer.spawn("npm", ["install"]);
        installProc.output.pipeTo(new WritableStream({ write(d) { addLine(d, "output"); } }));
        if ((await installProc.exit) !== 0) { addLine("❌ npm install failed.", "error"); setIsRunning(false); return; }
        addLine("✅ Dependencies installed.", "success");
        addLine("🚀 Starting server...", "info");
        const startProc = await webcontainer.spawn("npm", ["start"]);
        window._startProc = startProc;
        startProc.output.pipeTo(new WritableStream({ write(d) { addLine(d, "output"); } }));
        webcontainer.on("server-ready", (port, url) => { addLine(`🌐 Server ready → ${url}`, "success"); setIframeUrl(url); setIsRunning(false); });
        await startProc.exit;
      } catch (e) { addLine(`❌ ${e.message}`, "error"); }
      finally { setIsRunning(false); }
      return;
    }

    // Everything else → Wandbox
    if (!WANDBOX_COMPILERS[lang]) {
      addLine(`⚠️ "${lang}" is not executable in the browser.`, "warning");
      setIsRunning(false);
      return;
    }
    try {
      addLine(`🔧 Compiling via Wandbox (${WANDBOX_COMPILERS[lang]})...`, "info");
      const result = await runWithWandbox(code, lang);
      const compileOut = (result.compiler_output || "") + (result.compiler_error || "");
      const stdout     = result.program_output  || "";
      const stderr     = result.program_error   || "";
      const exitCode   = parseInt(result.status ?? "0", 10);
      if (compileOut.trim()) {
        addLine("── Compile ──────────────────────────────", "info");
        compileOut.split("\n").forEach(l => { if (l.trim()) addLine(l, l.toLowerCase().includes("error") ? "error" : "warning"); });
        addLine("", "output");
      }
      if (stdout.trim()) {
        addLine("── Output ───────────────────────────────", "info");
        stdout.split("\n").forEach(l => addLine(l, "output"));
      }
      if (stderr.trim()) {
        addLine("── Stderr ───────────────────────────────", "error");
        stderr.split("\n").forEach(l => l.trim() && addLine(l, "error"));
      }
      if (!stdout.trim() && !stderr.trim() && !compileOut.trim()) addLine("(no output)", "info");
      addLine("", "output");
      addLine(`Process exited with code ${exitCode}`, exitCode === 0 ? "success" : "error");
    } catch (e) {
      addLine(`❌ ${e.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Copy invite code ──────────────────────────────────────────────────────
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Admin actions ─────────────────────────────────────────────────────────
  const handleRemoveMember = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from this project?`)) return;
    try { await axios.delete(`/projects/${projectId}/members/${id}`); setProjectMembers(p => p.filter(m => m._id !== id)); }
    catch (e) { alert(e.response?.data?.error || "Failed"); }
  };
  const handlePromote = async (id, name) => {
    if (!window.confirm(`Make "${name}" an admin?`)) return;
    try { await axios.put(`/projects/${projectId}/promote/${id}`); setProjectAdmins(p => [...new Set([...p, id])]); }
    catch (e) { alert(e.response?.data?.error || "Failed"); }
  };
  const handleExitProject = async () => {
    if (!window.confirm("Leave this project?")) return;
    try { await axios.post(`/projects/${projectId}/exit`); navigate("/dashboard"); }
    catch (e) { alert(e.response?.data?.error || "Failed"); }
  };

  // ── File tree event handlers ──────────────────────────────────────────────
  const handleNewFile   = (parentPath) => setNewItemDialog({ type: "file",   parentPath: parentPath || "" });
  const handleNewFolder = (parentPath) => setNewItemDialog({ type: "folder", parentPath: parentPath || "" });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#0d1117", color: "#e2e8f0", overflow: "hidden",
      fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
    }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 42, background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px", flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Back */}
        <button onClick={() => navigate("/dashboard")} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
          borderRadius: 5, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          ← Dashboard
        </button>

        {/* Project name */}
        <span style={{ color: "#64748b", fontSize: 12, margin: "0 4px" }}>›</span>
        <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>
          {projectName}
        </span>

        {/* Active file breadcrumb */}
        {activeFilename && (
          <>
            <span style={{ color: "#374151", fontSize: 12 }}>›</span>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{activeFilename.split("/").pop()}</span>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Online users */}
        {onlineUsers.length > 0 && <OnlinePill users={onlineUsers} />}

        {/* Members button */}
        <button onClick={() => setMembersOpen(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
          borderRadius: 5,
          background: membersOpen ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: membersOpen ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
          color: membersOpen ? "#818cf8" : "#94a3b8",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          👥 {projectMembers.length}
        </button>

        {/* Chat toggle */}
        <button onClick={() => setChatOpen(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
          borderRadius: 5,
          background: chatOpen ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: chatOpen ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
          color: chatOpen ? "#818cf8" : "#94a3b8",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          💬 Chat
        </button>

        {/* Invite button */}
        <button onClick={() => setInviteOpen(true)} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
          borderRadius: 5, border: "none",
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          🔗 Invite
        </button>

        {/* Run button */}
        <button onClick={handleRun} disabled={!activeFilename || isRunning} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
          borderRadius: 5, border: "none",
          background: !activeFilename || isRunning ? "#374151" : "linear-gradient(135deg,#16a34a,#15803d)",
          color: "white", fontSize: 11, fontWeight: 700,
          cursor: !activeFilename || isRunning ? "not-allowed" : "pointer",
        }}>
          {isRunning ? "⏳ Running…" : "▶ Run"}
        </button>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── SIDEBAR: File Explorer ───────────────────────────────────── */}
        <div style={{
          width: 220, background: "#161b22", borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
        }}>
          {/* Explorer header */}
          <div style={{
            padding: "10px 12px 8px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Explorer
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => handleNewFile("")} title="New file" style={{
                background: "none", border: "none", color: "#64748b",
                cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 3,
              }}
                onMouseEnter={e => e.currentTarget.style.color="#e2e8f0"}
                onMouseLeave={e => e.currentTarget.style.color="#64748b"}
              >📄+</button>
              <button onClick={() => handleNewFolder("")} title="New folder" style={{
                background: "none", border: "none", color: "#64748b",
                cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 3,
              }}
                onMouseEnter={e => e.currentTarget.style.color="#e2e8f0"}
                onMouseLeave={e => e.currentTarget.style.color="#64748b"}
              >📁+</button>
            </div>
          </div>

          {/* File tree */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {Object.keys(files).length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ color: "#374151", fontSize: 12, marginBottom: 12 }}>
                  No files yet
                </p>
                <button onClick={() => handleNewFile("")} style={{
                  padding: "6px 14px", borderRadius: 6, border: "none",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>
                  + New File
                </button>
              </div>
            ) : (
              Object.values(fileTree.children)
                .sort((a, b) => {
                  if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                  return a.name.localeCompare(b.name);
                })
                .map(child => (
                  <FileTreeNode
                    key={child.name + (child.fullPath || "")}
                    node={child} depth={0}
                    activeFilename={activeFilename}
                    onSelect={openFile}
                    onDelete={deleteItem}
                    onRename={renameItem}
                    onNewFile={handleNewFile}
                    onNewFolder={handleNewFolder}
                  />
                ))
            )}
          </div>
        </div>

        {/* ── MAIN: Editor + Terminal ──────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Tabs */}
          {openTabs.length > 0 && (
            <TabBar
              tabs={openTabs}
              activeFilename={activeFilename}
              onSelect={openFile}
              onClose={closeTab}
            />
          )}

          {/* Editor area */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {!activeFilename ? (
              <div style={{
                height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16,
                background: "#0d1117",
              }}>
                <div style={{ fontSize: 48 }}>📂</div>
                <p style={{ color: "#374151", fontSize: 14 }}>Open a file to start editing</p>
                <button onClick={() => handleNewFile("")} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  Create first file
                </button>
              </div>
            ) : (
              <Editor
                key={activeFilename}
                height="100%"
                language={activeLang}
                value={activeFile?.content ?? ""}
                theme="vs-dark"
                onMount={handleEditorMount}
                onChange={handleEditorChange}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',Menlo,monospace",
                  fontLigatures: true,
                  lineNumbers: "on",
                  minimap: { enabled: true, scale: 1 },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  insertSpaces: true,
                  folding: true,
                  foldingHighlight: true,
                  bracketPairColorization: { enabled: true },
                  autoIndent: "full",
                  formatOnPaste: true,
                  formatOnType: false,
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: { other: true, comments: false, strings: false },
                  parameterHints: { enabled: true },
                  hover: { enabled: true },
                  renderLineHighlight: "line",
                  cursorStyle: "line",
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  glyphMargin: true,
                  renderWhitespace: "selection",
                  scrollbar: {
                    vertical: "auto", horizontal: "auto",
                    verticalScrollbarSize: 6, horizontalScrollbarSize: 6,
                  },
                }}
              />
            )}
          </div>

          {/* Terminal panel */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0, display: "flex", flexDirection: "column",
            transition: "height 0.2s", height: terminalOpen ? "240px" : "34px",
            background: "#161b22",
          }}>
            {/* Terminal tab */}
            <div
              onClick={() => setTerminalOpen(v => !v)}
              style={{
                height: 34, flexShrink: 0, display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "0 14px",
                cursor: "pointer", userSelect: "none",
                borderBottom: terminalOpen ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#4ade80", fontSize: 10 }}>⬛</span>
                <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Terminal
                </span>
                {isRunning && (
                  <span style={{ color: "#fbbf24", fontSize: 10, display: "flex", gap: 4, alignItems: "center" }}>
                    <span className="animate-pulse">●</span> Running
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {terminalLines.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); clearTerminal(); }} style={{
                    background: "none", border: "none", color: "#475569",
                    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                  }}>Clear</button>
                )}
                <span style={{ color: "#475569", fontSize: 10 }}>{terminalOpen ? "▼" : "▲"}</span>
              </div>
            </div>

            {/* Terminal output */}
            {terminalOpen && (
              <div ref={terminalRef} style={{
                flex: 1, overflowY: "auto", padding: "10px 14px",
                background: "#0d1117", fontSize: 12, lineHeight: 1.6,
              }}>
                {terminalLines.length === 0 ? (
                  <span style={{ color: "#374151" }}>Click ▶ Run to execute your code…</span>
                ) : (
                  terminalLines.map(line => (
                    <div key={line.id} style={{ color: lineColor(line.type), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {line.text}
                    </div>
                  ))
                )}
                {!isRunning && terminalLines.length > 0 && (
                  <span style={{ color: "#4ade80" }} className="animate-pulse">█</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Chat ────────────────────────────────────────── */}
        {chatOpen && (
          <div style={{
            width: 280, background: "#161b22",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            {/* Chat header */}
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Chat
              </span>
              <button onClick={() => setChatOpen(false)} style={{
                background: "none", border: "none", color: "#475569",
                cursor: "pointer", fontSize: 14,
              }}>×</button>
            </div>

            {/* Messages */}
            <div ref={messageBoxRef} style={{
              flex: 1, overflowY: "auto", padding: "10px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {messages.length === 0 ? (
                <div style={{ color: "#374151", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                  No messages yet
                </div>
              ) : messages.map(m => {
                const isOut = m.direction === "outgoing" || m.sender === myEmail;
                const isAI  = m.sender === "AI Assistant";
                let displayText = m.message;
                if (isAI) { try { displayText = JSON.parse(m.message)?.text || m.message; } catch {} }
                return (
                  <div key={m.id} style={{
                    alignSelf: isOut ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                  }}>
                    {!isOut && (
                      <span style={{ color: colorFor(m.sender), fontSize: 10, fontWeight: 700,
                        marginBottom: 3, display: "block", letterSpacing: "0.03em" }}>
                        {m.senderUsername || m.sender?.split("@")[0] || "?"}
                      </span>
                    )}
                    <div style={{
                      padding: "8px 11px", borderRadius: isOut ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isOut ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                        : isAI ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)",
                      border: isAI ? "1px solid rgba(99,102,241,0.25)" : "none",
                      fontSize: 13, lineHeight: 1.5, color: isOut ? "white" : "#d1d5db",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                      {displayText}
                    </div>
                    <div style={{ color: "#374151", fontSize: 9, marginTop: 2,
                      textAlign: isOut ? "right" : "left" }}>
                      {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message input */}
            <div style={{
              padding: "10px", borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex", gap: 8, alignItems: "flex-end",
            }}>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessageHandler())}
                placeholder="Message or @ai ..."
                style={{
                  flex: 1, padding: "8px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 12,
                  outline: "none", fontFamily: "'Inter', system-ui, sans-serif",
                  resize: "none",
                }}
              />
              <button onClick={sendMessageHandler} style={{
                padding: "8px 12px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700,
              }}>
                ↑
              </button>
            </div>
          </div>
        )}

        {/* ── MEMBERS PANEL overlay ────────────────────────────────────── */}
        {membersOpen && (
          <div style={{
            position: "absolute", right: chatOpen ? 280 : 0, top: 0,
            width: 240, height: "100%", background: "#161b22",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", zIndex: 20,
          }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Members
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={handleExitProject} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171", fontFamily: "inherit", fontWeight: 600,
                }}>Leave</button>
                <button onClick={() => setMembersOpen(false)} style={{
                  background: "none", border: "none", color: "#475569",
                  cursor: "pointer", fontSize: 14,
                }}>×</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {projectMembers.map(m => {
                const mid        = m._id?.toString() || "";
                const name       = m.username || m.email?.split("@")[0] || "?";
                const isMe       = m.email === myEmail;
                const isOnline   = onlineUsers.some(u => u._id === m._id || u.email === m.email);
                const isAdminMember = projectAdmins.includes(mid);
                const color      = colorFor(m.email);

                return (
                  <div key={mid || m.email} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 6,
                    background: isMe ? "rgba(99,102,241,0.08)" : "transparent",
                    marginBottom: 2,
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: color, display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: 11, color: "#000",
                      position: "relative",
                    }}>
                      {name.charAt(0).toUpperCase()}
                      {/* Online indicator */}
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 7, height: 7, borderRadius: "50%",
                        background: isOnline ? "#4ade80" : "#374151",
                        border: "1.5px solid #161b22",
                      }} />
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#d1d5db", fontSize: 12, fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </span>
                        {isAdminMember && (
                          <span style={{
                            fontSize: 7, padding: "1px 4px", borderRadius: 3,
                            background: "rgba(99,102,241,0.2)", color: "#818cf8",
                            border: "1px solid rgba(99,102,241,0.3)", letterSpacing: "0.06em",
                            textTransform: "uppercase", flexShrink: 0,
                          }}>admin</span>
                        )}
                        {isMe && <span style={{ color: "#64748b", fontSize: 9, flexShrink: 0 }}>(you)</span>}
                      </div>
                      <div style={{ color: "#475569", fontSize: 9,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.email}
                      </div>
                    </div>

                    {/* Admin actions */}
                    {amIAdmin && !isMe && !isAdminMember && (
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        <button onClick={() => handlePromote(mid, name)} title="Make admin" style={{
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                          background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                          color: "#818cf8", fontFamily: "inherit", fontWeight: 600,
                        }}>↑</button>
                        <button onClick={() => handleRemoveMember(mid, name)} title="Remove" style={{
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                          color: "#f87171", fontFamily: "inherit", fontWeight: 600,
                        }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── INVITE MODAL ──────────────────────────────────────────────────── */}
      {inviteOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && setInviteOpen(false)}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: 16, padding: "28px", maxWidth: 380, width: "100%",
            boxShadow: "0 0 60px rgba(99,102,241,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>Invite collaborators</h3>
              <button onClick={() => setInviteOpen(false)} style={{
                background: "none", border: "none", color: "#64748b",
                cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Share this code via <strong style={{ color: "#818cf8" }}>Dashboard → Join project</strong>
            </p>
            <div style={{
              background: "#030712", border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 10, padding: "14px 16px", marginBottom: 14,
            }}>
              <code style={{
                fontFamily: "monospace", fontSize: 18, letterSpacing: "0.12em",
                color: "#a5b4fc",
              }}>
                {inviteCode || "Loading…"}
              </code>
            </div>
            <button onClick={copyInviteCode} style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none",
              background: copied ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              transition: "background 0.2s",
            }}>
              {copied ? "✅ Copied!" : "📋 Copy invite code"}
            </button>
          </div>
        </div>
      )}

      {/* ── NEW ITEM DIALOG ───────────────────────────────────────────────── */}
      {newItemDialog && (
        <NewItemDialog
          type={newItemDialog.type}
          parentPath={newItemDialog.parentPath}
          onConfirm={name => {
            if (newItemDialog.type === "file") createFile(newItemDialog.parentPath, name);
            else createFolder(newItemDialog.parentPath, name);
            setNewItemDialog(null);
          }}
          onCancel={() => setNewItemDialog(null)}
        />
      )}

      {/* ── IFRAME PREVIEW ────────────────────────────────────────────────── */}
      {iframeUrl && webcontainer && (
        <div style={{
          position: "fixed", bottom: 40, right: 20, width: 380, height: 280,
          background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 12, overflow: "hidden", zIndex: 100,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", background: "#1e293b",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ color: "#4ade80", fontSize: 10 }}>🌐</span>
            <input value={iframeUrl} onChange={e => setIframeUrl(e.target.value)}
              style={{
                flex: 1, background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4,
                color: "#94a3b8", fontSize: 10, padding: "2px 8px", outline: "none",
                fontFamily: "monospace",
              }} />
            <button onClick={() => setIframeUrl(null)} style={{
              background: "none", border: "none", color: "#f87171",
              cursor: "pointer", fontSize: 14,
            }}>✕</button>
          </div>
          <iframe src={iframeUrl} style={{ width: "100%", height: "calc(100% - 32px)" }} title="preview" />
        </div>
      )}
    </div>
  );
};

export default Project;