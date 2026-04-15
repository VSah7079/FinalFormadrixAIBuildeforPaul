// src/services/cases/mockCaseService.ts
// ─────────────────────────────────────────────────────────────
// Realistic mock cases for PathScribe development & QA.
// Each case has coherent patient, specimens, narratives and
// pre-filled synoptic answers using real CAP eCC field IDs.

import { ICaseService } from "./ICaseService";
import { callAi } from '../aiIntegration/aiProviderService';
import { Case, SynopticReportInstance } from "../../types/case/Case";
import { CaseStatus } from "../../types/case/CaseStatus";
import { storageGet, storageSet } from "../mockStorage";

const STORAGE_KEY = 'cases';

// Seed from storage if available, otherwise use MOCK_CASES defined below
// (populated after MOCK_CASES declaration)

const delay = (ms = 30) => new Promise(res => setTimeout(res, ms));

function isoYearsAgo(years: number, month = 6, day = 15): string {
  return new Date(new Date().getFullYear() - years, month - 1, day).toISOString();
}
function isoDaysAgo(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}
function iid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Mock Cases ────────────────────────────────────────────────────────────────

const MOCK_CASES: Case[] = [

  // ── Case 1: Breast Invasive — multi-report, in-progress ──────────────────
  {
    id: 'S26-4401-BX-001',
    accession: { accessionNumber: '4401', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4401-BX-001' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-001', mrn: '100001',
      firstName: 'Grace', lastName: 'Thompson',
      dateOfBirth: isoYearsAgo(52, 3, 14), sex: 'F',
      phone: '555-201-4411', email: 'grace.thompson@example.org',
      address: '14 Maple Ave, Phoenix, AZ 85001',
    },
    specimens: [
      { id: 'S26-4401-SP-1', label: 'A', description: 'Left breast mastectomy', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
      { id: 'S26-4401-SP-2', label: 'B', description: 'Left axillary sentinel lymph node', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Sarah Chen', clinicalIndication: 'Invasive ductal carcinoma, left breast 10 o\'clock, ER+/PR+/HER2 2+. Proceeding to mastectomy following multidisciplinary tumour board recommendation.', receivedDate: isoDaysAgo(3), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "left breast mastectomy" is a 487g specimen, 18.0 × 14.0 × 4.5 cm. The overlying skin ellipse measures 16.0 × 7.0 cm and is unremarkable. Sectioning reveals a firm, stellate, tan-white mass measuring 2.3 × 1.8 × 1.5 cm in the upper outer quadrant, 3.0 cm from the nipple and 2.0 cm from the deep margin. No satellite nodules identified. Remaining breast tissue is fibrofatty.',
      microscopicDescription: 'Sections show invasive carcinoma of no special type (NST), Nottingham grade 2 (tubules 3, nuclei 2, mitoses 1; total score 6). The invasive component measures 2.3 cm. Lymphovascular invasion is not identified. DCIS of intermediate nuclear grade, cribriform pattern, is present at the periphery of the invasive carcinoma, spanning approximately 4 mm. All margins are negative; closest margin is the deep margin at 2.0 mm.',
      ancillaryStudies: 'ER: Positive (Allred score 7/8, 90% strong). PR: Positive (Allred score 6/8, 70% moderate). HER2 IHC: 2+ (equivocal). HER2 ISH: Not amplified (HER2/CEP17 ratio 1.4). Ki-67: 18%. Sentinel lymph node (Specimen B): 1 of 1 node positive for metastatic carcinoma, largest deposit 4.5 mm, no extranodal extension.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4401-SP-1_breast_invasive_001',
        specimenId: 'S26-4401-SP-1',
        templateId: 'breast_invasive',
        templateName: 'CAP Breast Invasive Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'total_mastectomy',
          specimen_laterality: 'left',
          tumor_site: ['upper_outer_quadrant'],
          histologic_type: 'invasive_nst',
          histologic_grade: '2 (score 6)',
          tumor_size: '2.3 cm',
          tumor_focality: 'single_focus',
          lvi: 'lvi_not_identified',
          treatment_effect_breast: 'no_presurgical_therapy',
          treatment_effect_nodes: 'nodes_not_applicable',
          margin_status_invasive: 'all_margins_negative_invasive',
          distance_invasive_to_named_margins: '2.0 mm (deep margin)',
          margin_status_dcis: 'all_margins_negative_dcis',
          regional_ln_status: 'tumor_present_nodes',
          number_ln_macrometastases: '1',
          largest_nodal_met_mm: '4.5',
          extranodal_extension: 'ene_not_identified',
          total_ln_examined: '1',
          sentinel_ln_examined: '1',
        },
        aiSuggestions: {
          procedure:                        { value: 'total_mastectomy',          confidence: 97, source: 'Gross: "left breast mastectomy"',                     verification: 'unverified' },
          specimen_laterality:              { value: 'left',                      confidence: 99, source: 'Gross: "left breast"',                                verification: 'unverified' },
          tumor_site:                       { value: ['upper_outer_quadrant'],    confidence: 91, source: 'Gross: "upper outer quadrant, 3.0 cm from the nipple"',      verification: 'unverified' },
          histologic_type:                  { value: 'invasive_nst',              confidence: 95, source: 'Micro: "invasive carcinoma of no special type"',       verification: 'unverified' },
          histologic_grade:                 { value: '2 (score 6)',               confidence: 88, source: 'Micro: "Nottingham grade 2 (tubules 3, nuclei 2, mitoses 1; total score 6)"', verification: 'unverified' },
          tumor_size:                       { value: '2.3 cm',                    confidence: 96, source: 'Gross: "2.3 × 1.8 × 1.5 cm"',                        verification: 'unverified' },
          tumor_focality:                   { value: 'single_focus',              confidence: 85, source: 'Gross: "No satellite nodules identified"',             verification: 'unverified' },
          lvi:                              { value: 'lvi_not_identified',        confidence: 82, source: 'Micro: "Lymphovascular invasion is not identified"',   verification: 'unverified' },
          treatment_effect_breast:          { value: 'no_presurgical_therapy',    confidence: 78, source: 'No known presurgical therapy mentioned',          verification: 'unverified' },
          treatment_effect_nodes:           { value: 'nodes_not_applicable',      confidence: 72, source: 'No known presurgical therapy mentioned',          verification: 'unverified' },
          margin_status_invasive:           { value: 'all_margins_negative_invasive', confidence: 94, source: 'Micro: "All margins are negative"',               verification: 'unverified' },
          distance_invasive_to_named_margins: { value: '2.0 mm (deep margin)',    confidence: 89, source: 'Micro: "closest margin is the deep margin at 2.0 mm"', verification: 'unverified' },
          margin_status_dcis:               { value: 'all_margins_negative_dcis', confidence: 88, source: 'Micro: "All margins are negative"',                   verification: 'unverified' },
          regional_ln_status:               { value: 'tumor_present_nodes',       confidence: 92, source: 'Ancillary: "1 of 1 node positive for metastatic carcinoma"', verification: 'unverified' },
          number_ln_macrometastases:        { value: '1',                         confidence: 90, source: 'Ancillary: "1 of 1 node positive … deposit 4.5 mm"',  verification: 'unverified' },
          largest_nodal_met_mm:             { value: '4.5',                       confidence: 88, source: 'Ancillary: "largest deposit 4.5 mm"',                 verification: 'unverified' },
          extranodal_extension:             { value: 'ene_not_identified',        confidence: 85, source: 'Ancillary: "no extranodal extension"',                verification: 'unverified' },
          total_ln_examined:                { value: '1',                         confidence: 90, source: 'Ancillary: "1 of 1 node positive"',                   verification: 'unverified' },
          sentinel_ln_examined:             { value: '1',                         confidence: 88, source: 'Specimen B: "Left axillary sentinel lymph node"',      verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'in-progress' as CaseStatus,
    createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'tumor_board_schedule', name: 'Tumor Board — Thu 14:00', color: 'blue',   severity: 3 },
      { id: 'pending_clin_cor',     name: 'Pending Clinical Correlation',              color: 'yellow', severity: 2 },
    ],
    specimenFlags: [
      { id: 'her2_fish_pending', name: 'HER2 ISH Pending',   color: 'blue',   severity: 2 },
      { id: 'ki67_pending',      name: 'Ki-67 Pending',      color: 'green',  severity: 1 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C50.412'], snomed: ['413448000'] },
  },

  // ── Case 2: Colorectal — sigmoid resection, partially filled ─────────────
  {
    id: 'S26-4402-COLON-RES',
    accession: { accessionNumber: '4402', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4402-COLON-RES' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-002', mrn: '100002',
      firstName: 'Robert', lastName: 'Jackson',
      dateOfBirth: isoYearsAgo(67, 8, 22), sex: 'M',
      phone: '555-202-4412', email: 'robert.jackson@example.org',
      address: '88 Desert Rose Blvd, Scottsdale, AZ 85251',
    },
    specimens: [
      { id: 'S26-4402-SP-1', label: 'A', description: 'Sigmoid colon resection', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(2), specimenFlags: [] },
      { id: 'S26-4402-SP-2', label: 'B', description: 'Apical lymph node', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(2), specimenFlags: [] },
    ],
    order: { priority: 'STAT', requestingProvider: 'Dr. Michael Torres', clinicalIndication: 'Sigmoid colon adenocarcinoma diagnosed on colonoscopy biopsy. CT staging: T3N1M0. Proceeding to laparoscopic sigmoid resection.', receivedDate: isoDaysAgo(2), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "sigmoid colon resection" is a segment of sigmoid colon measuring 22.0 cm in length. The serosal surface is smooth and glistening. A fungating, ulcerating tumor measuring 4.5 × 3.2 cm is present on the anterior wall, 9.0 cm from the distal margin and 11.0 cm from the proximal margin. The tumor invades through the muscularis propria into pericolorectal adipose tissue. The circumferential resection margin is 3 mm from the tumor.',
      microscopicDescription: 'Sections show moderately differentiated adenocarcinoma (low grade) infiltrating through the muscularis propria into pericolorectal adipose tissue (pT3). Perineural invasion is present. Lymphovascular invasion is not identified. All surgical margins (proximal, distal, radial) are uninvolved; the closest margin (radial) is 3 mm. 18 lymph nodes identified in the pericolorectal fat; 3 of 18 are positive for metastatic carcinoma, all without extranodal extension (pN1b).',
      ancillaryStudies: 'Mismatch repair proteins by IHC: MLH1, MSH2, MSH6, and PMS2 all retained (mismatch repair proficient, pMMR). KRAS mutation analysis: p.G12D detected. BRAF V600E: Wild type. RAS/RAF panel: Pending.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4402-SP-1_colon_resection_001',
        specimenId: 'S26-4402-SP-1',
        templateId: 'colon_resection',
        templateName: 'CAP Colon & Rectum Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'sigmoidectomy',
          tumor_site: ['sigmoid_colon'],
          histologic_type: 'adenocarcinoma',
          histologic_grade: 'g2',
          tumor_size: '4.5 cm',
          tumor_extent: 'extent_pericolic',
          lvi: ['lvi_not_identified'],
          perineural_invasion: 'pni_present',
          margin_status_invasive: 'all_margins_negative_invasive',
          distance_radial_margin: '3 mm',
          regional_ln_status: 'ln_tumor_present',
          ln_with_tumor: '3',
          ln_examined: '18',
          pT_category: 'pT3',
          pN_category: 'pN1b',
          treatment_effect: 'te_no_presurgical',
        },
        aiSuggestions: {
          procedure:               { value: 'sigmoidectomy',         confidence: 96, source: 'Gross: "sigmoid colon resection … 22 cm segment"',                   verification: 'unverified' },
          tumor_site:              { value: ['sigmoid_colon'],        confidence: 98, source: 'Gross: "anterior wall … sigmoid colon"',                             verification: 'unverified' },
          histologic_type:         { value: 'adenocarcinoma',        confidence: 94, source: 'Micro: "moderately differentiated adenocarcinoma"',                  verification: 'unverified' },
          histologic_grade:        { value: 'g2',                    confidence: 89, source: 'Micro: "moderately differentiated"',                                  verification: 'unverified' },
          tumor_size:              { value: '4.5 cm',                confidence: 95, source: 'Gross: "tumor measuring 4.5 × 3.2 cm"',                              verification: 'unverified' },
          tumor_extent:            { value: 'extent_pericolic',      confidence: 93, source: 'Micro: "invades through muscularis propria into pericolorectal fat"', verification: 'unverified' },
          lvi:                     { value: ['lvi_not_identified'],   confidence: 87, source: 'Micro: "Lymphovascular invasion is not identified"',                  verification: 'unverified' },
          perineural_invasion:     { value: 'pni_present',           confidence: 91, source: 'Micro: "Perineural invasion is present"',                            verification: 'unverified' },
          margin_status_invasive:  { value: 'all_margins_negative_invasive', confidence: 90, source: 'Micro: "All surgical margins … uninvolved"',                 verification: 'unverified' },
          distance_radial_margin:  { value: '3 mm',                  confidence: 85, source: 'Micro: "closest margin (radial) is 3 mm"',                           verification: 'unverified' },
          regional_ln_status:      { value: 'ln_tumor_present',      confidence: 92, source: 'Micro: "3 of 18 are positive for metastatic carcinoma"',              verification: 'unverified' },
          ln_with_tumor:           { value: '3',                     confidence: 92, source: 'Micro: "3 of 18 are positive"',                                       verification: 'unverified' },
          ln_examined:             { value: '18',                    confidence: 94, source: 'Micro: "18 lymph nodes identified"',                                  verification: 'unverified' },
          pT_category:             { value: 'pT3',                   confidence: 93, source: 'Micro: "pT3 — pericolorectal fat invasion"',                         verification: 'unverified' },
          pN_category:             { value: 'pN1b',                  confidence: 88, source: 'Micro: "3 positive nodes — pN1b"',                                   verification: 'unverified' },
          treatment_effect:        { value: 'te_no_presurgical',     confidence: 80, source: 'No presurgical therapy mentioned',                                    verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'in-progress' as CaseStatus,
    createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'oncology_awaiting',   name: 'Oncology Awaiting Report',  color: 'red',    severity: 5 },
      { id: 'stat_rush',           name: 'STAT — Rush Processing',    color: 'red',    severity: 5 },
    ],
    specimenFlags: [
      { id: 'kras_ras_pending',    name: 'KRAS/RAS Panel Pending',    color: 'green',  severity: 2 },
      { id: 'braf_pending',        name: 'BRAF V600E Noted',          color: 'orange', severity: 3 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C18.7'], snomed: ['363346000'] },
  },

  // ── Case 3: Lung — right upper lobe lobectomy, draft ─────────────────────
  {
    id: 'S26-4403',
    accession: { accessionNumber: '4403', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4403' },
    originHospitalId: 'HOSP-002', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-003', mrn: '100003',
      firstName: 'Helen', lastName: 'Williams',
      dateOfBirth: isoYearsAgo(63, 11, 5), sex: 'F',
      phone: '555-203-4413', email: 'helen.williams@example.org',
      address: '230 Cactus Wren Dr, Tempe, AZ 85281',
    },
    specimens: [
      { id: 'S26-4403-SP-1', label: 'A', description: 'Right upper lobe lobectomy', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4403-SP-2', label: 'B', description: 'Station 4R mediastinal lymph nodes', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4403-SP-3', label: 'C', description: 'Station 7 subcarinal lymph nodes', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: { priority: 'STAT', requestingProvider: 'Dr. James Park', clinicalIndication: '2.3 cm right upper lobe solid nodule, PET-avid (SUVmax 8.4). CT-guided biopsy: adenocarcinoma. EGFR/ALK negative. Proceeding to VATS right upper lobectomy.', receivedDate: isoDaysAgo(1), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "right upper lobe" is a lobectomy specimen, 14.0 × 10.0 × 3.5 cm, weighing 180g. The pleural surface is smooth. Sectioning reveals a firm, tan-white, spiculated mass measuring 2.3 × 2.1 × 1.9 cm in the posterior segment, 1.5 cm from the bronchial margin and 0.3 cm from the pleural surface. The remaining lung parenchyma shows mild emphysematous change.',
      microscopicDescription: 'Sections show acinar-predominant adenocarcinoma, IASLC/ATS/ERS grade 2 (moderately differentiated). The invasive component measures 2.3 cm. Visceral pleural invasion is present (PL1, elastic layer). Lymphovascular invasion is not identified. The bronchial margin is negative (1.5 cm). Specimens B and C: 0 of 5 lymph nodes positive for metastatic carcinoma.',
      ancillaryStudies: 'TTF-1: Positive. Napsin A: Positive. p40: Negative. ALK (D5F3): Negative. ROS1: Negative. EGFR mutation: Wild type. KRAS: p.G12C detected. PD-L1 TPS: 45% (22C3 assay). NGS comprehensive panel: Pending.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4403-SP-1_lung_adeno_001',
        specimenId: 'S26-4403-SP-1',
        templateId: 'lung_adeno',
        templateName: 'CAP Lung — Resection',
        status: 'draft',
        answers: {
          procedure: ['lobectomy'],
          specimen_laterality: 'right',
          tumor_site: ['upper_lobe'],
          histologic_type: 'inv_acinar',
          histologic_grade: 'g2',
          tumor_size: '2.3 cm',
          invasive_component_size: '2.3 cm',
          visceral_pleura_invasion: 'vpi_present',
          lymphovascular_invasion: ['lvi_not_identified'],
          regional_ln_status: 'ln_all_negative',
          ln_examined_count: '5',
          ln_with_tumor_count: '0',
          pT_category: 'pT2a',
          pN_category: 'pN0',
          synchronous_tumors: 'sync_not_applicable',
          tumor_focality: 'single_focus',
        },
        aiSuggestions: {
          procedure:               { value: ['lobectomy'],         confidence: 97, source: 'Gross: "right upper lobe … lobectomy specimen"',                       verification: 'unverified' },
          specimen_laterality:     { value: 'right',               confidence: 99, source: 'Gross: "right upper lobe"',                                            verification: 'unverified' },
          tumor_site:              { value: ['upper_lobe'],        confidence: 96, source: 'Gross: "posterior segment … right upper lobe"',                        verification: 'unverified' },
          histologic_type:         { value: 'inv_acinar',          confidence: 95, source: 'Micro: "acinar-predominant adenocarcinoma"',                           verification: 'unverified' },
          histologic_grade:        { value: 'g2',                  confidence: 88, source: 'Micro: "IASLC/ATS/ERS grade 2 (moderately differentiated)"',           verification: 'unverified' },
          tumor_size:              { value: '2.3 cm',              confidence: 95, source: 'Micro: "invasive component measures 2.3 cm"',                          verification: 'unverified' },
          invasive_component_size: { value: '2.3 cm',              confidence: 93, source: 'Micro: "invasive component measures 2.3 cm"',                          verification: 'unverified' },
          visceral_pleura_invasion:{ value: 'vpi_present',         confidence: 82, source: 'Micro: "Visceral pleural invasion is present (PL1, elastic layer)"',   verification: 'unverified' },
          lymphovascular_invasion: { value: ['lvi_not_identified'], confidence: 90, source: 'Micro: "Lymphovascular invasion is not identified"',                  verification: 'unverified' },
          margin_status_invasive:  { value: 'Negative (1.5 cm bronchial margin)', confidence: 92, source: 'Micro: "bronchial margin is negative (1.5 cm)"',        verification: 'unverified' },
          regional_ln_status:      { value: 'ln_all_negative',     confidence: 94, source: 'Micro: "0 of 5 lymph nodes positive"',                                verification: 'unverified' },
          ln_examined_count:       { value: '5',                   confidence: 91, source: 'Micro: "0 of 5 lymph nodes positive"',                                 verification: 'unverified' },
          ln_with_tumor_count:     { value: '0',                   confidence: 94, source: 'Micro: "0 of 5 lymph nodes positive for metastatic carcinoma"',        verification: 'unverified' },
          pT_category:             { value: 'pT2a',                confidence: 85, source: 'Micro: "2.3 cm with pleural invasion — pT2a"',                        verification: 'unverified' },
          pN_category:             { value: 'pN0',                 confidence: 90, source: 'Micro: "0 of 5 lymph nodes positive"',                                 verification: 'unverified' },
          synchronous_tumors:      { value: 'sync_not_applicable', confidence: 80, source: 'Gross: single mass identified',                                        verification: 'unverified' },
          tumor_focality:          { value: 'single_focus',        confidence: 88, source: 'Gross: "spiculated mass … posterior segment"',                        verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'stat_rush',           name: 'STAT — Rush Processing',    color: 'red',    severity: 5 },
      { id: 'thoracic_mdt',        name: 'Thoracic MDT — Fri 09:00', color: 'blue',   severity: 3 },
    ],
    specimenFlags: [
      { id: 'ngs_panel_pending',   name: 'NGS Panel Pending',         color: 'blue',   severity: 3 },
      { id: 'pdl1_pending',        name: 'PD-L1 TPS Noted 45%',      color: 'orange', severity: 2 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C34.11'], snomed: ['254637007'] },
  },

  // ── Case 4: Prostate Needle Biopsy, draft ──────────────────────────────────
  {
    id: 'S26-4404',
    accession: { accessionNumber: '4404', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4404' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-004', mrn: '100004',
      firstName: 'David', lastName: 'Martinez',
      dateOfBirth: isoYearsAgo(71, 5, 30), sex: 'M',
      phone: '555-204-4414', email: 'david.martinez@example.org',
      address: '501 Sun Valley Rd, Mesa, AZ 85201',
    },
    specimens: [
      { id: 'S26-4404-SP-1', label: 'A', description: 'Prostate biopsy — right apex', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4404-SP-2', label: 'B', description: 'Prostate biopsy — right mid', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4404-SP-3', label: 'C', description: 'Prostate biopsy — right base', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4404-SP-4', label: 'D', description: 'Prostate biopsy — left apex', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4404-SP-5', label: 'E', description: 'Prostate biopsy — left mid', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'S26-4404-SP-6', label: 'F', description: 'Prostate biopsy — left base', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Anil Sharma', clinicalIndication: 'PSA 8.4 ng/mL, rising from 5.2 ng/mL 12 months prior. Abnormal DRE: firm nodule right lobe. MRI prostate: PI-RADS 4 lesion right mid-gland. Proceeding to systematic + targeted biopsy.', receivedDate: isoDaysAgo(1), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received in formalin are six containers labeled A through F, each containing prostate needle biopsy cores. Specimen A (right apex): 2 cores, 1.4 and 1.2 cm. Specimen B (right mid): 2 cores, 1.6 and 1.5 cm. Specimen C (right base): 2 cores, 1.8 and 1.6 cm. Specimens D–F (left apex, mid, base): 2 cores each, 1.3–1.7 cm. All cores are grey-white and rubbery.',
      microscopicDescription: 'Specimens A, B, C (right apex, mid, base): Acinar adenocarcinoma (usual type), Gleason score 3+4=7 (Grade Group 2). 4 of 6 cores involved. Maximum % core involvement: 70% (right mid). Perineural invasion present (right mid, right apex). Specimens D, E, F (left apex, mid, base): Benign prostatic tissue with mild chronic inflammation. No carcinoma identified.',
      ancillaryStudies: 'PSMA IHC: Strongly positive in carcinoma foci. PIN-4 cocktail: Confirms adenocarcinoma, loss of basal cells confirmed.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4404-SP-1_prostate_001',
        specimenId: 'S26-4404-SP-1',
        templateId: 'prostate_needle_biopsy',
        templateName: 'CAP Prostate — Needle Biopsy',
        status: 'draft',
        answers: {
          procedure: ['procedure_systematic_biopsy'],
          positive_specimen_locations: ['positive_right'],
          highest_gleason_score: 'gg2_3_4_7',
          sites_with_highest_gleason: ['highest_right'],
          total_number_of_cores: 12,
          number_of_positive_cores: 4,
          greatest_percentage_core_involvement: 'gpc_61_70',
          perineural_invasion: 'pni_present',
          lymphatic_vascular_invasion: 'lvi_not_identified',
          treatment_effect: ['tx_no_known_presurgical_therapy'],
        },
        aiSuggestions: {
          procedure:                    { value: ['procedure_systematic_biopsy'], confidence: 94, source: 'Gross: "six containers … prostate needle biopsy cores A through F"', verification: 'unverified' },
          positive_specimen_locations:  { value: ['positive_right'],              confidence: 90, source: 'Micro: "Specimens A, B, C (right) — carcinoma identified"',           verification: 'unverified' },
          highest_gleason_score:        { value: 'gg2_3_4_7',                     confidence: 93, source: 'Micro: "Gleason score 3+4=7, Grade Group 2"',                         verification: 'unverified' },
          sites_with_highest_gleason:   { value: ['highest_right'],               confidence: 88, source: 'Micro: "right mid … 70% core involvement"',                           verification: 'unverified' },
          total_number_of_cores:        { value: 12,                              confidence: 90, source: 'Gross: "2 cores each" × 6 containers = 12 total',                      verification: 'unverified' },
          number_of_positive_cores:     { value: 4,                               confidence: 88, source: 'Micro: "4 of 6 cores involved on right side"',                         verification: 'unverified' },
          greatest_percentage_core_involvement: { value: 'gpc_61_70',             confidence: 82, source: 'Micro: "Maximum % core involvement: 70% (right mid)"',                verification: 'unverified' },
          perineural_invasion:          { value: 'pni_present',                   confidence: 92, source: 'Micro: "Perineural invasion present (right mid, right apex)"',         verification: 'unverified' },
          lymphatic_vascular_invasion:  { value: 'lvi_not_identified',            confidence: 78, source: 'No lymphovascular invasion mentioned in report',                       verification: 'unverified' },
          treatment_effect:             { value: ['tx_no_known_presurgical_therapy'], confidence: 85, source: 'No presurgical therapy mentioned',                                  verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'urology_mdt',         name: 'Urology MDT Scheduled',    color: 'blue',   severity: 2 },
      { id: 'gleason_upgrade',     name: 'Gleason Upgrade from Bx',  color: 'yellow', severity: 3 },
    ],
    specimenFlags: [
      { id: 'psma_ihc_pending',    name: 'PSMA IHC Noted Positive',  color: 'green',  severity: 1 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C61'], snomed: ['254900004'] },
  },

  // ── Case 5: Breast DCIS — lumpectomy, finalized ───────────────────────────
  {
    id: 'S26-4405',
    accession: { accessionNumber: '4405', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4405' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-005', mrn: '100005',
      firstName: 'Susan', lastName: 'Taylor',
      dateOfBirth: isoYearsAgo(48, 9, 12), sex: 'F',
      phone: '555-205-4415', email: 'susan.taylor@example.org',
      address: '77 Palo Verde Circle, Chandler, AZ 85224',
    },
    specimens: [
      { id: 'S26-4405-SP-1', label: 'A', description: 'Right breast lumpectomy', receivedAt: isoDaysAgo(5), collectedAt: isoDaysAgo(6), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Lisa Wong', clinicalIndication: 'Stereotactic biopsy: DCIS, intermediate grade. Screening mammogram calcifications right upper outer quadrant. Proceeding to wire-localised lumpectomy.', receivedDate: isoDaysAgo(6), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh, wire-localised, labeled "right breast lumpectomy" is a 68g specimen, 7.0 × 5.5 × 3.0 cm. Specimen radiograph confirms calcifications correlating with a firm, white, granular area measuring 1.8 × 1.2 cm in the upper outer quadrant. No discrete mass identified.',
      microscopicDescription: 'Sections show ductal carcinoma in situ (DCIS), intermediate nuclear grade, predominantly cribriform architecture with focal solid areas, spanning 18 mm. Calcifications are present within DCIS foci, correlating with the specimen radiograph. No invasive carcinoma identified. All margins are negative; closest margin is superior at 3 mm. No lymph nodes submitted.',
      ancillaryStudies: 'ER by IHC (DCIS): Positive (strong, diffuse). PR: Positive. HER2 IHC: 1+ (negative). Ki-67: 12%.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4405-SP-1_breast_dcis_001',
        specimenId: 'S26-4405-SP-1',
        templateId: 'breast_dcis_resection',
        templateName: 'CAP Breast DCIS — Resection',
        status: 'finalized',
        answers: {
          procedure: 'excision_less_than_total_mastectomy',
          specimen_laterality: 'right',
          tumor_type: 'dcis_without_invasion',
          tumor_site: ['upper_outer_quadrant'],
          dcis_nuclear_grade: 'grade_2_intermediate',
          dcis_architectural_patterns: ['cribriform'],
          dcis_size_extent: '18 mm',
          dcis_necrosis: 'necrosis_not_identified',
          microcalcifications: ['microcalc_in_dcis'],
          margin_status_dcis: 'all_margins_negative_dcis',
          distance_dcis_to_named_margins: '3 mm (superior)',
          regional_ln_status: 'no_nodes_submitted',
        },
        aiSuggestions: {
          procedure:               { value: 'excision_less_than_total_mastectomy', confidence: 95, source: 'Gross: "right breast lumpectomy … 68g specimen"',                  verification: 'verified' },
          specimen_laterality:     { value: 'right',                               confidence: 99, source: 'Gross: "right breast lumpectomy"',                                  verification: 'verified' },
          tumor_type:              { value: 'dcis_without_invasion',               confidence: 96, source: 'Micro: "No invasive carcinoma identified"',                         verification: 'verified' },
          tumor_site:              { value: ['upper_outer_quadrant'],               confidence: 88, source: 'Gross: "upper outer quadrant"',                                     verification: 'verified' },
          dcis_nuclear_grade:      { value: 'grade_2_intermediate',                confidence: 91, source: 'Micro: "DCIS, intermediate nuclear grade"',                         verification: 'verified' },
          dcis_architectural_patterns: { value: ['cribriform'],                     confidence: 88, source: 'Micro: "predominantly cribriform … focal solid"',                   verification: 'verified' },
          dcis_size_extent:        { value: '18 mm',                               confidence: 93, source: 'Micro: "spanning 18 mm"',                                           verification: 'verified' },
          dcis_necrosis:           { value: 'necrosis_not_identified',             confidence: 75, source: 'No necrosis mentioned in microscopic description',                  verification: 'verified' },
          microcalcifications:     { value: ['microcalc_in_dcis'],                  confidence: 87, source: 'Micro: "Calcifications are present within DCIS foci"',              verification: 'verified' },
          margin_status_dcis:      { value: 'all_margins_negative_dcis',           confidence: 96, source: 'Micro: "All margins are negative"',                                 verification: 'verified' },
          distance_dcis_to_named_margins: { value: '3 mm (superior)',             confidence: 90, source: 'Micro: "closest margin is superior at 3 mm"',                       verification: 'verified' },
          regional_ln_status:      { value: 'no_nodes_submitted',                  confidence: 92, source: 'Micro: "No lymph nodes submitted"',                                  verification: 'verified' },
        },
        createdAt: isoDaysAgo(5), updatedAt: isoDaysAgo(4),
      },
    ],
    status: 'finalized' as CaseStatus,
    createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(0),  // finalized today
    caseFlags: [
      { id: 'second_opinion',      name: 'Second Opinion Requested', color: 'purple', severity: 3 },
    ],
    specimenFlags: [
      { id: 'margins_close',       name: 'Close Margin — 3mm',       color: 'yellow', severity: 3 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['D05.11'], snomed: ['397201007'] },
  },

  // ── Case 6: Breast Invasive — blank form, tests empty state ──────────────
  {
    id: 'S26-4406',
    accession: { accessionNumber: '4406', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4406' },
    originHospitalId: 'HOSP-002', originEnterpriseId: 'ENT-GLOBAL',
    patient: {
      id: 'PAT-006', mrn: '100006',
      firstName: 'Ruth', lastName: 'Anderson',
      dateOfBirth: isoYearsAgo(58, 1, 28), sex: 'F',
      phone: '555-206-4416', email: 'ruth.anderson@example.org',
      address: '320 Ironwood Pl, Gilbert, AZ 85295',
    },
    specimens: [
      { id: 'S26-4406-SP-1', label: 'A', description: 'Left breast core needle biopsy', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: { priority: 'STAT', requestingProvider: 'Dr. Patricia Moore', clinicalIndication: 'Palpable mass left breast 2 o\'clock. Ultrasound: 1.8 cm hypoechoic irregular mass. BIRADS 5. Proceeding to ultrasound-guided core needle biopsy.', receivedDate: isoDaysAgo(1), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received in formalin labeled "left breast core needle biopsy" are 3 cores measuring 1.3, 1.4, and 1.5 cm, grey-white and firm.',
      microscopicDescription: 'Pending.',
      ancillaryStudies: 'Pending.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4406-SP-1_breast_invasive_001',
        specimenId: 'S26-4406-SP-1',
        templateId: 'breast_invasive',
        templateName: 'CAP Breast Invasive Carcinoma — Resection',
        status: 'draft',
        answers: {},
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'stat_rush',           name: 'STAT — Rush Processing',   color: 'red',    severity: 5 },
      { id: 'frozen_section',      name: 'Frozen Section Pending',   color: 'orange', severity: 4 },
    ],
    specimenFlags: [
      { id: 'er_pr_her2_ordered',  name: 'ER/PR/HER2 Ordered',       color: 'blue',   severity: 2 },
    ],
    reportingMode: 'pathscribe',
  },

  // ── Case 7: Colorectal — rectal resection, multi-specimen ─────────────────
  {
    id: 'S26-4407',
    accession: { accessionNumber: '4407', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4407' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-007', mrn: '100007',
      firstName: 'Michael', lastName: 'Chen',
      dateOfBirth: isoYearsAgo(74, 4, 9), sex: 'M',
      phone: '555-207-4417', email: 'michael.chen@example.org',
      address: '88 Mesquite Lane, Peoria, AZ 85345',
    },
    specimens: [
      { id: 'S26-4407-SP-1', label: 'A', description: 'Anterior resection — rectum', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
      { id: 'S26-4407-SP-2', label: 'B', description: 'Mesorectal lymph nodes', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. James Nguyen', clinicalIndication: 'Rectal adenocarcinoma, 8 cm from anal verge. MRI: mrT3N2. Completed neoadjuvant chemoradiotherapy (FOLFOX × 6 + long-course RT). Restaging MRI: good response. Proceeding to low anterior resection.', receivedDate: isoDaysAgo(3), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "anterior resection" is a segment of rectum measuring 18.0 cm in length with attached mesorectum. The mesorectal fascia is intact (complete TME). An ulcerating tumor measuring 2.5 × 2.0 cm is present on the posterior wall, 8.0 cm from the distal margin. The tumor appears to penetrate through the muscularis propria. The circumferential resection margin is 4 mm.',
      microscopicDescription: 'Post-treatment rectal adenocarcinoma with moderate treatment response (Ryan score 2, <5% residual viable carcinoma). Residual carcinoma invades through muscularis propria into pericolorectal adipose tissue (ypT3). Perineural invasion not identified. Lymphovascular invasion not identified. Proximal and distal margins negative. CRM: 4 mm (negative). 14 of 16 lymph nodes show treatment effect only; 2 lymph nodes contain viable metastatic carcinoma (ypN1b).',
      ancillaryStudies: 'MMR IHC: MLH1 loss (abnormal). MSH2: Retained. MSH6: Retained. PMS2: Loss. Pattern consistent with MLH1 promoter hypermethylation (sporadic MSI-H). BRAF V600E: Positive. Lynch syndrome unlikely.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4407-SP-1_colon_resection_001',
        specimenId: 'S26-4407-SP-1',
        templateId: 'colon_resection',
        templateName: 'CAP Colon & Rectum Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'low_anterior_resection',
          tumor_site: ['rectum'],
          histologic_type: 'adenocarcinoma',
          histologic_grade: 'g2',
          treatment_effect: 'te_near_complete',
          tumor_size: '2.5 cm',
          tumor_extent: 'extent_pericolic',
          perineural_invasion: 'pni_not_identified',
          lvi: ['lvi_not_identified'],
          margin_status_invasive: 'all_margins_negative_invasive',
          distance_radial_margin: '4 mm',
          regional_ln_status: 'ln_tumor_present',
          ln_with_tumor: '2',
          ln_examined: '16',
          pT_category: 'pT3',
          pN_category: 'pN1b',
          modified_classification: ['mod_y'],
          mesorectum_evaluation: 'meso_complete',
        },
        aiSuggestions: {
          procedure:               { value: 'low_anterior_resection',  confidence: 95, source: 'Gross: "anterior resection … segment of rectum"',                               verification: 'unverified' },
          tumor_site:              { value: ['rectum'],                 confidence: 98, source: 'Gross: "posterior wall … rectum … 8 cm from distal margin"',                    verification: 'unverified' },
          histologic_type:         { value: 'adenocarcinoma',          confidence: 93, source: 'Micro: "Post-treatment rectal adenocarcinoma"',                                 verification: 'unverified' },
          histologic_grade:        { value: 'g2',                      confidence: 76, source: 'Micro: "moderate treatment response" — pre-treatment grade g2',                 verification: 'unverified' },
          treatment_effect:        { value: 'te_near_complete',        confidence: 94, source: 'Micro: "Ryan score 2, <5% residual viable carcinoma"',                          verification: 'unverified' },
          tumor_size:              { value: '2.5 cm',                  confidence: 91, source: 'Gross: "ulcerating tumor measuring 2.5 × 2.0 cm"',                              verification: 'unverified' },
          tumor_extent:            { value: 'extent_pericolic',        confidence: 93, source: 'Micro: "invades through muscularis propria into pericolorectal fat"',            verification: 'unverified' },
          perineural_invasion:     { value: 'pni_not_identified',      confidence: 88, source: 'Micro: "Perineural invasion not identified"',                                   verification: 'unverified' },
          lvi:                     { value: ['lvi_not_identified'],     confidence: 89, source: 'Micro: "Lymphovascular invasion not identified"',                               verification: 'unverified' },
          margin_status_invasive:  { value: 'all_margins_negative_invasive', confidence: 87, source: 'Micro: "CRM: 4 mm (negative)"',                                          verification: 'unverified' },
          distance_radial_margin:  { value: '4 mm',                   confidence: 87, source: 'Micro: "CRM: 4 mm (negative)"',                                                  verification: 'unverified' },
          regional_ln_status:      { value: 'ln_tumor_present',        confidence: 91, source: 'Micro: "2 lymph nodes contain viable metastatic carcinoma"',                    verification: 'unverified' },
          ln_with_tumor:           { value: '2',                       confidence: 91, source: 'Micro: "2 lymph nodes contain viable metastatic carcinoma"',                    verification: 'unverified' },
          ln_examined:             { value: '16',                      confidence: 92, source: 'Micro: "14 of 16 lymph nodes show treatment effect only"',                      verification: 'unverified' },
          pT_category:             { value: 'pT3',                     confidence: 93, source: 'Micro: "ypT3 — pericolorectal fat invasion"',                                   verification: 'unverified' },
          pN_category:             { value: 'pN1b',                    confidence: 87, source: 'Micro: "2 positive nodes — ypN1b"',                                             verification: 'unverified' },
          modified_classification: { value: ['mod_y'],                 confidence: 85, source: 'Post-treatment specimen — ypT staging applies',                                 verification: 'unverified' },
          mesorectum_evaluation:   { value: 'meso_complete',           confidence: 82, source: 'Gross: "mesorectal fascia is intact (complete TME)"',                           verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'in-progress' as CaseStatus,
    createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'colorectal_mdt',      name: 'Colorectal MDT — Mon 13:00', color: 'blue', severity: 2 },
      { id: 'braf_msi_noted',      name: 'BRAF+ / MSI-H Noted',        color: 'orange', severity: 3 },
    ],
    specimenFlags: [
      { id: 'lynch_reflex',        name: 'Lynch Reflex Testing Done',   color: 'green',  severity: 2 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C20'], snomed: ['363346000'] },
  },

  // ── Case 8: Multi-template — breast invasive + DCIS same case ─────────────
  {
    id: 'S26-4408',
    accession: { accessionNumber: '4408', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4408' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-008', mrn: '100008',
      firstName: 'Carol', lastName: 'Davis',
      dateOfBirth: isoYearsAgo(61, 7, 3), sex: 'F',
      phone: '555-208-4418', email: 'carol.davis@example.org',
      address: '145 Saguaro Way, Glendale, AZ 85301',
    },
    specimens: [
      { id: 'S26-4408-SP-1', label: 'A', description: 'Right breast mastectomy', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(2), specimenFlags: [] },
      { id: 'S26-4408-SP-2', label: 'B', description: 'Right axillary contents', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(2), specimenFlags: [] },
    ],
    order: { priority: 'STAT', requestingProvider: 'Dr. Sarah Chen', clinicalIndication: 'Multifocal right breast carcinoma — index lesion 2.1 cm invasive NST plus extensive DCIS. BRCA1 positive. Opting for bilateral mastectomy.', receivedDate: isoDaysAgo(2), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "right breast mastectomy" is a 512g specimen. Index tumor: stellate tan-white mass 2.1 × 1.9 × 1.7 cm, upper outer quadrant. Surrounding DCIS-suspicious granular tissue spanning approximately 5 cm. Axillary contents contain abundant fibrofatty tissue.',
      microscopicDescription: 'Invasive carcinoma NST, grade 3 (score 9). Extensive high-grade DCIS, comedo type, spanning 52 mm. Lymphovascular invasion identified. All margins negative. Axillary lymph nodes: 2 of 22 positive, largest deposit 8 mm, no extranodal extension.',
      ancillaryStudies: 'ER: Negative. PR: Negative. HER2 IHC: 3+ (positive). Ki-67: 65%.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4408-SP-1_breast_invasive_001',
        specimenId: 'S26-4408-SP-1',
        templateId: 'breast_invasive',
        templateName: 'CAP Breast Invasive Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'total_mastectomy',
          specimen_laterality: 'right',
          tumor_site: ['upper_outer_quadrant'],
          histologic_type: 'invasive_nst',
          histologic_grade: '3 (score 9)',
          tumor_size: '2.1 cm',
          lvi: ['lvi_present'],
          margin_status_invasive: 'all_margins_negative_invasive',
          regional_ln_status: 'tumor_present_nodes',
          number_ln_macrometastases: '2',
          largest_nodal_met_mm: '8',
          extranodal_extension: 'ene_not_identified',
          total_ln_examined: '22',
          treatment_effect_breast: 'no_presurgical_therapy',
          treatment_effect_nodes: 'nodes_not_applicable',
        },
        aiSuggestions: {
          procedure:                { value: 'total_mastectomy',             confidence: 97, source: 'Gross: "right breast mastectomy … 512g specimen"',                        verification: 'unverified' },
          specimen_laterality:      { value: 'right',                        confidence: 99, source: 'Gross: "right breast mastectomy"',                                        verification: 'unverified' },
          tumor_site:               { value: ['upper_outer_quadrant'],       confidence: 90, source: 'Gross: "stellate tan-white mass … upper outer quadrant"',                 verification: 'unverified' },
          histologic_type:          { value: 'invasive_nst',                 confidence: 94, source: 'Micro: "Invasive carcinoma NST, grade 3"',                               verification: 'unverified' },
          histologic_grade:         { value: '3 (score 9)',                  confidence: 96, source: 'Micro: "grade 3 (score 9)"',                                             verification: 'unverified' },
          tumor_size:               { value: '2.1 cm',                       confidence: 93, source: 'Gross: "index tumor … 2.1 × 1.9 × 1.7 cm"',                              verification: 'unverified' },
          lvi:                      { value: ['lvi_present'],                 confidence: 95, source: 'Micro: "Lymphovascular invasion identified"',                             verification: 'unverified' },
          margin_status_invasive:   { value: 'all_margins_negative_invasive', confidence: 91, source: 'Micro: "All margins negative"',                                          verification: 'unverified' },
          regional_ln_status:       { value: 'tumor_present_nodes',          confidence: 95, source: 'Micro: "2 of 22 positive … axillary lymph nodes"',                       verification: 'unverified' },
          number_ln_macrometastases:{ value: '2',                             confidence: 94, source: 'Micro: "2 of 22 positive … largest deposit 8 mm"',                       verification: 'unverified' },
          largest_nodal_met_mm:     { value: '8',                             confidence: 90, source: 'Micro: "largest deposit 8 mm"',                                          verification: 'unverified' },
          extranodal_extension:     { value: 'ene_not_identified',            confidence: 88, source: 'Micro: "no extranodal extension"',                                       verification: 'unverified' },
          total_ln_examined:        { value: '22',                            confidence: 94, source: 'Micro: "2 of 22 … axillary lymph nodes"',                                verification: 'unverified' },
          treatment_effect_breast:  { value: 'no_presurgical_therapy',        confidence: 80, source: 'No presurgical therapy mentioned',                                       verification: 'unverified' },
          treatment_effect_nodes:   { value: 'nodes_not_applicable',          confidence: 78, source: 'No presurgical therapy mentioned',                                       verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
      {
        instanceId: 'S26-4408-SP-1_breast_dcis_001',
        specimenId: 'S26-4408-SP-1',
        templateId: 'breast_dcis_resection',
        templateName: 'CAP Breast DCIS — Resection',
        status: 'draft',
        answers: {
          procedure: 'total_mastectomy',
          specimen_laterality: 'right',
          tumor_type: 'dcis_without_invasion',
          dcis_nuclear_grade: 'grade_3_high',
          dcis_architectural_patterns: ['comedo'],
          dcis_size_extent: '52 mm',
          margin_status_dcis: 'all_margins_negative_dcis',
          regional_ln_status: 'no_nodes_submitted',
        },
        aiSuggestions: {
          procedure:               { value: 'total_mastectomy',          confidence: 97, source: 'Gross: "right breast mastectomy"',                         verification: 'unverified' },
          specimen_laterality:     { value: 'right',                     confidence: 99, source: 'Gross: "right breast mastectomy"',                         verification: 'unverified' },
          tumor_type:              { value: 'dcis_without_invasion',     confidence: 88, source: 'Micro: "Extensive high-grade DCIS, comedo type"',          verification: 'unverified' },
          dcis_nuclear_grade:      { value: 'grade_3_high',              confidence: 95, source: 'Micro: "Extensive high-grade DCIS"',                       verification: 'unverified' },
          dcis_architectural_patterns: { value: ['comedo'],               confidence: 94, source: 'Micro: "high-grade DCIS, comedo type"',                   verification: 'unverified' },
          dcis_size_extent:        { value: '52 mm',                     confidence: 91, source: 'Micro: "DCIS … spanning 52 mm"',                           verification: 'unverified' },
          margin_status_dcis:      { value: 'all_margins_negative_dcis', confidence: 90, source: 'Micro: "All margins negative"',                            verification: 'unverified' },
          regional_ln_status:      { value: 'no_nodes_submitted',        confidence: 70, source: 'DCIS template — node status per invasive report',          verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'oncology_hold',       name: 'Oncology Treatment on Hold', color: 'red',    severity: 5 },
      { id: 'brca1_positive',      name: 'BRCA1 Pathogenic Variant',   color: 'purple', severity: 4 },
      { id: 'stat_rush',           name: 'STAT — Rush Processing',     color: 'red',    severity: 5 },
    ],
    specimenFlags: [
      { id: 'her2_3plus_alert',    name: 'HER2 3+ — Oncology Alert',   color: 'red',    severity: 4 },
      { id: 'ki67_high',           name: 'Ki-67 65% — High',           color: 'orange', severity: 3 },
    ],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C50.411'], snomed: ['413448000'] },
  },

  // ── Case 9: Centennial patient — tests 3-digit age display ───────────────
  {
    id: 'S26-4409',
    accession: { accessionNumber: '4409', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4409' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-009', mrn: '100009',
      firstName: 'Beatrice', lastName: 'Holloway',
      dateOfBirth: isoYearsAgo(100, 1, 3), sex: 'F',
      phone: '555-209-4419', email: '',
      address: '12 Veteran Lane, Phoenix, AZ 85001',
    },
    specimens: [
      { id: 'S26-4409-SP-1', label: 'A', description: 'Left breast lumpectomy', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Sarah Chen', clinicalIndication: 'Breast mass, left upper outer quadrant. 100-year-old female. Core biopsy: invasive carcinoma. Proceeding to lumpectomy.', receivedDate: isoDaysAgo(1), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received fresh labeled "left breast lumpectomy" is a 42g specimen, 6.0 × 4.5 × 2.5 cm. A firm, tan-white, stellate mass measuring 1.4 × 1.1 × 1.0 cm is present in the upper outer quadrant.',
      microscopicDescription: 'Invasive carcinoma of no special type (NST), Nottingham grade 1. Margins negative.',
      ancillaryStudies: 'ER: Positive. PR: Positive. HER2: Negative.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4409-SP-1_breast_invasive_001',
        specimenId: 'S26-4409-SP-1',
        templateId: 'breast_invasive',
        templateName: 'CAP Breast Invasive Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'excision_less_than_total_mastectomy',
          specimen_laterality: 'left',
          histologic_type: 'invasive_nst',
          histologic_grade: '1',
          tumor_size: '1.4 cm',
          margin_status_invasive: 'all_margins_negative_invasive',
          treatment_effect_breast: 'no_presurgical_therapy',
          treatment_effect_nodes: 'nodes_not_applicable',
          lvi: ['lvi_not_identified'],
        },
        aiSuggestions: {
          procedure:              { value: 'excision_less_than_total_mastectomy', confidence: 93, source: 'Gross: "left breast lumpectomy … 42g specimen"',          verification: 'unverified' },
          specimen_laterality:    { value: 'left',                               confidence: 99, source: 'Gross: "left breast lumpectomy"',                           verification: 'unverified' },
          histologic_type:        { value: 'invasive_nst',                       confidence: 95, source: 'Micro: "invasive carcinoma of no special type (NST)"',     verification: 'unverified' },
          histologic_grade:       { value: '1',                                  confidence: 92, source: 'Micro: "Nottingham grade 1"',                               verification: 'unverified' },
          tumor_size:             { value: '1.4 cm',                             confidence: 94, source: 'Gross: "stellate mass measuring 1.4 × 1.1 × 1.0 cm"',     verification: 'unverified' },
          margin_status_invasive: { value: 'all_margins_negative_invasive',      confidence: 91, source: 'Micro: "Margins negative"',                                 verification: 'unverified' },
          treatment_effect_breast:{ value: 'no_presurgical_therapy',             confidence: 80, source: 'No presurgical therapy mentioned',                          verification: 'unverified' },
          treatment_effect_nodes: { value: 'nodes_not_applicable',               confidence: 78, source: 'No presurgical therapy mentioned',                          verification: 'unverified' },
          lvi:                    { value: ['lvi_not_identified'],                confidence: 70, source: 'No lymphovascular invasion mentioned',                      verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'geriatric_patient', name: 'Geriatric Patient — 100y', color: 'purple', severity: 3 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C50.412'], snomed: ['413448000'] },
  },

  // ── Case 10: Neonate (< 1 month) — Product of Conception ─────────────────
  {
    id: 'S26-4410',
    accession: { accessionNumber: '4410', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4410' },
    originHospitalId: 'HOSP-002', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-010', mrn: '100010',
      firstName: 'Baby', lastName: 'Nguyen',
      dateOfBirth: (() => { const d = new Date(); d.setHours(d.getHours() - 4); return d.toISOString(); })(),
      sex: 'F',
      phone: '', email: '',
      address: '',
    },
    specimens: [
      { id: 'S26-4410-SP-1', label: 'A', description: 'Products of conception', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Lisa Wong', clinicalIndication: 'Elective termination of pregnancy at 9 weeks gestation. Products of conception submitted for histological evaluation.', receivedDate: isoDaysAgo(0), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Received in formalin labeled "products of conception" is a 12g aggregate of pale grey-white, friable tissue measuring in aggregate 4.0 × 3.0 × 1.5 cm. Chorionic villi are identified grossly.',
      microscopicDescription: 'Pending.',
      ancillaryStudies: 'Pending.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4410-SP-1_poc_001',
        specimenId: 'S26-4410-SP-1',
        templateId: 'breast_dcis_resection',
        templateName: 'Non-Neoplastic — Default Negative',
        status: 'draft',
        answers: {},
        createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [
      { id: 'poc_case', name: 'Products of Conception', color: 'blue', severity: 2 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
  },

  // ── Case 11: Pending Review — awaiting attending sign-off ────────────────
  {
    id: 'S26-4411',
    accession: { accessionNumber: '4411', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4411' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-011', mrn: '100011',
      firstName: 'Margaret', lastName: 'Foster',
      dateOfBirth: isoYearsAgo(61, 4, 22), sex: 'F',
      phone: '555-211-4421', email: 'margaret.foster@example.org',
      address: '88 Ironwood Dr, Scottsdale, AZ 85251',
    },
    specimens: [
      { id: 'S26-4411-SP-1', label: 'A', description: 'Right breast core needle biopsy', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Sarah Chen', clinicalIndication: 'Suspicious right breast mass 1.5 cm. BI-RADS 5. Ultrasound-guided core needle biopsy.', receivedDate: isoDaysAgo(1), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Three cores, 1.2–1.5 cm, grey-white and firm.',
      microscopicDescription: 'Invasive carcinoma of no special type, Grade 2. ER/PR/HER2 pending.',
      ancillaryStudies: 'ER, PR, HER2 IHC: Pending.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4411-SP-1_breast_invasive_001',
        specimenId: 'S26-4411-SP-1',
        templateId: 'breast_invasive',
        templateName: 'CAP Breast Invasive Carcinoma — Resection',
        status: 'draft',
        answers: {
          procedure: 'excision_less_than_total_mastectomy',
          specimen_laterality: 'right',
          histologic_type: 'invasive_nst',
          histologic_grade: '2',
        },
        aiSuggestions: {
          procedure:           { value: 'excision_less_than_total_mastectomy', confidence: 88, source: 'Gross: "right breast core needle biopsy … 3 cores"',         verification: 'unverified' },
          specimen_laterality: { value: 'right',                               confidence: 99, source: 'Gross: "right breast core needle biopsy"',                   verification: 'unverified' },
          histologic_type:     { value: 'invasive_nst',                        confidence: 93, source: 'Micro: "Invasive carcinoma of no special type, Grade 2"',   verification: 'unverified' },
          histologic_grade:    { value: '2',                                   confidence: 91, source: 'Micro: "Invasive carcinoma of no special type, Grade 2"',   verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0),
      },
    ],
    status: 'pending-review' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0),
    caseFlags: [
      { id: 'awaiting_sign_off',  name: 'Awaiting Attending Sign-off', color: 'yellow', severity: 3 },
      { id: 'ihc_pending',        name: 'ER/PR/HER2 Pending',          color: 'blue',   severity: 2 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C50.411'], snomed: ['413448000'] },
  },

  // ── Case 12: Amended — addendum after finalization ────────────────────────
  {
    id: 'S26-4412',
    accession: { accessionNumber: '4412', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4412' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: {
      id: 'PAT-012', mrn: '100012',
      firstName: 'Harold', lastName: 'Bennett',
      dateOfBirth: isoYearsAgo(58, 9, 15), sex: 'M',
      phone: '555-212-4422', email: 'harold.bennett@example.org',
      address: '203 Cactus Ridge Rd, Mesa, AZ 85201',
    },
    specimens: [
      { id: 'S26-4412-SP-1', label: 'A', description: 'Prostate needle biopsy — right mid', receivedAt: isoDaysAgo(5), collectedAt: isoDaysAgo(6), specimenFlags: [] },
    ],
    order: { priority: 'Routine', requestingProvider: 'Dr. Anil Sharma', clinicalIndication: 'PSA 7.2, PI-RADS 4. Targeted biopsy right mid-gland. Original report amended to update Gleason grade following second opinion review.', receivedDate: isoDaysAgo(6), assignedTo: 'PATH-001' },
    diagnostic: {
      grossDescription: 'Two cores, 1.4 and 1.6 cm.',
      microscopicDescription: 'AMENDED: Acinar adenocarcinoma, Gleason score 3+4=7, Grade Group 2. Original report issued as Gleason 3+3=6 — amended following MDT review.',
      ancillaryStudies: 'PIN-4: Confirms adenocarcinoma.',
    },
    synopticReports: [
      {
        instanceId: 'S26-4412-SP-1_prostate_001',
        specimenId: 'S26-4412-SP-1',
        templateId: 'prostate_needle_biopsy',
        templateName: 'CAP Prostate — Needle Biopsy',
        status: 'finalized',
        answers: {
          procedure: ['procedure_systematic_biopsy'],
          highest_gleason_score: 'gg2_3_4_7',
          total_number_of_cores: 2,
          number_of_positive_cores: 2,
          perineural_invasion: 'pni_not_identified',
          treatment_effect: ['tx_no_known_presurgical_therapy'],
        },
        aiSuggestions: {
          procedure:                  { value: ['procedure_systematic_biopsy'], confidence: 90, source: 'Gross: "Two cores, 1.4 and 1.6 cm … prostate needle biopsy"', verification: 'verified' },
          highest_gleason_score:      { value: 'gg2_3_4_7',                    confidence: 89, source: 'Micro (amended): "Gleason score 3+4=7 — amended from 3+3=6"', verification: 'disputed' },
          total_number_of_cores:      { value: 2,                              confidence: 93, source: 'Gross: "Two cores"',                                            verification: 'verified' },
          number_of_positive_cores:   { value: 2,                              confidence: 91, source: 'Micro: both cores involved by adenocarcinoma',                  verification: 'verified' },
          perineural_invasion:        { value: 'pni_not_identified',           confidence: 75, source: 'No perineural invasion mentioned',                              verification: 'verified' },
          treatment_effect:           { value: ['tx_no_known_presurgical_therapy'], confidence: 85, source: 'No presurgical therapy mentioned',                         verification: 'verified' },
        },
        createdAt: isoDaysAgo(5), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'amended' as CaseStatus,
    createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'amended_report',    name: 'Amended Report',              color: 'purple', severity: 4 },
      { id: 'second_opinion',    name: 'Second Opinion — MDT Review', color: 'blue',   severity: 3 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C61'], snomed: ['254900004'] },
  },

  // ── Pool Cases ──────────────────────────────────────────────────────────────
  {
    id: 'S26-4415-BX-001',
    accession: { accessionNumber: '4415', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4415-BX-001' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: { id: 'PAT-015', mrn: '100015', firstName: 'Robert', lastName: 'Hawkins', dateOfBirth: '1958-11-22T07:00:00.000Z', sex: 'M', phone: '555-301-7711', email: 'rhawkins@example.org', address: '88 Cedar Rd, Phoenix, AZ 85004' },
    specimens: [{ id: 'S26-4415-SP-1', label: 'A', description: 'Sigmoid colon biopsy — three fragments', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] }],
    order: { priority: 'Routine', requestingProvider: 'Dr. Amanda Chen', clinicalIndication: 'Change in bowel habits. Colonoscopy: 15mm polyp sigmoid colon.', receivedDate: isoDaysAgo(0), assignedTo: null },
    diagnostic: { grossDescription: 'Received in formalin labeled "sigmoid colon biopsy" are three tan-pink fragments measuring 0.4–0.8 cm.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: '1',
    poolName: 'Gastrointestinal',
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [], specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,

  {
    id: 'S26-4416-BX-001',
    accession: { accessionNumber: '4416', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4416-BX-001' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: { id: 'PAT-016', mrn: '100016', firstName: 'Linda', lastName: 'Okafor', dateOfBirth: '1971-04-09T07:00:00.000Z', sex: 'F', phone: '555-302-8822', email: 'lokafor@example.org', address: '22 Maple St, Phoenix, AZ 85006' },
    specimens: [{ id: 'S26-4416-SP-1', label: 'A', description: 'Skin punch biopsy — right forearm', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] }],
    order: { priority: 'Routine', requestingProvider: 'Dr. Susan Park', clinicalIndication: 'Pigmented lesion right forearm, irregular border. Rule out melanoma.', receivedDate: isoDaysAgo(1), assignedTo: null },
    diagnostic: { grossDescription: 'Received in formalin labeled "skin punch biopsy right forearm" is a punch biopsy measuring 0.4 cm in diameter and 0.3 cm deep.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: '2',
    poolName: 'Dermatopathology',
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
    caseFlags: [], specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,

  {
    id: 'S26-4417-BX-001',
    accession: { accessionNumber: '4417', accessionPrefix: 'S', accessionYear: 2026, fullAccession: 'S26-4417-BX-001' },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-ACME',
    patient: { id: 'PAT-017', mrn: '100017', firstName: 'Marcus', lastName: 'Delgado', dateOfBirth: '1965-07-30T07:00:00.000Z', sex: 'M', phone: '555-303-9933', email: 'mdelgado@example.org', address: '54 Oak Ave, Phoenix, AZ 85008' },
    specimens: [{ id: 'S26-4417-SP-1', label: 'A', description: 'Colon resection — right hemicolectomy', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] }],
    order: { priority: 'STAT', requestingProvider: 'Dr. Kevin Ng', clinicalIndication: 'Ascending colon adenocarcinoma diagnosed on biopsy. CT: T3N0. STAT — OR case.', receivedDate: isoDaysAgo(0), assignedTo: null },
    diagnostic: { grossDescription: 'Received fresh labeled "right hemicolectomy" is a 28 cm segment of right colon with attached terminal ileum. A fungating tumor measuring 3.8 × 3.2 cm is identified in the ascending colon.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: '1',
    poolName: 'Gastrointestinal',
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [{ id: 'stat_rush', name: 'STAT — Rush Processing', color: 'red', severity: 5 }],
    specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,

  // ══════════════════════════════════════════════════════════════════════════════
  // UK DEMO CASES — Paul Carter (PATH-UK-001), Copilot Mode
  // NHS Trust: Manchester University NHS Foundation Trust
  // Templates: RCPath (en-GB), TNM 9
  // ══════════════════════════════════════════════════════════════════════════════

  // ── UK Case 1: Colorectal — Anterior Resection, in-progress ─────────────────
  {
    id: 'MFT26-8801-CR-RES',
    accession: { accessionNumber: '8801', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8801-CR-RES' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-001', mrn: '200001',
      firstName: 'William', lastName: 'Hartley',
      dateOfBirth: isoYearsAgo(68, 4, 12), sex: 'M',
      phone: '0161 234 5678', email: 'w.hartley@nhs.net',
      address: '14 Deansgate, Manchester, M3 2EX',
      nhsNumber: '485 777 3456',
    },
    specimens: [
      { id: 'MFT26-8801-SP-1', label: 'A', description: 'Anterior resection specimen', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
      { id: 'MFT26-8801-SP-2', label: 'B', description: 'Mesorectal lymph nodes', receivedAt: isoDaysAgo(2), collectedAt: isoDaysAgo(3), specimenFlags: [] },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. James Whitfield',
      clinicalIndication: 'Rectal adenocarcinoma, 7 cm from anal verge. MRI staging: mrT3N1. Completed neoadjuvant long-course chemoradiotherapy. Good radiological response. Proceeding to laparoscopic anterior resection.',
      receivedDate: isoDaysAgo(3),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Received fresh labelled "anterior resection specimen" is a segment of rectum and sigmoid colon measuring 28 cm in length with attached mesorectum. The mesorectal envelope is intact and complete. An ulcerating tumour measuring 3.8 × 2.9 cm is present on the posterior wall, 7 cm from the distal resection margin. The tumour appears to invade into but not through the muscularis propria macroscopically. The circumferential resection margin appears clear. Multiple lymph nodes are identified within the mesorectal fat.',
      microscopicDescription: 'Sections show moderately differentiated adenocarcinoma with evidence of treatment response. Residual tumour invades into the pericolorectal adipose tissue (ypT3). The plane of mesorectal excision is at the level of the mesorectal fascia. Circumferential resection margin clear, closest approach 4 mm. Longitudinal margins clear. No lymphovascular invasion identified. Perineural invasion present. Tumour regression score: TRS 2 (residual cancer with evident tumour regression). 16 lymph nodes identified; 2 of 16 positive for metastatic carcinoma, no extranodal extension (ypN1b).',
      ancillaryStudies: 'Mismatch repair proteins: MLH1, PMS2, MSH2, MSH6 — all nuclear expression intact (MMR proficient). KRAS codon 12/13: p.G12V mutation detected. BRAF V600E: wild type. MSI testing: MS-stable.',
    },
    synopticReports: [
      {
        instanceId: 'MFT26-8801-SP-1_rcpath_colorectal_resection_001',
        specimenId: 'MFT26-8801-SP-1',
        templateId: 'rcpath_colorectal_resection',
        templateName: 'RCPath Colorectal Carcinoma — Resection (Appendix F)',
        status: 'draft',
        answers: {
          specimen_type: 'anterior_resection',
          tumour_site: 'rectum',
          maximum_tumour_diameter_mm: '38',
          tumour_perforation: 'perforation_no',
          relation_to_peritoneal_reflection: 'below_reflection',
          tumour_type: 'adenocarcinoma',
          differentiation: 'well_moderate',
          local_invasion: ['pT3'],
          max_distance_beyond_muscularis_propria_mm: '4',
          plane_of_mesorectal_excision: 'mesorectal_fascia',
          venous_invasion: 'venous_none',
          lymphatic_invasion: 'lymphatic_none',
          perineural_invasion: 'perineural_extramural',
          number_of_lymph_nodes_examined: '16',
          number_of_positive_lymph_nodes: '2',
          tumour_deposits: 'no_deposits',
          longitudinal_margin_involvement: 'longitudinal_not_involved',
          circumferential_margin_involvement: 'crm_not_involved',
          crm_distance_mm: '4',
          tumour_regression_score: 'trs_2',
          pt_category: 'ypT3',
          pn_category: 'ypN1b',
          pm_category: 'pM0',
          resection_status: 'r0',
          mmr_mlh1: 'mlh1_intact',
          mmr_pms2: 'pms2_intact',
          mmr_msh2: 'msh2_intact',
          mmr_msh6: 'msh6_intact',
          msi_status: 'ms_stable',
          kras_status: 'kras_mutant',
          kras_mutation_detail: 'p.G12V',
          braf_v600e: 'braf_absent',
          snomed_topography: 'T68000',
          snomed_morphology: 'M81403',
        },
        aiSuggestions: {
          specimen_type:           { value: 'anterior_resection',        confidence: 96, source: 'Gross: "anterior resection specimen"',                        verification: 'unverified' },
          tumour_site:             { value: 'rectum',                    confidence: 94, source: 'Order: "rectal adenocarcinoma, 7 cm from anal verge"',         verification: 'unverified' },
          maximum_tumour_diameter: { value: '38',                        confidence: 91, source: 'Gross: "3.8 × 2.9 cm"',                                       verification: 'unverified' },
          tumour_perforation:      { value: 'perforation_no',             confidence: 88, source: 'Gross: no perforation mentioned',                             verification: 'unverified' },
          relation_to_peritoneal_reflection: { value: 'below_reflection', confidence: 82, source: 'Order: "7 cm from anal verge"',                               verification: 'unverified' },
          tumour_type_adenocarcinoma: { value: 'adenocarcinoma',          confidence: 98, source: 'Micro: "moderately differentiated adenocarcinoma"',            verification: 'unverified' },
          differentiation:         { value: 'well_moderate',             confidence: 90, source: 'Micro: "moderately differentiated"',                          verification: 'unverified' },
          plane_of_mesorectal_excision: { value: 'mesorectal_fascia',    confidence: 93, source: 'Micro: "plane of mesorectal excision is at the level of the mesorectal fascia"', verification: 'unverified' },
          perineural_invasion:     { value: 'perineural_extramural',     confidence: 85, source: 'Micro: "perineural invasion present"',                         verification: 'unverified' },
          number_of_lymph_nodes:   { value: '16',                        confidence: 92, source: 'Micro: "16 lymph nodes identified"',                           verification: 'unverified' },
          number_of_involved_lymph_nodes: { value: '2',                  confidence: 92, source: 'Micro: "2 of 16 positive"',                                   verification: 'unverified' },
          distance_to_circumferential_margin: { value: '4',              confidence: 88, source: 'Micro: "closest approach 4 mm"',                              verification: 'unverified' },
          preoperative_therapy_response: { value: 'Residual cancer with evident tumour regression (TRS 2)', confidence: 87, source: 'Micro: "TRS 2"',            verification: 'unverified' },
          pT:                      { value: 'ypT3',                      confidence: 90, source: 'Micro: "ypT3"',                                               verification: 'unverified' },
          pN:                      { value: 'ypN1b',                     confidence: 90, source: 'Micro: "ypN1b"',                                              verification: 'unverified' },
          resection_status:        { value: 'r0',                         confidence: 89, source: 'Micro: "Longitudinal margins clear, CRM clear"',               verification: 'unverified' },
          mmr_mlh1:                { value: 'mlh1_intact',               confidence: 96, source: 'Ancillary: "MLH1 nuclear expression intact"',                  verification: 'unverified' },
          kras_mutation:           { value: 'kras_mutant',               confidence: 97, source: 'Ancillary: "p.G12V mutation detected"',                        verification: 'unverified' },
          kras_mutation_specify:   { value: 'p.G12V',                    confidence: 95, source: 'Ancillary: "KRAS codon 12/13: p.G12V"',                       verification: 'unverified' },
          braf_v600e:              { value: 'braf_absent',               confidence: 97, source: 'Ancillary: "BRAF V600E: wild type"',                          verification: 'unverified' },
          snomed_topography:       { value: 'T68000',                    confidence: 92, source: 'SNOMED: Rectum structure',                                    verification: 'unverified' },
          snomed_morphology:       { value: 'M81403',                    confidence: 94, source: 'SNOMED: Adenocarcinoma',                                      verification: 'unverified' },
        },
        createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'in-progress' as CaseStatus,
    createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'mdt_colorectal', name: 'Colorectal MDT — Wed 14:00', color: 'blue', severity: 2 },
      { id: 'kras_result',    name: 'KRAS Result — Oncology Notified', color: 'green', severity: 1 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: {
      icd10: ['C20'],
      snomed: ['413448001'],
    },
  },

  // ── UK Case 2: Prostate — Needle Biopsy, draft ───────────────────────────────
  {
    id: 'MFT26-8802-PR-BX',
    accession: { accessionNumber: '8802', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8802-PR-BX' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-002', mrn: '200002',
      firstName: 'Geoffrey', lastName: 'Barrowclough',
      dateOfBirth: isoYearsAgo(71, 9, 3), sex: 'M',
      phone: '0161 345 6789', email: 'g.barrowclough@nhs.net',
      address: '7 Piccadilly Gardens, Manchester, M1 1RG',
      nhsNumber: '612 345 9087',
    },
    specimens: [
      { id: 'MFT26-8802-SP-1', label: 'A', description: 'Prostate biopsy — right apex', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8802-SP-2', label: 'B', description: 'Prostate biopsy — right mid', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8802-SP-3', label: 'C', description: 'Prostate biopsy — right base', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8802-SP-4', label: 'D', description: 'Prostate biopsy — left apex', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8802-SP-5', label: 'E', description: 'Prostate biopsy — left mid', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8802-SP-6', label: 'F', description: 'Prostate biopsy — left base', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. David Whitmore',
      clinicalIndication: 'PSA 12.4 ng/mL, rising trend. Abnormal DRE: nodule right lobe. mpMRI prostate: PI-RADS 5 lesion right mid-gland, 14 mm. Proceeding to MRI-targeted and systematic transperineal biopsy under general anaesthetic.',
      receivedDate: isoDaysAgo(1),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Received in formalin, six containers labelled A through F. Specimen A (right apex): 2 cores, 17 mm and 14 mm. Specimen B (right mid): 2 cores, 18 mm and 16 mm — targeted cores from PI-RADS 5 lesion. Specimen C (right base): 2 cores, 15 mm and 13 mm. Specimens D–F (left apex, mid, base): 2 cores each, 12–16 mm. All cores are grey-white and rubbery.',
      microscopicDescription: 'Specimens A, B, C (right apex, mid, base): Acinar adenocarcinoma (usual type), Gleason score 4+3=7 (Grade Group 3). 5 of 6 cores involved. Maximum % core involvement: 85% (right mid, targeted core). Perineural invasion present. No seminal vesicle involvement identified on biopsy. Specimens D, E, F (left apex, mid, base): Benign prostatic tissue with mild chronic inflammation. No carcinoma identified.',
      ancillaryStudies: 'PSMA IHC: Strongly positive in carcinoma foci. PIN-4 cocktail (CK5/6, p63, AMACR): Confirms adenocarcinoma, loss of basal cells confirmed.',
    },
    synopticReports: [
      {
        instanceId: 'MFT26-8802-SP-1_rcpath_prostate_biopsy_001',
        specimenId: 'MFT26-8802-SP-1',
        templateId: 'rcpath_prostate_biopsy',
        templateName: 'RCPath Prostate — Needle Biopsy',
        status: 'draft',
        answers: {},
        aiSuggestions: {},
        createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0),
    caseFlags: [
      { id: 'urology_mdt', name: 'Urology MDT — Fri 09:00', color: 'blue', severity: 2 },
      { id: 'psma_positive', name: 'PSMA IHC — Positive', color: 'yellow', severity: 2 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C61'], snomed: [] },
  },

  // ── UK Case 3: Colorectal — Local Excision, pending review ──────────────────
  {
    id: 'MFT26-8803-CR-LOC',
    accession: { accessionNumber: '8803', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8803-CR-LOC' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-003', mrn: '200003',
      firstName: 'Margaret', lastName: 'Ashworth',
      dateOfBirth: isoYearsAgo(58, 7, 19), sex: 'F',
      phone: '0161 456 7890', email: 'm.ashworth@nhs.net',
      address: '22 Oxford Road, Manchester, M13 9PL',
      nhsNumber: '345 678 1234',
    },
    specimens: [
      { id: 'MFT26-8803-SP-1', label: 'A', description: 'Transanal endoscopic microsurgery (TEMS) excision — rectal polyp', receivedAt: isoDaysAgo(3), collectedAt: isoDaysAgo(4), specimenFlags: [] },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. James Whitfield',
      clinicalIndication: 'Sessile rectal polyp, 4 cm, 6 cm from anal verge. Colonoscopy biopsy: tubulovillous adenoma with high-grade dysplasia. Proceeding to TEMS excision.',
      receivedDate: isoDaysAgo(4),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Received fresh labelled "TEMS excision — rectal polyp" is an intact disc of rectal wall measuring 4.2 × 3.8 cm. The mucosal surface shows a sessile polyp measuring 3.9 × 3.5 cm with a villous surface. The deep margin is inked blue. Sectioning reveals the polyp extends to but does not appear to breach the muscularis propria.',
      microscopicDescription: 'Sections show a tubulovillous adenoma with focal areas of invasive adenocarcinoma (well differentiated, pT1). Maximum depth of invasive tumour from muscularis mucosae: 1.8 mm. Width of invasive tumour: 6 mm. Haggitt level: not applicable (sessile). Kikuchi level: sm1. No lymphovascular invasion. No perineural invasion. Deep margin: not involved (clearance 1.2 mm). Peripheral margin: not involved. Tumour budding: Bd1 (3 buds identified). Resection status: R0.',
      ancillaryStudies: 'MMR IHC: MLH1, PMS2, MSH2, MSH6 — all nuclear expression intact.',
    },
    synopticReports: [
      {
        instanceId: 'MFT26-8803-SP-1_rcpath_colorectal_local_excision_001',
        specimenId: 'MFT26-8803-SP-1',
        templateId: 'rcpath_colorectal_local_excision',
        templateName: 'RCPath Colorectal Carcinoma — Local Excision (Appendix D)',
        status: 'draft',
        answers: {
          specimen_type: 'Endoscopic submucosal dissection',
          site_of_tumour: 'Rectum',
          maximum_tumour_diameter: '39',
          tumour_type_adenocarcinoma: 'Yes',
          differentiation: 'Well/moderate',
          local_invasion: ['Submucosa (pT1)'],
          kikuchi_level: 'sm1',
          venous_invasion: 'None',
          lymphatic_invasion: 'None',
          perineural_invasion: 'None',
          tumour_budding: 'Bd1 (<5 buds)',
          margin_peripheral: 'Not involved',
          margin_deep: 'Not involved',
          resection_status: 'Yes (R0)',
          tnm_edition: 'UICC9',
          pT: 'pT1',
          pN: 'pNX',
          snomed_topography: 'T59600',
          snomed_morphology: 'M81403',
        },
        aiSuggestions: {
          specimen_type:       { value: 'Endoscopic submucosal dissection', confidence: 88, source: 'Order: "TEMS excision"', verification: 'unverified' },
          site_of_tumour:      { value: 'Rectum',                          confidence: 95, source: 'Order: "rectal polyp, 6 cm from anal verge"', verification: 'unverified' },
          differentiation:     { value: 'Well/moderate',                   confidence: 90, source: 'Micro: "well differentiated"', verification: 'unverified' },
          local_invasion:      { value: ['Submucosa (pT1)'],               confidence: 88, source: 'Micro: "invasive adenocarcinoma pT1"', verification: 'unverified' },
          kikuchi_level:       { value: 'sm1',                             confidence: 85, source: 'Micro: "Kikuchi level: sm1"', verification: 'unverified' },
          tumour_budding:      { value: 'Bd1 (<5 buds)',                   confidence: 82, source: 'Micro: "Bd1 (3 buds identified)"', verification: 'unverified' },
          margin_deep:         { value: 'Not involved',                    confidence: 90, source: 'Micro: "Deep margin: not involved"', verification: 'unverified' },
          resection_status:    { value: 'Yes (R0)',                        confidence: 92, source: 'Micro: "Resection status: R0"', verification: 'unverified' },
          pT:                  { value: 'pT1',                             confidence: 90, source: 'Micro: "pT1"', verification: 'unverified' },
          snomed_topography:   { value: 'T59600',                         confidence: 90, source: 'SNOMED: Rectum structure', verification: 'unverified' },
          snomed_morphology:   { value: 'M81403',                         confidence: 93, source: 'SNOMED: Adenocarcinoma', verification: 'unverified' },
        },
        createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(1),
      },
    ],
    status: 'pending-review' as CaseStatus,
    createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(1),
    caseFlags: [
      { id: 'second_opinion', name: 'Second Opinion Requested', color: 'blue', severity: 2 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C20'], snomed: ['413448001'] },
  },

  // ── UK Case 4: Prostate — Radical Prostatectomy, draft ──────────────────────
  {
    id: 'MFT26-8804-PR-RP',
    accession: { accessionNumber: '8804', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8804-PR-RP' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-004', mrn: '200004',
      firstName: 'Thomas', lastName: 'Pemberton',
      dateOfBirth: isoYearsAgo(63, 11, 28), sex: 'M',
      phone: '0161 567 8901', email: 't.pemberton@nhs.net',
      address: '45 Wilmslow Road, Manchester, M14 5AQ',
      nhsNumber: '789 012 3456',
    },
    specimens: [
      { id: 'MFT26-8804-SP-1', label: 'A', description: 'Radical prostatectomy specimen', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8804-SP-2', label: 'B', description: 'Right pelvic lymph nodes', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
      { id: 'MFT26-8804-SP-3', label: 'C', description: 'Left pelvic lymph nodes', receivedAt: isoDaysAgo(1), collectedAt: isoDaysAgo(1), specimenFlags: [] },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. David Whitmore',
      clinicalIndication: 'Prostate adenocarcinoma, Gleason 4+3=7, Grade Group 3. PSA 11.2 ng/mL. MRI: T2N0. Proceeding to robot-assisted radical prostatectomy with bilateral pelvic lymph node dissection.',
      receivedDate: isoDaysAgo(1),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Received fresh labelled "radical prostatectomy" is a prostate gland with attached seminal vesicles weighing 54g and measuring 4.8 × 4.2 × 3.9 cm. The external surface is inked (right: red, left: black, anterior: blue). Serial sectioning reveals a firm, grey-white tumour predominantly involving the right mid and base, estimated to occupy 35% of the gland volume. The tumour appears to extend to the inked right posterolateral margin in one section. Bilateral seminal vesicles unremarkable. Bilateral pelvic lymph node packages submitted separately.',
      microscopicDescription: 'Sections show acinar adenocarcinoma, Gleason score 4+3=7 (Grade Group 3). Tumour involves right mid, right base, and right apex. Extraprostatic extension present at right posterolateral aspect, spanning 2.1 mm. Right posterolateral surgical margin positive over 1.2 mm. All other margins clear. No seminal vesicle invasion. No lymphovascular invasion. Right pelvic lymph nodes: 0 of 8 positive. Left pelvic lymph nodes: 0 of 7 positive.',
      ancillaryStudies: 'PIN-4 cocktail: confirms adenocarcinoma. PSMA IHC: positive.',
    },
    synopticReports: [
      {
        instanceId: 'MFT26-8804-SP-1_rcpath_prostate_rp_001',
        specimenId: 'MFT26-8804-SP-1',
        templateId: 'rcpath_prostate_radical_prostatectomy',
        templateName: 'RCPath Prostate — Radical Prostatectomy',
        status: 'draft',
        answers: {},
        aiSuggestions: {},
        createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
      },
    ],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0),
    caseFlags: [
      { id: 'positive_margin', name: 'Positive Surgical Margin', color: 'red', severity: 3 },
      { id: 'urology_mdt', name: 'Urology MDT — Fri 09:00', color: 'blue', severity: 2 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C61'], snomed: [] },
  },

  // ── UK Case 5: Colorectal — Completed/Finalised ──────────────────────────────
  {
    id: 'MFT26-8805-CR-FIN',
    accession: { accessionNumber: '8805', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8805-CR-FIN' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-005', mrn: '200005',
      firstName: 'Patricia', lastName: 'Hollingsworth',
      dateOfBirth: isoYearsAgo(55, 2, 8), sex: 'F',
      phone: '0161 678 9012', email: 'p.hollingsworth@nhs.net',
      address: '8 King Street, Manchester, M2 6AQ',
      nhsNumber: '234 567 8901',
    },
    specimens: [
      { id: 'MFT26-8805-SP-1', label: 'A', description: 'Right hemicolectomy specimen', receivedAt: isoDaysAgo(7), collectedAt: isoDaysAgo(8), specimenFlags: [] },
      { id: 'MFT26-8805-SP-2', label: 'B', description: 'Apical lymph node', receivedAt: isoDaysAgo(7), collectedAt: isoDaysAgo(8), specimenFlags: [] },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. James Whitfield',
      clinicalIndication: 'Caecal adenocarcinoma, colonoscopy biopsy confirmed. CT staging: T3N0M0. Proceeding to laparoscopic right hemicolectomy.',
      receivedDate: isoDaysAgo(8),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Right hemicolectomy specimen, 38 cm in length. Fungating tumour in caecum measuring 5.2 × 4.1 cm. Tumour invades through muscularis propria into pericolorectal fat. All margins clear.',
      microscopicDescription: 'Well differentiated adenocarcinoma, pT3. No lymphovascular invasion. No perineural invasion. 22 lymph nodes; 0 of 22 positive (pN0). CRM clear, 8 mm. R0 resection. MMR proficient.',
      ancillaryStudies: 'MMR IHC: all four proteins retained. MSI: MS-stable. KRAS: wild type. BRAF V600E: wild type.',
    },
    synopticReports: [
      {
        instanceId: 'MFT26-8805-SP-1_rcpath_colorectal_resection_001',
        specimenId: 'MFT26-8805-SP-1',
        templateId: 'rcpath_colorectal_resection',
        templateName: 'RCPath Colorectal Carcinoma — Resection (Appendix F)',
        status: 'draft',
        answers: {
          specimen_type: 'Right hemicolectomy',
          site_of_tumour: 'Caecum',
          maximum_tumour_diameter: '52',
          tumour_type_adenocarcinoma: 'Yes',
          differentiation: 'Well/moderate',
          local_invasion: ['Beyond muscularis propria'],
          venous_invasion: 'None',
          lymphatic_invasion: 'None',
          perineural_invasion: 'None',
          number_of_lymph_nodes: '22',
          number_of_involved_lymph_nodes: '0',
          margin_longitudinal: 'Not involved',
          margin_circumferential: 'Not involved',
          distance_to_circumferential_margin: '8',
          preoperative_therapy_response: 'Not applicable',
          tnm_edition: 'UICC9',
          pT: 'pT3',
          pN: 'pN0',
          pM: 'Not applicable',
          resection_status: 'Yes (R0)',
          mmr_mlh1: 'Yes', mmr_pms2: 'Yes', mmr_msh2: 'Yes', mmr_msh6: 'Yes',
          msi_status: 'MS-stable',
          kras_mutation: 'Absent',
          braf_v600e: 'Absent',
          snomed_topography: 'T59100',
          snomed_morphology: 'M81403',
        },
        aiSuggestions: {},
        createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(5),
      },
    ],
    status: 'finalized' as CaseStatus,
    createdAt: isoDaysAgo(8), updatedAt: isoDaysAgo(5),
    caseFlags: [],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C18.0'], snomed: ['413448001'] },
  },

  // ── UK Case 6: STAT — Colorectal, urgent, unstarted ──────────────────────────
  {
    id: 'MFT26-8806-CR-STAT',
    accession: { accessionNumber: '8806', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8806-CR-STAT' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: {
      id: 'PAT-UK-006', mrn: '200006',
      firstName: 'Edward', lastName: 'Blackwood',
      dateOfBirth: isoYearsAgo(74, 6, 30), sex: 'M',
      phone: '0161 789 0123', email: 'e.blackwood@nhs.net',
      address: '3 Albert Square, Manchester, M2 5PF',
      nhsNumber: '901 234 5678',
    },
    specimens: [
      { id: 'MFT26-8806-SP-1', label: 'A', description: 'Sigmoid colectomy — emergency resection', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] },
    ],
    order: {
      priority: 'STAT',
      requestingProvider: 'Mr. Peter Thornton',
      clinicalIndication: 'Emergency presentation with perforated sigmoid colon. CT: sigmoid mass with free air. Proceeding to emergency Hartmann\'s procedure. Intraoperative finding: perforated sigmoid adenocarcinoma.',
      receivedDate: isoDaysAgo(0),
      assignedTo: 'PATH-UK-001',
    },
    diagnostic: {
      grossDescription: 'Fresh sigmoid colectomy specimen, 18 cm. Perforated tumour, 6.5 × 5.2 cm, on the anterior wall. Perforation site 8 mm in diameter. Tumour invades through full bowel wall thickness.',
      microscopicDescription: 'Pending processing.',
      ancillaryStudies: 'Pending.',
    },
    synopticReports: [],
    status: 'draft' as CaseStatus,
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [
      { id: 'stat_flag', name: 'STAT — Rush Processing', color: 'red', severity: 3 },
      { id: 'perforation', name: 'Tumour Perforation — pT4', color: 'red', severity: 3 },
    ],
    specimenFlags: [],
    reportingMode: 'pathscribe',
    coding: { icd10: ['C18.7'], snomed: [] },
  },

  // ── UK Pool Cases — Manchester University NHS Foundation Trust ───────────────
  {
    id: 'MFT26-8807-POOL',
    accession: { accessionNumber: '8807', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8807-POOL' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: { id: 'PAT-UK-007', mrn: '200007', firstName: 'Susan', lastName: 'Hargreaves', dateOfBirth: isoYearsAgo(62, 5, 14), sex: 'F', phone: '0161 890 1234', email: 's.hargreaves@nhs.net', address: '19 Portland Street, Manchester, M1 3HU', nhsNumber: '345 891 2345' },
    specimens: [{ id: 'MFT26-8807-SP-1', label: 'A', description: 'Sigmoid colon biopsy — three fragments', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] }],
    order: { priority: 'Routine', requestingProvider: 'Dr. Helen Marsden', clinicalIndication: 'Change in bowel habit. Colonoscopy: 18mm sessile polyp sigmoid colon. Biopsy taken.', receivedDate: isoDaysAgo(0), assignedTo: null },
    diagnostic: { grossDescription: 'Received in formalin labelled "sigmoid colon biopsy" are three tan-pink fragments measuring 0.3–0.7 cm.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: 'GI-UK',
    poolName: 'Gastrointestinal',
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [], specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,

  {
    id: 'MFT26-8808-POOL',
    accession: { accessionNumber: '8808', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8808-POOL' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: { id: 'PAT-UK-008', mrn: '200008', firstName: 'Alan', lastName: 'Butterworth', dateOfBirth: isoYearsAgo(77, 3, 22), sex: 'M', phone: '0161 901 2345', email: 'a.butterworth@nhs.net', address: '6 St Anns Square, Manchester, M2 7LP', nhsNumber: '456 902 3456' },
    specimens: [{ id: 'MFT26-8808-SP-1', label: 'A', description: 'Prostate biopsy — right apex', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] },
                { id: 'MFT26-8808-SP-2', label: 'B', description: 'Prostate biopsy — right mid', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] },
                { id: 'MFT26-8808-SP-3', label: 'C', description: 'Prostate biopsy — right base', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] }],
    order: { priority: 'Routine', requestingProvider: 'Mr. David Whitmore', clinicalIndication: 'PSA 9.1 ng/mL. PI-RADS 4 lesion right mid. Proceeding to targeted biopsy.', receivedDate: isoDaysAgo(0), assignedTo: null },
    diagnostic: { grossDescription: 'Three containers labelled A–C, each containing 2 prostate needle biopsy cores, 12–15 mm each.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: 'URO-UK',
    poolName: 'Uropathology',
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [], specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,

  {
    id: 'MFT26-8809-POOL',
    accession: { accessionNumber: '8809', accessionPrefix: 'MFT', accessionYear: 2026, fullAccession: 'MFT26-8809-POOL' },
    originHospitalId: 'HOSP-MFT', originEnterpriseId: 'ENT-MFT',
    patient: { id: 'PAT-UK-009', mrn: '200009', firstName: 'Dorothy', lastName: 'Whitworth', dateOfBirth: isoYearsAgo(49, 8, 5), sex: 'F', phone: '0161 012 3456', email: 'd.whitworth@nhs.net', address: '31 Chapel Street, Salford, M3 5JJ', nhsNumber: '567 013 4567' },
    specimens: [{ id: 'MFT26-8809-SP-1', label: 'A', description: 'Right hemicolectomy — emergency resection', receivedAt: isoDaysAgo(0), collectedAt: isoDaysAgo(0), specimenFlags: [] }],
    order: { priority: 'STAT', requestingProvider: 'Mr. Peter Thornton', clinicalIndication: 'Emergency right hemicolectomy for obstructing caecal mass. CT: suspected adenocarcinoma.', receivedDate: isoDaysAgo(0), assignedTo: null },
    diagnostic: { grossDescription: 'Right hemicolectomy specimen, 32 cm, received fresh. Obstructing tumour in caecum, 5.8 cm. Tumour perforates the serosal surface at one point.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    status: 'pool' as CaseStatus,
    poolId: 'GI-UK',
    poolName: 'Gastrointestinal',
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
    caseFlags: [{ id: 'stat_rush', name: 'STAT — Rush Processing', color: 'red', severity: 5 }],
    specimenFlags: [],
    reportingMode: 'pathscribe', coding: {},
  } as any,
];

// ─── Per-case patient history & similar cases ────────────────────────────────

export interface SimilarCase {
  id: string; accession: string; patient: string; diagnosis: string;
  date: string; similarity: number; site: string; outcome: string;
}

export const mockPatientHistoryMap: Record<string, string> = {
  'S26-4401':
    "S22-4471 (Mar 2022) — Core needle biopsy, left breast 10 o'clock. Dx: Atypical ductal hyperplasia (ADH). ER+/PR+. Excision recommended; patient deferred. | " +
    "S23-7809 (Nov 2023) — Wire-localised excision, left breast. Dx: DCIS intermediate grade, cribriform, 8 mm. Margins clear >2 mm. XRT planned. | " +
    "S25-1104 (Jan 2025) — Screening mammogram bilateral. BI-RADS 3 — short-interval follow-up advised.",
  'S26-4402':
    "S21-8832 (Aug 2021) — Colonoscopy polypectomy, sigmoid colon. Dx: Tubular adenoma, low grade, completely excised. Surveillance in 3 years. | " +
    "S24-0091 (Jan 2024) — Surveillance colonoscopy biopsy, sigmoid colon. Dx: Tubulovillous adenoma with high grade dysplasia. Surgical referral placed. | " +
    "S24-6210 (Jun 2024) — Colonoscopy biopsy, sigmoid mass. Dx: Adenocarcinoma, moderately differentiated. CT staging arranged.",
  'S26-4403':
    "S22-3310 (Apr 2022) — CT-guided core biopsy, right upper lobe nodule 1.1 cm. Dx: Atypical adenomatous hyperplasia. Active surveillance. | " +
    "S24-9912 (Nov 2024) — PET-CT: RUL lesion 2.3 cm SUVmax 8.4. CT-guided biopsy planned. | " +
    "S25-0044 (Jan 2025) — CT-guided needle biopsy, RUL mass. Dx: Adenocarcinoma, acinar predominant. KRAS G12C. Surgical referral.",
  'S26-4404':
    "S20-5541 (Jun 2020) — Prostate needle biopsy x12. Dx: Benign, all cores. PSA 4.1. Annual surveillance. | " +
    "S22-7723 (Sep 2022) — Prostate needle biopsy x12. Dx: Benign with focal PIN. PSA 5.2. 12-month follow-up. | " +
    "S24-3301 (Mar 2024) — MRI prostate PI-RADS 3 right mid-gland. PSA 6.8. Active surveillance continued.",
  'S26-4405':
    "S23-4499 (Jul 2023) — Screening mammogram. BI-RADS 0 — calcifications right UOQ. Recall for additional views. | " +
    "S23-6610 (Sep 2023) — Stereotactic biopsy, right breast calcifications. Dx: DCIS intermediate grade. Lumpectomy + XRT recommended.",
  'S26-4406':
    "S25-8801 (Dec 2025) — Screening mammogram bilateral. BI-RADS 4B right breast mass 2 o'clock. Ultrasound-guided biopsy recommended.",
  'S26-4407':
    "S23-1140 (Feb 2023) — Colonoscopy biopsy, rectal mass 8 cm from AV. Dx: Adenocarcinoma, moderately differentiated. MRI staging: mrT3N2M0. | " +
    "S23-4482 (May 2023) — Restaging post-neoadjuvant FOLFOX + long-course RT. Endoscopy: near-complete response. Pathology: mucin pools, no viable tumour. | " +
    "S25-9901 (Oct 2025) — Surveillance colonoscopy. No anastomotic recurrence. CEA stable 2.1.",
  'S26-4408':
    "S22-0091 (Jan 2022) — BRCA1/2 germline testing: BRCA1 pathogenic variant c.5266dupC. Risk-reducing surgery discussed. | " +
    "S23-9901 (Dec 2023) — MRI screening bilateral. BI-RADS 4C right breast 2.1 cm UOQ. Biopsy arranged. | " +
    "S24-0441 (Jan 2024) — Ultrasound-guided biopsy, right breast 2 o'clock. Dx: Invasive carcinoma NST, Grade 3, HER2 3+. Pre-op pertuzumab/trastuzumab.",
};

export const mockSimilarCasesMap: Record<string, SimilarCase[]> = {
  'S26-4401': [
    { id: 'S25-3301', accession: 'S25-3301', patient: 'Harrison, Mary',    diagnosis: 'Invasive carcinoma NST, Grade 2, 2.1 cm, ER+/PR+/HER2-, pN1(1/3)',       date: '2025-08-14', similarity: 96, site: 'Left breast UOQ',    outcome: 'Finalized' },
    { id: 'S25-1872', accession: 'S25-1872', patient: 'Foster, Diane',     diagnosis: 'Invasive carcinoma NST, Grade 2, 1.8 cm, ER+/PR+/HER2 2+ (FISH neg)',    date: '2025-03-22', similarity: 91, site: 'Left breast',         outcome: 'Finalized' },
    { id: 'S24-7809', accession: 'S24-7809', patient: 'Nelson, Patricia',  diagnosis: 'Invasive lobular carcinoma, Grade 2, 2.6 cm, ER+/PR+/HER2-',             date: '2024-11-08', similarity: 84, site: 'Left breast UIQ',    outcome: 'Finalized' },
    { id: 'S24-4451', accession: 'S24-4451', patient: 'Reed, Barbara',     diagnosis: 'Invasive carcinoma NST, Grade 1, 1.4 cm, ER+/PR+/HER2-, pN0',            date: '2024-06-19', similarity: 79, site: 'Right breast UOQ',   outcome: 'Finalized' },
    { id: 'S23-9103', accession: 'S23-9103', patient: 'Cox, Margaret',     diagnosis: 'Invasive carcinoma NST, Grade 3, 3.1 cm, ER+/PR-/HER2-, pN2(4/14)',      date: '2023-12-01', similarity: 72, site: 'Left breast',         outcome: 'Amended'   },
  ],
  'S26-4402': [
    { id: 'S25-4401', accession: 'S25-4401', patient: 'Butler, George',    diagnosis: 'Adenocarcinoma sigmoid, low grade, pT3N0, pMMR, KRAS G12D',              date: '2025-09-10', similarity: 94, site: 'Sigmoid colon',       outcome: 'Finalized' },
    { id: 'S25-0812', accession: 'S25-0812', patient: 'Simmons, Frank',    diagnosis: 'Adenocarcinoma sigmoid, low grade, pT3N1b(3/18), pMMR',                  date: '2025-05-17', similarity: 89, site: 'Sigmoid colon',       outcome: 'Finalized' },
    { id: 'S24-6631', accession: 'S24-6631', patient: 'Grant, Thomas',     diagnosis: 'Adenocarcinoma descending colon, low grade, pT3N0, MSI-H',               date: '2024-10-03', similarity: 81, site: 'Descending colon',    outcome: 'Finalized' },
    { id: 'S24-2210', accession: 'S24-2210', patient: 'Webb, Arthur',      diagnosis: 'Adenocarcinoma rectosigmoid, pT4aN1a(1/12), pMMR, KRAS wt',             date: '2024-04-22', similarity: 74, site: 'Rectosigmoid',        outcome: 'Finalized' },
    { id: 'S23-8814', accession: 'S23-8814', patient: 'Murray, Charles',   diagnosis: 'Mucinous adenocarcinoma sigmoid, high grade, pT3N2b, MSI-H',             date: '2023-08-15', similarity: 67, site: 'Sigmoid colon',       outcome: 'Finalized' },
  ],
  'S26-4403': [
    { id: 'S25-5501', accession: 'S25-5501', patient: 'Fleming, Barbara',  diagnosis: 'Adenocarcinoma RUL, acinar predominant, Grade 2, pT1cN0, KRAS G12C',     date: '2025-10-05', similarity: 95, site: 'Right upper lobe',    outcome: 'Finalized' },
    { id: 'S25-2219', accession: 'S25-2219', patient: 'Gibson, Anne',      diagnosis: 'Adenocarcinoma LUL, lepidic/acinar, Grade 2, pT2aN0, EGFR exon 19 del', date: '2025-06-11', similarity: 87, site: 'Left upper lobe',     outcome: 'Finalized' },
    { id: 'S24-8802', accession: 'S24-8802', patient: 'Hawkins, Sandra',   diagnosis: 'Adenocarcinoma RUL, papillary predominant, Grade 3, pT2bN1, ALK+',       date: '2024-12-20', similarity: 80, site: 'Right upper lobe',    outcome: 'Finalized' },
    { id: 'S24-3318', accession: 'S24-3318', patient: 'Preston, Judith',   diagnosis: 'Adenocarcinoma RLL, acinar, Grade 2, pT1bN0, KRAS G12V',                date: '2024-07-08', similarity: 73, site: 'Right lower lobe',    outcome: 'Finalized' },
    { id: 'S23-7741', accession: 'S23-7741', patient: 'Lawson, Shirley',   diagnosis: 'Invasive mucinous adenocarcinoma RUL, Grade 1, pT3N0, KRAS G12D',        date: '2023-11-14', similarity: 65, site: 'Right upper lobe',    outcome: 'Finalized' },
  ],
  'S26-4404': [
    { id: 'S25-6601', accession: 'S25-6601', patient: 'Carpenter, James',  diagnosis: 'Acinar adenocarcinoma, Gleason 3+4=7 (GG2), 5/12 cores, PNI present',   date: '2025-11-02', similarity: 97, site: 'Prostate bilateral',   outcome: 'Finalized' },
    { id: 'S25-3318', accession: 'S25-3318', patient: 'Stone, Edward',     diagnosis: 'Acinar adenocarcinoma, Gleason 3+4=7 (GG2), 4/12 cores, PNI absent',    date: '2025-07-19', similarity: 92, site: 'Prostate right',       outcome: 'Finalized' },
    { id: 'S24-9912', accession: 'S24-9912', patient: 'Walsh, Joseph',     diagnosis: 'Acinar adenocarcinoma, Gleason 4+3=7 (GG3), 6/12 cores, PNI present',   date: '2024-09-30', similarity: 84, site: 'Prostate bilateral',   outcome: 'Finalized' },
    { id: 'S24-5514', accession: 'S24-5514', patient: 'Ryan, Patrick',     diagnosis: 'Acinar adenocarcinoma, Gleason 3+3=6 (GG1), 2/12 cores, PNI absent',    date: '2024-05-14', similarity: 76, site: 'Prostate right',       outcome: 'Finalized' },
    { id: 'S23-8801', accession: 'S23-8801', patient: 'Kennedy, William',  diagnosis: 'Acinar adenocarcinoma, Gleason 4+4=8 (GG4), 8/12 cores, PNI present',   date: '2023-10-07', similarity: 68, site: 'Prostate bilateral',   outcome: 'Finalized' },
  ],
  'S26-4405': [
    { id: 'S25-4402', accession: 'S25-4402', patient: 'Palmer, Christine', diagnosis: 'DCIS intermediate grade, cribriform, 15 mm, margins clear >3 mm',       date: '2025-08-21', similarity: 95, site: 'Right breast UOQ',    outcome: 'Finalized' },
    { id: 'S25-1101', accession: 'S25-1101', patient: 'Gardner, Frances',  diagnosis: 'DCIS intermediate grade, solid/cribriform, 22 mm, closest margin 2 mm', date: '2025-04-09', similarity: 88, site: 'Left breast',         outcome: 'Finalized' },
    { id: 'S24-7712', accession: 'S24-7712', patient: 'Burton, Jean',      diagnosis: 'DCIS high grade, comedo, 11 mm, margins clear',                         date: '2024-10-17', similarity: 79, site: 'Right breast UIQ',    outcome: 'Finalized' },
  ],
  'S26-4406': [
    { id: 'S25-3301', accession: 'S25-3301', patient: 'Harrison, Mary',    diagnosis: 'Invasive carcinoma NST, Grade 2, 2.1 cm, ER+/PR+/HER2-, pN1(1/3)',       date: '2025-08-14', similarity: 82, site: 'Left breast UOQ',    outcome: 'Finalized' },
    { id: 'S24-7809', accession: 'S24-7809', patient: 'Nelson, Patricia',  diagnosis: 'Invasive lobular carcinoma, Grade 2, 2.6 cm, ER+/PR+/HER2-',             date: '2024-11-08', similarity: 74, site: 'Left breast UIQ',    outcome: 'Finalized' },
  ],
  'S26-4407': [
    { id: 'S25-8801', accession: 'S25-8801', patient: 'Sherman, Harold',   diagnosis: 'Rectal adenocarcinoma post-CRT, ypT2N0, Ryan score 2, pMMR',             date: '2025-09-22', similarity: 93, site: 'Rectum',             outcome: 'Finalized' },
    { id: 'S25-3309', accession: 'S25-3309', patient: 'Gibson, Walter',    diagnosis: 'Rectal adenocarcinoma post-CRT, ypT3N1b(2/14), Ryan score 2, MSI-H',    date: '2025-04-15', similarity: 88, site: 'Rectum',             outcome: 'Finalized' },
    { id: 'S24-7809', accession: 'S24-7809', patient: 'Cross, Ralph',      diagnosis: 'Rectal adenocarcinoma post-CRT, ypT0N0 (pCR), Ryan score 0',             date: '2024-08-30', similarity: 79, site: 'Rectum',             outcome: 'Finalized' },
    { id: 'S24-2201', accession: 'S24-2201', patient: 'Hunt, Ernest',      diagnosis: 'Rectal adenocarcinoma post-CRT, ypT3N2b(5/16), Ryan score 3, pMMR',     date: '2024-02-11', similarity: 71, site: 'Rectum',             outcome: 'Finalized' },
  ],
  'S26-4408': [
    { id: 'S25-7701', accession: 'S25-7701', patient: 'Holt, Virginia',    diagnosis: 'Invasive carcinoma NST, Grade 3, 2.4 cm, ER-/PR-/HER2 3+, pN0, BRCA1+', date: '2025-10-11', similarity: 96, site: 'Right breast',        outcome: 'Finalized' },
    { id: 'S25-4410', accession: 'S25-4410', patient: 'Warren, Dorothy',   diagnosis: 'Invasive carcinoma NST, Grade 3, 1.9 cm, ER-/PR-/HER2 3+, pN1(2/15)',   date: '2025-06-28', similarity: 91, site: 'Left breast',         outcome: 'Finalized' },
    { id: 'S24-9801', accession: 'S24-9801', patient: 'Fowler, Evelyn',    diagnosis: 'Invasive carcinoma NST, Grade 3, 3.3 cm, ER-/PR-/HER2 3+, pN2, BRCA2+', date: '2024-11-14', similarity: 85, site: 'Left breast UIQ',    outcome: 'Amended'   },
    { id: 'S24-3309', accession: 'S24-3309', patient: 'Hawkins, Mildred',  diagnosis: 'Invasive carcinoma NST, Grade 3, 2.8 cm, ER+/PR-/HER2 3+, pN1(1/8)',    date: '2024-05-03', similarity: 77, site: 'Right breast',        outcome: 'Finalized' },
  ],
};

const DEFAULT_HISTORY = 'No prior pathology cases on record for this patient.';
const DEFAULT_SIMILAR: SimilarCase[] = [];

export function getSimilarCases(caseId: string): SimilarCase[] {
  return mockSimilarCasesMap[caseId] ?? DEFAULT_SIMILAR;
}
export function getPatientHistory(caseId: string): string {
  return mockPatientHistoryMap[caseId] ?? DEFAULT_HISTORY;
}

// Legacy static exports
export const mockSimilarCases = mockSimilarCasesMap['S26-4401'] ?? [];
export const mockPatientHistory = mockPatientHistoryMap['S26-4401'] ?? DEFAULT_HISTORY;


// ─── Persisted case store ─────────────────────────────────────────────────────
// Version bump here forces a re-seed whenever mock data changes structurally.
// Increment MOCK_VERSION whenever MOCK_CASES fields are added/changed.
const MOCK_VERSION = '7'; // bumped: US prior pathology + SNOMED matching added
const VERSION_KEY  = 'pathscribe_mock_cases_version';

const storedVersion = localStorage.getItem(VERSION_KEY);
if (storedVersion !== MOCK_VERSION) {
  // Stale data — wipe and re-seed from MOCK_CASES
  localStorage.removeItem('pathscribe_mock_' + STORAGE_KEY);
  localStorage.setItem(VERSION_KEY, MOCK_VERSION);
}

const stored = localStorage.getItem('pathscribe_mock_' + STORAGE_KEY);
let CASES: Case[] = stored ? JSON.parse(stored) : null;
if (!CASES) {
  CASES = JSON.parse(JSON.stringify(MOCK_CASES));
  storageSet(STORAGE_KEY, CASES);
}

// ─── AI Suggestion Generator ─────────────────────────────────────────────────
// Called when a template is first attached to a case (no prior aiSuggestions).
// Uses the Anthropic API to analyse the gross/micro/ancillary text and return
// field-level suggestions with confidence scores and source citations.

export async function generateAiSuggestionsForReport(
  caseData: Case,
  templateId: string,
  templateFields: Array<{ id: string; label: string; options?: Array<{ id: string; label: string }> }>
): Promise<Record<string, { value: string | string[]; confidence: number; source: string; verification: 'unverified' }>> {
  const fieldList = templateFields.map(f => {
    const opts = f.options?.map(o => `${o.id} (${o.label})`).join(', ');
    return opts ? `- ${f.id} | ${f.label} | options: [${opts}]` : `- ${f.id} | ${f.label} | free text`;
  }).join('\n');

  const prompt = `You are a pathology AI assistant. Analyse the following pathology case text and suggest answers for each synoptic field.

CASE ID: ${caseData.id}
GROSS DESCRIPTION: ${caseData.diagnostic?.grossDescription ?? '—'}
MICROSCOPIC DESCRIPTION: ${caseData.diagnostic?.microscopicDescription ?? '—'}
ANCILLARY STUDIES: ${caseData.diagnostic?.ancillaryStudies ?? '—'}

SYNOPTIC FIELDS (id | label | allowed option ids):
${fieldList}

Return ONLY a JSON object (no markdown, no preamble) with this exact structure for every field you can answer:
{
  "field_id": {
    "value": "option_id_or_free_text_string",
    "confidence": 85,
    "source": "Short quote from the case text that supports this answer"
  }
}

Rules:
- value must be an option id (not the label) when options are listed, or a plain string for free text
- For checkboxes/multi-select fields, value may be an array of option ids
- confidence is 0–100 based on how clearly the text supports the answer
- source is a short (≤12 word) direct quote or paraphrase from gross/micro/ancillary
- Only include fields you can answer with reasonable confidence (≥30)
- Do NOT invent findings not present in the text`;

  try {
    const { text: raw } = await callAi({
      system: 'You are a pathology AI assistant. You return only valid JSON — no markdown, no preamble.',
      prompt,
    });
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Stamp every field with verification: 'unverified'
    const result: Record<string, any> = {};
    for (const [fieldId, sug] of Object.entries(parsed) as any) {
      result[fieldId] = { ...sug, verification: 'unverified' };
    }
    return result;
  } catch (e) {
    console.error('[PathScribe] AI suggestion generation failed:', e);
    return {};
  }
}

// ─── Migrate stored cases: backfill aiSuggestions from MOCK_CASES ────────────
// Runs once after load. If a stored synopticReport instance is missing
// aiSuggestions, it copies them from the matching MOCK_CASES entry.
// This is safe to run on every boot — it only fills gaps, never overwrites.
(function migratAiSuggestions() {
  let mutated = false;
  CASES.forEach(storedCase => {
    const mockCase = MOCK_CASES.find(m => m.id === storedCase.id);
    if (!mockCase?.synopticReports) return;
    storedCase.synopticReports?.forEach(storedReport => {
      const mockReport = mockCase.synopticReports!.find(m => m.instanceId === storedReport.instanceId);
      if (mockReport && (mockReport as any).aiSuggestions && !(storedReport as any).aiSuggestions) {
        (storedReport as any).aiSuggestions = (mockReport as any).aiSuggestions;
        mutated = true;
      }
    });
  });
  if (mutated) storageSet(STORAGE_KEY, CASES);
})();

// ─── AI Feedback Logger ──────────────────────────────────────────────────────
// Records every user correction/confirmation so the AI can learn over time.
// In production this would POST to your ML feedback endpoint.
// For now it persists to localStorage so corrections survive refresh and
// can be bulk-exported when a real endpoint is available.

export interface AiFeedbackEntry {
  timestamp: string;
  caseId: string;
  instanceId: string;
  templateId: string;
  fieldId: string;
  fieldLabel: string;
  aiValue: string | string[];
  aiConfidence: number;
  userValue: string | string[];
  action: 'confirmed' | 'overridden' | 'missed';
  source: string;
}

const FEEDBACK_KEY = 'pathscribe_ai_feedback';

export function recordAiFeedback(entry: AiFeedbackEntry): void {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const log: AiFeedbackEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    // Keep last 500 entries to avoid unbounded growth
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(log));
    console.info('[PathScribe AI] Feedback recorded:', entry.action, entry.fieldId,
      entry.action === 'overridden'
        ? `AI said "${entry.aiValue}" → user chose "${entry.userValue}"`
        : `"${entry.aiValue}" confirmed`
    );
  } catch (e) {
    console.error('[PathScribe AI] Failed to record feedback', e);
  }
}

export function getAiFeedbackLog(): AiFeedbackEntry[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Persist updated aiSuggestions for a single report instance ──────────────
// Called after every field change so override/confirmed state is durable.
export async function saveReportSuggestions(
  caseId: string,
  instanceId: string,
  suggestions: Record<string, import('../../types/case/Case').AiFieldSuggestion>
): Promise<void> {
  const c = CASES.find(x => x.id === caseId);
  if (!c) return;
  const report = c.synopticReports?.find(r => r.instanceId === instanceId);
  if (!report) return;
  (report as any).aiSuggestions = suggestions;
  report.updatedAt = new Date().toISOString();
  storageSet(STORAGE_KEY, CASES);
}

// ─── Service ──────────────────────────────────────────────────────────────────

// ─── Delegation & Pool Claim Functions ───────────────────────────────────────

const CLAIM_TTL_MS        = 30_000;
const DELEGATION_STORE_KEY = 'ps_delegations_v1';
const CLAIM_STORE_KEY      = 'ps_claims_v1';

export interface ClaimResult {
  success: boolean;
  claimedBy?: string;
  error?: string;
}

export interface DelegationRecord {
  id: string;
  caseId: string;
  fromUserId: string;
  toUserId?: string;
  toPoolId?: string;
  toPoolName?: string;
  delegationType: string;
  note?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'passed' | 'completed';
}

function loadDelegations(): DelegationRecord[] {
  try { return JSON.parse(localStorage.getItem(DELEGATION_STORE_KEY) ?? '[]'); } catch { return []; }
}
function saveDelegations(records: DelegationRecord[]): void {
  try { localStorage.setItem(DELEGATION_STORE_KEY, JSON.stringify(records)); } catch {}
}
function loadClaims(): Record<string, { userId: string; expiresAt: number }> {
  try { return JSON.parse(localStorage.getItem(CLAIM_STORE_KEY) ?? '{}'); } catch { return {}; }
}
function saveClaims(claims: Record<string, { userId: string; expiresAt: number }>): void {
  try { localStorage.setItem(CLAIM_STORE_KEY, JSON.stringify(claims)); } catch {}
}

/** Attempt to claim a pool case before showing accept/pass prompt */
export async function claimPoolCase(caseId: string, userId: string): Promise<ClaimResult> {
  await delay(200);
  const claims = loadClaims();
  const existing = claims[caseId];
  if (existing && existing.expiresAt > Date.now() && existing.userId !== userId) {
    return { success: false, claimedBy: existing.userId, error: 'Case is being claimed by another pathologist' };
  }
  claims[caseId] = { userId, expiresAt: Date.now() + CLAIM_TTL_MS };
  saveClaims(claims);
  return { success: true };
}

/** Accept a pool case — assigns to pathologist, removes from pool */
export async function acceptPoolCase(caseId: string, userId: string): Promise<void> {
  await delay(300);
  const claims = loadClaims();
  delete claims[caseId];
  saveClaims(claims);
  // Update case in CASES array
  const idx = CASES.findIndex((c: any) => c.id === caseId);
  if (idx >= 0) {
    CASES[idx] = { ...CASES[idx], status: 'in-progress' as CaseStatus, order: { ...CASES[idx].order, assignedTo: userId }, updatedAt: new Date().toISOString() } as any;
    storageSet(STORAGE_KEY, CASES);
  }
  const delegations = loadDelegations();
  const delIdx = delegations.findIndex(d => d.caseId === caseId && d.status === 'pending');
  if (delIdx >= 0) { delegations[delIdx].status = 'accepted'; saveDelegations(delegations); }
}

/** Pass on a pool case — release claim, case stays in pool */
export async function passPoolCase(caseId: string): Promise<void> {
  await delay(200);
  const claims = loadClaims();
  delete claims[caseId];
  saveClaims(claims);
}

/** Delegate a case to an individual or pool */
export async function delegateCase(
  caseId: string,
  fromUserId: string,
  delegationType: string,
  toUserId?: string,
  toPoolId?: string,
  toPoolName?: string,
  note?: string,
): Promise<DelegationRecord> {
  await delay(400);
  const record: DelegationRecord = {
    id: Math.random().toString(36).slice(2),
    caseId, fromUserId, toUserId, toPoolId, toPoolName, delegationType,
    note, timestamp: new Date().toISOString(), status: 'pending',
  };
  const idx = CASES.findIndex((c: any) => c.id === caseId);
  if (idx >= 0) {
    const newStatus: CaseStatus = delegationType === 'POOL' ? 'pool'
      : delegationType === 'REASSIGN' ? 'in-progress'
      : 'pending-review';
    CASES[idx] = {
      ...CASES[idx],
      status: newStatus,
      ...(toPoolId   ? { poolId: toPoolId }     : {}),
      ...(toPoolName ? { poolName: toPoolName }  : {}),
      order: { ...CASES[idx].order, assignedTo: toUserId ?? CASES[idx].order?.assignedTo },
      updatedAt: new Date().toISOString(),
    } as any;
    storageSet(STORAGE_KEY, CASES);
  }
  const delegations = loadDelegations();
  delegations.push(record);
  saveDelegations(delegations);
  return record;
}

/** Get delegation history, optionally filtered by case */
export async function getDelegations(caseId?: string): Promise<DelegationRecord[]> {
  await delay(100);
  const all = loadDelegations();
  return caseId ? all.filter(d => d.caseId === caseId) : all;
}

// ─── Synoptic-level Assignment ────────────────────────────────────────────────

export interface SynopticAssignment {
  caseId: string;
  instanceId: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedAt: string;
  requiresCountersign: boolean;
  note?: string;
}

/** Assign a specific synoptic report instance to another pathologist */
export async function assignSynoptic(
  caseId: string,
  instanceId: string,
  assignedTo: string,
  assignedToName: string,
  assignedBy: string,
  requiresCountersign = true,
  note?: string,
): Promise<void> {
  await delay(300);
  const idx = CASES.findIndex((c: any) => c.id === caseId);
  if (idx < 0) return;
  const reportIdx = (CASES[idx].synopticReports ?? []).findIndex(
    (r: any) => r.instanceId === instanceId
  );
  if (reportIdx < 0) return;

  const updated = { ...CASES[idx] };
  const reports = [...(updated.synopticReports ?? [])];
  reports[reportIdx] = {
    ...reports[reportIdx],
    assignedTo,
    assignedToName,
    assignedBy,
    assignedAt: new Date().toISOString(),
    requiresCountersign,
    assignmentNote: note,
    status: 'draft',
  };
  updated.synopticReports = reports;
  CASES[idx] = updated as any;
  storageSet(STORAGE_KEY, CASES);

  // Record delegation entry
  const record: DelegationRecord = {
    id: Math.random().toString(36).slice(2),
    caseId, fromUserId: assignedBy, toUserId: assignedTo,
    delegationType: 'SYNOPTIC_ASSIGN',
    note, timestamp: new Date().toISOString(), status: 'pending',
  };
  const delegations = loadDelegations();
  delegations.push(record);
  saveDelegations(delegations);
}

/** Countersign a synoptic that was finalised by an assigned pathologist */
export async function countersignSynoptic(
  caseId: string,
  instanceId: string,
  countersignedBy: string,
): Promise<void> {
  await delay(300);
  const idx = CASES.findIndex((c: any) => c.id === caseId);
  if (idx < 0) return;
  const reportIdx = (CASES[idx].synopticReports ?? []).findIndex(
    (r: any) => r.instanceId === instanceId
  );
  if (reportIdx < 0) return;

  const updated = { ...CASES[idx] };
  const reports = [...(updated.synopticReports ?? [])];
  reports[reportIdx] = {
    ...reports[reportIdx],
    countersignedBy,
    countersignedAt: new Date().toISOString(),
    status: 'finalized',
  };
  updated.synopticReports = reports;
  CASES[idx] = updated as any;
  storageSet(STORAGE_KEY, CASES);
}

// ─── Pathologist ID → Name map ────────────────────────────────────────────────
// Matches the assignedTo IDs used in MOCK_CASES orders.
const PATHOLOGIST_NAMES: Record<string, string> = {
  'PATH-001': 'Dr. Sarah Chen',
  'PATH-002': 'Dr. Michael Torres',
  'PATH-003': 'Dr. Anil Sharma',
  'PATH-004': 'Dr. Linda Park',
  'PATH-005': 'Dr. James Nguyen',
  'PATH-UK-001': 'Dr. Paul Carter',
  'PATH-UK-002': 'Dr. Oliver Pemberton',
};

// ─── Patient History ──────────────────────────────────────────────────────────
// Prior pathology for known patients, keyed by MRN.
// This is the "query input" the AI uses to find similar cases.

export interface PatientHistoryCase {
  id: string;
  date: string;
  diagnosis: string;
  site: string;
  procedure: string;
  physician: string;
  receptors: string;
  ki67: string;
  margins: string;
  nodes: string;
  gross: string;
  microscopic: string;
  comment: string;
  tags: string[];
  // Internal fields used by the similarity scorer
  _templateId?: string;
  _grade?: number;
  _erPositive?: boolean;
  _her2Positive?: boolean;
  _snomedMorphology?: string[];  // SNOMED CT concept IDs for morphology matching
}

export const MOCK_PRIOR_PATHOLOGY: Record<string, PatientHistoryCase[]> = {
  // ── US patients ───────────────────────────────────────────────────────────

  // Robert Jackson — MRN 100002 — Colorectal (current: sigmoid resection)
  '100002': [
    {
      id: 'S23-09812',
      date: 'Jun 18, 2023',
      diagnosis: 'Tubular adenoma with low grade dysplasia — surveillance colonoscopy',
      site: 'Sigmoid colon',
      procedure: 'Colonoscopic polypectomy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '< 15%', margins: 'Clear', nodes: 'Not sampled',
      gross: 'Single pedunculated polyp 1.4 cm. Pink-tan mucosal surface.',
      microscopic: 'Tubular adenoma with low grade dysplasia. No high grade dysplasia or invasive carcinoma. Stalk margin clear.',
      comment: 'Tubular adenoma completely excised. 3-year colonoscopic surveillance recommended.',
      tags: ['Adenoma', 'Low grade dysplasia', 'Polypectomy', 'Complete excision'],
      _templateId: 'colon_resection', _grade: 1, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['413448000', '363346000'],
    },
  ],

  // Helen Williams — MRN 100003 — Lung (current: VATS right upper lobectomy)
  '100003': [
    {
      id: 'S24-11203',
      date: 'Aug 29, 2024',
      diagnosis: 'Adenocarcinoma of lung — CT-guided core biopsy, acinar predominant',
      site: 'Right upper lobe, subpleural nodule',
      procedure: 'CT-guided core needle biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '32%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Two core biopsies each 1.4 cm × 2 mm. Submitted entirely.',
      microscopic: 'Moderately differentiated adenocarcinoma, acinar predominant pattern. TTF-1 positive.',
      comment: 'Pulmonary adenocarcinoma confirmed. EGFR/ALK/ROS1 negative. Referral to thoracic surgery for VATS resection.',
      tags: ['Lung adenocarcinoma', 'Acinar', 'EGFR−', 'ALK−', 'Pre-surgical biopsy'],
      _templateId: 'lung_resection', _grade: 2, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['254637007', '413448000'],
    },
  ],

  // David Martinez — MRN 100004 — Prostate (current: TRUS biopsy)
  '100004': [
    {
      id: 'S22-08871',
      date: 'Apr 12, 2022',
      diagnosis: 'Benign prostatic tissue — no malignancy. HGPIN in 1 core.',
      site: 'Prostate, bilateral',
      procedure: 'TRUS-guided 12-core biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '< 2%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: '12 core biopsies submitted by anatomical site.',
      microscopic: 'Benign prostatic glands with focal chronic prostatitis. High-grade PIN in 1 core. No invasive carcinoma.',
      comment: 'No malignancy. HGPIN in 1 core — rebiopsy recommended. PSA 5.1 ng/mL.',
      tags: ['Benign', 'HGPIN', 'No malignancy', 'Surveillance'],
      _templateId: 'prostate_biopsy', _grade: 1, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['399068003'],
    },
  ],

  // Susan Taylor — MRN 100005 — Breast DCIS (current: wire-localised lumpectomy)
  '100005': [
    {
      id: 'S23-31102',
      date: 'Nov 14, 2023',
      diagnosis: 'DCIS — intermediate nuclear grade, cribriform pattern — stereotactic biopsy',
      site: 'Right breast, upper outer quadrant — microcalcifications',
      procedure: 'Stereotactic vacuum-assisted biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'ER+ (85%), PR+ (60%), HER2−', ki67: '12%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Multiple vacuum-assisted biopsy cores aggregating 2.8 cm.',
      microscopic: 'DCIS, intermediate nuclear grade, cribriform and micropapillary patterns, with calcifications. No invasive carcinoma.',
      comment: 'DCIS confirmed. ER/PR positive. Wire-localised excision recommended.',
      tags: ['DCIS', 'Intermediate grade', 'ER+', 'Cribriform', 'Pre-excision biopsy'],
      _templateId: 'breast_dcis_resection', _grade: 2, _erPositive: true, _her2Positive: false,
      _snomedMorphology: ['413448000', '397201007'],
    },
  ],

  // Carol Davis — MRN 100008 — Breast bilateral mastectomy (BRCA1)
  '100008': [
    {
      id: 'S24-19034',
      date: 'Jan 22, 2024',
      diagnosis: 'Invasive NST carcinoma, Grade III, right breast — core biopsy',
      site: 'Right breast, 10 o\'clock, 2.1 cm mass',
      procedure: 'Ultrasound-guided core needle biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'ER− PR− HER2 2+ (equivocal)', ki67: '68%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Four core biopsies each 1.6 cm.',
      microscopic: 'High grade invasive carcinoma of no special type. Marked nuclear pleomorphism, frequent mitoses. Nottingham grade 3.',
      comment: 'High grade triple-negative-like breast carcinoma. BRCA1 germline testing recommended.',
      tags: ['Grade III', 'ER−', 'HER2 equivocal', 'BRCA1 testing', 'High Ki-67'],
      _templateId: 'breast_invasive', _grade: 3, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['413448000', '254838004'],
    },
  ],

  // Ruth Anderson — MRN 100006 — Breast core biopsy
  '100006': [
    {
      id: 'S24-22341',
      date: 'Sep 5, 2024',
      diagnosis: 'Fibrocystic changes with apocrine metaplasia — no atypia',
      site: 'Left breast, 9 o\'clock position',
      procedure: 'Ultrasound-guided core needle biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '< 3%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Three core biopsies each 1.2 cm. Submitted entirely.',
      microscopic: 'Fibrocystic changes with apocrine metaplasia and mild adenosis. No atypia. No malignancy.',
      comment: 'Benign fibrocystic changes. Clinical and imaging follow-up recommended.',
      tags: ['Benign', 'Fibrocystic', 'No atypia', 'Surveillance'],
      _templateId: 'breast_invasive', _grade: 1, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['413448000'],
    },
  ],

  // Michael Chen — MRN 100007 — Colorectal (current: anterior resection)
  '100007': [
    {
      id: 'S24-16782',
      date: 'Jul 14, 2024',
      diagnosis: 'Rectal adenocarcinoma — staging biopsy, moderately differentiated',
      site: 'Rectum, 8 cm from anal verge',
      procedure: 'Flexible sigmoidoscopy biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '48%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Four fragments of rectal mucosa 0.3–0.6 cm. Submitted entirely.',
      microscopic: 'Moderately differentiated adenocarcinoma infiltrating the submucosa. No lymphovascular invasion in the biopsy.',
      comment: 'Rectal adenocarcinoma confirmed. CT staging: mrT3N1. Referred for neoadjuvant chemoradiotherapy.',
      tags: ['Rectal adenocarcinoma', 'Grade 2', 'Staging biopsy', 'Pre-treatment'],
      _templateId: 'colon_resection', _grade: 2, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['363346000', '413448000'],
    },
    {
      id: 'S21-09234',
      date: 'Mar 22, 2021',
      diagnosis: 'Tubulovillous adenoma with low grade dysplasia',
      site: 'Sigmoid colon',
      procedure: 'Colonoscopic polypectomy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '< 20%', margins: 'Clear', nodes: 'Not sampled',
      gross: 'Pedunculated polyp 1.8 cm. Submitted entirely.',
      microscopic: 'Tubulovillous adenoma (villous component 25%) with low grade dysplasia. Stalk margin clear.',
      comment: 'Completely excised. 3-year surveillance recommended.',
      tags: ['Tubulovillous adenoma', 'Low grade', 'Complete excision'],
      _templateId: 'colon_resection', _grade: 1, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['413448009'],
    },
  ],

  // Beatrice Holloway — MRN 100009 — Breast lumpectomy
  '100009': [
    {
      id: 'S25-41102',
      date: 'Feb 8, 2025',
      diagnosis: 'Invasive lobular carcinoma, Grade I — core biopsy',
      site: 'Left breast, upper outer quadrant',
      procedure: 'Ultrasound-guided core needle biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'ER+ (100%), PR+ (85%), HER2−', ki67: '6%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Three core biopsies each 1.3 cm. Submitted entirely.',
      microscopic: 'Invasive lobular carcinoma, classic type, single file pattern. Nottingham grade 1. E-cadherin negative.',
      comment: 'ER/PR strongly positive, HER2 negative. Low Ki-67. Excellent hormone receptor profile. Wire-localised lumpectomy planned.',
      tags: ['Invasive lobular', 'Grade I', 'ER+', 'PR+', 'HER2−', 'Low Ki-67'],
      _templateId: 'breast_invasive', _grade: 1, _erPositive: true, _her2Positive: false,
      _snomedMorphology: ['413448002', '254838004'],
    },
  ],

  // Margaret Foster — MRN 100011 — Breast core biopsy
  '100011': [
    {
      id: 'S25-38871',
      date: 'Dec 3, 2025',
      diagnosis: 'Invasive ductal carcinoma, Grade III — core biopsy',
      site: 'Right breast, upper inner quadrant',
      procedure: 'Ultrasound-guided core needle biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'ER− PR− HER2 3+ (positive)', ki67: '72%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: 'Four core biopsies each 1.5 cm. Submitted entirely.',
      microscopic: 'High grade invasive ductal carcinoma, Nottingham grade 3. Marked pleomorphism, brisk mitotic activity.',
      comment: 'HER2-positive, hormone receptor-negative. HER2 FISH confirmed amplified. Anti-HER2 therapy eligible.',
      tags: ['Grade III', 'ER−', 'HER2+', 'High Ki-67', 'Anti-HER2 eligible'],
      _templateId: 'breast_invasive', _grade: 3, _erPositive: false, _her2Positive: true,
      _snomedMorphology: ['413448000', '254838004'],
    },
  ],

  // Harold Bennett — MRN 100012 — Prostate biopsy
  '100012': [
    {
      id: 'S20-14432',
      date: 'Aug 19, 2020',
      diagnosis: 'Benign prostatic tissue — no malignancy',
      site: 'Prostate, bilateral',
      procedure: 'TRUS-guided 12-core biopsy',
      physician: 'Dr. S. Johnson',
      receptors: 'N/A', ki67: '< 1%', margins: 'N/A (biopsy)', nodes: 'Not sampled',
      gross: '12 core biopsies submitted by anatomical site.',
      microscopic: 'Benign prostatic glands with focal benign prostatic hyperplasia. No PIN. No invasive carcinoma.',
      comment: 'No malignancy. PSA 4.2 ng/mL. Annual PSA surveillance recommended.',
      tags: ['Benign', 'BPH', 'No malignancy', 'Surveillance'],
      _templateId: 'prostate_biopsy', _grade: 1, _erPositive: false, _her2Positive: false,
      _snomedMorphology: ['399068003'],
    },
  ],

  // ── Grace Thompson — MRN 100001 (existing entry) ──────────────────────────
  '100001': [
    {
      id: 'S24-04821',
      date: 'Mar 14, 2024',
      diagnosis: 'Invasive Ductal Carcinoma, Grade II',
      site: 'Right breast, upper outer quadrant',
      procedure: 'Core needle biopsy',
      physician: 'Dr. A. Patel',
      receptors: 'ER+ (95%), PR+ (80%), HER2−',
      ki67: '18%',
      margins: 'N/A (biopsy)',
      nodes: 'Not sampled',
      gross: 'Core needle biopsy, 3 cores each 1.4 cm in length. Tan-white firm tissue submitted in entirety.',
      microscopic: 'Sections show invasive carcinoma of ductal type arranged in nests and cords with moderate nuclear pleomorphism. Mitotic rate 8/10 HPF. No lymphovascular invasion identified.',
      comment: 'Morphology and IHC profile consistent with invasive ductal carcinoma, Grade II (Nottingham score 6). Recommend correlation with clinical and imaging findings.',
      tags: ['ER+', 'PR+', 'HER2−', 'Grade II', 'Core biopsy'],
      _templateId: 'breast_invasive', _grade: 2, _erPositive: true, _her2Positive: false,
      _snomedMorphology: ['413448000', '254838004'],
    },
    {
      id: 'S23-17340',
      date: 'Oct 3, 2023',
      diagnosis: 'Atypical Ductal Hyperplasia',
      site: 'Left breast, 2 o\'clock position',
      procedure: 'Excisional biopsy',
      physician: 'Dr. T. Nguyen',
      receptors: 'N/A',
      ki67: '< 5%',
      margins: 'Clear (> 2 mm)',
      nodes: 'Not sampled',
      gross: 'Excisional biopsy specimen 2.8 × 1.9 × 1.2 cm. Grey-white fibrous tissue with a small firm nodule centrally.',
      microscopic: 'Sections reveal ductal proliferation with architectural atypia involving fewer than 2 complete duct spaces. Features fall short of DCIS quantitatively. No invasive carcinoma identified.',
      comment: 'Atypical ductal hyperplasia. Excision with clear margins. Recommend 6-month surveillance imaging and high-risk clinical assessment.',
      tags: ['ADH', 'Excision', 'Clear margins', 'Surveillance'],
      _templateId: 'breast_dcis_resection', _grade: 1, _erPositive: true, _her2Positive: false,
    },
    {
      id: 'S22-02190',
      date: 'Feb 9, 2022',
      diagnosis: 'Fibroadenoma, Benign',
      site: 'Right breast, 10 o\'clock position',
      procedure: 'Fine needle aspiration',
      physician: 'Dr. J. Kim',
      receptors: 'N/A',
      ki67: '< 2%',
      margins: 'N/A (FNA)',
      nodes: 'Not sampled',
      gross: 'Fine needle aspirate submitted in CytoLyt fixative. Adequate cellularity on review.',
      microscopic: 'Smears show cohesive sheets of benign ductal epithelial cells with bipolar bare nuclei in a clean background. Features consistent with fibroadenoma.',
      comment: 'Benign fibroepithelial lesion consistent with fibroadenoma. No malignant cells identified. Clinical correlation recommended.',
      tags: ['Benign', 'Fibroadenoma', 'FNA', 'No atypia'],
      _templateId: 'breast_invasive', _grade: 1, _erPositive: false, _her2Positive: false,
    },
    {
      id: 'S20-08855',
      date: 'Jun 22, 2020',
      diagnosis: 'Fibrocystic Changes, No Atypia',
      site: 'Bilateral',
      procedure: 'Core biopsy',
      physician: 'Dr. A. Patel',
      receptors: 'N/A',
      ki67: 'N/A',
      margins: 'N/A',
      nodes: 'Not sampled',
      gross: 'Bilateral core biopsies submitted in formalin. Grey-tan fibrous tissue.',
      microscopic: 'Sections show fibrocystic changes with apocrine metaplasia, adenosis, and mild ductal hyperplasia of usual type. No atypia. No malignancy identified.',
      comment: 'Benign fibrocystic changes bilaterally. Routine screening follow-up recommended.',
      tags: ['Benign', 'Fibrocystic', 'No atypia', 'Bilateral'],
      _templateId: 'breast_invasive', _grade: 1, _erPositive: false, _her2Positive: false,
    },
  ],
};

// ─── AI Similar Case Matching ─────────────────────────────────────────────────
// In production this calls callAi() with the patient's history as context and
// the case corpus as the search space. In mock/dev mode we score deterministically
// by comparing synoptic answers against the patient's most recent malignant case.

export interface AiMatchedCase {
  caseId: string;
  accession: string;
  patientInitials: string;
  date: string;
  diagnosis: string;
  site: string;
  procedure: string;
  receptors: string;
  ki67: string;
  matchPct: number;
  matchReason: string;
  // Full report fields for detail view
  physician: string;
  margins: string;
  nodes: string;
  gross: string;
  microscopic: string;
  ancillaryStudies: string;
  tags: string[];
}

/**
 * Scores a case's synoptic answers against the patient's most recent
 * malignant prior pathology entry. Returns 0–100.
 *
 * Scoring weights (must sum to 100):
 *   templateId match (same organ system)  → 30 pts
 *   grade match                            → 25 pts
 *   ER status match                        → 20 pts
 *   HER2 status match                      → 15 pts
 *   site/laterality overlap                → 10 pts
 */
function scoreCaseAgainstHistory(
  c: Case,
  anchor: PatientHistoryCase,
): number {
  const reports = c.synopticReports ?? [];
  if (reports.length === 0) return 0;

  const report = reports[0];
  const answers = report.answers ?? {};
  const ancillary = (c.diagnostic?.ancillaryStudies ?? '').toLowerCase();
  const micro = (c.diagnostic?.microscopicDescription ?? '').toLowerCase();

  let score = 0;

  // 1. SNOMED morphology match (35 pts) — most clinically specific signal
  const caseSnomedCodes = (c as any).coding?.snomed ?? [];
  if (anchor._snomedMorphology && anchor._snomedMorphology.length > 0 && caseSnomedCodes.length > 0) {
    const overlap = anchor._snomedMorphology.filter((code: string) =>
      caseSnomedCodes.includes(code)
    );
    if (overlap.length > 0) {
      score += 35; // exact morphology match
    } else {
      // Check if same organ system via templateId as fallback
      if (anchor._templateId && report.templateId === anchor._templateId) score += 10;
    }
  } else if (anchor._templateId && report.templateId === anchor._templateId) {
    score += 20; // no SNOMED — fall back to template match
  } else if (
    anchor._templateId?.startsWith('breast') &&
    report.templateId?.startsWith('breast')
  ) {
    score += 12;
  }

  // 2. Template / organ system (25 pts when SNOMED unavailable)
  if (!(anchor._snomedMorphology && anchor._snomedMorphology.length > 0)) {
    if (anchor._templateId && report.templateId === anchor._templateId) score += 25;
    else if (anchor._templateId?.startsWith('breast') && report.templateId?.startsWith('breast')) score += 15;
  }

  // 3. Grade match (20 pts)
  const rawGrade = answers['histologic_grade'] as string | undefined;
  let caseGrade: number | null = null;
  if (rawGrade) {
    if (rawGrade.includes('1') || rawGrade === 'g1') caseGrade = 1;
    else if (rawGrade.includes('2') || rawGrade === 'g2') caseGrade = 2;
    else if (rawGrade.includes('3') || rawGrade === 'g3') caseGrade = 3;
  }
  if (anchor._grade && caseGrade !== null) {
    if (caseGrade === anchor._grade) score += 20;
    else if (Math.abs(caseGrade - anchor._grade) === 1) score += 10;
  }

  // 4. ER status (10 pts)
  const erPositive =
    ancillary.includes('er: positive') || ancillary.includes('er+') ||
    micro.includes('er+') ||
    String(answers['receptor_status'] ?? '').includes('er_positive');
  if (anchor._erPositive !== undefined) {
    if (erPositive === anchor._erPositive) score += 10;
    else score += 2;
  }

  // 5. HER2 status (5 pts)
  const her2Positive =
    ancillary.includes('her2 3+') || ancillary.includes('her2: positive') ||
    ancillary.includes('her2+') || ancillary.includes('ish: amplified');
  if (anchor._her2Positive !== undefined) {
    if (her2Positive === anchor._her2Positive) score += 5;
    else score += 1;
  }

  // 6. Site / laterality (5 pts)
  const laterality = String(answers['specimen_laterality'] ?? '').toLowerCase();
  const anchorSite = anchor.site.toLowerCase();
  if (laterality && anchorSite.includes(laterality)) score += 5;
  else if (laterality === 'left' || laterality === 'right') score += 2;

  return Math.min(score, 100);
}

function buildMatchReason(c: Case, anchor: PatientHistoryCase): string {
  const reasons: string[] = [];
  const reports = c.synopticReports ?? [];
  const answers = reports[0]?.answers ?? {};
  const ancillary = (c.diagnostic?.ancillaryStudies ?? '').toLowerCase();

  // SNOMED morphology match — strongest signal
  const caseSnomedCodes = (c as any).coding?.snomed ?? [];
  if (anchor._snomedMorphology && anchor._snomedMorphology.length > 0) {
    const overlap = anchor._snomedMorphology.filter((code: string) =>
      caseSnomedCodes.includes(code)
    );
    if (overlap.length > 0) reasons.push('Matching SNOMED morphology');
  }

  if (reports[0]?.templateId === anchor._templateId) reasons.push('Same histologic type');
  else if (reports[0]?.templateId?.startsWith('breast') && anchor._templateId?.startsWith('breast')) {
    reasons.push('Same organ system');
  }

  const rawGrade = answers['histologic_grade'] as string | undefined;
  if (rawGrade) {
    const gradeNum = rawGrade.includes('1') ? 1 : rawGrade.includes('2') ? 2 : rawGrade.includes('3') ? 3 : null;
    if (gradeNum === anchor._grade) reasons.push(`Matching Grade ${gradeNum}`);
    else if (gradeNum !== null) reasons.push(`Adjacent grade (${gradeNum} vs ${anchor._grade})`);
  }

  const erPositive = ancillary.includes('er: positive') || ancillary.includes('er+');
  if (erPositive && anchor._erPositive) reasons.push('ER+ profile');
  else if (!erPositive && !anchor._erPositive) reasons.push('ER− profile');

  const her2Positive = ancillary.includes('her2 3+') || ancillary.includes('ish: amplified');
  if (her2Positive && anchor._her2Positive) reasons.push('HER2+ profile');
  else if (!her2Positive && !anchor._her2Positive) reasons.push('HER2− profile');

  return reasons.slice(0, 3).join(' · ') || 'Morphologic similarity';
}

function buildTags(c: Case, matchPct: number): string[] {
  const tags: string[] = [];
  const ancillary = (c.diagnostic?.ancillaryStudies ?? '').toLowerCase();
  const answers = c.synopticReports?.[0]?.answers ?? {};

  const rawGrade = answers['histologic_grade'] as string | undefined;
  if (rawGrade?.includes('1') || rawGrade === 'g1') tags.push('Grade I');
  else if (rawGrade?.includes('2') || rawGrade === 'g2') tags.push('Grade II');
  else if (rawGrade?.includes('3') || rawGrade === 'g3') tags.push('Grade III');

  if (ancillary.includes('er: positive') || ancillary.includes('er+')) tags.push('ER+');
  else if (ancillary.includes('er:') || ancillary.includes('er ')) tags.push('ER−');
  if (ancillary.includes('her2 3+') || ancillary.includes('ish: amplified')) tags.push('HER2+');
  else if (ancillary.includes('her2')) tags.push('HER2−');

  tags.push(`${matchPct}% match`);
  return tags;
}

/**
 * findSimilarCases — the AI matching entry point.
 *
 * In production: calls callAi() with the patient's prior pathology as context
 * and the case corpus as the search space, returns structured matches.
 *
 * In mock/dev: scores MOCK_CASES deterministically against the patient's
 * most recent malignant history entry, excludes the patient's own cases,
 * and returns the top results above a minimum threshold.
 */
export async function findSimilarCases(
  mrn: string,
  topN = 5,
  minScore = 40,
): Promise<AiMatchedCase[]> {
  await delay(600); // simulate AI latency

  const history = MOCK_PRIOR_PATHOLOGY[mrn];
  if (!history || history.length === 0) return [];

  // Use the most recent malignant case as the anchor for matching
  const anchor =
    history.find(h => h._templateId === 'breast_invasive' && (h._grade ?? 0) >= 2) ??
    history[0];

  const results: AiMatchedCase[] = [];

  for (const c of CASES) {
    // Never match the patient's own cases
    if (c.patient.mrn === mrn) continue;
    // Only match finalized or in-progress cases (not blank drafts)
    if (!c.diagnostic?.microscopicDescription || c.diagnostic.microscopicDescription === 'Pending.') continue;

    const score = scoreCaseAgainstHistory(c, anchor);
    if (score < minScore) continue;

    // Add a small deterministic jitter so scores don't cluster identically
    const jitter = (parseInt(c.id.replace(/\D/g, '').slice(-2), 10) % 5) - 2;
    const matchPct = Math.min(99, Math.max(minScore, score + jitter));

    const patientInitials =
      `${c.patient.firstName[0]}${c.patient.lastName[0]}`;

    const primaryReport = c.synopticReports?.[0];
    const answers = primaryReport?.answers ?? {};

    results.push({
      caseId: c.id,
      accession: c.accession.fullAccession,
      patientInitials,
      date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      diagnosis: primaryReport?.templateName?.replace('CAP ', '').replace(' — Resection', '').replace(' — Needle Biopsy', '') ?? 'Unknown',
      site: String(answers['tumor_site'] ?? answers['specimen_laterality'] ?? 'Breast'),
      procedure: String(answers['procedure'] ?? 'Surgical specimen').replace(/_/g, ' '),
      receptors: (() => {
        const a = (c.diagnostic?.ancillaryStudies ?? '').toLowerCase();
        const er  = a.includes('er: positive') || a.includes('er+') ? 'ER+' : 'ER−';
        const pr  = a.includes('pr: positive') || a.includes('pr+') ? 'PR+' : 'PR−';
        const her2 = (a.includes('her2 3+') || a.includes('ish: amplified')) ? 'HER2+' : 'HER2−';
        return `${er}/${pr}, ${her2}`;
      })(),
      ki67: (() => {
        const match = (c.diagnostic?.ancillaryStudies ?? '').match(/ki-?67[:\s]+(\d+%)/i);
        return match ? match[1] : 'N/A';
      })(),
      matchPct,
      matchReason: buildMatchReason(c, anchor),
      physician: PATHOLOGIST_NAMES[c.order?.assignedTo ?? ''] ?? c.order?.assignedTo ?? 'Unknown',
      margins: String(answers['margin_status_invasive'] ?? answers['margin_status_dcis'] ?? 'See report').replace(/_/g, ' '),
      nodes: String(answers['regional_ln_status'] ?? 'See report').replace(/_/g, ' '),
      gross: c.diagnostic?.grossDescription ?? '',
      microscopic: c.diagnostic?.microscopicDescription ?? '',
      ancillaryStudies: c.diagnostic?.ancillaryStudies ?? '',
      tags: buildTags(c, matchPct),
    });
  }

  // Sort descending by matchPct, return topN
  return results
    .sort((a, b) => b.matchPct - a.matchPct)
    .slice(0, topN);
}

// ─── Pathologist ID → Name map ────────────────────────────────────────────────
// Matches the assignedTo IDs used in MOCK_CASES orders.
export const mockCaseService: ICaseService = {
  async getCase(id: string): Promise<Case | undefined> {
    await delay();
    return CASES.find(c => c.id === id);
  },

  async listCasesForUser(userId: string): Promise<Case[]> {
    await delay();
    if (!userId || userId === 'all' || userId === 'current') return CASES;
    // Get the user's organisation from their assigned cases
    const userOrg = CASES.find(c => c.order?.assignedTo === userId)?.originHospitalId;
    return CASES.filter(c =>
      c.order?.assignedTo === userId ||
      ((c as any).status === 'pool' && (!userOrg || c.originHospitalId === userOrg))
    );
  },

  async updateCase(caseId: string, updates: Partial<Case>): Promise<void> {
    await delay();
    const index = CASES.findIndex(c => c.id === caseId);
    if (index !== -1) {
      CASES[index] = { ...CASES[index], ...updates, updatedAt: new Date().toISOString() };
      storageSet(STORAGE_KEY, CASES);
    }
  },
};
