import { useEffect, useState } from "react";
import './pathscribe.css';
import SunCalc from "suncalc";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

type ThemeMode = "light" | "dark" | "auto" | "scheduled";

// Standard Eye Icons using SVGs
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [theme, setTheme] = useState<ThemeMode>("auto");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [pauseAnimation, setPauseAnimation] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setCardVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme-mode") as ThemeMode | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      if (theme === "light") return setResolvedTheme("light");
      if (theme === "dark") return setResolvedTheme("dark");

      if (theme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return setResolvedTheme(prefersDark ? "dark" : "light");
      }

      if (theme === "scheduled") {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const times = SunCalc.getTimes(new Date(), latitude, longitude);
            const now = new Date();
            const isNight = now < times.sunrise || now > times.sunset;
            setResolvedTheme(isNight ? "dark" : "light");
          },
          () => {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setResolvedTheme(prefersDark ? "dark" : "light");
          }
        );
      }
    };
    applyTheme();
  }, [theme]);

  const isDark = resolvedTheme === "dark";
  const watermarkOpacity = pauseAnimation ? 0.06 : isDark ? 0.12 : 0.14;
  const watermarkBrightness = pauseAnimation ? "brightness(120%)" : isDark ? "brightness(180%)" : "brightness(240%)";
  const logoSrc = isDark ? "/pathscribe-logo.svg" : "/pathscribe-logo.svg";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate("/");
  }

  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: `url('/main_background.jpg')`, backgroundSize: "cover", backgroundPosition: "center",
      position: "relative", overflow: "hidden", fontFamily: "sans-serif"
    }}>
      <style>{`
        @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes cardFadeIn { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes modalFadeIn { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* OVERLAY & WATERMARK */}
      <div style={{ position: "absolute", inset: 0, background: isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.1)" }} />
      <img src={logoSrc} alt="Watermark" style={{ position: "absolute", top: "50%", left: "50%", width: "150px", height: "150px", opacity: watermarkOpacity, filter: watermarkBrightness, transform: "translate(-50%, -50%)", animation: pauseAnimation ? "none" : "spin 20s linear infinite", pointerEvents: "none" }} />

      {/* HELP BUTTON */}
      <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 20 }}>
        <button onClick={() => setShowAbout(true)} style={{ width: "32px", height: "32px", borderRadius: "999px", border: isDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.15)", background: isDark ? "rgba(30,41,59,0.7)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)", cursor: "pointer", color: isDark ? "#fff" : "#000", fontWeight: 600 }}>?</button>
      </div>

      {/* CENTERED CARD */}
      <div style={{
        width: "100%", maxWidth: "400px", 
        background: isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.88)",
        padding: "40px", borderRadius: "16px", 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(12px)", zIndex: 10,
        opacity: cardVisible ? 1 : 0, transform: cardVisible ? "translateY(0)" : "translateY(20px)",
        animation: "cardFadeIn 0.8s ease-out forwards", boxSizing: "border-box"
      }}>
        <div style={{ width: "100%", marginBottom: "30px", display: "flex", justifyContent: "center" }}>
          <img src={logoSrc} alt="pathscribe AI" style={{ height: "80px", width: "auto" }} />
        </div>

        <form onSubmit={handleLogin}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569" }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setPauseAnimation(true)} onBlur={() => setPauseAnimation(false)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", background: isDark ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.5)", color: isDark ? "#fff" : "#000", marginBottom: "16px", outline: "none", boxSizing: "border-box" }} />

          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 500, color: isDark ? "#cbd5e1" : "#475569" }}>Password</label>
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPauseAnimation(true)} onBlur={() => setPauseAnimation(false)}
              style={{ width: "100%", padding: "12px", paddingRight: "45px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", background: isDark ? "rgba(15,23,42,0.5)" : "rgba(255,255,255,0.5)", color: isDark ? "#fff" : "#000", outline: "none", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "#94a3b8" : "#64748b" }}>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontWeight: 600, cursor: "pointer", marginBottom: "16px" }}>Sign In</button>
          
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <a href="#" style={{ fontSize: "13px", color: isDark ? "#60a5fa" : "#2563eb", textDecoration: "none" }}>Forgot password?</a>
          </div>

          <div style={{ margin: "20px 0", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }} />
              <span style={{ opacity: 0.7, fontSize: "13px", color: isDark ? "#94a3b8" : "#64748b" }}>or continue with</span>
              <div style={{ flex: 1, height: "1px", background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button type="button" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", color: isDark ? "#fff" : "#000" }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.02 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.39-4.5H24v9h12.85c-.56 2.85-2.23 5.26-4.73 6.88l7.32 5.68C43.82 37.43 46.5 31.39 46.5 24.5z"/><path fill="#FBBC05" d="M10.54 28.41c-.48-1.43-.75-2.96-.75-4.41s.27-2.98.75-4.41l-7.98-6.19C.92 16.03 0 19.91 0 24c0 4.09.92 7.97 2.56 11.59l7.98-6.18z"/><path fill="#34A853" d="M24 48c6.47 0 11.9-2.38 15.98-6.47l-7.32-5.68C30.71 37.78 27.54 39 24 39c-6.26 0-11.57-3.52-13.46-8.91l-7.98 6.18C6.51 42.62 14.62 48 24 48z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", color: isDark ? "#fff" : "#000" }}>
                <svg width="18" height="18" viewBox="0 0 23 23"><rect width="10" height="10" fill="#F35325"/><rect x="13" width="10" height="10" fill="#81BC06"/><rect y="13" width="10" height="10" fill="#05A6F0"/><rect x="13" y="13" width="10" height="10" fill="#FFBA08"/></svg>
                <span>Microsoft</span>
              </button>
          </div>
        </form>

        <p style={{ marginTop: "32px", textAlign: "center", fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b" }}>
          Your credentials are never stored by pathscribe<sup style={{ color: "#0891B2", fontWeight: 800 }}>AI</sup>.
        </p>
      </div>

      {/* ABOUT MODAL */}
      {showAbout && (
        <div onClick={() => setShowAbout(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "340px", padding: "32px", borderRadius: "16px", background: isDark ? "#1e293b" : "#fff", color: isDark ? "#fff" : "#000", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", animation: "modalFadeIn 0.3s ease" }}>
            <h2 style={{ marginBottom: "10px" }}>pathscribe AI</h2>
            <p style={{ opacity: 0.8, fontSize: "14px" }}>Version 0.9.0 | Build: 2026‑02‑11</p>
            <p style={{ opacity: 0.8, fontSize: "14px", margin: "10px 0" }}>&copy; 2026 pathscribe Team</p>
            <button onClick={() => setShowAbout(false)} style={{ marginTop: "24px", width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
