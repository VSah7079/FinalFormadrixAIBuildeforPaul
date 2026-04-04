import React, { useState, useEffect } from "react";
import '../pathscribe.css';
import { useNavigate } from "react-router-dom";
import { useAuth } from "@contexts/AuthContext";
import { useLogout } from "@hooks/useLogout";
import {
  SunIcon,
  MoonIcon,
  HelpIcon,
  LogOutIcon,
  MonitorIcon,
  WarningIcon
} from "@components/Icons";
import CaseSearchBar from "@components/Search/CaseSearchBar";
import FlagRow        from "@components/Dashboards/FlagRow";
import CaseMixTile    from "@components/Dashboards/CaseMixTile";
import ProductivityTab from "./ProductivityTab";
import QualityTab      from "./QualityTab";
import AIContributionTab from "./AIContributionTab";
import { pathScribeTheme as t } from "@theme/pathscribeTheme";
import type {
  ContributionFlag,
  CaseMixData,
  KpiTile,
} from "../types/ContributionDashboard";
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../constants/systemActions';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockKpis: KpiTile[] = [
  { label: "Cases Signed Out",  value: 128,  unit: "",      delta: "+12%",     up: true,  icon: "✓"  },
  { label: "Cases In Progress", value: 14,   unit: "",      delta: "-3",       up: false, icon: "⏳" },
  { label: "AI‑Assisted Cases", value: 92,   unit: "",      delta: "+8%",      up: true,  icon: "🤖" },
  { label: "Avg TAT",           value: 27.4, unit: " hrs",  delta: "-2.1 hrs", up: true,  icon: "⚡" },
];

const mockCaseMixData: CaseMixData = {
  breast: 42,
  gi:     38,
  gu:     21,
  derm:   17,
  other:  12,
};



const mockQualityFlags: ContributionFlag[] = [
  { id: "PSA-2024-1182", label: "PSA-2024-1182", value: "Missing margin comment",     severity: "low"    },
  { id: "PSA-2024-1190", label: "PSA-2024-1190", value: "Discordant grade",           severity: "medium" },
  { id: "PSA-2024-1201", label: "PSA-2024-1201", value: "Specimen labeling mismatch", severity: "high"   },
];

// RVU last-30-days mock
const mockRvu30 = { total: 387, delta: "+6.2%", up: true, avgPerCase: 21.8 };

// Weekly mock (cases + RVUs per day)
interface DailyData { day: string; cases: number; rvus: number; }
const mockDaily: DailyData[] = [
  { day: "Mon", cases: 22, rvus: 70 },
  { day: "Tue", cases: 28, rvus: 89 },
  { day: "Wed", cases: 31, rvus: 99 },
  { day: "Thu", cases: 26, rvus: 83 },
  { day: "Fri", cases: 25, rvus: 80 },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

type DashboardTab = "overview" | "productivity" | "quality" | "ai";

const TAB_LABELS: Record<DashboardTab, string> = {
  overview:     "Overview",
  productivity: "Productivity",
  quality:      "Quality",
  ai:           "AI Contribution",
};

// ─── Inline Weekly Chart (Overview) ──────────────────────────────────────────

const WeeklyOverviewChart: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  // Single shared scale — bars reflect true relative magnitude across both series
  const maxC    = Math.max(...mockDaily.map(d => d.cases));
  const maxR    = Math.max(...mockDaily.map(d => d.rvus));
  const maxAll  = Math.max(maxC, maxR);
  const BAR_H   = 72; // max bar height px — the highest value across both series fills this

  return (
    <div style={{
      padding: "20px", borderRadius: "18px",
      background: t.colors.surfaceSubtle,
      border: `1px solid ${t.colors.border.subtle}`,
    }}>
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "15px", fontWeight: 600 }}>This Week</div>
        <div style={{ fontSize: "13px", color: t.colors.text.muted }}>Daily cases and RVUs — shared scale</div>
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        {mockDaily.map((d, i) => {
          const cH    = (d.cases / maxAll) * BAR_H;
          const rH    = (d.rvus  / maxAll) * BAR_H;
          const isHov = hovered === i;
          return (
            <div key={d.day}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            >
              {/* Always-visible totals above bars */}
              <div style={{ display: "flex", gap: "2px", width: "100%", justifyContent: "center", marginBottom: "3px" }}>
                <div style={{ width: "44%", textAlign: "center", fontSize: "10px", fontWeight: 700, color: t.colors.chart.cases }}>{d.cases}</div>
                <div style={{ width: "44%", textAlign: "center", fontSize: "10px", fontWeight: 700, color: t.colors.chart.rvu   }}>{d.rvus}</div>
              </div>

              {/* Bars */}
              <div style={{ width: "100%", height: `${BAR_H}px`, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "2px" }}>
                <div style={{ width: "44%", height: `${cH}px`, background: t.colors.chart.cases, borderRadius: "3px 3px 0 0", opacity: isHov ? 1 : 0.85, transition: "height 0.25s ease" }} />
                <div style={{ width: "44%", height: `${rH}px`, background: t.gradients.amberVertical, borderRadius: "3px 3px 0 0", opacity: isHov ? 1 : 0.85, transition: "height 0.25s ease" }} />
              </div>

              {/* Day label */}
              <div style={{ fontSize: "10px", color: t.colors.text.muted, marginTop: "4px" }}>{d.day}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: t.colors.chart.cases }} />
          <span style={{ fontSize: "11px", color: t.colors.text.muted }}>Cases</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: t.colors.chart.rvu }} />
          <span style={{ fontSize: "11px", color: t.colors.text.muted }}>RVUs</span>
        </div>
      </div>
    </div>
  );
};

// ─── RVU 30-day tile ──────────────────────────────────────────────────────────

const Rvu30Tile: React.FC = () => (
  <div style={{
    padding: "20px", borderRadius: "18px",
    background: t.colors.surfaceSubtle,
    border: `1px solid ${t.colors.border.subtle}`,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
      <span style={{ fontSize: "13px", color: t.colors.text.muted }}>RVUs — Last 30 Days</span>
      <span style={{ fontSize: "16px" }}>📊</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
      <span style={{ fontSize: "28px", fontWeight: 800, color: t.colors.text.primary }}>{mockRvu30.total}</span>
      <span style={{ fontSize: "13px", color: t.colors.text.muted }}>RVUs</span>
    </div>
    <div style={{ fontSize: "12px", fontWeight: 600, color: mockRvu30.up ? t.colors.semantic.success : t.colors.semantic.warning }}>
      {mockRvu30.up ? "▲" : "▼"} {mockRvu30.delta} vs prev 30d
    </div>
    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${t.colors.border.subtle}`, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: "12px", color: t.colors.text.muted }}>Avg / case</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: t.colors.chart.rvu }}>{mockRvu30.avgPerCase}</span>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ContributionDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout   = useLogout();

  const [activeTab,           setActiveTab]           = useState<DashboardTab>("overview");
  const [themeMode,           setThemeMode]           = useState<"light" | "dark" | "system">("dark");
  const [showProfileModal,    setShowProfileModal]    = useState(false);
  const [showQuickLinksModal, setShowQuickLinksModal] = useState(false);
  const [showWarningModal,    setShowWarningModal]    = useState(false);
  const [showAboutModal,      setShowAboutModal]      = useState(false);

  const applyThemeMode = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    if (mode === "system") document.documentElement.removeAttribute("data-theme");
    else                   document.documentElement.setAttribute("data-theme", mode);
  };

  // ── Voice: set WORKLIST context on mount ──────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  return (
    <div style={{ padding: "32px", color: t.colors.text.primary }}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "15px" }}>
          <span style={{ cursor: "pointer", color: t.colors.text.muted }}
            onClick={() => navigate("/")}
            onMouseEnter={e => (e.currentTarget.style.color = t.colors.accentTeal)}
            onMouseLeave={e => (e.currentTarget.style.color = t.colors.text.muted)}
          >Home</span>
          <span style={{ color: t.colors.text.muted }}>/</span>
          <span style={{ color: t.colors.text.primary, fontWeight: 600 }}>Contribution Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <div onClick={() => applyThemeMode("light")}  style={{ display: "inline-flex" }}><SunIcon     size={22} style={{ opacity: themeMode === "light"  ? 1 : 0.4, transition: "0.2s" }} /></div>
            <div onClick={() => applyThemeMode("dark")}   style={{ display: "inline-flex" }}><MoonIcon    size={22} style={{ opacity: themeMode === "dark"   ? 1 : 0.4, transition: "0.2s" }} /></div>
            <div onClick={() => applyThemeMode("system")} style={{ display: "inline-flex" }}><MonitorIcon size={22} style={{ opacity: themeMode === "system" ? 1 : 0.4, transition: "0.2s" }} /></div>
          </div>
          <div onClick={() => setShowAboutModal(true)} style={{ display: "inline-flex", cursor: "pointer" }}><HelpIcon   size={22} style={{ opacity: 0.7 }} /></div>
          <div onClick={logout} style={{ display: "inline-flex", cursor: "pointer" }}><LogOutIcon size={22} style={{ opacity: 0.7 }} /></div>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: t.colors.button.subtle, border: `1px solid ${t.colors.button.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 700 }}
            onClick={() => setShowProfileModal(true)}>
            {user?.name?.[0] ?? "U"}
          </div>
        </div>
      </div>

      {/* ─── Search ──────────────────────────────────────────────────────── */}
      <div data-capture-hide="true"><CaseSearchBar /></div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "24px", marginTop: "32px", marginBottom: "24px" }}>
        {(Object.keys(TAB_LABELS) as DashboardTab[]).map((tab) => (
          <div key={tab} style={{ paddingBottom: "8px", cursor: "pointer", fontWeight: 600,
            borderBottom: activeTab === tab ? `3px solid ${t.colors.accentTeal}` : "3px solid transparent",
            color: activeTab === tab ? t.colors.text.primary : t.colors.text.muted,
          }} onClick={() => setActiveTab(tab)}>
            {TAB_LABELS[tab]}
          </div>
        ))}
      </div>

      {/* ─── Overview Tab ────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* KPI row — 5 tiles including RVU */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "16px" }}>
            {mockKpis.map((kpi) => (
              <div key={kpi.label} style={{ padding: "16px", borderRadius: "16px", background: t.colors.surfaceSubtle, border: `1px solid ${t.colors.border.subtle}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: t.colors.text.muted }}>{kpi.label}</span>
                  <span style={{ fontSize: "16px" }}>{kpi.icon}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "22px", fontWeight: 700 }}>{kpi.value}</span>
                  {kpi.unit && <span style={{ fontSize: "13px", color: t.colors.text.muted }}>{kpi.unit}</span>}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: kpi.up ? t.colors.semantic.success : t.colors.semantic.warning }}>
                  {kpi.up ? "▲ " : "▼ "}{kpi.delta}
                </div>
              </div>
            ))}
            {/* RVU tile as 5th KPI */}
            <Rvu30Tile />
          </div>

          {/* Main content: 2-col */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr", gap: "24px" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Case Mix with counts */}
              <CaseMixTile
                title="Case Mix"
                data={mockCaseMixData}
                colors={t.colors.caseMix}
                showCounts={true}
              />

              {/* Weekly chart */}
              <WeeklyOverviewChart />
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Quality Flags */}
              <div style={{ padding: "20px", borderRadius: "18px", background: t.colors.surfaceSubtle, border: `1px solid ${t.colors.border.subtle}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600 }}>Quality Flags</div>
                    <div style={{ fontSize: "13px", color: t.colors.text.muted }}>Recent cases with documentation or concordance issues</div>
                  </div>
                  <WarningIcon size={18} style={{ color: t.colors.semantic.warning }} />
                </div>
                <div data-capture-hide="true" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {mockQualityFlags.map((flag) => (
                    <FlagRow key={flag.id} {...flag} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Productivity Tab ────────────────────────────────────────────── */}
      {activeTab === "productivity" && <ProductivityTab />}

      {/* ─── Quality Tab ─────────────────────────────────────────────────── */}
      {activeTab === "quality" && <div data-capture-hide="true"><QualityTab /></div>}

      {/* ─── AI Contribution Tab ─────────────────────────────────────────── */}
      {activeTab === "ai" && <AIContributionTab />}

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {showProfileModal && (
        <div style={overlayStyle} onClick={() => setShowProfileModal(false)}>
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            <h2 style={modalHeadingStyle}>Profile & Preferences</h2>
            <div style={{ marginBottom: "24px", color: t.colors.text.muted, fontSize: "14px" }}>
              Signed in as <strong style={{ color: t.colors.text.primary }}>{user?.email}</strong>
            </div>
            <button style={profileMenuBtnStyle} onClick={() => { setShowProfileModal(false); setShowQuickLinksModal(true); }}>Quick Links</button>
            <button style={profileMenuBtnStyle} onClick={() => { setShowProfileModal(false); setShowWarningModal(true);   }}>Unsaved Data Warning</button>
            <button style={profileMenuBtnStyle} onClick={() => { setShowProfileModal(false); setShowAboutModal(true);     }}>About PathScribe AI</button>
            <button style={{ ...closeBtnStyle, marginTop: "20px" }} onClick={() => setShowProfileModal(false)}>Close</button>
          </div>
        </div>
      )}
      {showQuickLinksModal && (
        <div style={overlayStyle} onClick={() => setShowQuickLinksModal(false)}>
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            <h2 style={modalHeadingStyle}>Quick Links</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button style={profileMenuBtnStyle} onClick={() => navigate("/")}>Home</button>
              <button style={profileMenuBtnStyle} onClick={() => navigate("/cases")}>Case List</button>
              <button style={profileMenuBtnStyle} onClick={() => navigate("/settings")}>Settings</button>
            </div>
            <button style={{ ...closeBtnStyle, marginTop: "20px" }} onClick={() => setShowQuickLinksModal(false)}>Close</button>
          </div>
        </div>
      )}
      {showWarningModal && (
        <div style={overlayStyle} onClick={() => setShowWarningModal(false)}>
          <div style={warningCardStyle} onClick={e => e.stopPropagation()}>
            <WarningIcon size={42} style={{ color: t.colors.semantic.warning, marginBottom: "16px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>Unsaved Changes</h2>
            <p style={{ fontSize: "14px", color: t.colors.text.muted, marginBottom: "24px" }}>You have unsaved changes. If you leave this page, your edits will be lost.</p>
            <button style={{ ...closeBtnStyle, background: "rgba(249,115,22,0.12)", border: `1px solid ${t.colors.semantic.warning}`, color: t.colors.semantic.warning, marginBottom: "12px" }} onClick={() => setShowWarningModal(false)}>Stay on Page</button>
            <button style={closeBtnStyle} onClick={() => { setShowWarningModal(false); navigate("/"); }}>Leave Page</button>
          </div>
        </div>
      )}
      {showAboutModal && (
        <div style={overlayStyle} onClick={() => setShowAboutModal(false)}>
          <div style={{ ...modalCardStyle, width: "460px" }} onClick={e => e.stopPropagation()}>
            <h2 style={modalHeadingStyle}>About PathScribe AI</h2>
            <p style={{ fontSize: "14px", color: t.colors.text.muted, marginBottom: "20px" }}>PathScribe AI is a next‑generation pathology reporting platform designed to streamline workflows, enhance diagnostic accuracy, and provide actionable insights through intelligent automation.</p>
            <p style={{ fontSize: "14px", color: t.colors.text.muted, marginBottom: "20px" }}>This dashboard provides a high‑level overview of your case activity, productivity, quality indicators, and AI‑assisted contributions.</p>
            <button style={closeBtnStyle} onClick={() => setShowAboutModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, backgroundColor: t.colors.overlay,
  backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
};
const modalCardStyle: React.CSSProperties = {
  width: "420px", backgroundColor: t.colors.background.base, padding: "32px",
  borderRadius: "24px", border: `1px solid ${t.colors.button.border}`,
  boxShadow: `0 25px 50px -12px ${t.colors.overlay}`,
};
const modalHeadingStyle: React.CSSProperties = { fontSize: "20px", fontWeight: 700, marginBottom: "16px" };
const warningCardStyle: React.CSSProperties = {
  width: "400px", backgroundColor: t.colors.background.base, padding: "40px",
  borderRadius: "28px", textAlign: "center", border: `1px solid ${t.colors.button.border}`,
  boxShadow: `0 25px 50px -12px ${t.colors.overlay}`,
};
const profileMenuBtnStyle: React.CSSProperties = {
  padding: "12px 16px", borderRadius: "10px", background: t.colors.button.subtle,
  border: `1px solid ${t.colors.button.border}`, color: t.colors.button.text,
  fontWeight: 600, fontSize: "15px", cursor: "pointer", width: "100%",
  transition: "all 0.2s", textAlign: "left", display: "flex", alignItems: "center", gap: "10px",
};
const closeBtnStyle: React.CSSProperties = {
  padding: "12px 24px", borderRadius: "10px", background: t.colors.accentTealSubtle,
  border: `1px solid ${t.colors.accentTealBorder}`, color: t.colors.accentTeal,
  fontWeight: 600, fontSize: "15px", cursor: "pointer", width: "100%", transition: "all 0.2s ease",
};

export default ContributionDashboardPage;
