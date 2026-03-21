import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Animated code rain canvas ─────────────────────────────────────────── */
const CodeRain = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "01アイウエオカキクケコサシスセソ{}[]()<>=+-*/;:,.!?#@$%^&~|`".split("");
    const cols  = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(3,7,18,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "13px 'Fira Code', monospace";
      drops.forEach((y, i) => {
        const char  = chars[Math.floor(Math.random() * chars.length)];
        const alpha = Math.random();
        if (alpha > 0.92) ctx.fillStyle = "#ffffff";
        else if (alpha > 0.7) ctx.fillStyle = "#3b82f6";
        else ctx.fillStyle = `rgba(99,102,241,${0.15 + alpha * 0.25})`;
        ctx.fillText(char, i * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        opacity: 0.35, pointerEvents: "none",
      }}
    />
  );
};

/* ─── Feature card ───────────────────────────────────────────────────────── */
const FeatureCard = ({ icon, title, desc, delay }) => (
  <div
    style={{
      animationDelay: `${delay}ms`,
      background: "linear-gradient(135deg,rgba(30,41,59,0.9),rgba(15,23,42,0.95))",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: "16px",
      padding: "28px",
      transition: "transform 0.25s, box-shadow 0.25s, border-color 0.25s",
    }}
    className="group hover:-translate-y-1"
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
      e.currentTarget.style.boxShadow   = "0 0 32px rgba(99,102,241,0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
      e.currentTarget.style.boxShadow   = "none";
    }}
  >
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22, marginBottom: 16,
      boxShadow: "0 0 20px rgba(99,102,241,0.4)",
    }}>
      {icon}
    </div>
    <h3 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
      {title}
    </h3>
    <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
  </div>
);

/* ─── Step card ──────────────────────────────────────────────────────────── */
const StepCard = ({ num, title, desc }) => (
  <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
    <div style={{
      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 800, fontSize: 15,
      boxShadow: "0 0 20px rgba(99,102,241,0.35)",
    }}>
      {num}
    </div>
    <div>
      <h4 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
        {title}
      </h4>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
    </div>
  </div>
);

/* ─── Stat badge ─────────────────────────────────────────────────────────── */
const StatBadge = ({ value, label }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{
      fontSize: 36, fontWeight: 800,
      background: "linear-gradient(90deg,#818cf8,#c084fc)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      lineHeight: 1,
    }}>
      {value}
    </div>
    <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{label}</div>
  </div>
);

/* ─── Language pill ─────────────────────────────────────────────────────── */
const LangPill = ({ name, color }) => (
  <span style={{
    padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }}>
    {name}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Landing page
═══════════════════════════════════════════════════════════════════════════ */
const Landing = () => {
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Check if already logged in → redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user  = localStorage.getItem("user");
    if (token && user) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const S = {
    page: {
      background: "#030712",
      color: "#f1f5f9",
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowX: "hidden",
    },
    nav: {
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "0 40px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 64,
      background: navScrolled ? "rgba(3,7,18,0.92)" : "transparent",
      backdropFilter: navScrolled ? "blur(12px)" : "none",
      borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "all 0.3s",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 10,
      textDecoration: "none",
    },
    logoText: {
      fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px",
      background: "linear-gradient(90deg,#818cf8,#c084fc)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    navLinks: { display: "flex", gap: 32, alignItems: "center" },
    navLink: { color: "#94a3b8", fontSize: 14, textDecoration: "none", cursor: "pointer",
      transition: "color 0.2s" },
    btnOutline: {
      padding: "8px 20px", borderRadius: 8,
      border: "1px solid rgba(99,102,241,0.5)",
      background: "transparent", color: "#818cf8",
      fontSize: 14, fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s",
    },
    btnPrimary: {
      padding: "8px 20px", borderRadius: 8,
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      border: "none", color: "white",
      fontSize: 14, fontWeight: 600, cursor: "pointer",
      boxShadow: "0 0 24px rgba(99,102,241,0.35)",
      transition: "all 0.2s",
    },
    hero: {
      position: "relative", overflow: "hidden",
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "120px 24px 80px",
    },
    heroGlow: {
      position: "absolute",
      width: 600, height: 600, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)",
      top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      pointerEvents: "none",
    },
    badge: {
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 16px", borderRadius: 999, marginBottom: 32,
      background: "rgba(99,102,241,0.12)",
      border: "1px solid rgba(99,102,241,0.3)",
      fontSize: 13, color: "#818cf8", fontWeight: 600,
    },
    h1: {
      fontSize: "clamp(2.4rem,6vw,4.2rem)",
      fontWeight: 900, lineHeight: 1.1,
      letterSpacing: "-2px", marginBottom: 24,
      maxWidth: 800,
    },
    grad: {
      background: "linear-gradient(90deg,#818cf8,#c084fc,#f472b6)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    heroSub: {
      fontSize: "clamp(1rem,2vw,1.2rem)",
      color: "#94a3b8", maxWidth: 560,
      lineHeight: 1.7, marginBottom: 40,
    },
    heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" },
    heroBtnPrimary: {
      padding: "14px 36px", borderRadius: 10, border: "none",
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
      boxShadow: "0 0 40px rgba(99,102,241,0.4)",
      transition: "all 0.2s", letterSpacing: "-0.3px",
    },
    heroBtnOutline: {
      padding: "14px 36px", borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.04)",
      color: "#f1f5f9", fontSize: 16, fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s",
    },
    section: { padding: "96px 24px", maxWidth: 1100, margin: "0 auto" },
    sectionLabel: {
      fontSize: 12, fontWeight: 700, letterSpacing: "0.15em",
      color: "#818cf8", textTransform: "uppercase", marginBottom: 12,
    },
    sectionTitle: {
      fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800,
      letterSpacing: "-0.5px", marginBottom: 16,
    },
    sectionSub: { color: "#64748b", fontSize: 16, lineHeight: 1.7, maxWidth: 540 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 },
    divider: { height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)", margin: "0 40px" },
    footer: {
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "40px 40px", marginTop: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    },
  };

  return (
    <div style={S.page}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>💎</div>
          <span style={S.logoText}>GemChat</span>
        </div>

        <div style={S.navLinks}>
          <a href="#features" style={S.navLink}
            onMouseEnter={e => e.target.style.color="#f1f5f9"}
            onMouseLeave={e => e.target.style.color="#94a3b8"}>Features</a>
          <a href="#how" style={S.navLink}
            onMouseEnter={e => e.target.style.color="#f1f5f9"}
            onMouseLeave={e => e.target.style.color="#94a3b8"}>How it works</a>
          <a href="#languages" style={S.navLink}
            onMouseEnter={e => e.target.style.color="#f1f5f9"}
            onMouseLeave={e => e.target.style.color="#94a3b8"}>Languages</a>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnOutline} onClick={() => navigate("/login")}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(99,102,241,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}>
            Sign in
          </button>
          <button style={S.btnPrimary} onClick={() => navigate("/register")}
            onMouseEnter={e => { e.currentTarget.style.transform="scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={S.hero} ref={heroRef}>
        <CodeRain />
        <div style={S.heroGlow} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={S.badge}>
            <span>✨</span>
            <span>Powered by Gemini AI</span>
          </div>

          <h1 style={S.h1}>
            Code together,{" "}
            <span style={S.grad}>ship faster</span>
            <br />with AI at your side
          </h1>

          <p style={S.heroSub}>
            GemChat is a real-time collaborative coding platform where your team and
            an AI pair-programmer work side-by-side — across any language, any timezone.
          </p>

          <div style={S.heroBtns}>
            <button style={S.heroBtnPrimary}
              onClick={() => navigate("/register")}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 0 56px rgba(99,102,241,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 0 40px rgba(99,102,241,0.4)"; }}>
              Start for free →
            </button>
            <button style={S.heroBtnOutline}
              onClick={() => navigate("/login")}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}>
              Sign in
            </button>
          </div>
        </div>

        {/* Mock editor preview */}
        <div style={{
          position: "relative", zIndex: 2, marginTop: 72,
          width: "100%", maxWidth: 800,
          borderRadius: 16,
          border: "1px solid rgba(99,102,241,0.25)",
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(99,102,241,0.15), 0 40px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Editor title bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px",
            background: "rgba(30,41,59,0.8)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
              add_numbers.cpp
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#4f46e5", fontWeight: 600,
              background: "rgba(79,70,229,0.15)", padding: "2px 10px", borderRadius: 4 }}>
              C++
            </span>
          </div>

          {/* Code + Chat side by side */}
          <div style={{ display: "flex" }}>
            <div style={{ flex: 1, padding: "20px 24px", fontFamily: "'Fira Code',monospace", fontSize: 13, lineHeight: 1.8, textAlign: "left" }}>
              <div><span style={{ color: "#818cf8" }}>#include</span> <span style={{ color: "#34d399" }}>&lt;iostream&gt;</span></div>
              <div style={{ height: 8 }} />
              <div><span style={{ color: "#818cf8" }}>int</span> <span style={{ color: "#60a5fa" }}>main</span><span style={{ color: "#f1f5f9" }}>()</span> <span style={{ color: "#f1f5f9" }}>{"{"}</span></div>
              <div style={{ paddingLeft: 24 }}><span style={{ color: "#818cf8" }}>int</span> <span style={{ color: "#f1f5f9" }}>a</span><span style={{ color: "#94a3b8" }}>,</span> <span style={{ color: "#f1f5f9" }}>b</span><span style={{ color: "#f1f5f9" }}>;</span></div>
              <div style={{ paddingLeft: 24 }}><span style={{ color: "#64748b" }}>// get two numbers from user</span></div>
              <div style={{ paddingLeft: 24 }}><span style={{ color: "#f1f5f9" }}>std::cin</span> <span style={{ color: "#94a3b8" }}>&gt;&gt;</span> <span style={{ color: "#f1f5f9" }}>a</span> <span style={{ color: "#94a3b8" }}>&gt;&gt;</span> <span style={{ color: "#f1f5f9" }}>b</span><span style={{ color: "#f1f5f9" }}>;</span></div>
              <div style={{ paddingLeft: 24 }}><span style={{ color: "#f1f5f9" }}>std::cout</span> <span style={{ color: "#94a3b8" }}>&lt;&lt;</span> <span style={{ color: "#34d399" }}>"Sum: "</span> <span style={{ color: "#94a3b8" }}>&lt;&lt;</span> <span style={{ color: "#f1f5f9" }}>a</span><span style={{ color: "#94a3b8" }}>+</span><span style={{ color: "#f1f5f9" }}>b</span><span style={{ color: "#f1f5f9" }}>;</span></div>
              <div><span style={{ color: "#f1f5f9" }}>{"}"}</span></div>
            </div>

            {/* Chat panel preview */}
            <div style={{
              width: 220, borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: "16px 14px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                background: "rgba(79,70,229,0.15)", borderRadius: 8, padding: "8px 10px",
                fontSize: 12, color: "#a5b4fc",
              }}>
                🤖 <strong>AI:</strong> I can optimize this to handle overflow safely…
              </div>
              <div style={{
                background: "rgba(99,102,241,0.25)", borderRadius: 8, padding: "8px 10px",
                fontSize: 12, color: "#e2e8f0", alignSelf: "flex-end",
              }}>
                @ai add input validation
              </div>
              <div style={{
                background: "rgba(15,23,42,0.6)", borderRadius: 8, padding: "8px 10px",
                fontSize: 12, color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                👤 <strong>alice:</strong> looks good, let's run it
              </div>
            </div>
          </div>

          {/* Terminal strip */}
          <div style={{
            padding: "10px 24px",
            background: "#0d1117",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "monospace", fontSize: 12,
            display: "flex", gap: 16, alignItems: "center",
          }}>
            <span style={{ color: "#f0c040" }}>$ </span>
            <span style={{ color: "#4ade80" }}>Sum: 42</span>
            <span style={{ color: "#64748b", marginLeft: "auto" }}>Process exited 0</span>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "center",
        gap: "clamp(32px,8vw,96px)", padding: "48px 24px",
        background: "rgba(99,102,241,0.04)",
        borderTop: "1px solid rgba(99,102,241,0.1)",
        borderBottom: "1px solid rgba(99,102,241,0.1)",
        flexWrap: "wrap",
      }}>
        <StatBadge value="40+"  label="Languages supported" />
        <StatBadge value="∞"    label="Files per project" />
        <StatBadge value="Real‑time" label="Collaboration" />
        <StatBadge value="Free" label="No API key needed" />
      </div>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={S.sectionLabel}>Features</div>
          <h2 style={S.sectionTitle}>Everything your team needs</h2>
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>
            Built for developers who want to move fast, collaborate deeply, and ship confidently.
          </p>
        </div>

        <div style={S.grid3}>
          <FeatureCard delay={0}   icon="🤖" title="Gemini AI pair-programmer"
            desc="Ask @ai anything in chat. It writes code, explains concepts, refactors files, and pushes updates directly to the shared editor." />
          <FeatureCard delay={60}  icon="⚡" title="Real-time collaboration"
            desc="Everyone on the team sees code changes and chat messages instantly — no refresh, no lag, no conflicts." />
          <FeatureCard delay={120} icon="▶️" title="Multi-language execution"
            desc="Run C++, Java, Python, Go, Rust, TypeScript, and 30+ more directly in the browser terminal. No setup required." />
          <FeatureCard delay={180} icon="📁" title="Smart file explorer"
            desc="AI-generated files are organised into a VS Code–style tree. Delete, rename, or open any file with one click." />
          <FeatureCard delay={240} icon="🔗" title="Invite codes"
            desc="Share a unique invite link with your team. Anyone with the code can join the project instantly." />
          <FeatureCard delay={300} icon="🔒" title="JWT + Redis auth"
            desc="Secure token-based authentication with Redis-backed token blacklisting on logout. Your code stays private." />
        </div>
      </section>

      <div style={S.divider} />

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how" style={S.section}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64,
          alignItems: "center",
        }}
          className="how-grid"
        >
          <div>
            <div style={S.sectionLabel}>How it works</div>
            <h2 style={S.sectionTitle}>From idea to running code in minutes</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 36 }}>
              <StepCard num={1} title="Create a project"
                desc="Name your workspace. An invite code is generated automatically." />
              <StepCard num={2} title="Add collaborators"
                desc="Share the invite code with your team. They join with one click." />
              <StepCard num={3} title="Ask the AI"
                desc="Type @ai generate a REST API in Express and watch files appear in the editor." />
              <StepCard num={4} title="Run immediately"
                desc="Hit ▶ Run — the code executes in the integrated terminal. Output appears for everyone." />
            </div>
          </div>

          {/* Right: terminal mockup */}
          <div style={{
            borderRadius: 16,
            border: "1px solid rgba(99,102,241,0.2)",
            overflow: "hidden",
            boxShadow: "0 0 60px rgba(99,102,241,0.1)",
          }}>
            <div style={{
              background: "#1e293b", padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>⬛ TERMINAL</span>
            </div>
            <div style={{ background: "#0d1117", padding: "20px 20px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
              {[
                { c: "#f0c040", t: "$ @ai generate a Python fibonacci function" },
                { c: "#64748b", t: "🤖 Generating..." },
                { c: "#4ade80", t: "✅ fibonacci.py created (12 lines)" },
                { c: "#f0c040", t: "$ Run: fibonacci.py" },
                { c: "#7dd3fc", t: "🔧 Piston (python 3.10.0)..." },
                { c: "#d1d5db", t: "── Output ──────────────" },
                { c: "#d1d5db", t: "0 1 1 2 3 5 8 13 21 34 55" },
                { c: "#4ade80", t: "Process exited with code 0" },
              ].map((l, i) => (
                <div key={i} style={{ color: l.c }}>{l.t}</div>
              ))}
              <span style={{ color: "#4ade80" }} className="animate-pulse">█</span>
            </div>
          </div>
        </div>
      </section>

      <div style={S.divider} />

      {/* ── Languages ──────────────────────────────────────────────────── */}
      <section id="languages" style={S.section}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={S.sectionLabel}>Languages</div>
          <h2 style={S.sectionTitle}>Run anything</h2>
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>
            40+ languages supported via Piston. No compiler needed. No Docker required.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {[
            ["C++", "#60a5fa"], ["Java", "#f59e0b"], ["Python", "#34d399"],
            ["JavaScript", "#f0c040"], ["TypeScript", "#818cf8"], ["Go", "#22d3ee"],
            ["Rust", "#fb923c"], ["Ruby", "#f472b6"], ["PHP", "#a78bfa"],
            ["Kotlin", "#e879f9"], ["Swift", "#60a5fa"], ["C#", "#4ade80"],
            ["Bash", "#94a3b8"], ["Scala", "#f87171"], ["Haskell", "#c084fc"],
            ["Lua", "#7dd3fc"], ["Perl", "#fbbf24"], ["R", "#34d399"],
            ["C", "#60a5fa"], ["HTML/CSS", "#f97316"],
          ].map(([name, color]) => (
            <LangPill key={name} name={name} color={color} />
          ))}
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 24px" }}>
        <div style={{
          maxWidth: 680, margin: "0 auto", textAlign: "center",
          padding: "64px 40px",
          background: "linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.12))",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 24,
          boxShadow: "0 0 80px rgba(99,102,241,0.1)",
        }}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 16 }}>
            Ready to ship{" "}
            <span style={S.grad}>10× faster?</span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
            Create your free account in 30 seconds. No credit card required.
          </p>
          <button
            style={{
              padding: "16px 48px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              color: "white", fontSize: 17, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 0 48px rgba(99,102,241,0.45)",
              transition: "all 0.2s",
            }}
            onClick={() => navigate("/register")}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 0 64px rgba(99,102,241,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 0 48px rgba(99,102,241,0.45)"; }}
          >
            Get started free →
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>💎</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#818cf8" }}>GemChat</span>
        </div>
        <span style={{ color: "#334155", fontSize: 13 }}>
          AI-powered collaborative coding platform
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <button onClick={() => navigate("/login")} style={{
            background: "none", border: "none", color: "#64748b",
            fontSize: 13, cursor: "pointer",
          }}>Sign in</button>
          <button onClick={() => navigate("/register")} style={{
            background: "none", border: "none", color: "#64748b",
            fontSize: 13, cursor: "pointer",
          }}>Sign up</button>
        </div>
      </footer>
    </div>
  );
};

export default Landing;