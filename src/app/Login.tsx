import { useEffect, useState } from "react";
import SunCalc from "suncalc";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type ThemeMode = "light" | "dark" | "auto" | "scheduled";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [theme, setTheme] = useState<ThemeMode>("auto");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [pauseAnimation, setPauseAnimation] = useState(false);
  const [themeNotice, setThemeNotice] = useState("");
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
    localStorage.setItem("theme-mode", theme);
  }, [theme]);

  useEffect(() => {
    const applyTheme = () => {
      if (theme === "light") return setResolvedTheme("light");
      if (theme === "dark") return setResolvedTheme("dark");

      if (theme === "auto") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
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
            setThemeNotice("");
          },
          () => {
            const prefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches;
            setResolvedTheme(prefersDark ? "dark" : "light");
            setThemeNotice(
              "We couldn’t determine your location, so we’re using your system theme."
            );
          }
        );
      }
    };

    applyTheme();
  }, [theme]);

  const isDark = resolvedTheme === "dark";

  const watermarkOpacity = pauseAnimation ? 0.06 : isDark ? 0.12 : 0.14;
  const watermarkBrightness = pauseAnimation
    ? "brightness(120%)"
    : isDark
    ? "brightness(180%)"
    : "brightness(240%)";

  const logoSrc = isDark
    ? "/pathscribe-logo-dark.svg"
    : "/pathscribe-logo.svg";

  const ThemeIconButton = ({
    mode,
    label,
    iconSrc,
    isSun
  }: {
    mode: ThemeMode;
    label: string;
    iconSrc: string;
    isSun?: boolean;
  }) => {
    const active = theme === mode;

    return (
      <button
        type="button"
        title={label}
        onClick={() => setTheme(mode)}
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "999px",
          border: active
            ? isDark
              ? "1px solid rgba(96,165,250,0.9)"
              : "1px solid rgba(37,99,235,0.9)"
            : "1px solid rgba(255,255,255,0.15)",
          background: isSun
            ? isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.14)"
            : isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.06)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          transition: "all 0.2s ease",
          boxShadow: active
            ? isDark
              ? "0 0 6px rgba(96,165,250,0.5)"
              : "0 0 6px rgba(37,99,235,0.35)"
            : isSun
            ? "inset 0 0 3px rgba(0,0,0,0.22)"
            : "none"
        }}
      >
        <img
          src={iconSrc}
          alt={label}
          style={{
            width: "18px",
            height: "18px",
            opacity: 1,
            filter: active
              ? "brightness(1.25)"
              : isSun
              ? "brightness(1.2)"
              : "brightness(1.15)",
            transition: "filter 0.2s ease"
          }}
        />
      </button>
    );
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate("/");
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: isDark
          ? "linear-gradient(135deg, #0f172a, #1e293b)"
          : "linear-gradient(135deg, #eef2ff, #f8fafc)",
        color: isDark ? "#e5e7eb" : "#111",
        position: "relative"
      }}
    >
      <style>
        {`
          @keyframes spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }

          @keyframes cardFadeIn {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes modalFadeIn {
            0% { opacity: 0; transform: scale(0.96); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      {/* LEFT PANEL */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          backgroundImage: `url('/main_background.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: "scale(1.06)"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isDark
              ? "linear-gradient(to bottom right, rgba(255,255,255,0.18), rgba(255,255,255,0.06))"
              : "linear-gradient(to bottom right, rgba(0,0,0,0.28), rgba(0,0,0,0.10))"
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isDark
              ? "radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.35))"
              : "radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.22))"
          }}
        />
        <img
          src={logoSrc}
          alt="Watermark"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "150px",
            height: "150px",
            opacity: watermarkOpacity,
            filter: watermarkBrightness,
            transform: "translate(-50%, -50%)",
            animation: pauseAnimation ? "none" : "spin 20s linear infinite",
            transition: "opacity 0.3s ease, filter 0.3s ease"
          }}
        />
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          width: "420px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            background: isDark
              ? "rgba(30,41,59,0.85)"
              : "rgba(255,255,255,0.85)",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: isDark
              ? "0 8px 24px rgba(0,0,0,0.45)"
              : "0 8px 24px rgba(0,0,0,0.12)",
            backdropFilter: "blur(10px)",
            opacity: cardVisible ? 1 : 0,
            transform: cardVisible ? "translateY(0)" : "translateY(20px)",
            animation: "cardFadeIn 0.6s ease forwards",
            boxSizing: "border-box"
          }}
        >
          <img
            src={logoSrc}
            alt="PathScribe AI"
            style={{
              width: "160px",
              display: "block",
              margin: "0 auto 16px"
            }}
          />

          <div
            style={{
              height: "1px",
              background: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.12)",
              marginBottom: "20px"
            }}
          />

          <form onSubmit={handleLogin}>
            <label style={{ display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              autoComplete="off"
              name="email"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setPauseAnimation(true)}
              onBlur={() => setPauseAnimation(false)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.25)"
                  : "1px solid rgba(0,0,0,0.25)",
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                color: isDark ? "#fff" : "#000",
                marginBottom: "16px",
                outline: "none",
                transition: "border 0.2s ease",
                boxSizing: "border-box"
              }}
            />

            <label style={{ display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <div
              style={{
                position: "relative",
                marginBottom: "20px",
                overflow: "hidden"
              }}
            >
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                name="password"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPauseAnimation(true)}
                onBlur={() => setPauseAnimation(false)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  paddingRight: "40px",
                  borderRadius: "6px",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(0,0,0,0.25)",
                  background: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  color: isDark ? "#fff" : "#000",
                  outline: "none",
                  transition: "border 0.2s ease",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isDark ? "#fff" : "#000",
                  opacity: 0.7
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "none",
                background: isDark
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "linear-gradient(135deg, #2563eb, #1e40af)",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.2s ease"
              }}
            >
              Sign In
            </button>

            <div
              style={{
                marginTop: "12px",
                textAlign: "right"
              }}
            >
              <a
                href="#"
                style={{
                  fontSize: "14px",
                  color: isDark ? "#93c5fd" : "#2563eb",
                  textDecoration: "none"
                }}
              >
                Forgot password?
              </a>
            </div>

            <div
              style={{
                margin: "20px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.12)"
                }}
              />
              <span style={{ opacity: 0.7 }}>or continue with</span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.12)"
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "8px"
              }}
            >
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(0,0,0,0.25)",
                  background: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.02 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.57-.14-3.08-.39-4.5H24v9h12.85c-.56 2.85-2.23 5.26-4.73 6.88l7.32 5.68C43.82 37.43 46.5 31.39 46.5 24.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.54 28.41c-.48-1.43-.75-2.96-.75-4.41s.27-2.98.75-4.41l-7.98-6.19C.92 16.03 0 19.91 0 24c0 4.09.92 7.97 2.56 11.59l7.98-6.18z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.47 0 11.9-2.38 15.98-6.47l-7.32-5.68C30.71 37.78 27.54 39 24 39c-6.26 0-11.57-3.52-13.46-8.91l-7.98 6.18C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(0,0,0,0.25)",
                  background: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 23 23">
                  <rect width="10" height="10" fill="#F35325" />
                  <rect x="13" width="10" height="10" fill="#81BC06" />
                  <rect y="13" width="10" height="10" fill="#05A6F0" />
                  <rect x="13" y="13" width="10" height="10" fill="#FFBA08" />
                </svg>
                <span>Sign in with Microsoft</span>
              </button>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                opacity: 0.7,
                marginTop: "4px"
              }}
            >
              Your credentials are never stored by PathScribe AI.
            </p>
          </form>
        </div>
      </div>

      {/* THEME SELECTOR + HELP ICON */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          zIndex: 20
        }}
      >
        <ThemeIconButton
          mode="light"
          label="Light Mode"
          iconSrc="/theme-sun.svg"
          isSun
        />
        <ThemeIconButton
          mode="dark"
          label="Dark Mode"
          iconSrc="/theme-moon.svg"
        />
        <ThemeIconButton
          mode="auto"
          label="Auto"
          iconSrc="/theme-auto.svg"
        />
        <ThemeIconButton
          mode="scheduled"
          label="Scheduled"
          iconSrc="/theme-schedule.svg"
        />

        <button
          onClick={() => setShowAbout(true)}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "999px",
            border: isDark
              ? "1px solid rgba(255,255,255,0.25)"
              : "1px solid rgba(0,0,0,0.25)",
            background: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isDark ? "#fff" : "#000",
            fontWeight: 600,
            fontSize: "16px"
          }}
        >
          ?
        </button>
      </div>

      {/* ABOUT MODAL */}
      {showAbout && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: isDark
              ? "rgba(0,0,0,0.55)"
              : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "360px",
              padding: "28px",
              borderRadius: "12px",
              background: isDark
                ? "rgba(30,41,59,0.55)"
                : "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.22)"
                : "1px solid rgba(0,0,0,0.18)",
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.55)"
                : "0 8px 24px rgba(0,0,0,0.18)",
              animation: "modalFadeIn 0.25s ease"
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
              PathScribe AI
            </h2>
            <p style={{ margin: "4px 0" }}>Version 0.9.0</p>
            <p style={{ margin: "4px 0" }}>Build: 2026‑02‑11</p>
            <p style={{ margin: "4px 0" }}>Environment: Internal Preview</p>

            <div
              style={{
                height: "1px",
                background: isDark
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(0,0,0,0.15)",
                margin: "16px 0"
              }}
            />

            <p style={{ margin: "4px 0" }}>
              Developed by the PathScribe AI Team
            </p>
            <p style={{ margin: "4px 0" }}>© 2026 PathScribe</p>

            {themeNotice && (
              <p
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  opacity: 0.8
                }}
              >
                {themeNotice}
              </p>
            )}

            <button
              onClick={() => setShowAbout(false)}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                background: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.12)",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
