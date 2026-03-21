import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Context/user.context";
import axios from "../Config/axios.config";
import { toast } from "react-toastify";

const Profile = () => {
  const navigate    = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const [username,        setUsername]        = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile,   setSavingProfile]   = useState(false);
  const [savingPassword,  setSavingPassword]  = useState(false);
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);

  // Hydrate from context / localStorage
  useEffect(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
    })();
    const u = user || stored;
    if (u?.username) setUsername(u.username);
    else if (u?.email) setUsername(u.email.split("@")[0]);
  }, [user]);

  const email = user?.email || (() => {
    try { return JSON.parse(localStorage.getItem("user"))?.email; } catch { return ""; }
  })();

  // Password strength
  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8)          s++;
    if (/[0-9]/.test(newPassword))        s++;
    if (/[!@#$%^&*]/.test(newPassword))   s++;
    if (newPassword.length >= 12)         s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#4ade80"][strength];

  // Save username
  const saveUsername = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSavingProfile(true);
    try {
      const res = await axios.put("/users/profile", { username: username.trim() });
      // Update context + localStorage with fresh data + new token
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      toast.success("Username updated!", { position: "top-center", autoClose: 1500 });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update username", {
        position: "top-center",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save password
  const savePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match", { position: "top-center" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await axios.put("/users/profile", { currentPassword, newPassword });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed!", { position: "top-center", autoClose: 1500 });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password", {
        position: "top-center",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const S = {
    page: {
      minHeight: "100vh", background: "#030712",
      fontFamily: "'Inter', system-ui, sans-serif", color: "#f1f5f9",
    },
    nav: {
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(3,7,18,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "0 28px", height: 60,
      display: "flex", alignItems: "center", gap: 14,
    },
    main: { maxWidth: 600, margin: "0 auto", padding: "40px 24px" },
    card: {
      background: "rgba(15,23,42,0.9)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: 16, padding: "28px 28px",
      marginBottom: 20,
    },
    cardTitle: {
      color: "#f1f5f9", fontWeight: 700, fontSize: 16, marginBottom: 4,
    },
    cardSub: { color: "#64748b", fontSize: 13, marginBottom: 22, lineHeight: 1.5 },
    label: { display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 6 },
    input: {
      width: "100%", padding: "11px 14px",
      background: "rgba(30,41,59,0.8)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: 9, color: "#f1f5f9", fontSize: 14,
      outline: "none", boxSizing: "border-box",
      transition: "border-color 0.2s, box-shadow 0.2s",
      fontFamily: "inherit", marginBottom: 14,
    },
    inputWrap: { position: "relative" },
    eyeBtn: {
      position: "absolute", right: 12, top: 11,
      background: "none", border: "none", color: "#64748b",
      cursor: "pointer", fontSize: 15, padding: 0,
    },
    btn: {
      padding: "11px 28px", borderRadius: 9, border: "none",
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      color: "white", fontSize: 14, fontWeight: 700,
      cursor: "pointer", boxShadow: "0 0 20px rgba(99,102,241,0.3)",
      transition: "all 0.2s", fontFamily: "inherit",
    },
    disabledBtn: {
      padding: "11px 28px", borderRadius: 9, border: "none",
      background: "#334155", color: "#64748b",
      fontSize: 14, fontWeight: 700,
      cursor: "not-allowed", fontFamily: "inherit",
    },
    avatar: {
      width: 64, height: 64, borderRadius: "50%",
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, fontWeight: 800, marginBottom: 12,
      boxShadow: "0 0 24px rgba(99,102,241,0.4)",
    },
  };

  const focusStyle = {
    borderColor: "rgba(99,102,241,0.6)",
    boxShadow: "0 0 0 3px rgba(99,102,241,0.12)",
  };
  const blurStyle = {
    borderColor: "rgba(99,102,241,0.2)",
    boxShadow: "none",
  };

  const displayName = username || email?.split("@")[0] || "?";
  const initial     = displayName.charAt(0).toUpperCase();

  return (
    <div style={S.page}>

      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          💎
        </div>
        <span style={{
          fontSize: 18, fontWeight: 800,
          background: "linear-gradient(90deg,#818cf8,#c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          GemChat
        </span>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginLeft: "auto", padding: "7px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
      </nav>

      <main style={S.main}>

        {/* Avatar + greeting */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ ...S.avatar, margin: "0 auto 12px" }}>{initial}</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {displayName}
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>{email}</p>
        </div>

        {/* ── Username card ─────────────────────────────────────────────────── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Display name</h2>
          <p style={S.cardSub}>
            This is the name shown in chat messages and member lists. Change it any time.
          </p>
          <form onSubmit={saveUsername}>
            <label style={S.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. cooldev42"
              maxLength={30}
              minLength={2}
              required
              style={S.input}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
            <p style={{ color: "#334155", fontSize: 11, marginTop: -10, marginBottom: 18 }}>
              2–30 characters. Letters, numbers, underscores are fine.
            </p>
            <button
              type="submit"
              disabled={savingProfile}
              style={savingProfile ? S.disabledBtn : S.btn}
              onMouseEnter={e => { if (!savingProfile) e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
            >
              {savingProfile ? "Saving…" : "Save username"}
            </button>
          </form>
        </div>

        {/* ── Password card ─────────────────────────────────────────────────── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Change password</h2>
          <p style={S.cardSub}>
            You must enter your current password to set a new one.
          </p>
          <form onSubmit={savePassword}>
            {/* Current password */}
            <label style={S.label}>Current password</label>
            <div style={S.inputWrap}>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                required
                style={{ ...S.input, paddingRight: 40 }}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
              <button type="button" style={S.eyeBtn}
                onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? "🙈" : "👁"}
              </button>
            </div>

            {/* New password */}
            <label style={S.label}>
              New password
              {newPassword && (
                <span style={{ marginLeft: 8, color: strengthColor, fontSize: 11, fontWeight: 700 }}>
                  {strengthLabel}
                </span>
              )}
            </label>
            <div style={S.inputWrap}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 number, 1 special char"
                required
                style={{ ...S.input, paddingRight: 40 }}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
              <button type="button" style={S.eyeBtn}
                onClick={() => setShowNew(v => !v)}>
                {showNew ? "🙈" : "👁"}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword && (
              <div style={{
                height: 3, borderRadius: 2, marginTop: -10, marginBottom: 14,
                background: "#1e293b", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(strength / 4) * 100}%`,
                  background: strengthColor,
                  transition: "width 0.3s, background 0.3s",
                }} />
              </div>
            )}

            {/* Confirm */}
            <label style={S.label}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              style={{
                ...S.input,
                borderColor: confirmPassword && newPassword !== confirmPassword
                  ? "#ef4444" : undefined,
              }}
              onFocus={e => Object.assign(e.target.style, focusStyle)}
              onBlur={e  => Object.assign(e.target.style, blurStyle)}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: -10, marginBottom: 14 }}>
                Passwords do not match
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              style={savingPassword ? S.disabledBtn : S.btn}
              onMouseEnter={e => { if (!savingPassword) e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
            >
              {savingPassword ? "Saving…" : "Change password"}
            </button>
          </form>
        </div>

        {/* ── Danger zone ───────────────────────────────────────────────────── */}
        <div style={{
          ...S.card,
          border: "1px solid rgba(239,68,68,0.25)",
          background: "rgba(127,29,29,0.08)",
        }}>
          <h2 style={{ ...S.cardTitle, color: "#f87171" }}>Danger zone</h2>
          <p style={S.cardSub}>
            Signing out will invalidate your current session and clear local storage.
          </p>
          <button
            onClick={async () => {
              try { await axios.get("/users/logout"); } catch { /* ignore */ }
              setUser(null);
              navigate("/login");
            }}
            style={{
              padding: "10px 24px", borderRadius: 9,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(239,68,68,0.12)"; }}
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;