// src/pages/Synoptic/Codes/codeSearchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Terminology search abstraction.
// All endpoint URLs are centralised in terminologyConfig.ts.
//
// NLM Clinical Tables API response format (all endpoints):
//   data[0] = total match count
//   data[1] = array of primary codes     e.g. ["C50.412", "C50.911"]
//   data[2] = code system info (ignore)
//   data[3] = array of display arrays    e.g. [["C50.412","Malignant..."], ...]
//
// Key params:
//   sf = search fields  (which fields NLM searches against)
//   df = display fields (which fields NLM returns in data[3])
// ─────────────────────────────────────────────────────────────────────────────

import { TERMINOLOGY_CONFIG } from '../../../components/Config/Terminology/terminologyConfig';

export interface CodeResult {
  code:       string;
  display:    string;
  system:     string;
  hierarchy?: string;
}

const NLM_BASE = TERMINOLOGY_CONFIG.nlm.baseUrl;

export type SnomedFilter = 'all' | 'morphology' | 'anatomy' | 'specimen' | 'organism';

// ─── SNOMED CT ────────────────────────────────────────────────────────────────
// Endpoint: /snomed/v3/search
// data[1] = concept IDs, data[3] = [[code, term], ...] when df=code,term

export async function searchSnomed(
  query: string,
  filter: SnomedFilter = 'all',
  maxResults = 20
): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    // Dev/demo: NLM Conditions API — free, no license required.
    // Returns common clinical conditions with SNOMED concept IDs.
    // Production: swap to UMLS API with your license key via backend proxy:
    //   GET https://uts-ws.nlm.nih.gov/rest/search/current?string={q}&sabs=SNOMEDCT_US&apiKey={key}
    //
    // Filter mapping — Conditions API uses 'type' param:
    //   morphology → diagnosis (closest available)
    //   anatomy    → no direct filter, search all
    //   specimen   → no direct filter, search all
    //   organism   → no direct filter, search all
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'primary_name,snomed_cid',
      sf:      'primary_name,synonyms',
    });

    const res = await fetch(`${NLM_BASE}/conditions/v3/search?${params}`);
    if (!res.ok) throw new Error(`NLM Conditions ${res.status}`);
    const data = await res.json();

    // Response format:
    //   data[0] = total count
    //   data[1] = primary codes (condition names used as display key)
    //   data[3] = [[primary_name, snomed_cid], ...] matching df param
    const extraArr: any[][] = data[3] ?? [];

    return extraArr
      .filter(row => row[1]) // must have a SNOMED CID
      .map(row => ({
        code:    String(row[1]),   // SNOMED concept ID
        display: String(row[0]),   // primary condition name
        system:  'SNOMED',
      }));
  } catch (err) {
    console.warn('[codeSearchService] SNOMED search failed:', err);
    return [];
  }
}

// ─── ICD-10-CM ────────────────────────────────────────────────────────────────
// Endpoint: /icd10cm/v3/search
// data[1] = codes, data[3] = [[code, name], ...] when df=code,name
// Note: Non-US variants (ICD-10-AM, ICD-10 WHO) require backend proxy.

export async function searchIcd10(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      sf:      'code,name',
      df:      'code,name',
    });
    const res = await fetch(`${NLM_BASE}${TERMINOLOGY_CONFIG.nlm.endpoints.icd10}?${params}`);
    if (!res.ok) throw new Error(`NLM ICD-10 ${res.status}`);
    const data = await res.json();

    const codes:    string[]  = data[1] ?? [];
    const extraArr: any[][]   = data[3] ?? [];

    return codes.map((code, i) => ({
      code,
      display: extraArr[i]?.[1] ?? extraArr[i]?.[0] ?? code,
      system:  'ICD10',
    }));
  } catch (err) {
    console.warn('[codeSearchService] ICD-10 search failed:', err);
    return [];
  }
}

// ─── ICD-11 ───────────────────────────────────────────────────────────────────
// Endpoint: /icd11_codes/v3/search
// NLM hosts ICD-11 directly — no WHO OAuth or backend proxy required.
// data[1] = codes, data[3] = [[code, title], ...] when df=code,title

export async function searchIcd11(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      sf:      'code,title',
      df:      'code,title',
    });
    const res = await fetch(`${NLM_BASE}${TERMINOLOGY_CONFIG.nlm.endpoints.icd11}?${params}`);
    if (!res.ok) throw new Error(`NLM ICD-11 ${res.status}`);
    const data = await res.json();

    const codes:    string[]  = data[1] ?? [];
    const extraArr: any[][]   = data[3] ?? [];

    return codes.map((code, i) => ({
      code,
      display: extraArr[i]?.[1] ?? extraArr[i]?.[0] ?? code,
      system:  'ICD11',
    }));
  } catch (err) {
    console.warn('[codeSearchService] ICD-11 search failed:', err);
    return [];
  }
}

// ─── LOINC ────────────────────────────────────────────────────────────────────
// Endpoint: /loinc_items/v3/search  (note: loinc_items, not loinc)
// type=question filters to observable/test codes relevant to pathology.
// data[1] = LOINC numbers, data[3] = [[LOINC_NUM, LONG_COMMON_NAME], ...]

export async function searchLoinc(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      type:    'question',
      sf:      'LOINC_NUM,LONG_COMMON_NAME,SHORTNAME',
      df:      'LOINC_NUM,LONG_COMMON_NAME',
    });
    const res = await fetch(`${NLM_BASE}${TERMINOLOGY_CONFIG.nlm.endpoints.loinc}?${params}`);
    if (!res.ok) throw new Error(`NLM LOINC ${res.status}`);
    const data = await res.json();

    const codes:    string[]  = data[1] ?? [];
    const extraArr: any[][]   = data[3] ?? [];

    return codes.map((code, i) => ({
      code,
      display: extraArr[i]?.[1] ?? extraArr[i]?.[0] ?? code,
      system:  'LOINC',
    }));
  } catch (err) {
    console.warn('[codeSearchService] LOINC search failed:', err);
    return [];
  }
}

// ─── ICD-O ────────────────────────────────────────────────────────────────────
// NLM has no dedicated ICD-O endpoint.
// Falls back to SNOMED morphology subset (rec_type=Morphologic abnormality)
// which covers the most common oncology morphology codes.
// Replace with a dedicated backend endpoint for full ICD-O-3 coverage.

export async function searchIcdo(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    // Dev/demo: NLM Conditions API filtered to neoplasm/cancer conditions.
    // Returns SNOMED morphology codes which closely map to ICD-O-3 morphology.
    // Production: use a dedicated ICD-O-3 backend endpoint.
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'primary_name,snomed_cid',
      sf:      'primary_name,synonyms',
    });

    const res = await fetch(`${NLM_BASE}/conditions/v3/search?${params}`);
    if (!res.ok) throw new Error(`NLM Conditions (ICD-O) ${res.status}`);
    const data = await res.json();

    const extraArr: any[][] = data[3] ?? [];

    return extraArr
      .filter(row => row[1])
      .map(row => ({
        code:    String(row[1]),
        display: String(row[0]),
        system:  'ICDO',
      }));
  } catch (err) {
    console.warn('[codeSearchService] ICD-O search failed:', err);
    return [];
  }
}

// ─── CPT ──────────────────────────────────────────────────────────────────────
// NLM does not have CPT codes (AMA copyright restriction).
// Requires a licensed backend proxy — placeholder until implemented.

export async function searchCpt(_query: string, _maxResults = 20): Promise<CodeResult[]> {
  // TODO: wire to licensed CPT API via backend proxy at VITE_CPT_PROXY_URL
  return [];
}

// ─── Unified dispatcher ───────────────────────────────────────────────────────

export async function searchCodes(
  system: string,
  query: string,
  filter: SnomedFilter = 'all',
  maxResults = 20
): Promise<CodeResult[]> {
  switch (system) {
    case 'SNOMED': return searchSnomed(query, filter, maxResults);
    case 'ICD10':  return searchIcd10(query, maxResults);
    case 'ICD11':  return searchIcd11(query, maxResults);
    case 'LOINC':  return searchLoinc(query, maxResults);
    case 'ICDO':   return searchIcdo(query, maxResults);
    case 'CPT':    return searchCpt(query, maxResults);
    default:       return [];
  }
}
