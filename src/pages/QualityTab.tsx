import React, { useState } from "react";
import '../pathscribe.css';
import { pathscribeTheme as t } from "@theme/pathscribeTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high";
type DateRange = "30d" | "90d" | "ytd";

interface DiscordantCase {
  id: string; caseType: string; frozenDx: string; finalDx: string;
  delta: string; date: string; severity: Severity;
}
interface AmendedCase {
  id: string; caseType: string; reason: string; date: string; severity: Severity;
}
interface TATOutlier {
  id: string; caseType: string; tatDays: number; benchmark: number; date: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockDiscordant: DiscordantCase[] = [
  { id: "PSA-2024-1190", caseType: "Breast Core Bx",    frozenDx: "Atypical, favor benign", finalDx: "DCIS, low grade",         delta: "Upgraded",   date: "Aug 12", severity: "high"   },
  { id: "PSA-2024-1178", caseType: "Colon Polypectomy", frozenDx: "Adenoma, low-grade",     finalDx: "Adenoma, low-grade",       delta: "Concordant", date: "Aug 9",  severity: "low"    },
  { id: "PSA-2024-1165", caseType: "Thyroid Lobe",      frozenDx: "Follicular lesion",      finalDx: "Follicular carcinoma",     delta: "Upgraded",   date: "Aug 5",  severity: "medium" },
  { id: "PSA-2024-1142", caseType: "Lymph Node",        frozenDx: "Reactive",               finalDx: "Metastatic carcinoma",     delta: "Upgraded",   date: "Jul 28", severity: "high"   },
];

const mockAmended: AmendedCase[] = [
  { id: "PSA-2024-1201", caseType: "Prostate Bx",      reason: "Specimen labeling mismatch",     date: "Aug 14", severity: "high"   },
  { id: "PSA-2024-1185", caseType: "Skin Excision",    reason: "Margin status correction",        date: "Aug 11", severity: "medium" },
  { id: "PSA-2024-1170", caseType: "GI Biopsy",        reason: "Diagnosis clarification added",   date: "Aug 6",  severity: "low"    },
  { id: "PSA-2024-1155", caseType: "Breast Excision",  reason: "IHC results addended",            date: "Jul 31", severity: "low"    },
];

const mockTATOutliers: TATOutlier[] = [
  { id: "PSA-2024-1198", caseType: "Soft Tissue Mass",  tatDays: 9,  benchmark: 5, date: "Aug 13" },
  { id: "PSA-2024-1176", caseType: "Decalcified Bone",  tatDays: 12, benchmark: 7, date: "Aug 8"  },
  { id: "PSA-2024-1160", caseType: "Lymph Node Panel",  tatDays: 8,  benchmark: 5, date: "Aug 2"  },
];

const mockSummary = { discordant: 4, amended: 4, tatOutliers: 3, concordanceRate: 94.2 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityBadge = (s: Severity): React.CSSProperties => ({
  padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
  color:       s === "high" ? t.colors.semantic.warning : s === "medium" ? "#FDD663" : t.colors.text.muted,
  background:  s === "high" ? "rgba(249,115,22,0.12)"  : s === "medium" ? "rgba(253,214,99,0.1)" : "rgba(148,163,184,0.1)",
  border: `1px solid ${s === "high" ? "rgba(249,115,22,0.3)" : s === "medium" ? "rgba(253,214,99,0.25)" : "rgba(148,163,184,0.2)"}`,
});

const th: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600,
  color: t.colors.text.muted, textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: `1px solid ${t.colors.border.subtle}`, background: "rgba(255,255,255,0.02)",
};
const td: React.CSSProperties = {
  padding: "12px 12px", fontSize: "13px", color: t.colors.text.secondary,
  borderBottom: `1px solid rgba(255,255,255,0.04)`,
};
const card: React.CSSProperties = {
  borderRadius: "16px", border: `1px solid ${t.colors.tile.border}`,
  background: t.colors.tile.background, overflow: "hidden",
};

type Section = "discordant" | "amended" | "tat";

const QualityTab: React.FC = () => {
  const [section,   setSection]   = useState<Section>("discordant");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "6px", cursor: "pointer",
    border: `1px solid ${active ? t.colors.accentTealBorder : t.colors.border.subtle}`,
    background: active ? t.colors.accentTealSubtle : t.colors.button.subtle,
    color: active ? t.colors.accentTeal : t.colors.text.muted, transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Summary tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        {[
          { label: "Discordant Cases",   value: mockSummary.discordant,     unit: "",  color: t.colors.semantic.warning, icon: "⚠️" },
          { label: "Amended Reports",    value: mockSummary.amended,        unit: "",  color: "#FDD663",                 icon: "✏️" },
          { label: "TAT Outliers",       value: mockSummary.tatOutliers,    unit: "",  color: t.colors.chart.cases,      icon: "⏱️" },
          { label: "Concordance Rate",   value: mockSummary.concordanceRate, unit: "%", color: t.colors.semantic.success, icon: "✓"  },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px", borderRadius: "14px", background: t.colors.tile.background, border: `1px solid ${t.colors.tile.border}`, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: t.colors.text.muted }}>{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
              <span style={{ fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</span>
              {s.unit && <span style={{ fontSize: "13px", color: t.colors.text.muted }}>{s.unit}</span>}
            </div>
            <div style={{ fontSize: "11px", color: t.colors.text.muted }}>Last {dateRange}</div>
          </div>
        ))}
      </div>

      {/* ── Section nav + date range ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={btn(section === "discordant")} onClick={() => setSection("discordant")}>Frozen vs Final</button>
          <button style={btn(section === "amended")}    onClick={() => setSection("amended")}>Amended Reports</button>
          <button style={btn(section === "tat")}        onClick={() => setSection("tat")}>TAT Outliers</button>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["30d", "90d", "ytd"] as DateRange[]).map(r => (
            <button key={r} style={btn(dateRange === r)} onClick={() => setDateRange(r)}>{r.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Discordant diagnoses table ── */}
      {section === "discordant" && (
        <div style={card}>
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.colors.text.primary }}>Discordant Diagnoses</div>
            <div style={{ fontSize: "12px", color: t.colors.text.muted, marginTop: "2px", marginBottom: "12px" }}>
              Cases where frozen section and final diagnosis differ
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Case</th>
                <th style={th}>Type</th>
                <th style={th}>Frozen Dx</th>
                <th style={th}>Final Dx</th>
                <th style={th}>Delta</th>
                <th style={th}>Date</th>
                <th style={th}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {mockDiscordant.map(c => (
                <tr key={c.id}>
                  <td style={{ ...td, color: t.colors.accentTeal, fontWeight: 600 }}>{c.id}</td>
                  <td style={td}>{c.caseType}</td>
                  <td style={{ ...td, color: t.colors.text.muted }}>{c.frozenDx}</td>
                  <td style={{ ...td, color: t.colors.text.primary }}>{c.finalDx}</td>
                  <td style={td}>
                    <span style={{ color: c.delta === "Concordant" ? t.colors.semantic.success : t.colors.semantic.warning, fontWeight: 600, fontSize: "12px" }}>
                      {c.delta === "Concordant" ? "✓" : "↑"} {c.delta}
                    </span>
                  </td>
                  <td style={{ ...td, color: t.colors.text.muted }}>{c.date}</td>
                  <td style={td}><span style={severityBadge(c.severity)}>{c.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Amended reports table ── */}
      {section === "amended" && (
        <div style={card}>
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.colors.text.primary }}>Amended Reports</div>
            <div style={{ fontSize: "12px", color: t.colors.text.muted, marginTop: "2px", marginBottom: "12px" }}>
              Reports modified after initial sign-out
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Case</th>
                <th style={th}>Type</th>
                <th style={th}>Reason for Amendment</th>
                <th style={th}>Date</th>
                <th style={th}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {mockAmended.map(c => (
                <tr key={c.id}>
                  <td style={{ ...td, color: t.colors.accentTeal, fontWeight: 600 }}>{c.id}</td>
                  <td style={td}>{c.caseType}</td>
                  <td style={{ ...td, color: t.colors.text.primary }}>{c.reason}</td>
                  <td style={{ ...td, color: t.colors.text.muted }}>{c.date}</td>
                  <td style={td}><span style={severityBadge(c.severity)}>{c.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAT outliers table ── */}
      {section === "tat" && (
        <div style={card}>
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.colors.text.primary }}>Turnaround Time Outliers</div>
            <div style={{ fontSize: "12px", color: t.colors.text.muted, marginTop: "2px", marginBottom: "12px" }}>
              Cases exceeding benchmark TAT by case type
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Case</th>
                <th style={th}>Type</th>
                <th style={th}>Actual TAT</th>
                <th style={th}>Benchmark</th>
                <th style={th}>Over by</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {mockTATOutliers.map(c => (
                <tr key={c.id}>
                  <td style={{ ...td, color: t.colors.accentTeal, fontWeight: 600 }}>{c.id}</td>
                  <td style={td}>{c.caseType}</td>
                  <td style={{ ...td, color: t.colors.semantic.warning, fontWeight: 700 }}>{c.tatDays}d</td>
                  <td style={{ ...td, color: t.colors.text.muted }}>{c.benchmark}d</td>
                  <td style={td}>
                    <span style={{ color: t.colors.semantic.warning, fontWeight: 600 }}>+{c.tatDays - c.benchmark}d</span>
                  </td>
                  <td style={{ ...td, color: t.colors.text.muted }}>{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default QualityTab;
