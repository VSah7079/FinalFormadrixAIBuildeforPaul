// src/components/CasePanel/CasePreviewDrawer.tsx

import React from "react";
import { useLISFreshnessCheck } from "../../hooks/useLISFreshnessCheck";
import type { FullReport, MinimalReport } from "../../mock/mockReports";

interface DrawerProps {
  report: FullReport | MinimalReport | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}

export const CasePreviewDrawer: React.FC<DrawerProps> = ({
  report,
  isOpen,
  onClose,
  onOpenFull,
}) => {
  // If drawer is closed OR no report, render nothing
  if (!report) return null;

  const { accession, diagnosis, lastUpdated } = report;
  const specimenType =
    "specimenType" in report ? report.specimenType : undefined;

  // ⭐ Freshness check (this was missing)
  const { isStale } = useLISFreshnessCheck(accession);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
          zIndex: 29999,
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          width: "420px",
          height: "100%",
          background: "#0b1120",
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          padding: "20px",
          zIndex: 30000,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            alignSelf: "flex-end",
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        {/* Accession */}
        <h2 style={{ color: "#e5e7eb", marginBottom: "6px" }}>{accession}</h2>

        {/* Diagnosis */}
        <div style={{ color: "#cbd5f5", marginBottom: "6px" }}>
          {diagnosis}
        </div>

        {/* Specimen Type (MinimalReport only) */}
        {specimenType && (
          <div style={{ color: "#94a3b8", marginBottom: "6px" }}>
            Specimen Type: {specimenType}
          </div>
        )}

        {/* Last Updated */}
        <div style={{ color: "#9ca3af", marginTop: "12px" }}>
          Last Updated: {lastUpdated}
        </div>

        {/* ⭐ Freshness Warning */}
        {isStale && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px",
              borderRadius: "6px",
              background: "rgba(234,179,8,0.15)",
              color: "#facc15",
              fontSize: "12px",
            }}
          >
            ⚠ Updated in LIS — preview may be outdated
          </div>
        )}

        {/* Full Report Button */}
        <button
          onClick={onOpenFull}
          style={{
            marginTop: "auto",
            padding: "10px 14px",
            background: "#0ea5e9",
            color: "#0f172a",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          View Full Report
        </button>
      </div>
    </>
  );
};