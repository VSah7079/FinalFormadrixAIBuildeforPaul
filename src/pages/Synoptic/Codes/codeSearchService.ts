// src/pages/Synoptic/Codes/codeSearchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Terminology search abstraction.
// Dev: calls NLM Clinical Tables API directly (no key required).
// Production: swap BASE_URL to your backend proxy — zero frontend changes.
// ─────────────────────────────────────────────────────────────────────────────

export interface CodeResult {
  code: string;
  display: string;
  system: string;
  hierarchy?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
// In production, point this to your backend proxy:
// const BASE_URL = 'https://api.pathscribe.com/terminology';

const NLM_BASE = 'https://clinicaltables.nlm.nih.gov/api';

export type SnomedFilter = 'all' | 'morphology' | 'anatomy' | 'specimen' | 'organism';

// ─── SNOMED CT ────────────────────────────────────────────────────────────────

export async function searchSnomed(
  query: string,
  filter: SnomedFilter = 'all',
  maxResults = 20
): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'code,display',
      ef:      'display',
    });

    // NLM SNOMED uses 'rec_type' for hierarchy filtering
    // These map to NLM's built-in record type filters
    const recTypeMap: Partial<Record<SnomedFilter, string>> = {
      morphology: 'Morphologic abnormality',
      anatomy:    'Body structure',
      specimen:   'Specimen',
      organism:   'Organism',
    };
    const recType = recTypeMap[filter];
    if (recType) params.set('rec_type', recType);

    const url = `${NLM_BASE}/snomed/v3/search?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NLM SNOMED ${res.status}`);
    const data = await res.json();
    console.log('[SNOMED raw]', JSON.stringify(data).slice(0, 300));

    // NLM format: [totalCount, codesArray, null, [displayArray]]
    const codes:    string[]   = data[1] ?? [];
    const extraArr: string[][] = data[3] ?? [];
    const displays: string[]   = extraArr.map((d: string[]) => d[0] ?? '');

    return codes.map((code, i) => ({
      code,
      display: displays[i] ?? code,
      system:  'SNOMED',
    }));
  } catch (err) {
    console.warn('[codeSearchService] SNOMED search failed:', err);
    return [];
  }
}

// ─── ICD-10-CM ────────────────────────────────────────────────────────────────

export async function searchIcd10(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'code,name',
      ef:      'name',
    });
    const res = await fetch(`${NLM_BASE}/icd10cm/v3/search?${params}`);
    if (!res.ok) throw new Error(`NLM ICD-10 ${res.status}`);
    const data = await res.json();

    const codes:    string[]   = data[1] ?? [];
    const extraArr: string[][] = data[3] ?? [];
    const displays: string[]   = extraArr.map((d: string[]) => d[0] ?? '');

    return codes.map((code, i) => ({
      code,
      display: displays[i] ?? code,
      system:  'ICD10',
    }));
  } catch (err) {
    console.warn('[codeSearchService] ICD-10 search failed:', err);
    return [];
  }
}

// ─── ICD-11 ───────────────────────────────────────────────────────────────────
// NLM doesn't yet have ICD-11 — placeholder for WHO API or backend proxy.

export async function searchIcd11(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  // TODO: wire to backend proxy → WHO ICD-11 API (requires OAuth token)
  // POST https://id.who.int/icd/entity/search?q={query}
  return [];
}

// ─── LOINC ────────────────────────────────────────────────────────────────────

export async function searchLoinc(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'LOINC_NUM,LONG_COMMON_NAME',
      ef:      'LONG_COMMON_NAME',
    });
    const res = await fetch(`${NLM_BASE}/loinc/v3/search?${params}`);
    if (!res.ok) throw new Error(`NLM LOINC ${res.status}`);
    const data = await res.json();

    const codes:    string[]   = data[1] ?? [];
    const extraArr: string[][] = data[3] ?? [];
    const displays: string[]   = extraArr.map((d: string[]) => d[0] ?? '');

    return codes.map((code, i) => ({
      code,
      display: displays[i] ?? code,
      system:  'LOINC',
    }));
  } catch (err) {
    console.warn('[codeSearchService] LOINC search failed:', err);
    return [];
  }
}

// ─── ICD-O ────────────────────────────────────────────────────────────────────
// ICD-O-3 (Oncology) — NLM has a small subset, use that for now.

export async function searchIcdo(query: string, maxResults = 20): Promise<CodeResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      terms:   query,
      maxList: String(maxResults),
      df:      'code,display',
    });
    // NLM doesn't have ICD-O directly — fall back to SNOMED morphology subset
    // which covers most oncology codes. Replace with dedicated endpoint when available.
    const res = await fetch(`${NLM_BASE}/snomed/v3/search?${params}&sf=${encodeURIComponent('<< 49755003')}`);
    if (!res.ok) throw new Error(`NLM ICD-O fallback ${res.status}`);
    const data = await res.json();

    const codes:    string[] = data[1] ?? [];
    const displays: string[] = data[3]?.map((d: string[]) => d[0]) ?? [];

    return codes.map((code, i) => ({
      code,
      display: displays[i] ?? code,
      system: 'ICDO',
    }));
  } catch (err) {
    console.warn('[codeSearchService] ICD-O search failed:', err);
    return [];
  }
}

// ─── Unified search dispatcher ────────────────────────────────────────────────

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
    default:       return [];
  }
}
