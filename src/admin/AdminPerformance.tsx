import Header from "../components/Header";
import AdminLayout from "./AdminLayout";

export default function AdminPerformance() {
  return (
    <AdminLayout>
      {/* PAGE HEADER */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: "8px"
          }}
        >
          Model Performance Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          Monitor AI model accuracy and system health
        </p>
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "32px"
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "#0891B2",
            borderBottom: "3px solid #0891B2",
            marginBottom: "-2px"
          }}
        >
          Performance
        </div>
        <div style={tabStyle}>Models</div>
        <div style={tabStyle}>Training Data</div>
        <div style={tabStyle}>Configuration</div>
        <div style={tabStyle}>Audit Logs</div>
      </div>

      {/* STATS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "32px"
        }}
      >
        {statCard("94.2%", "Overall Accuracy", "↑ 2.3% vs last month", true)}
        {statCard("12,487", "Cases Processed (30d)", "↑ 18% vs last month", true)}
        {statCard("2.4s", "Avg Processing Time", "↓ 0.3s vs last month", false)}
        {statCard("98.7%", "Uptime", "↑ 0.2% vs last month", true)}
      </div>

      {/* ALERT */}
      <div
        style={{
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "start",
          gap: "12px",
          background: "#fef3c7",
          border: "1px solid #fde047"
        }}
      >
        <div style={{ fontSize: "1.25rem" }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
            Model Retraining Recommended
          </div>
          <div style={{ fontSize: "0.875rem", color: "#475569" }}>
            Accuracy for lymphovascular invasion detection has dropped to 68%
            (below 75% threshold). Consider retraining with additional labeled examples.
          </div>
        </div>
        <button style={secondaryButton}>Review Data</button>
      </div>

      {/* FIELD EXTRACTION PERFORMANCE */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <h3 style={sectionTitle}>Field Extraction Performance</h3>
          <select style={selectStyle}>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last year</option>
          </select>
        </div>

        <table style={tableStyle}>
          <thead>
            <tr>
              {[
                "Field Name",
                "Accuracy",
                "Confidence Avg",
                "Cases",
                "Manual Override Rate",
                "Status"
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {row("Tumor Size", "96.4%", "94%", "8,421", "2.1%", "Excellent")}
            {row("Histologic Type", "98.1%", "98%", "8,421", "0.8%", "Excellent")}
            {row("Histologic Grade", "93.7%", "91%", "8,421", "4.2%", "Good")}
            {row(
              "Lymphovascular Invasion",
              "68.3%",
              "71%",
              "8,421",
              "18.7%",
              "Needs Review",
              true
            )}
            {row("Margin Status", "95.2%", "93%", "8,421", "3.1%", "Good")}
            {row("ER Status", "97.8%", "96%", "8,421", "1.2%", "Excellent")}
          </tbody>
        </table>
      </div>

      {/* TRAINING PIPELINE */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Training Pipeline Status</h3>

        <div
          style={{
            padding: "20px",
            background: "#f8fafc",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
              Training in Progress: LVI Detection v1.0.4
            </div>
            <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
              Epoch 47/100 • Est. completion: 3h 24m
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={progressBar}>
              <div style={{ ...progressFill, width: "47%" }} />
            </div>
            <span style={{ fontWeight: 600, color: "#0891B2" }}>47%</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ------------------ COMPONENT HELPERS ------------------ */

const tabStyle = {
  padding: "12px 24px",
  fontWeight: 600,
  fontSize: "0.875rem",
  color: "#64748b",
  cursor: "pointer"
};

const statCard = (value, label, trend, up) => (
  <div
    style={{
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px"
    }}
  >
    <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1e293b" }}>
      {value}
    </div>
    <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "8px" }}>
      {label}
    </div>
    <div
      style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: up ? "#10b981" : "#ef4444"
      }}
    >
      {trend}
    </div>
  </div>
);

const sectionCard = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "24px"
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
};

const sectionTitle = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1e293b"
};

const selectStyle = {
  padding: "8px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "0.875rem"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse"
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  borderBottom: "2px solid #e2e8f0"
};

const row = (name, acc, conf, cases, override, status, highlight = false) => (
  <tr style={highlight ? { background: "#fefce8" } : {}}>
    <td style={td}>{name}</td>
    <td style={td}>
      <strong>{acc}</strong>
    </td>
    <td style={td}>{conf}</td>
    <td style={td}>{cases}</td>
    <td style={td}>{override}</td>
    <td style={td}>
      <span style={badge(status)}>{status}</span>
    </td>
  </tr>
);

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "0.875rem"
};

const badge = (status) => {
  const base = {
    fontSize: "0.7rem",
    padding: "3px 8px",
    borderRadius: "10px",
    fontWeight: 600
  };

  if (status === "Excellent")
    return { ...base, background: "#86efac", color: "#14532d" };
  if (status === "Good")
    return { ...base, background: "#d1fae5", color: "#065f46" };
  if (status === "Needs Review")
    return { ...base, background: "#fde047", color: "#713f12" };

  return base;
};

const secondaryButton = {
  padding: "8px 16px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.875rem",
  background: "white",
  border: "1px solid #cbd5e1",
  color: "#475569",
  cursor: "pointer"
};

const progressBar = {
  width: "200px",
  height: "8px",
  background: "#e2e8f0",
  borderRadius: "4px",
  overflow: "hidden"
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #0891B2, #10b981)",
  borderRadius: "4px"
};
