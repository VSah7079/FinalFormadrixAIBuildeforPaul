import { ServiceResult, ID } from '../types';
import { storageGet } from '../mockStorage';
import type { PathologyCase, CaseFilterParams, ICaseService } from './ICaseService';

// ─── Double Metaphone phonetic matching ───────────────────────────────────────
// Used for name search to support spelling variants and international names.
// talisman/phonetics/double-metaphone returns [primary, secondary] code pair.
// In production, name resolution is delegated to the LIS/MPI (Master Patient
// Index) which handles cross-system identity matching. The mock implements
// Double Metaphone locally as a realistic approximation.
import doubleMetaphone from 'talisman/phonetics/double-metaphone';

/** Return all Double Metaphone codes for a full name string (splits on space/comma) */
function metaphoneCodes(name: string): Set<string> {
  const codes = new Set<string>();
  name.trim().split(/[\s,]+/).filter(Boolean).forEach(token => {
    const [primary, secondary] = doubleMetaphone(token);
    if (primary)   codes.add(primary);
    if (secondary) codes.add(secondary);
  });
  return codes;
}

/** True if any metaphone code from query overlaps with any code from candidate */
function phoneticMatch(query: string, candidate: string): boolean {
  if (!query.trim()) return false;
  const queryCodes     = metaphoneCodes(query);
  const candidateCodes = metaphoneCodes(candidate);
  for (const code of queryCodes) {
    if (candidateCodes.has(code)) return true;
  }
  return false;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
// PHI note: patient field uses "Last, First" for ***REMOVED*** only.
// In production this will be MRN only — name resolved via patient service.

const PROTOCOLS = [
  'CAP Breast Invasive Carcinoma', 'CAP Colon Resection',      'CAP Prostatectomy',
  'CAP Lung Resection',            'CAP Thyroid',               'CAP Endometrium',
  'CAP Melanoma',                  'CAP Kidney Resection',      'CAP Bladder Resection',
  'CAP Cervix Resection',          'CAP Ovary',                 'CAP Lymph Node',
  'CAP Soft Tissue',               'CAP Prostate Biopsy',
];

const SPECIMENS = [
  'Left Breast Mastectomy',    'Right Breast Mastectomy',   'Right Breast Lumpectomy',
  'Left Breast Lumpectomy',    'Right Hemicolectomy',       'Left Hemicolectomy',
  'Radical Prostatectomy',     'Left Lower Lobe Lobectomy', 'Right Upper Lobe Lobectomy',
  'Total Thyroidectomy',       'Partial Thyroidectomy',     'Cholecystectomy',
  'Appendectomy',              'Partial Nephrectomy',       'Radical Nephrectomy',
  'Total Hysterectomy',        'Wide Local Excision',       'Axillary Node Dissection',
  'TURBT Specimen',            'Endocervical Curettage',    'Cervical Cone Biopsy',
  'Sentinel Lymph Node Biopsy','Core Needle Biopsy Breast', 'Prostate Biopsy Cores',
];

const STATUSES:    PathologyCase['status'][]   = ['Grossed', 'Awaiting Micro', 'Finalizing', 'Completed'];
const AI_STATUSES: PathologyCase['aiStatus'][] = ['Draft Ready', 'Syncing Micro', 'Finalized', 'Pending'];
const GENDERS:     PathologyCase['gender'][]   = ['Male', 'Female', 'Female', 'Male', 'Non-binary', 'Female', 'Male', 'Female', 'Unknown', 'Other'];

// DOB pool — spans ~50 years for realistic age range ***REMOVED*** (born 1945–1995)
const DOBS = [
  '1945-03-12', '1952-07-28', '1958-11-04', '1963-02-19', '1967-09-30',
  '1970-05-14', '1973-12-08', '1976-04-22', '1979-08-17', '1982-01-31',
  '1985-06-05', '1987-10-23', '1989-03-16', '1991-07-09', '1993-11-27',
  '1948-08-02', '1955-04-15', '1961-09-07', '1965-12-20', '1971-02-03',
];

function ageFromDob(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
const LAST_NAMES  = [
  // Common English
  'Miller', 'Smith', 'Taylor', 'White', 'Brown', 'Davis', 'Wilson', 'Moore', 'Anderson',
  'Thomas', 'Jackson', 'Harris', 'Martin', 'Garcia', 'Martinez', 'Robinson', 'Rodriguez',
  // Verified Double Metaphone pairs — searching either finds both
  'Clark',    'Clarke',      // KLRK → match
  'Fisher',   'Fischer',     // FXR  → match (AU/German)
  'Stephens', 'Stevens',     // STFN → match
  'Stewart',  'Stuart',      // STRT → match (Scottish)
  'Phillips', 'Philips',     // FLPS → match
  'Mackenzie','McKenzie',    // MKNS → match (Scottish)
  'Smyth',    'Smith',       // SM0  → match (Irish/English)
  'Whyte',    'White',       // T    → match (Scottish)
  'Thomson',  'Thompson',    // TMSN → match
  // International — NHS / EU / AU
  'Nguyen',         // Vietnamese — common AU/UK
  'Patel',          // South Asian — very common NHS
  'Schmidt',        // German
  'Kowalski',       // Polish
  'Okafor',         // Nigerian/West African
  'Fernandez',      // Spanish/Latin American
  'Johansson',      // Scandinavian
  'MacPherson',     // Scottish
  'Nakamura',       // Japanese
  'Krishnamurthy',  // South Indian
];
const FIRST_NAMES = [
  // Common
  'Jane', 'Alice', 'Michael', 'Charles', 'Susan', 'Robert', 'Linda', 'William', 'Barbara', 'Richard',
  'Mary', 'James', 'Patricia', 'John', 'Jennifer', 'David', 'Margaret', 'Christopher', 'Lisa', 'Daniel',
  // Phonetic variants
  'Jon',         // → matches John
  'Kristopher',  // → matches Christopher
  'Katheryn',    // → matches Catherine/Katherine
  'Jeffery',     // → matches Jeffrey
  // International
  'Priya', 'Aiko', 'Fatima', 'Sven', 'Liam', 'Aoife', 'Björn', 'Yuki', 'Ananya', 'Ciarán',
];

function generateSeedCases(n: number): PathologyCase[] {
  return Array.from({ length: n }, (_, i) => {
    const aiStatus = AI_STATUSES[i % AI_STATUSES.length];
    const hrs      = [30, 45, 60, 90, 120, 180, 240, 300][i % 8];
    return {
      id:         `S26-${4200 + i}`,
      patient:    `${LAST_NAMES[i % LAST_NAMES.length]}, ${FIRST_NAMES[i % FIRST_NAMES.length]}`,
      dob:        DOBS[i % DOBS.length],
      gender:     GENDERS[i % GENDERS.length],
      protocol:   PROTOCOLS[i % PROTOCOLS.length],
      specimen:   SPECIMENS[i % SPECIMENS.length],
      status:     STATUSES[i % STATUSES.length],
      aiStatus,
      confidence: aiStatus === 'Pending' ? 0 : 78 + (i % 20),
      time:       hrs < 60 ? `${hrs}m ago` : `${Math.round(hrs / 60)}h ago`,
      priority:   i % 7 === 0 ? 'STAT' : 'Routine',
    };
  });
}

const SEED_CASES: PathologyCase[] = generateSeedCases(60);

// ─── Storage ──────────────────────────────────────────────────────────────────

const load    = () => storageGet<PathologyCase[]>('formedrix_cases', SEED_CASES);

// Cases are read-only from the client (written by LIS sync / AI engine),
// so we load once and do not expose a persist path in the service interface.
const MOCK_CASES: PathologyCase[] = load();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true,  data  });
const err   = <T>(e: string): ServiceResult<T> => ({ ok: false, error: e });
const delay = () => new Promise(r => setTimeout(r, 80));

function applyFilters(cases: PathologyCase[], f: CaseFilterParams = {}): PathologyCase[] {
  const nameQ = f.patientName?.trim().toLowerCase();
  const accQ  = f.accessionNo?.trim().toLowerCase();
  const idQ   = f.hospitalId?.trim().toLowerCase();

  return cases.filter(c => {
    // Name matching: substring first (fast), then Double Metaphone phonetic fallback
    const nameMatch = (query: string) =>
      c.patient.toLowerCase().includes(query) ||
      phoneticMatch(query, c.patient);

    // If multiple identifier fields set to same value (ambiguous search), use OR logic
    const sameQuery = nameQ && nameQ === accQ && nameQ === idQ;
    if (sameQuery) {
      const matched = nameMatch(nameQ!) || c.id.toLowerCase().includes(nameQ!);
      if (!matched) return false;
    } else {
      if (nameQ && !nameMatch(nameQ))                        return false;
      if (accQ  && !c.id.toLowerCase().includes(accQ))       return false;
      if (idQ   && !c.id.toLowerCase().includes(idQ))        return false;
    }

    if (f.diagnosisList?.length && !f.diagnosisList.some(d =>
      c.protocol.toLowerCase().includes(d.toLowerCase()) ||
      c.specimen.toLowerCase().includes(d.toLowerCase())
    )) return false;

    if (f.specimenList?.length && !f.specimenList.some(s =>
      c.specimen.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.snomedCodes?.length && !f.snomedCodes.some(s =>
      c.protocol.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.icdCodes?.length && !f.icdCodes.some(s =>
      c.protocol.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.statusList?.length   && !f.statusList.includes(c.status))     return false;
    if (f.priorityList?.length && !f.priorityList.includes(c.priority)) return false;

    // Demographics
    if (f.genderList?.length && !f.genderList.includes(c.gender)) return false;

    if (f.dobFrom && c.dob < f.dobFrom) return false;
    if (f.dobTo   && c.dob > f.dobTo)   return false;

    if (f.ageMin !== undefined || f.ageMax !== undefined) {
      const age = ageFromDob(c.dob);
      if (f.ageMin !== undefined && age < f.ageMin) return false;
      if (f.ageMax !== undefined && age > f.ageMax) return false;
    }

    return true;
  });
}

// ─── Mock service ─────────────────────────────────────────────────────────────
// TODO: Replace with firestoreCaseService when LIS integration is ready.

export const mockCaseService: ICaseService = {

  async getAll(filters) {
    await delay();
    return ok(applyFilters([...MOCK_CASES], filters));
  },

  async getById(id: ID) {
    await delay();
    const c = MOCK_CASES.find(c => c.id === id);
    return c ? ok({ ...c }) : err(`Case ${id} not found`);
  },
};
