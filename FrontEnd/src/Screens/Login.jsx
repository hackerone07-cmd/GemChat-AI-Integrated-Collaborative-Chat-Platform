import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../Context/user.context";
import axios from "../Config/axios.config";
import { toast } from "react-toastify";

const Login = () => {
  const navigate  = useNavigate();
  const { setUser } = useContext(UserContext);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await axios.post("/users/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      toast.success("Welcome back!", { position: "top-center", autoClose: 1500 });
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page: {
      minHeight: "100vh",
      background: "#030712",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "24px",
      position: "relative", overflow: "hidden",
    },
    glow: {
      position: "absolute", width: 480, height: 480, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)",
      top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      pointerEvents: "none",
    },
    card: {
      position: "relative", zIndex: 2,
      width: "100%", maxWidth: 420,
      background: "rgba(15,23,42,0.9)",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: 20, padding: "40px 36px",
      backdropFilter: "blur(16px)",
      boxShadow: "0 0 60px rgba(0,0,0,0.4)",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 32, justifyContent: "center",
    },
    logoBox: {
      width: 36, height: 36, borderRadius: 9,
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, boxShadow: "0 0 20px rgba(99,102,241,0.4)",
    },
    logoText: {
      fontSize: 20, fontWeight: 800,
      background: "linear-gradient(90deg,#818cf8,#c084fc)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    title: { color: "#f1f5f9", fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: "center" },
    sub:   { color: "#64748b", fontSize: 14, textAlign: "center", marginBottom: 32 },
    label: { display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6 },
    inputWrap: { position: "relative", marginBottom: 18 },
    input: {
      width: "100%", padding: "12px 16px",
      background: "rgba(30,41,59,0.8)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: 10, color: "#f1f5f9", fontSize: 14,
      outline: "none", boxSizing: "border-box",
      transition: "border-color 0.2s",
      fontFamily: "inherit",
    },
    eyeBtn: {
      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", color: "#64748b",
      cursor: "pointer", fontSize: 16, padding: 0,
      display: "flex", alignItems: "center",
    },
    btn: {
      width: "100%", padding: "13px",
      background: loading ? "#334155" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
      border: "none", borderRadius: 10, color: "white",
      fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      marginTop: 4,
      boxShadow: loading ? "none" : "0 0 32px rgba(99,102,241,0.35)",
      transition: "all 0.2s",
      fontFamily: "inherit",
    },
    divider: {
      display: "flex", alignItems: "center", gap: 12, margin: "24px 0",
    },
    divLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.08)" },
    divText: { color: "#475569", fontSize: 12 },
    footer: { textAlign: "center", marginTop: 24, color: "#475569", fontSize: 13 },
    link: { color: "#818cf8", textDecoration: "none", fontWeight: 600 },
  };

  const focusStyle  = { borderColor: "rgba(99,102,241,0.6)", boxShadow: "0 0 0 3px rgba(99,102,241,0.12)" };
  const blurStyle   = { borderColor: "rgba(99,102,241,0.2)", boxShadow: "none" };

  return (
    <div style={S.page}>
      <div style={S.glow} />
      <div style={S.card}>

        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoBox}>💎</div>
          <span style={S.logoText}>GemChat</span>
        </div>

        <h1 style={S.title}>Welcome back</h1>
        <p style={S.sub}>Sign in to your workspace</p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={S.inputWrap}>
            <label style={S.label}>Email address</label>
            <input
              type="email" value={email} required
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={S.input}
              onFocus={e  => Object.assign(e.target.style, focusStyle)}
              onBlur={e   => Object.assign(e.target.style, blurStyle)}
            />
          </div>

          {/* Password */}
          <div style={S.inputWrap}>
            <label style={S.label}>Password</label>
            <input
              type={showPass ? "text" : "password"} value={password} required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...S.input, paddingRight: 44 }}
              onFocus={e  => Object.assign(e.target.style, focusStyle)}
              onBlur={e   => Object.assign(e.target.style, blurStyle)}
            />
            <button type="button" style={S.eyeBtn} onClick={() => setShowPass(v => !v)}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>

          <button type="submit" style={S.btn} disabled={loading}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <div style={S.divider}>
          <div style={S.divLine} />
          <span style={S.divText}>New to GemChat?</span>
          <div style={S.divLine} />
        </div>

        <p style={S.footer}>
          <Link to="/register" style={S.link}>Create a free account</Link>
        </p>

        <p style={{ ...S.footer, marginTop: 16 }}>
          <Link to="/" style={{ ...S.link, color: "#475569", fontSize: 12 }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;