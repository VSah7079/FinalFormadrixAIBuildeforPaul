import React, { Suspense, lazy } from "react";
import "./pathscribe.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth + Providers
import { AuthProvider } from "./contexts/AuthContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import { MessagingProvider } from "./contexts/MessagingContext";
import { SpecimenProvider } from "./contexts/useSpecimens";
import { SubspecialtyProvider } from "./contexts/useSubspecialties";
import { SpecimenDictionaryProvider } from "./components/Config/System/useSpecimenDictionary";

// Breadcrumb
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { DirtyStateProvider } from './contexts/DirtyStateProvider';

// Voice Integration
import { VoiceProvider } from "./contexts/VoiceProvider";

// Scanner Integration (barcode/QR scanner support)
import { ScannerProvider } from "./contexts/ScannerProvider";

// Standard Wrappers
import ProtectedRoute from "./ProtectedRoute";
import AppShell from "./components/AppShell/AppShell";

// Loaders
import { synopticLoader } from "./loaders/synopticLoader";

//EMR Access
import MockEMRPage from './pages/MockEMRPage';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./Login"));
const WorklistPage = lazy(() => import("./pages/WorklistPage/WorklistPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const ConfigurationPage = lazy(() => import("./pages/ConfigurationPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ContributionDashboardPage = lazy(() =>
  import("./pages/ContributionDashboardPage")
);

const SynopticReportPage = lazy(() =>
  import("./pages/SynopticReportPage/SynopticReportPage")
);
const FullReportPage = lazy(() => import("./pages/FullReportPage"));
const PatientReportPage = lazy(() =>
  import("./components/PatientReportPage/PatientReportPage")
);

const SynopticEditor = lazy(() =>
  import("./components/Config/Protocols/SynopticEditor")
);
const ProtocolEditor = lazy(() => import("./protocols/ProtocolEditor"));
const TemplateRendererPage = lazy(() =>
  import("./components/Config/Templates/TemplateRenderer").then((m) => ({
    default: m.TemplateRenderer,
  }))
);

// ── Loading fallback ──────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "#0b1120",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid rgba(8,145,178,0.15)",
        borderTop: "3px solid #0891B2",
        borderRadius: "50%",
        animation: "ps-spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes ps-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ToastContainer />
    <SystemConfigProvider>
      <AuthProvider>
        <MessagingProvider>
          <SpecimenProvider>
            <SubspecialtyProvider>
              <SpecimenDictionaryProvider>
                <DirtyStateProvider>
                <BreadcrumbProvider>
                <VoiceProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Route */}
                      <Route path="/login" element={<Login />} />

                      {/* Protected Routes — ScannerProvider only active when authenticated */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<ScannerProvider><AppShell /></ScannerProvider>}>
                          <Route path="/" element={<Home />} />
                          <Route path="/worklist" element={<WorklistPage />} />
                          <Route path="/search" element={<SearchPage />} />
                          <Route path="/audit" element={<AuditLogPage />} />
                          <Route
                            path="/configuration"
                            element={<ConfigurationPage />}
                          />
                          <Route
                            path="/contribution"
                            element={<ContributionDashboardPage />}
                          />
                        </Route>

                        {/* Clinical Routes — full-screen, no AppShell, but still need scanner */}
                        <Route
                          path="/case/:caseId/synoptic"
                          element={<ScannerProvider><SynopticReportPage /></ScannerProvider>}
                          loader={synopticLoader}
                        />
                        <Route
                          path="/report/:accession"
                          element={<ScannerProvider><FullReportPage /></ScannerProvider>}
                        />
                        <Route
                          path="/case/:accession"
                          element={<PatientReportPage />}
                        />
                        <Route
                          path="/template-editor/new"
                          element={<SynopticEditor />}
                        />
                        <Route
                          path="/template-editor/:templateId"
                          element={<SynopticEditor />}
                        />
                        <Route
                          path="/configuration/protocols/:protocolId"
                          element={<ProtocolEditor />}
                        />
                        <Route
                          path="/template-review/:templateId"
                          element={<TemplateRendererPage />}
                        />
                        <Route 
                          path="/mock-emr" 
                          element={<MockEMRPage />} 
                        />
                      </Route>
                    </Routes>
                  </Suspense>
                </VoiceProvider>
                </BreadcrumbProvider>
                </DirtyStateProvider>
              </SpecimenDictionaryProvider>
            </SubspecialtyProvider>
          </SpecimenProvider>
        </MessagingProvider>
      </AuthProvider>
    </SystemConfigProvider>
  </Router>
);

export default App;