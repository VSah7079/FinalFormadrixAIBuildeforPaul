import React, { useState } from "react";
import { pathscribeTheme as theme } from "@theme/pathscribeTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyData {
  month: string;
  cases: number;
  rvus: number;
  cumulativeRvus: number;
}


type ChartMetric = "cases" | "rvus" | "combined";
type DateRange   = "ytd" | "6m" | "3m" | "1m";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockMonthly: MonthlyData[] = [
  { month: "Jan", cases: 98,  rvus: 312, cumulativeRvus: 312  },
  { month: "Feb", cases: 112, rvus: 358, cumulativeRvus: 670  },
  { month: "Mar", cases: 105, rvus: 336, cumulativeRvus: 1006 },
  { month: "Apr", cases: 121, rvus: 387, cumulativeRvus: 1393 },
  { month: "May", cases: 118, rvus: 378, cumulativeRvus: 1771 },
  { month: "Jun", cases: 128, rvus: 409, cumulativeRvus: 2180 },
  { month: "Jul", cases: 115, rvus: 368, cumulativeRvus: 2548 },
  { month: "Aug", cases: 132, rvus: 422, cumulativeRvus: 2970 },
];


const mockPeerData = {
  you:      2970,
  peerAvg:  2640,
  topPerf:  3380,
  lastYear: 2510,
};

const mockRvuTile = {
  total:      2970,
  delta:      "+12.2%",
  up:         true,
  period:     "YTD 2025",
  avgPerCase: 22.4,
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: theme.colors.tile.background,
    border: `1px solid ${theme.colors.tile.border}`,
    borderRadius: "16px",
    padding: "20px",
    ...style,
  }}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ fontSize: "15px", fontWeight: 700, color: theme.colors.text.primary }}>{title}</div>
    {sub && <div style={{ fontSize: "12px", color: theme.colors.text.muted, marginTop: "2px" }}>{sub}</div>}
  </div>
);

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
    background: theme.colors.background.panel,
    border: `1px solid ${theme.colors.border.subtle}`,
    borderRadius: "8px", padding: "8px 12px", fontSize: "12px",
    color: theme.colors.text.secondary, whiteSpace: "nowrap", zIndex: 10,
    boxShadow: `0 4px 16px ${theme.colors.tile.shadow}`,
  }}>
    {children}
  </div>
);

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const BarChart: React.FC<{ data: MonthlyData[]; metric: ChartMetric }> = ({ data, metric }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxCases = Math.max(...data.map(d => d.cases));
  const maxRvus  = Math.max(...data.map(d => d.rvus));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "200px" }}>
      {data.map((d, i) => {
        const caseH = (d.cases / maxCases) * 160;
        const rvuH  = (d.rvus  / maxRvus)  * 160;
        const isHov = hovered === i;

        return (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: "pointer" }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHov && (
              <Tooltip>
                <div style={{ fontWeight: 700, color: theme.colors.text.primary, marginBottom: "4px" }}>{d.month}</div>
                {(metric === "cases" || metric === "combined") && <div style={{ color: theme.colors.chart.cases }}>Cases: {d.cases}</div>}
                {(metric === "rvus"  || metric === "combined") && <div style={{ color: theme.colors.chart.rvu   }}>RVUs: {d.rvus}</div>}
              </Tooltip>
            )}
            {/* Count labels above bars */}
            <div style={{ display: "flex", gap: "2px", marginBottom: "3px", justifyContent: "center", width: "100%" }}>
              {(metric === "cases" || metric === "combined") && (
                <div style={{ fontSize: "10px", fontWeight: 700, color: theme.colors.chart.cases, width: metric === "combined" ? "45%" : "70%", textAlign: "center" }}>{d.cases}</div>
              )}
              {(metric === "rvus" || metric === "combined") && (
                <div style={{ fontSize: "10px", fontWeight: 700, color: theme.colors.chart.rvu, width: metric === "combined" ? "45%" : "70%", textAlign: "center" }}>{d.rvus}</div>
              )}
            </div>
            <div style={{ width: "100%", height: "160px", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "2px" }}>
              {(metric === "cases" || metric === "combined") && (
                <div style={{ width: metric === "combined" ? "45%" : "70%", height: `${caseH}px`, background: theme.colors.chart.cases, borderRadius: "4px 4px 0 0", opacity: isHov ? 1 : 0.85, transition: "height 0.3s ease, opacity 0.15s" }} />
              )}
              {(metric === "rvus" || metric === "combined") && (
                <div style={{ width: metric === "combined" ? "45%" : "70%", height: `${rvuH}px`, background: theme.gradients.amberVertical, borderRadius: "4px 4px 0 0", opacity: isHov ? 1 : 0.85, transition: "height 0.3s ease, opacity 0.15s" }} />
              )}
            </div>
            <div style={{ fontSize: "11px", color: theme.colors.text.muted, marginTop: "6px" }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
};

// ─── YTD Line Chart ───────────────────────────────────────────────────────────

const LineChart: React.FC<{
  data: MonthlyData[];
  showPeer: boolean;
  showTop: boolean;
  showLastYear: boolean;
}> = ({ data, showPeer, showTop, showLastYear }) => {
  const W      = 100 / (data.length - 1);
  const maxVal = Math.max(mockPeerData.topPerf, ...data.map(d => d.cumulativeRvus));

  const toY = (v: number) => 5 + (1 - v / maxVal) * 90;
  const toX = (i: number) => i * W;

  const youLine  = data.map((d, i) => ({ x: toX(i), y: toY(d.cumulativeRvus) }));
  const peerLine = data.map((_, i) => ({ x: toX(i), y: toY(mockPeerData.peerAvg  * (i + 1) / data.length) }));
  const topLine  = data.map((_, i) => ({ x: toX(i), y: toY(mockPeerData.topPerf  * (i + 1) / data.length) }));
  const lastLine = data.map((_, i) => ({ x: toX(i), y: toY(mockPeerData.lastYear * (i + 1) / data.length) }));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Y-axis tick values: 5 evenly-spaced labels from 0 to maxVal
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(frac => ({
    value: Math.round(frac * maxVal / 100) * 100,
    y: toY(frac * maxVal),
  }));

  return (
    <div>
    <div style={{ display: "flex", gap: "4px" }}>
      {/* Y-axis labels */}
      <svg viewBox="0 0 12 110" style={{ width: "40px", height: "400px", flexShrink: 0, overflow: "visible" }}>
        {yTicks.map(tick => (
          <text key={tick.value} x="10" y={tick.y + 1} textAnchor="end" fontSize="4" fill={theme.colors.chart.axis}>
            {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value}
          </text>
        ))}
        <text x="4" y="55" textAnchor="middle" fontSize="3.5" fill={theme.colors.text.muted}
          transform="rotate(-90, 4, 55)">RVUs</text>
      </svg>

      {/* Main chart */}
      <svg viewBox="0 0 100 110" style={{ flex: 1, height: "400px", overflow: "visible" }}>
        {yTicks.map(tick => (
          <line key={tick.value} x1={0} y1={tick.y} x2={100} y2={tick.y} stroke={theme.colors.chart.gridline} strokeWidth="0.4" />
        ))}
        {showLastYear && <path d={makePath(lastLine)} fill="none" stroke={theme.colors.text.muted} strokeWidth="1" strokeDasharray="2 2" />}
        {showPeer     && <path d={makePath(peerLine)} fill="none" stroke={theme.colors.chart.cases} strokeWidth="1.2" strokeDasharray="3 2" />}
        {showTop      && <path d={makePath(topLine)}  fill="none" stroke={theme.colors.chart.rvu} strokeWidth="1.2" strokeDasharray="3 2" />}
        <path d={makePath(youLine)} fill="none" stroke={theme.colors.accentTeal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {youLine.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={theme.colors.accentTeal} />
        ))}
        {data.map((d, i) => (
          <text key={d.month} x={toX(i)} y={108} textAnchor="middle" fontSize="4.5" fill={theme.colors.chart.axis}>{d.month}</text>
        ))}
      </svg>
    </div>

    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "8px" }}>
      {[
        { label: "Your RVUs",     color: theme.colors.accentTeal,          show: true        },
        { label: "Peer Average",  color: theme.colors.chart.cases,         show: showPeer    },
        { label: "Top Performer", color: theme.colors.chart.rvu,           show: showTop     },
        { label: "Last Year",     color: theme.colors.text.muted,          show: showLastYear },
      ].filter(l => l.show).map(l => (
        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "20px", height: "2px", background: l.color, borderRadius: "1px" }} />
          <span style={{ fontSize: "11px", color: theme.colors.text.muted }}>{l.label}</span>
        </div>
      ))}
    </div>
    </div>
  );
};


// ─── RVU Summary Tile ─────────────────────────────────────────────────────────

const RvuTile: React.FC = () => (
  <Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: "13px", color: theme.colors.text.muted, marginBottom: "6px" }}>
          Total RVUs — {mockRvuTile.period}
        </div>
        <div style={{ fontSize: "32px", fontWeight: 800, color: theme.colors.text.primary, lineHeight: 1 }}>
          {mockRvuTile.total.toLocaleString()}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "6px", color: mockRvuTile.up ? theme.colors.semantic.success : theme.colors.semantic.warning }}>
          {mockRvuTile.up ? "▲" : "▼"} {mockRvuTile.delta} vs last year
        </div>
        <div style={{ fontSize: "11px", color: theme.colors.text.muted, marginTop: "8px" }}>
          Finalized cases only · Clinical workload metric
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "11px", color: theme.colors.text.muted }}>Avg per case</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: theme.colors.chart.rvu }}>{mockRvuTile.avgPerCase}</div>
        <div style={{ fontSize: "10px", color: theme.colors.text.muted, marginTop: "2px" }}>RVUs</div>
      </div>
    </div>
  </Card>
);

// ─── Peer Comparison ──────────────────────────────────────────────────────────

const PeerComparison: React.FC = () => {
  const max = mockPeerData.topPerf;
  const rows = [
    { label: "You",           value: mockPeerData.you,      color: theme.colors.accentTeal              },
    { label: "Peer Average",  value: mockPeerData.peerAvg,  color: theme.colors.chart.cases             },
    { label: "Top Performer", value: mockPeerData.topPerf,  color: theme.colors.chart.rvu               },
    { label: "Last Year",     value: mockPeerData.lastYear, color: theme.colors.text.muted              },
  ];

  return (
    <Card>
      <SectionTitle title="Peer Comparison" sub="YTD RVUs — anonymized · role-gated" />
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {rows.map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
              <span style={{ color: r.label === "You" ? theme.colors.text.secondary : theme.colors.text.muted }}>
                {r.label}
              </span>
              <span style={{ color: r.color, fontWeight: 700 }}>{r.value.toLocaleString()}</span>
            </div>
            <div style={{ height: "6px", borderRadius: "99px", background: theme.colors.surfaceSubtle, border: `1px solid ${theme.colors.border.subtle}`, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(r.value / max) * 100}%`, background: r.color, borderRadius: "99px", transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Main ProductivityTab ─────────────────────────────────────────────────────

const ProductivityTab: React.FC = () => {
  const [dateRange,    setDateRange]    = useState<DateRange>("ytd");
  const [activeChart,  setActiveChart]  = useState<"monthly" | "ytd">("monthly");
  const [showPeer,     setShowPeer]     = useState(true);
  const [showTop,      setShowTop]      = useState(true);
  const [showLastYear, setShowLastYear] = useState(false);

  const filteredMonthly =
    dateRange === "ytd" ? mockMonthly :
    dateRange === "6m"  ? mockMonthly.slice(-6) :
    dateRange === "3m"  ? mockMonthly.slice(-3) :
                          mockMonthly.slice(-1);

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "6px", cursor: "pointer",
    border: `1px solid ${active ? theme.colors.accentTealBorder : theme.colors.border.subtle}`,
    background: active ? theme.colors.accentTealSubtle : theme.colors.button.subtle,
    color: active ? theme.colors.accentTeal : theme.colors.text.muted,
    transition: "all 0.15s",
  });

  const toggle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
    fontSize: "12px", color: active ? theme.colors.text.secondary : theme.colors.text.muted,
    userSelect: "none",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── RVU Tile + Peer Comparison ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <RvuTile />
        <PeerComparison />
      </div>



      {/* ── Monthly + YTD charts ── */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={btn(activeChart === "monthly")} onClick={() => setActiveChart("monthly")}>Monthly Cases</button>
            <button style={btn(activeChart === "ytd")}     onClick={() => setActiveChart("ytd")}>YTD RVU Accumulation</button>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["1m", "3m", "6m", "ytd"] as DateRange[]).map(r => (
              <button key={r} style={btn(dateRange === r)} onClick={() => setDateRange(r)}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {activeChart === "monthly" && (
          <>
            <SectionTitle title="Monthly Case Counts" sub="Finalized cases per month — volume overview" />
            <BarChart data={filteredMonthly} metric="cases" />
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "12px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: theme.colors.chart.cases }} />
              <span style={{ fontSize: "11px", color: theme.colors.text.muted }}>Finalized cases</span>
            </div>
          </>
        )}

        {activeChart === "ytd" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <SectionTitle title="Year-to-Date RVU Accumulation" sub="Cumulative RVUs · finalized cases only" />
              <div style={{ display: "flex", gap: "16px" }}>
                {[
                  { label: "Peer Avg",  state: showPeer,     set: setShowPeer     },
                  { label: "Top Perf.", state: showTop,      set: setShowTop      },
                  { label: "Last Year", state: showLastYear, set: setShowLastYear },
                ].map(({ label, state, set }) => (
                  <label key={label} style={toggle(state)}>
                    <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} style={{ accentColor: theme.colors.accentTeal, width: "13px", height: "13px" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <LineChart data={filteredMonthly} showPeer={showPeer} showTop={showTop} showLastYear={showLastYear} />
          </>
        )}
      </Card>

      {/* ── Export row ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={() => window.print()}
          style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", cursor: "pointer", border: `1px solid ${theme.colors.border.subtle}`, background: theme.colors.button.subtle, color: theme.colors.button.text }}>
          🖨 Print
        </button>
        <button onClick={() => alert("PDF export — connect to your PDF library")}
          style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", cursor: "pointer", border: `1px solid ${theme.colors.accentTealBorder}`, background: theme.colors.accentTealSubtle, color: theme.colors.accentTeal }}>
          ↓ Export PDF
        </button>
      </div>

    </div>
  );
};

export default ProductivityTab;
