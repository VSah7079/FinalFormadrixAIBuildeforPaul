import Header from "../components/Header";
import { useState } from "react";

export default function ApplicationConfiguration() {
  const tabs = [
    "Branding",
    "Authentication",
    "AI Settings",
    "Integrations",
    "Licensing",
    "Feature Flags",
    "Backup & Recovery"
  ];

  const [activeTab, setActiveTab] = useState("Branding");

  const SectionCard = ({ title, children }: any) => (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px"
      }}
    >
      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#1e293b",
          marginBottom: "16px"
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );

  const Toggle = ({ label, value, onChange }: any) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0"
      }}
    >
      <span style={{ fontSize: "0.9rem", color: "#334155" }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: "48px",
          height: "24px",
          background: value ? "#0891B2" : "#e2e8f0",
          borderRadius: "12px",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            background: "white",
            borderRadius: "50%",
            position: "absolute",
            top: "2px",
            left: value ? "26px" : "2px",
            transition: "left 0.2s"
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ padding: "40px" }}>
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
          Application Configuration
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          System‑wide settings for PathScribe
          <sup style={{ fontSize: "0.65em", marginLeft: "2px" }}>AI</sup>
        </p>
      </div>

      {/* SUB‑TABS */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "32px"
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              borderBottom: activeTab === tab ? "3px solid #0891B2" : "3px solid transparent",
              color: activeTab === tab ? "#0891B2" : "#64748b",
              marginBottom: "-2px"
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "Branding" && (
        <>
          <SectionCard title="Logo & Visual Identity">
            <div className="config-group">
              <label className="config-label">Upload Logo</label>
              <input type="file" className="config-input" />
            </div>

            <div className="config-group">
              <label className="config-label">Accent Color</label>
              <input type="color" className="config-input" />
            </div>

            <Toggle
              label="Enable PathScribe AI superscript branding"
              value={true}
              onChange={() => {}}
            />
          </SectionCard>

          <SectionCard title="Login Screen Appearance">
            <Toggle
              label="Enable left‑panel clinical image"
              value={true}
              onChange={() => {}}
            />
            <Toggle
              label="Enable watermark animation"
              value={true}
              onChange={() => {}}
            />
          </SectionCard>
        </>
      )}

      {activeTab === "Authentication" && (
        <>
          <SectionCard title="MFA Policies">
            <Toggle
              label="Require MFA for all users"
              value={true}
              onChange={() => {}}
            />
            <Toggle
              label="Allow TOTP (Authenticator App)"
              value={true}
              onChange={() => {}}
            />
            <Toggle
              label="Allow Email fallback"
              value={true}
              onChange={() => {}}
            />
            <Toggle
              label="Allow WebAuthn (Biometrics)"
              value={true}
              onChange={() => {}}
            />
          </SectionCard>

          <SectionCard title="Session Security">
            <div className="config-group">
              <label className="config-label">Session Timeout (minutes)</label>
              <input type="number" className="config-input" defaultValue={30} />
            </div>

            <div className="config-group">
              <label className="config-label">Password Policy</label>
              <select className="config-input">
                <option>Standard (8+ chars)</option>
                <option>Strong (12+ chars, symbols)</option>
                <option>Custom</option>
              </select>
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === "AI Settings" && (
        <>
          <SectionCard title="AI Model Behavior">
            <div className="config-group">
              <label className="config-label">Temperature</label>
              <input type="range" min="0" max="1" step="0.05" />
            </div>

            <Toggle
              label="Enable Clinical Safety Mode"
              value={true}
              onChange={() => {}}
            />

            <Toggle
              label="Enable PHI Redaction"
              value={true}
              onChange={() => {}}
            />
          </SectionCard>

          <SectionCard title="Allowed Prompt Categories">
            <Toggle label="Clinical Interpretation" value={true} onChange={() => {}} />
            <Toggle label="Summarization" value={true} onChange={() => {}} />
            <Toggle label="Data Extraction" value={true} onChange={() => {}} />
            <Toggle label="Free‑form Chat" value={false} onChange={() => {}} />
          </SectionCard>
        </>
      )}

      {activeTab === "Integrations" && (
        <>
          <SectionCard title="LIS / LIMS">
            <div className="config-group">
              <label className="config-label">HL7 Endpoint</label>
              <input className="config-input" placeholder="hl7://..." />
            </div>

            <div className="config-group">
              <label className="config-label">FHIR Server URL</label>
              <input className="config-input" placeholder="https://fhir.server" />
            </div>
          </SectionCard>

          <SectionCard title="SSO Providers">
            <Toggle label="Enable Azure AD" value={true} onChange={() => {}} />
            <Toggle label="Enable Okta" value={false} onChange={() => {}} />
            <Toggle label="Enable Google Workspace" value={false} onChange={() => {}} />
          </SectionCard>
        </>
      )}

      {activeTab === "Licensing" && (
        <>
          <SectionCard title="License Information">
            <div className="config-group">
              <label className="config-label">License Key</label>
              <input className="config-input" placeholder="XXXX-XXXX-XXXX" />
            </div>

            <div className="config-group">
              <label className="config-label">Seats Used / Available</label>
              <input className="config-input" value="42 / 100" readOnly />
            </div>
          </SectionCard>

          <SectionCard title="Environment">
            <div className="config-group">
              <label className="config-label">Environment</label>
              <select className="config-input">
                <option>Production</option>
                <option>Staging</option>
                <option>Development</option>
              </select>
            </div>

            <div className="config-group">
              <label className="config-label">Build Version</label>
              <input className="config-input" value="2026.02.11" readOnly />
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === "Feature Flags" && (
        <>
          <SectionCard title="Feature Toggles">
            <Toggle label="Enable New Login UI" value={true} onChange={() => {}} />
            <Toggle label="Enable LVI Experimental Model" value={false} onChange={() => {}} />
            <Toggle label="Enable Real‑time Extraction" value={false} onChange={() => {}} />
          </SectionCard>
        </>
      )}

      {activeTab === "Backup & Recovery" && (
        <>
          <SectionCard title="Backup Settings">
            <div className="config-group">
              <label className="config-label">Backup Frequency</label>
              <select className="config-input">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: "12px" }}
            >
              Export Configuration
            </button>
          </SectionCard>

          <SectionCard title="Disaster Recovery">
            <button className="btn btn-secondary">Restore from Backup</button>
          </SectionCard>
        </>
      )}
    </div>
  );
}
