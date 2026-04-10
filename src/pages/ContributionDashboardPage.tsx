import React, { useState, useEffect } from "react";
import '../pathscribe.css';
import { useAuth } from "@contexts/AuthContext";
import { WarningIcon } from "@components/Icons";
import CaseSearchBar from "@components/Search/CaseSearchBar";
import FlagRow        from "@components/Dashboards/FlagRow";
import CaseMixTile    from "@components/Dashboards/CaseMixTile";
import ProductivityTab from "./ProductivityTab";
import QualityTab      from "./QualityTab";
import AIContributionTab from "./AIContributionTab";
import { pathscribeTheme as t } from "@theme/pathscribeTheme";
import type {
  ContributionFlag,
  CaseMixData,
  KpiTile,
} from "../types/ContributionDashboard";
import { getOrchestratorMode } from "@components/Config/NarrativeTemplates";
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../constants/systemActions';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockKpis: KpiTile[] = [
  { label: "CASE_LABEL_PLACEHOLDER",  value: 128,  unit: "",      delta: "+12%",     up: true,  icon: "✓"  },
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
  //const navigate = useNavigate();
  const { user } = useAuth();
  

  const [activeTab,           setActiveTab]           = useState<DashboardTab>("overview");
  const finalCaseLabel = getOrchestratorMode() ? "Cases Signed Out" : "Cases Finalised";


  // ── Voice: set WORKLIST context on mount ──────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  return (
    <div style={{ padding: "32px", color: t.colors.text.primary, overflowY: "auto", height: "100%" }}>

      {/* ─── Page Title ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: t.colors.text.primary, margin: 0, letterSpacing: "-0.5px" }}>
          Contribution Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: t.colors.text.muted, marginTop: "4px" }}>
          {user?.name} · Pathologist
        </p>
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
                  <span style={{ fontSize: "13px", color: t.colors.text.muted }}>
                  {kpi.label === "CASE_LABEL_PLACEHOLDER" ? finalCaseLabel : kpi.label}
                </span>
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

      {/* ─── Modals ──────────────────────────────────────────────────────── */}    </div>
  );
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
export default ContributionDashboardPage;
