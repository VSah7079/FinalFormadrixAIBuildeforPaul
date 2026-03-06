import React from "react";
import { useParams } from "react-router-dom";
import { getMockReport } from "../../mock/mockReports";

const PatientReportPage: React.FC = () => {
  const { accession } = useParams();

  if (!accession) {
    return <div style={{ color: "white" }}>Invalid report ID.</div>;
  }

  const report = getMockReport(accession);

  if (!report) {
    return <div style={{ color: "white" }}>No report found.</div>;
  }

  return (
    <div style={{ padding: "2rem", color: "white" }}>
      <h1>{report.accession}</h1>
      <p>{report.diagnosis}</p>
      <p>Last Updated: {report.lastUpdated}</p>
    </div>
  );
};

export default PatientReportPage;