// src/mock/mockReports.ts

export type FullReport = {
  accession: string;
  patientName: string;
  mrn: string;
  collectedAt: string;
  receivedAt: string;
  reportedAt: string;
  diagnosis: string;
  specimens: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  synoptic: {
    tumorType: string;
    grade: string;
    size: string;
    margins: string;
    lymphovascularInvasion: string;
    biomarkers: {
      er: string;
      pr: string;
      her2: string;
      ki67: string;
    };
  };
  grossDescription: string;
  microscopicDescription: string;
  ancillaryStudies: string;
  lastUpdated: string; // for freshness check
};

export type MinimalReport = {
  accession: string;
  diagnosis: string;
  specimenType?: string;
  lastUpdated: string;
};

export type Report = FullReport | MinimalReport;

// ------------------------------
// FULL REPORT (S24-1122)
// ------------------------------

const fullReport: FullReport = {
  accession: "S24-1122",
  patientName: "John Smith",
  mrn: "123456789",
  collectedAt: "2024-02-10T09:15:00Z",
  receivedAt: "2024-02-10T11:00:00Z",
  reportedAt: "2024-02-12T14:30:00Z",
  diagnosis: "Invasive ductal carcinoma, Nottingham grade 2",
  specimens: [
    {
      id: "A",
      type: "Breast, left",
      description: "Core needle biopsy showing invasive ductal carcinoma."
    }
  ],
  synoptic: {
    tumorType: "Invasive ductal carcinoma",
    grade: "Grade 2",
    size: "1.8 cm",
    margins: "Negative",
    lymphovascularInvasion: "Not identified",
    biomarkers: {
      er: "95% positive",
      pr: "80% positive",
      her2: "1+ (negative)",
      ki67: "18%"
    }
  },
  grossDescription:
    "Received in formalin are multiple tan-white core fragments measuring 1.5 cm in aggregate.",
  microscopicDescription:
    "Sections show infiltrating ducts with moderate nuclear atypia and tubule formation.",
  ancillaryStudies: "ER/PR/HER2 immunohistochemistry performed.",
  lastUpdated: "2024-02-12T14:30:00Z"
};

// ------------------------------
// MINIMAL REPORT (S23-9981)
// ------------------------------

const minimalReport: MinimalReport = {
  accession: "S23-9981",
  diagnosis: "Invasive lobular carcinoma",
  specimenType: "Breast, right",
  lastUpdated: "2023-11-05T10:00:00Z"
};

// ------------------------------
// LOOKUP FUNCTION
// ------------------------------

export function getMockReport(accession: string): Report | null {
  switch (accession) {
    case "S24-1122":
      return fullReport;
    case "S23-9981":
      return minimalReport;
    default:
      return null;
  }
}