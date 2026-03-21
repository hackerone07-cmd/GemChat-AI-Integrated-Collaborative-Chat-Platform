import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../Context/user.context";
import axios from "../Config/axios.config";
import { toast } from "react-toastify";

const Register = () => {
  const navigate    = useNavigate();
  const { setUser } = useContext(UserContext);

  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Password strength
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)             s++;
    if (/[0-9]/.test(password))           s++;
    if (/[!@#$%^&*]/.test(password))      s++;
    if (password.length >= 12)            s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#4ade80"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required", { position: "top-center" });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/users/register", {
        email,
        password,
        username: username.trim(),
      });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      toast.success("Account created! Welcome to GemChat 🎉", {
        position: "top-center", autoClose: 2000,
      });
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed", {
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page: {
      minHeight: "100vh", background: "#030712",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "24px", position: "relative", overflow: "hidden",
    },
    glow: {
      position: "absolute", width: 560, height: 560, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(124,58,237,0.15) 0%,transparent 70%)",
      top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      pointerEvents: "none",
    },
    card: {
      position: "relative", zIndex: 2,
      width: "100%", maxWidth: 420,
      background: "rgba(15,23,42,0.9)",
      border: "1px solid rgba(124,58,237,0.25)",
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
    sub:   { color: "#64748b", fontSize: 14, textAlign: "center", marginBottom: 28 },
    label: { display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6 },
    hint:  { color: "#475569", fontSize: 11, marginTop: 4 },
    inputWrap: { position: "relative", marginBottom: 16 },
    input: {
      width: "100%", padding: "12px 16px",
      background: "rgba(30,41,59,0.8)",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 10, color: "#f1f5f9", fontSize: 14,
      outline: "none", boxSizing: "border-box",
      transition: "border-color 0.2s", fontFamily: "inherit",
    },
    eyeBtn: {
      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", color: "#64748b",
      cursor: "pointer", fontSize: 16, padding: 0,
    },
    btn: {
      width: "100%", padding: "13px",
      background: loading ? "#334155" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
      border: "none", borderRadius: 10, color: "white",
      fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      marginTop: 4, boxShadow: loading ? "none" : "0 0 32px rgba(99,102,241,0.35)",
      transition: "all 0.2s", fontFamily: "inherit",
    },
    footer: { textAlign: "center", marginTop: 20, color: "#475569", fontSize: 13 },
    link: { color: "#818cf8", textDecoration: "none", fontWeight: 600 },
  };

  const focusStyle = {
    borderColor: "rgba(124,58,237,0.6)",
    boxShadow: "0 0 0 3px rgba(124,58,237,0.12)",
  };
  const blurStyle = {
    borderColor: "rgba(124,58,237,0.2)",
    boxShadow: "none",
  };

  return (
    <div style={S.page}>
      <div style={S.glow} />
      <div style={S.card}>

        <div style={S.logo}>
          <div style={S.logoBox}>💎</div>
          <span style={S.logoText}>GemChat</span>
        </div>

        <h1 style={S.title}>Create your account</h1>
        <p style={S.sub}>Join thousands of developers building together</p>

        <form onSubmit={handleSubmit}>

          {/* Username — required */}
          <div style={S.inputWrap}>
            <label style={S.label}>
              Username <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. cooldev42"
              maxLength={30}
              minLength={2}
              required
              autoComplete="username"
              style={S.input}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
            <p style={S.hint}>2–30 characters. Shown in chat and member lists.</p>
          </div>

          {/* Email */}
          <div style={S.inputWrap}>
            <label style={S.label}>
              Email address <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={S.input}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
          </div>

          {/* Password */}
          <div style={S.inputWrap}>
            <label style={S.label}>
              Password <span style={{ color: "#ef4444" }}>*</span>
              {password && (
                <span style={{ marginLeft: 8, color: strengthColor, fontSize: 11, fontWeight: 700 }}>
                  {strengthLabel}
                </span>
              )}
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 chars, 1 number, 1 special char"
              required
              autoComplete="new-password"
              style={{ ...S.input, paddingRight: 44 }}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
            <button type="button" style={S.eyeBtn} onClick={() => setShowPass(v => !v)}>
              {showPass ? "🙈" : "👁"}
            </button>
            {password && (
              <div style={{ height: 3, borderRadius: 2, marginTop: 8,
                background: "#1e293b", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(strength / 4) * 100}%`,
                  background: strengthColor,
                  transition: "width 0.3s, background 0.3s",
                }} />
              </div>
            )}
          </div>

          <button type="submit" style={S.btn} disabled={loading}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}>
            {loading ? "Creating account…" : "Create account →"}
          </button>
        </form>

        <p style={S.footer}>
          Already have an account?{" "}
          <Link to="/login" style={S.link}>Sign in</Link>
        </p>
        <p style={{ ...S.footer, marginTop: 12 }}>
          <Link to="/" style={{ ...S.link, color: "#475569", fontSize: 12 }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;