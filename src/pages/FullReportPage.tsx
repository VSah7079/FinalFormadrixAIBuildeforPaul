// src/pages/FullReportPage.tsx

import { useParams, useNavigate } from "react-router-dom";
import {
  getMockReport,
  FullReport,
  MinimalReport,
} from "../mock/mockReports";

// ─── Shared style tokens ──────────────────────────────────────────────────────

const S = {
  page: {
    position: "relative" as const,
    minHeight: "100vh",
    backgroundColor: "#000",
    color: "#f1f5f9",
    fontFamily: "'Inter', sans-serif",
  } as React.CSSProperties,
  bg: {
    position: "fixed" as const,
    inset: 0,
    backgroundImage: "url(/main_background.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.25) contrast(1.1)",
    zIndex: 0,
  } as React.CSSProperties,
  bgGrad: {
    position: "fixed" as const,
    inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, #000 100%)",
    zIndex: 1,
  } as React.CSSProperties,
  content: {
    position: "relative" as const,
    zIndex: 10,
    maxWidth: "860px",
    margin: "0 auto",
    padding: "40px 40px 80px",
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "24px 28px",
    marginBottom: "20px",
    backdropFilter: "blur(12px)",
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "14px",
    paddingBottom: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  } as React.CSSProperties,
  label: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: "4px",
  } as React.CSSProperties,
  value: {
    fontSize: "14px",
    color: "#e2e8f0",
    lineHeight: 1.6,
  } as React.CSSProperties,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FullReportPage() {
  const { accession } = useParams();
  const navigate = useNavigate();

  const cleanedAccession = accession?.trim() || "";
  const report = cleanedAccession ? getMockReport(cleanedAccession) : null;

  if (!report) {
    return (
      <div style={S.page}>
        <div style={S.bg} />
        <div style={S.bgGrad} />
        <div style={{ ...S.content, textAlign: "center", paddingTop: "120px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
            Report Not Found
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "28px" }}>
            Accession <code style={{ color: "#0891B2" }}>{cleanedAccession || "—"}</code> could not be found.
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "10px 24px", background: "#0891B2", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const isFull = (report as FullReport).synoptic !== undefined;

  return (
    <div style={S.page}>
      <div style={S.bg} />
      <div style={S.bgGrad} />
      <div style={S.content}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{ marginBottom: "28px", padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          ← Back
        </button>

        {/* Header card */}
        <div style={{ ...S.card, borderColor: "rgba(8,145,178,0.3)", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0891B2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Pathology Report
              </div>
              <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                {report.accession}
              </h1>
              {isFull && (
                <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
                  {(report as FullReport).diagnosis}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={S.label}>Last Updated</div>
              <div style={{ fontSize: "13px", color: "#e2e8f0", fontFamily: "monospace" }}>
                {report.lastUpdated}
              </div>
            </div>
          </div>
        </div>

        {isFull
          ? <FullReportView report={report as FullReport} />
          : <MinimalReportView report={report as MinimalReport} />
        }
      </div>
    </div>
  );
}

// ─── Full Report View ─────────────────────────────────────────────────────────

function FullReportView({ report }: { report: FullReport }) {
  return (
    <>
      {/* Diagnosis */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Diagnosis</div>
        <p style={{ ...S.value, fontSize: "15px", fontWeight: 500, color: "#f1f5f9" }}>{report.diagnosis}</p>
      </div>

      {/* Specimens */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Specimens</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {report.specimens.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: "14px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#0891B220", color: "#0891B2", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.id}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", marginBottom: "2px" }}>{s.type}</div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Synoptic Summary */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Synoptic Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {[
            { label: "Tumor Type",              value: report.synoptic.tumorType },
            { label: "Grade",                   value: report.synoptic.grade },
            { label: "Size",                    value: report.synoptic.size },
            { label: "Margins",                 value: report.synoptic.margins },
            { label: "Lymphovascular Invasion", value: report.synoptic.lymphovascularInvasion },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={S.label}>{label}</div>
              <div style={S.value}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ ...S.label, marginBottom: "12px" }}>Biomarkers</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {[
            { label: "ER",    value: report.synoptic.biomarkers.er   },
            { label: "PR",    value: report.synoptic.biomarkers.pr   },
            { label: "HER2",  value: report.synoptic.biomarkers.her2 },
            { label: "Ki-67", value: report.synoptic.biomarkers.ki67 },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "10px 14px", background: "rgba(8,145,178,0.08)", borderRadius: "8px", border: "1px solid rgba(8,145,178,0.2)", textAlign: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#0891B2", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gross Description */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Gross Description</div>
        <p style={{ ...S.value, lineHeight: 1.8 }}>{report.grossDescription}</p>
      </div>

      {/* Microscopic Description */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Microscopic Description</div>
        <p style={{ ...S.value, lineHeight: 1.8 }}>{report.microscopicDescription}</p>
      </div>

      {/* Ancillary Studies */}
      <div style={S.card}>
        <div style={S.sectionHeading}>Ancillary Studies</div>
        <p style={{ ...S.value, lineHeight: 1.8 }}>{report.ancillaryStudies}</p>
      </div>
    </>
  );
}

// ─── Minimal Report View ──────────────────────────────────────────────────────

function MinimalReportView({ report }: { report: MinimalReport }) {
  return (
    <>
      <div style={S.card}>
        <div style={S.sectionHeading}>Diagnosis</div>
        <p style={{ ...S.value, fontSize: "15px", fontWeight: 500, color: "#f1f5f9" }}>{report.diagnosis}</p>
      </div>

      {report.specimenType && (
        <div style={S.card}>
          <div style={S.sectionHeading}>Specimen Type</div>
          <p style={S.value}>{report.specimenType}</p>
        </div>
      )}

      <div style={{ ...S.card, borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.05)" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b", marginBottom: "4px" }}>Limited Data</div>
            <p style={{ ...S.value, color: "#94a3b8", margin: 0 }}>
              This report contains limited data. Additional LIS details may not be available.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
