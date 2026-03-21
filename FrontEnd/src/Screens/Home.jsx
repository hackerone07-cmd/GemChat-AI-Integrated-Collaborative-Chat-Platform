import React, { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/user.context";
import axios from "../Config/axios.config";
import { toast } from "react-toastify";

/* ─── Language tag for project cards ─────────────────────────────────────── */
const LANG_COLORS = {
  javascript: "#f0c040", typescript: "#818cf8", python: "#34d399",
  java: "#f59e0b", cpp: "#60a5fa", c: "#7dd3fc", go: "#22d3ee",
  rust: "#fb923c", ruby: "#f472b6", php: "#a78bfa", kotlin: "#e879f9",
  swift: "#60a5fa", bash: "#94a3b8", html: "#f97316", css: "#38bdf8",
};

/* ─── Delete confirmation modal ───────────────────────────────────────────── */
const ConfirmModal = ({ projectName, onConfirm, onCancel }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  }}>
    <div style={{
      background: "#0f172a", border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 16, padding: "32px 28px", maxWidth: 380, width: "100%",
      boxShadow: "0 0 60px rgba(239,68,68,0.15)",
    }}>
      <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🗑️</div>
      <h3 style={{ color: "#f1f5f9", fontWeight: 700, textAlign: "center", marginBottom: 10 }}>
        Delete project?
      </h3>
      <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
        "<strong style={{ color: "#f1f5f9" }}>{projectName}</strong>" will be permanently deleted.
        This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8", fontSize: 14, fontWeight: 600,
        }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer",
          background: "#ef4444", border: "none",
          color: "white", fontSize: 14, fontWeight: 700,
        }}>
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ─── Project card ────────────────────────────────────────────────────────── */
const ProjectCard = ({ project, onClick, onDelete, currentUserId }) => {
  const [hovered, setHovered] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const initials = (project.name || "?").slice(0, 2).toUpperCase();
  const color    = Object.values(LANG_COLORS)[
    (project.name || "").charCodeAt(0) % Object.values(LANG_COLORS).length
  ];
  const date = new Date(project.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // Check if the current user is an admin of this project
  const isAdmin = currentUserId && project.admins?.some(
    (a) => (a._id || a).toString() === currentUserId.toString()
  );

  return (
    <>
      <div
        style={{
          background: hovered
            ? "linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))"
            : "linear-gradient(135deg,rgba(15,23,42,0.9),rgba(9,15,30,0.95))",
          border: `1px solid ${hovered ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.15)"}`,
          borderRadius: 16, padding: "22px 20px",
          cursor: "pointer", transition: "all 0.22s",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 12px 40px rgba(99,102,241,0.18)" : "none",
          position: "relative",
          display: "flex", flexDirection: "column", gap: 14,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); }}
        onClick={() => !showDel && onClick(project)}
      >
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg,${color}33,${color}11)`,
            border: `1px solid ${color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, color,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <h3 style={{
                color: "#f1f5f9", fontWeight: 700, fontSize: 15,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {project.name}
              </h3>
              {isAdmin && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 6px",
                  borderRadius: 4, background: "rgba(99,102,241,0.2)",
                  color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  flexShrink: 0,
                }}>
                  Admin
                </span>
              )}
            </div>
            <span style={{ color: "#475569", fontSize: 12 }}>{date}</span>
          </div>

          {/* Delete button — admins only */}
          {isAdmin && (
          <button
            onClick={e => { e.stopPropagation(); setShowDel(true); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: hovered ? "#ef4444" : "transparent",
              fontSize: 16, padding: "2px 4px", borderRadius: 4,
              transition: "color 0.2s",
              flexShrink: 0,
            }}
            title="Delete project"
          >
            🗑
          </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 16, alignItems: "center",
          padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>👥</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              {project.users?.length ?? 0} member{project.users?.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 6,
            padding: "3px 10px", borderRadius: 20,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>Open</span>
          </div>
        </div>

        {/* Open arrow */}
        {hovered && (
          <div style={{
            position: "absolute", bottom: 16, right: 18,
            color: "#818cf8", fontSize: 18,
          }}>
            →
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDel && (
        <ConfirmModal
          projectName={project.name}
          onCancel={() => setShowDel(false)}
          onConfirm={() => { setShowDel(false); onDelete(project._id); }}
        />
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Home / Dashboard
═══════════════════════════════════════════════════════════════════════════ */
const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [projects,     setProjects]     = useState([]);
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [projectName,  setProjectName]  = useState("");
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [sort,         setSort]         = useState("newest"); // newest | oldest | name | members
  const [joinModal,    setJoinModal]    = useState(false);
  const [inviteCode,   setInviteCode]   = useState("");
  const [joining,      setJoining]      = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects/all");
      setProjects(res.data.projects ?? []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const id = setInterval(fetchProjects, 60_000);
    return () => clearInterval(id);
  }, []);

  // Create project
  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      await axios.post("/projects/create", { name: projectName.trim() });
      toast.success(`"${projectName}" created!`, { position: "top-center", autoClose: 1500 });
      setProjectName("");
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  // Delete project — calls real API, admin only
  const deleteProject = async (id) => {
    try {
      await axios.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p._id !== id));
      toast.success("Project deleted", { position: "top-center", autoClose: 1200 });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete project", {
        position: "top-center",
      });
    }
  };

  // Join via invite code
  const joinProject = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const res = await axios.post("/projects/join", { inviteCode: inviteCode.trim() });
      toast.success(`Joined "${res.data.project?.name}"!`, { position: "top-center" });
      setInviteCode("");
      setJoinModal(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid invite code");
    } finally {
      setJoining(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axios.get("/users/logout");
    } catch { /* ignore */ }
    setUser(null);
    toast.success("Signed out", { position: "top-center", autoClose: 1000 });
    navigate("/login");
  };

  // Filter + sort
  const displayedProjects = projects
    .filter((p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "newest")  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "oldest")  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "name")    return (a.name || "").localeCompare(b.name || "");
      if (sort === "members") return (b.users?.length ?? 0) - (a.users?.length ?? 0);
      return 0;
    });

  const email    = user?.email || "user";
  const initials = email.charAt(0).toUpperCase();

  const S = {
    page: {
      minHeight: "100vh", background: "#030712",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#f1f5f9",
    },
    nav: {
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(3,7,18,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "0 28px", height: 60,
      display: "flex", alignItems: "center", gap: 16,
    },
    logoBox: {
      width: 32, height: 32, borderRadius: 8,
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16,
    },
    logoText: {
      fontSize: 18, fontWeight: 800,
      background: "linear-gradient(90deg,#818cf8,#c084fc)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    main: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px" },
    input: {
      background: "rgba(30,41,59,0.8)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: 8, color: "#f1f5f9", fontSize: 14,
      outline: "none", fontFamily: "inherit",
      transition: "border-color 0.2s",
    },
    btnPrimary: {
      padding: "10px 22px", borderRadius: 8, border: "none",
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
      boxShadow: "0 0 24px rgba(99,102,241,0.3)", transition: "all 0.2s",
    },
    btnGhost: {
      padding: "10px 22px", borderRadius: 8,
      border: "1px solid rgba(99,102,241,0.3)",
      background: "transparent", color: "#818cf8",
      fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
    },
    statsCard: {
      background: "rgba(15,23,42,0.8)",
      border: "1px solid rgba(99,102,241,0.15)",
      borderRadius: 14, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 4,
    },
    modal: {
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    },
    modalCard: {
      background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)",
      borderRadius: 16, padding: "32px 28px", maxWidth: 420, width: "100%",
      boxShadow: "0 0 60px rgba(99,102,241,0.15)",
    },
  };

  const focusStyle = { borderColor: "rgba(99,102,241,0.6)", boxShadow: "0 0 0 3px rgba(99,102,241,0.12)" };
  const blurStyle  = { borderColor: "rgba(99,102,241,0.2)", boxShadow: "none" };

  return (
    <div style={S.page}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={S.logoBox}>💎</div>
        <span style={S.logoText}>GemChat</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* User menu */}
          <div style={{ position: "relative" }} ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(30,41,59,0.8)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 8, padding: "6px 12px",
                color: "#f1f5f9", cursor: "pointer", fontSize: 13,
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12,
              }}>
                {initials}
              </div>
              <span style={{ color: "#94a3b8", maxWidth: 160,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </span>
              <span style={{ color: "#64748b", fontSize: 10 }}>▾</span>
            </button>

            {userMenuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                background: "#0f172a", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 10, overflow: "hidden", minWidth: 180,
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)", zIndex: 200,
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Signed in as</div>
                  <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600,
                    maxWidth: 148, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {email}
                  </div>
                </div>
                {[
                  { icon: "🏠", label: "Dashboard",     action: () => { setUserMenuOpen(false); } },
                  { icon: "👤", label: "Edit profile",  action: () => { setUserMenuOpen(false); navigate("/profile"); } },
                  { icon: "🔑", label: "Join project",  action: () => { setUserMenuOpen(false); setJoinModal(true); } },
                  { icon: "🚪", label: "Sign out",      action: logout, red: true },
                ].map(({ icon, label, action, red }) => (
                  <button key={label} onClick={action} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 16px",
                    background: "none", border: "none",
                    color: red ? "#f87171" : "#94a3b8",
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={S.main}>

        {/* Hero header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
            Your workspace
          </h1>
          <p style={{ color: "#64748b", fontSize: 15 }}>
            {projects.length === 0 && !loading
              ? "Create your first project to get started"
              : `${projects.length} project${projects.length !== 1 ? "s" : ""} — build something great`}
          </p>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12, marginBottom: 32,
        }}>
          {[
            { icon: "📁", label: "Projects",    value: projects.length },
            { icon: "👥", label: "Teammates",
              value: [...new Set(projects.flatMap(p => p.users || []))].length },
            { icon: "⚡", label: "Active now",   value: projects.filter(p => (p.users?.length ?? 0) > 1).length },
            { icon: "🤖", label: "AI-powered",   value: "∞" },
          ].map(({ icon, label, value }) => (
            <div key={label} style={S.statsCard}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>{value}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap",
          alignItems: "center", marginBottom: 24,
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#475569", fontSize: 14, pointerEvents: "none",
            }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              style={{ ...S.input, width: "100%", padding: "10px 12px 10px 36px", boxSizing: "border-box" }}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
          </div>

          {/* Sort */}
          <select
            value={sort} onChange={e => setSort(e.target.value)}
            style={{
              ...S.input, padding: "10px 14px",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="members">Most members</option>
          </select>

          {/* Join */}
          <button style={S.btnGhost} onClick={() => setJoinModal(true)}
            onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            🔑 Join
          </button>

          {/* New project */}
          <button style={S.btnPrimary} onClick={() => setIsModalOpen(true)}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 0 36px rgba(99,102,241,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 0 24px rgba(99,102,241,0.3)"; }}>
            + New project
          </button>
        </div>

        {/* Project grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <p>Loading projects…</p>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            border: "2px dashed rgba(99,102,241,0.2)", borderRadius: 20,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {search ? "🔍" : "🚀"}
            </div>
            <h3 style={{ color: "#64748b", fontWeight: 600, marginBottom: 8 }}>
              {search ? `No projects match "${search}"` : "No projects yet"}
            </h3>
            <p style={{ color: "#334155", fontSize: 14, marginBottom: 24 }}>
              {search
                ? "Try a different search term"
                : "Create your first project and start collaborating with AI"}
            </p>
            {!search && (
              <button style={S.btnPrimary} onClick={() => setIsModalOpen(true)}>
                Create first project →
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            gap: 16,
          }}>
            {displayedProjects.map((p) => {
              const currentUserId =
                user?._id || (() => { try { return JSON.parse(localStorage.getItem("user"))?._id; } catch { return null; } })();
              return (
                <ProjectCard
                  key={p._id}
                  project={p}
                  currentUserId={currentUserId}
                  onClick={(proj) => navigate("/project", { state: { project: proj } })}
                  onDelete={deleteProject}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create project modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div style={S.modalCard}>
            <h2 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
              New project
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
              Give your workspace a name. An invite code is generated automatically.
            </p>
            <form onSubmit={createProject}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Project name
              </label>
              <input
                autoFocus value={projectName} required
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. my-awesome-api"
                style={{ ...S.input, width: "100%", padding: "12px 14px",
                  boxSizing: "border-box", marginBottom: 22 }}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{
                  flex: 1, padding: "11px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={{
                  flex: 1, padding: "11px", borderRadius: 8, border: "none",
                  background: creating ? "#334155" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white", fontSize: 14, fontWeight: 700,
                  cursor: creating ? "not-allowed" : "pointer",
                  boxShadow: creating ? "none" : "0 0 24px rgba(99,102,241,0.3)",
                }}>
                  {creating ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join project modal ───────────────────────────────────────────── */}
      {joinModal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setJoinModal(false)}>
          <div style={S.modalCard}>
            <h2 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
              Join a project
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
              Enter the invite code shared by a project member.
            </p>
            <form onSubmit={joinProject}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Invite code
              </label>
              <input
                autoFocus value={inviteCode} required
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Paste invite code here…"
                style={{ ...S.input, width: "100%", padding: "12px 14px",
                  boxSizing: "border-box", marginBottom: 22,
                  fontFamily: "'Fira Code', monospace", letterSpacing: "0.05em" }}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setJoinModal(false)} style={{
                  flex: 1, padding: "11px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={joining} style={{
                  flex: 1, padding: "11px", borderRadius: 8, border: "none",
                  background: joining ? "#334155" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "white", fontSize: 14, fontWeight: 700,
                  cursor: joining ? "not-allowed" : "pointer",
                  boxShadow: joining ? "none" : "0 0 24px rgba(99,102,241,0.3)",
                }}>
                  {joining ? "Joining…" : "Join project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;