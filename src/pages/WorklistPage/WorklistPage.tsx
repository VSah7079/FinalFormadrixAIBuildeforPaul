import React, { useState, useEffect, useCallback } from 'react';
import { mockCaseService, getDelegations } from '@/services/cases/mockCaseService';
import type { Case } from '@/types/case/Case';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '@hooks/useLogout';
import { PathologyCase } from '../../components/Worklist/types';
import WorklistTable      from '../../components/Worklist/WorklistTable';
import ResourcesModal     from './ResourcesModal';
import LogoutWarningModal from './LogoutWarningModal';
import CaseSearchBar from '../../components/Search/CaseSearchBar';
import { mockActionRegistryService } from '../../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { PoolClaimModal } from '../../components/Worklist/PoolClaimModal';

const WorklistPage: React.FC = () => {
  const handleLogout = useLogout();
  const [activeFilter, setActiveFilter]       = useState<'all' | 'review' | 'completed' | 'urgent' | 'physician' | 'pool' | 'delegated' | 'inprogress' | 'amended' | 'draft' | 'finalizing'>('all');
  const [realCases, setRealCases]             = useState<Case[]>([]);
  const [delegatedToMeCount, setDelegatedToMeCount] = useState(0);
  const [physicianFilter, setPhysicianFilter] = useState<string>('');
  const [physicianPrompt, setPhysicianPrompt] = useState<string | null>(null);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const CURRENT_USER_ID   = 'PATH-001';
  const CURRENT_USER_NAME = 'Dr. Sarah Johnson';

  // Pool claim modal state
  const [claimModal, setClaimModal] = useState<{ caseId: string; summary: string; poolName: string } | null>(null);

  // Load real cases from mockCaseService on mount
  useEffect(() => {
    mockCaseService.listCasesForUser('current').then(setRealCases).catch(() => {});
    // Load delegated-to-me count
    getDelegations().then(all => {
      const count = all.filter(d => d.toUserId === CURRENT_USER_ID && d.status === 'pending').length;
      setDelegatedToMeCount(count);
    }).catch(() => {});
  }, []);

  // Quick Links Data
  const quickLinks = {
    protocols: [
      { title: 'CAP Cancer Protocols', url: 'https://www.cap.org/protocols-and-guidelines' },
      { title: 'WHO Classification', url: 'https://www.who.int/publications' }
    ],
    references: [
      { title: 'PathologyOutlines', url: 'https://www.pathologyoutlines.com' },
      { title: 'UpToDate', url: 'https://www.uptodate.com' }
    ],
    systems: [
      { title: 'Hospital LIS', url: '#' },
      { title: 'Lab Management', url: '#' }
    ]
  };

  // ── 50 Mock Cases ──────────────────────────────────────────────────────────
  const allCases: PathologyCase[] = [
    {
      // S26-4401 — Breast Invasive, in-progress — has pre-filled synoptic
      id: 'S26-4401',
      patient: 'Thompson, Grace',
      protocol: 'CAP Breast Invasive Carcinoma — Resection',
      specimen: 'Left Breast Mastectomy + Sentinel LN',
      status: 'Synoptic',
      aiStatus: 'Draft Ready',
      confidence: 91,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '03/28/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      caseFlags: [
        { id: 'tumor_board_schedule', name: 'Tumor Board Scheduled', color: 'blue', severity: 2 }
      ],
      specimenFlags: [
        { id: 'her2_fish_pending', name: 'HER2 ISH Pending', color: 'blue', severity: 2 }
      ]
    },
    {
      // S26-4402 — Colorectal sigmoid, in-progress — has pre-filled synoptic
      id: 'S26-4402',
      patient: 'Jackson, Robert',
      protocol: 'CAP Colon & Rectum Carcinoma — Resection',
      specimen: 'Sigmoid Colon Resection + Apical LN',
      status: 'Synoptic',
      aiStatus: 'Draft Ready',
      confidence: 88,
      time: '1h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '03/29/2026',
      submittingPhysician: 'Dr. Michael Torres',
      caseFlags: [
        { id: 'oncology_awaiting', name: 'Oncology Awaiting Report', color: 'red', severity: 5 }
      ],
      specimenFlags: [
        { id: 'kras_pending', name: 'KRAS/RAS Panel Pending', color: 'green', severity: 2 }
      ]
    },
    {
      // S26-4403 — Lung RUL lobectomy, draft — partially filled synoptic
      id: 'S26-4403',
      patient: 'Williams, Helen',
      protocol: 'CAP Lung — Resection',
      specimen: 'Right Upper Lobe Lobectomy + Mediastinal LN',
      status: 'Synoptic',
      aiStatus: 'Staged',
      confidence: 84,
      time: '45m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '03/30/2026',
      submittingPhysician: 'Dr. James Park',
      caseFlags: [
        { id: 'stat___rush', name: 'STAT — Rush Processing', color: 'red', severity: 5 }
      ],
      specimenFlags: [
        { id: 'ngs_pending', name: 'NGS Panel Pending', color: 'blue', severity: 3 }
      ]
    },
    {
      // S26-4404 — Prostate needle biopsy, draft — partially filled synoptic
      id: 'S26-4404',
      patient: 'Martinez, David',
      protocol: 'CAP Prostate — Needle Biopsy',
      specimen: 'Prostate Cores x6 Sites (A–F)',
      status: 'Synoptic',
      aiStatus: 'Draft Ready',
      confidence: 87,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '03/30/2026',
      submittingPhysician: 'Dr. Anil Sharma',
    },
    {
      // S26-4405 — Breast DCIS, finalized — tests read-only flow
      id: 'S26-4405',
      patient: 'Taylor, Susan',
      protocol: 'CAP Breast DCIS — Resection',
      specimen: 'Right Breast Lumpectomy',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 99,
      time: '4d ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '03/26/2026',
      submittingPhysician: 'Dr. Lisa Wong',
    },
    {
      // S26-4406 — Breast Invasive blank form — tests empty synoptic state
      id: 'S26-4406',
      patient: 'Anderson, Ruth',
      protocol: 'CAP Breast Invasive Carcinoma — Resection',
      specimen: 'Left Breast Core Needle Biopsy',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '20m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '03/30/2026',
      submittingPhysician: 'Dr. Patricia Moore',
      caseFlags: [
        { id: 'stat___rush', name: 'STAT — Rush Processing', color: 'red', severity: 5 }
      ]
    },
    {
      // S26-4407 — Colorectal rectal post-chemo — tests treatment effect fields
      id: 'S26-4407',
      patient: 'Chen, Michael',
      protocol: 'CAP Colon & Rectum Carcinoma — Resection',
      specimen: 'Anterior Resection — Rectum + Mesorectal LN',
      status: 'Synoptic',
      aiStatus: 'Draft Ready',
      confidence: 86,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '03/28/2026',
      submittingPhysician: 'Dr. James Nguyen',
      specimenFlags: [
        { id: 'braf_pending', name: 'BRAF V600E Result Noted', color: 'orange', severity: 3 }
      ]
    },
    {
      // S26-4408 — Breast invasive + DCIS same specimen — tests multi-report sidebar
      id: 'S26-4408',
      patient: 'Davis, Carol',
      protocol: 'CAP Breast Invasive + DCIS — Resection',
      specimen: 'Right Breast Mastectomy + Axillary Contents',
      status: 'Synoptic',
      aiStatus: 'Draft Ready',
      confidence: 89,
      time: '1h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '03/29/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      caseFlags: [
        { id: 'brca1_positive', name: 'BRCA1 Positive', color: 'purple', severity: 3 },
        { id: 'oncology_holding', name: 'Oncology Treatment on Hold', color: 'red', severity: 5 }
      ],
      specimenFlags: [
        { id: 'her2_3plus', name: 'HER2 3+ — Oncology Alert', color: 'red', severity: 4 }
      ]
    },
    {
      id: 'S26-4415',
      patient: 'Thompson, Grace',
      protocol: 'Thyroid Resection',
      specimen: 'Total Thyroidectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 91,
      time: '30m ago',
      priority: 'Routine',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Anika Sharma',
      caseFlags: [{ id: 'intraoperative_consu', name: 'Intraoperative Consult', color: 'orange', severity: 4 }]
    },
    {
      id: 'S26-4416',
      patient: 'Martinez, Carlos',
      protocol: 'Melanoma Excision',
      specimen: 'Back Wide Excision',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '1h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Derek Osei',
      caseFlags: [{ id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 }]
    },
    {
      id: 'S26-4417',
      patient: 'Lee, Sung-Min',
      protocol: 'Kidney Resection',
      specimen: 'Left Partial Nephrectomy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 88,
      time: '15m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. James Nguyen'
    },
    {
      id: 'S26-4418',
      patient: 'Patel, Priya',
      protocol: 'Endometrial Carcinoma',
      specimen: 'Total Hysterectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 93,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      specimenFlags: [{ id: 'frozen_section_corre', name: 'Frozen Section Correlation', color: 'blue', severity: 2 }]
    },
    {
      id: 'S26-4419',
      patient: 'Brown, Henry',
      protocol: 'Bladder Biopsy',
      specimen: 'TURBT Chips',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 99,
      time: '4h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Anika Sharma'
    },
    {
      id: 'S26-4420',
      patient: 'Garcia, Isabella',
      protocol: 'Cervical LEEP',
      specimen: 'LEEP Cone',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '20m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Sarah Chen'
    },
    {
      id: 'S26-4421',
      patient: 'Anderson, Paul',
      protocol: 'Liver Biopsy',
      specimen: 'Liver Core Biopsy x3',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 85,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Marcus Webb',
      specimenFlags: [{ id: 'trichrome_pending', name: 'Trichrome Pending', color: 'green', severity: 2 }]
    },
    {
      id: 'S26-4422',
      patient: 'White, Eleanor',
      protocol: 'Ovarian Mass',
      specimen: 'Left Oophorectomy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 87,
      time: '1h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      caseFlags: [{ id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 }]
    },
    {
      id: 'S26-4423',
      patient: 'Harris, Samuel',
      protocol: 'Skin Punch Biopsy',
      specimen: 'Left Forearm Punch x2',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 98,
      time: '5h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/23/2026',
      submittingPhysician: 'Dr. Derek Osei'
    },
    {
      id: 'S26-4424',
      patient: 'Clark, Diana',
      protocol: 'Appendix Resection',
      specimen: 'Appendectomy Specimen',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 90,
      time: '45m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. James Nguyen'
    },
    {
      id: 'S26-4425',
      patient: 'Lewis, Nathan',
      protocol: 'Testicular Tumor',
      specimen: 'Left Orchiectomy',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '2h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Anika Sharma',
      caseFlags: [{ id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 }, { id: 'tumor_markers_ordere', name: 'Tumor Markers Ordered', color: 'blue', severity: 2 }]
    },
    {
      id: 'S26-4426',
      patient: 'Robinson, Faye',
      protocol: 'Salivary Gland',
      specimen: 'Parotid Gland Excision',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 92,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Sarah Chen'
    },
    {
      id: 'S26-4427',
      patient: 'Walker, Jerome',
      protocol: 'Colon Polyp',
      specimen: 'Sigmoid Polypectomy x4',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 97,
      time: '6h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/23/2026',
      submittingPhysician: 'Dr. Marcus Webb'
    },
    {
      id: 'S26-4428',
      patient: 'Young, Angela',
      protocol: 'Soft Tissue Tumor',
      specimen: 'Thigh Excision Biopsy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 78,
      time: '30m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Derek Osei',
      caseFlags: [{ id: 'sarcoma_protocol', name: 'Sarcoma Protocol', color: 'purple', severity: 3 }],
      specimenFlags: [{ id: 'cytogenetics_pending', name: 'Cytogenetics Pending', color: 'yellow', severity: 3 }]
    },
    {
      id: 'S26-4429',
      patient: 'Allen, Thomas',
      protocol: 'Gastric Resection',
      specimen: 'Partial Gastrectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 86,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Lisa Patel'
    },
    {
      id: 'S26-4430',
      patient: 'King, Veronica',
      protocol: 'Lymph Node Biopsy',
      specimen: 'Left Axillary Node Excision',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. James Nguyen',
      specimenFlags: [{ id: 'flow_cytometry_order', name: 'Flow Cytometry Ordered', color: 'green', severity: 2 }]
    },
    {
      id: 'S26-4431',
      patient: 'Scott, Raymond',
      protocol: 'Prostate Biopsy',
      specimen: 'TRUS Biopsy 12-Core',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 95,
      time: '4h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/23/2026',
      submittingPhysician: 'Dr. Anika Sharma'
    },
    {
      id: 'S26-4432',
      patient: 'Green, Harriet',
      protocol: 'Fallopian Tube',
      specimen: 'Bilateral Salpingectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 88,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Sarah Chen'
    },
    {
      id: 'S26-4433',
      patient: 'Adams, Victor',
      protocol: 'Brain Biopsy',
      specimen: 'Right Temporal Stereotactic Biopsy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 82,
      time: '10m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Marcus Webb',
      caseFlags: [
        { id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 },
        { id: 'neuro_oncology_consu', name: 'Neuro-Oncology Consult', color: 'purple', severity: 3 }
      ]
    },
    {
      id: 'S26-4434',
      patient: 'Baker, Monica',
      protocol: 'Vulvar Excision',
      specimen: 'Wide Local Excision Vulva',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Lisa Patel'
    },
    {
      id: 'S26-4435',
      patient: 'Gonzalez, Enrique',
      protocol: 'Esophageal Resection',
      specimen: 'Esophagogastrectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 91,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Derek Osei',
      specimenFlags: [{ id: 'her2_testing_ordered', name: 'HER2 Testing Ordered', color: 'blue', severity: 2 }]
    },
    {
      id: 'S26-4436',
      patient: 'Nelson, Betty',
      protocol: 'Skin Excision',
      specimen: 'Nose BCC Excision',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 99,
      time: '7h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/23/2026',
      submittingPhysician: 'Dr. James Nguyen'
    },
    {
      id: 'S26-4437',
      patient: 'Carter, Denise',
      protocol: 'Lung Biopsy',
      specimen: 'CT-Guided Core Biopsy x2',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '45m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Anika Sharma',
      caseFlags: [{ id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 }],
      specimenFlags: [{ id: 'molecular_panel_orde', name: 'Molecular Panel Ordered', color: 'orange', severity: 4 }]
    },
    {
      id: 'S26-4438',
      patient: 'Mitchell, Franklin',
      protocol: 'Spleen Resection',
      specimen: 'Splenectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 84,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Sarah Chen'
    },
    {
      id: 'S26-4439',
      patient: 'Perez, Luisa',
      protocol: 'Bone Biopsy',
      specimen: 'Iliac Crest Core Biopsy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 79,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Marcus Webb',
      specimenFlags: [{ id: 'decal_in_progress', name: 'Decal in Progress', color: 'yellow', severity: 3 }]
    },
    {
      id: 'S26-4440',
      patient: 'Roberts, Clarence',
      protocol: 'Pancreas Resection',
      specimen: 'Whipple Procedure',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 90,
      time: '30m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      caseFlags: [{ id: 'tumor_board_schedule', name: 'Tumor Board Scheduled', color: 'blue', severity: 2 }]
    },
    {
      id: 'S26-4441',
      patient: 'Turner, Sylvia',
      protocol: 'Vaginal Biopsy',
      specimen: 'Colposcopic Biopsy x3',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 96,
      time: '8h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/22/2026',
      submittingPhysician: 'Dr. Derek Osei'
    },
    {
      id: 'S26-4442',
      patient: 'Phillips, Gordon',
      protocol: 'Renal Transplant Biopsy',
      specimen: 'Allograft Core Biopsy x2',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '20m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. James Nguyen',
      caseFlags: [
        { id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 },
        { id: 'rejection_rule_out', name: 'Rejection Rule-Out', color: 'orange', severity: 4 }
      ]
    },
    {
      id: 'S26-4443',
      patient: 'Campbell, Rosemary',
      protocol: 'Breast Biopsy',
      specimen: 'US-Guided Core Biopsy x4',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 93,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Anika Sharma'
    },
    {
      id: 'S26-4444',
      patient: 'Parker, Leonard',
      protocol: 'Colon Resection',
      specimen: 'Left Hemicolectomy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 88,
      time: '50m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      specimenFlags: [{ id: 'msi_testing_ordered', name: 'MSI Testing Ordered', color: 'green', severity: 2 }]
    },
    {
      id: 'S26-4445',
      patient: 'Evans, Constance',
      protocol: 'Skin Shave Biopsy',
      specimen: 'Scalp Shave x2',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 97,
      time: '9h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/22/2026',
      submittingPhysician: 'Dr. Marcus Webb'
    },
    {
      id: 'S26-4446',
      patient: 'Edwards, Wallace',
      protocol: 'Bladder Resection',
      specimen: 'Cystectomy Specimen',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 89,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Lisa Patel'
    },
    {
      id: 'S26-4447',
      patient: 'Collins, Marguerite',
      protocol: 'Adrenal Resection',
      specimen: 'Right Adrenalectomy',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Derek Osei'
    },
    {
      id: 'S26-4448',
      patient: 'Stewart, Reginald',
      protocol: 'Lung Resection',
      specimen: 'Left Lower Lobectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 92,
      time: '2h ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. James Nguyen',
      caseFlags: [
        { id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 },
        { id: 'molecular_profiling_', name: 'Molecular Profiling Pending', color: 'yellow', severity: 3 }
      ]
    },
    {
      id: 'S26-4449',
      patient: 'Sanchez, Olivia',
      protocol: 'Uterine Fibroid',
      specimen: 'Myomectomy Specimen',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 99,
      time: '10h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/22/2026',
      submittingPhysician: 'Dr. Anika Sharma'
    },
    {
      id: 'S26-4450',
      patient: 'Morris, Clifford',
      protocol: 'Head & Neck Resection',
      specimen: 'Oropharyngeal Resection',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 83,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      caseFlags: [{ id: 'hpv_testing_ordered', name: 'HPV Testing Ordered', color: 'blue', severity: 2 }]
    },
    {
      id: 'S26-4451',
      patient: 'Rogers, Nadine',
      protocol: 'Skin Excision',
      specimen: 'Ear SCC Wide Excision',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 90,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Marcus Webb'
    },
    {
      id: 'S26-4452',
      patient: 'Reed, Douglas',
      protocol: 'Breast Invasive Carcinoma',
      specimen: 'Right Breast Mastectomy',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      specimenFlags: [{ id: 'sentinel_node_submit', name: 'Sentinel Node Submitted', color: 'orange', severity: 4 }]
    },
    {
      id: 'S26-4453',
      patient: 'Cook, Patricia',
      protocol: 'Gallbladder',
      specimen: 'Cholecystectomy',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 98,
      time: '11h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/22/2026',
      submittingPhysician: 'Dr. Derek Osei'
    },
    {
      id: 'S26-4454',
      patient: 'Morgan, Elliott',
      protocol: 'Kidney Resection',
      specimen: 'Right Radical Nephrectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 87,
      time: '4h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. James Nguyen'
    },
    {
      id: 'S26-4455',
      patient: 'Bell, Adrienne',
      protocol: 'Lymphoma Biopsy',
      specimen: 'Mediastinal Core Biopsy',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 76,
      time: '20m ago',
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Anika Sharma',
      caseFlags: [
        { id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 },
        { id: 'heme_oncology_notifi', name: 'Heme Oncology Notified', color: 'purple', severity: 3 }
      ],
      specimenFlags: [{ id: 'flow_cytometry_order', name: 'Flow Cytometry Ordered', color: 'green', severity: 2 }]
    },
    {
      id: 'S26-4456',
      patient: 'Murphy, Cecilia',
      protocol: 'Cervical LEEP',
      specimen: 'LEEP Cone + ECC',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 94,
      time: '2h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Sarah Chen'
    },
    {
      id: 'S26-4457',
      patient: 'Bailey, Wendell',
      protocol: 'Prostatectomy',
      specimen: 'Robot-Assisted Radical Prostatectomy',
      status: 'Awaiting Micro',
      aiStatus: 'Staged',
      confidence: 0,
      time: '1h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Marcus Webb'
    },
    {
      id: 'S26-4458',
      patient: 'Rivera, Camila',
      protocol: 'Ovarian Mass',
      specimen: 'Right Oophorectomy',
      status: 'Grossed',
      aiStatus: 'Draft Ready',
      confidence: 91,
      time: '3h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      caseFlags: [{ id: 'ca_125_correlation', name: 'CA-125 Correlation', color: 'yellow', severity: 3 }]
    },
    {
      id: 'S26-4459',
      patient: 'Cooper, Bernard',
      protocol: 'Skin Excision',
      specimen: 'Scalp Melanoma Re-Excision',
      status: 'Completed',
      aiStatus: 'Finalized',
      confidence: 96,
      time: '12h ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/21/2026',
      submittingPhysician: 'Dr. Derek Osei'
    },
    {
      id: 'S26-4460',
      patient: 'Richardson, Loretta',
      protocol: 'Breast Biopsy',
      specimen: 'Stereotactic Biopsy x6',
      status: 'Finalizing',
      aiStatus: 'Syncing Micro...',
      confidence: 89,
      time: '40m ago',
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. James Nguyen',
      specimenFlags: [{ id: 'calcifications_noted', name: 'Calcifications Noted', color: 'orange', severity: 4 }]
    }
  ];

  const navigate = useNavigate();
  const location  = useLocation();

  // ── Voice: selected row index for keyboard/voice navigation ───────────────
  const [selectedIndex,    setSelectedIndex]    = useState<number>(-1);
  const [selectedCaseId,   setSelectedCaseId]   = useState<string | null>(null);
  const [displayOrder,     setDisplayOrder]      = useState<string[]>([]);

  // ── Return-from-case selection ─────────────────────────────────────────
  // When navigating back from a synoptic report, advance to the next case
  // in the table's actual display order (respects active sort).
  // displayOrder is populated by WorklistTable via onDisplayOrder before this runs.
  const fromCaseId = (location.state as any)?.fromCaseId as string | undefined;
  useEffect(() => {
    if (!fromCaseId || displayOrder.length === 0) return;
    const viewedIdx = displayOrder.indexOf(fromCaseId);
    const targetId  = displayOrder[viewedIdx + 1] ?? displayOrder[viewedIdx] ?? null;
    if (!targetId) return;
    setSelectedIndex(0);
    setSelectedCaseId(targetId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOrder]); // fires once displayOrder arrives from the table


  const filteredCases = allCases.filter(c => {
    if (activeFilter === 'pool')       return (c as any).status === 'pool';
    if (activeFilter === 'all')        return (c as any).status !== 'pool';
    if (activeFilter === 'review')     return c.aiStatus === 'Draft Ready';
    if (activeFilter === 'completed')  return c.status === 'Completed';
    if (activeFilter === 'urgent')     return c.priority === 'STAT' || c.isCritical === true;
    if (activeFilter === 'draft')      return c.status === 'draft';
    if (activeFilter === 'finalizing') return c.status === 'finalizing';
    if (activeFilter === 'physician')  return (c.submittingPhysician ?? '').toLowerCase().includes(physicianFilter.toLowerCase());
    return true;
  });

  const stats = {
    total:          realCases.filter(c => (c as any).status !== 'pool').length,
    pool:           realCases.filter(c => (c as any).status === 'pool').length,
    inProgress:     realCases.filter(c => c.status === 'in-progress').length,
    needsReview:    realCases.filter(c => c.status === 'pending-review').length,
    urgent:         realCases.filter(c => c.order?.priority === 'STAT').length,
    amended:        realCases.filter(c => c.status === 'amended').length,
    draft:          realCases.filter(c => c.status === 'draft').length,
    finalizing:     realCases.filter(c => c.status === 'finalizing').length,
    completedToday: realCases.filter(c => {
      if (c.status !== 'finalized') return false;
      if (!c.updatedAt) return false;
      const u = new Date(c.updatedAt), t = new Date();
      return u.getFullYear() === t.getFullYear() &&
             u.getMonth()    === t.getMonth()    &&
             u.getDate()     === t.getDate();
    }).length,
  };

  // ── Voice: set WORKLIST context on mount ──────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: table navigation listeners ────────────────────────────────────────
  useEffect(() => {
    const clamp = (i: number) => Math.max(0, Math.min(i, filteredCases.length - 1));

    // Sync both index and case ID together so selection survives sort/filter changes
    const syncId = (idx: number) => {
      setSelectedIndex(idx);
      setSelectedCaseId(filteredCases[idx]?.id ?? null);
    };

    // Default to row 0 on first voice command if nothing selected yet
    const ensureSelection = (i: number) => i < 0 ? 0 : i;

    const next        = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 1); syncId(n); return n; });
    const previous    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 1); syncId(n); return n; });
    const pageDown    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 10); syncId(n); return n; });
    const pageUp      = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 10); syncId(n); return n; });
    const first       = () => syncId(0);
    const last        = () => syncId(clamp(filteredCases.length - 1));
    const refresh     = () => window.location.reload();

    // TTS helper — reads text aloud via Web Speech Synthesis
    const speak = (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    };

    // Read flags for the focused row
    const readFlags = () => {
      const focused = allCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const flags = [
        ...(focused.caseFlags    ?? []).map((f: any) => f.name),
        ...(focused.specimenFlags ?? []).map((f: any) => f.name),
      ];
      if (flags.length === 0) {
        speak(`${focused.id} has no flags.`);
      } else {
        speak(`${focused.id} has ${flags.join(' and ')}.`);
      }
    };

    // Read specimen type for the focused row
    const readSpecimen = () => {
      const focused = allCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      speak(`${focused.id}: ${focused.specimen}.`);
    };

    // Filter by physician name — extracted from transcript
    const filterPhysician = (e: Event) => {
      const transcript = ((e as CustomEvent).detail?.transcript as string) ?? '';
      const name = transcript.toLowerCase().replace(/filter by\s*/i, '').trim();
      if (!name) return;

      // Find all unique physicians in the worklist
      const physicians = [...new Set(allCases.map(c => c.submittingPhysician ?? '').filter(Boolean))];
      const matches = physicians.filter(p => p.toLowerCase().includes(name));

      if (matches.length === 0) {
        speak(`No physician found matching ${name}.`);
      } else if (matches.length === 1) {
        setPhysicianFilter(matches[0]);
        setActiveFilter('physician');
        setSelectedIndex(-1); setSelectedCaseId(null);
        speak(`Filtering by ${matches[0]}.`);
      } else {
        // Ambiguity — prompt for clarification
        setPhysicianPrompt(`Did you mean: ${matches.slice(0, 3).join(', or ')}?`);
        speak(`Multiple physicians match ${name}. ${matches.slice(0, 3).join(', or ')}?`);
      }
    };

    // Filter commands — reset selection when filter changes
    const filterUrgent    = () => { setActiveFilter('urgent');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterCompleted = () => { setActiveFilter('completed'); setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterReview    = () => { setActiveFilter('review');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const clearFilter     = () => { setActiveFilter('all');       setSelectedIndex(-1); setSelectedCaseId(null); };

    // Sort commands — forward to WorklistTable's internal sort system via custom events
    const sortDate     = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'accessionDate', dir: 'desc' } }));
    const sortPriority = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'flagSeverity',  dir: 'desc' } }));
    const sortStatus   = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'status',        dir: 'asc'  } }));

    // Sort by column name — extracted from transcript e.g. "sort by date", "sort by physician"
    const sortByColumn = (e: Event) => {
      const t = ((e as CustomEvent).detail?.transcript as string ?? '').toLowerCase().replace('sort by', '').trim();
      const map: Record<string, () => void> = {
        'date': sortDate, 'accession date': sortDate, 'accession': sortDate,
        'priority': sortPriority, 'stat': sortPriority, 'urgency': sortPriority,
        'status': sortStatus, 'case status': sortStatus,
      };
      const fn = map[t];
      if (fn) { fn(); }
      else { speak(`Column "${t}" not recognised. Try date, priority, or status.`); }
    };
    const clearSort    = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_CLEAR'));

    const openResources = () => setIsResourcesOpen(true);

    const worklistState = { worklistCaseIds: filteredCases.map(c => c.id) };

    const openSelected = () => {
      if (selectedIndex >= 0 && filteredCases[selectedIndex]) {
        navigate(`/case/${filteredCases[selectedIndex].id}/synoptic`, { state: worklistState });
      }
    };

    const nextCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) + 1);
      syncId(idx);
      navigate(`/case/${filteredCases[idx].id}/synoptic`, { state: worklistState });
    };

    const prevCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) - 1);
      syncId(idx);
      navigate(`/case/${filteredCases[idx].id}/synoptic`, { state: worklistState });
    };

    window.addEventListener('PATHSCRIBE_TABLE_NEXT',             next);
    window.addEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
    window.addEventListener('PATHSCRIBE_TABLE_FIRST',            first);
    window.addEventListener('PATHSCRIBE_TABLE_LAST',             last);
    window.addEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
    window.addEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_REVIEW',    filterReview);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
    window.addEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
    window.addEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
    window.addEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
    window.addEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);

    return () => {
      window.removeEventListener('PATHSCRIBE_TABLE_NEXT',             next);
      window.removeEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
      window.removeEventListener('PATHSCRIBE_TABLE_FIRST',            first);
      window.removeEventListener('PATHSCRIBE_TABLE_LAST',             last);
      window.removeEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
      window.removeEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_REVIEW',    filterReview);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
      window.removeEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
      window.removeEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
      window.removeEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
      window.removeEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
      window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);
    };
  }, [filteredCases, selectedIndex, navigate]);

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      backgroundColor: '#000000', color: '#ffffff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Backgrounds — self-closing, no scroll contribution */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, #000000 100%)', zIndex: 1 }} />

      {/* All content — fills viewport exactly, no overflow */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Search bar — fixed height, never scrolls */}
        <div data-capture-hide="true" style={{ flexShrink: 0, padding: '12px 24px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <CaseSearchBar />
        </div>

        {/* Main — fills remaining height, no overflow */}
        <main style={{ flex: 1, minHeight: 0, padding: '12px 20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Header row — title LEFT, tiles RIGHT, fixed height */}
            <div data-capture-hide="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexShrink: 0 }}>

              {/* Title */}
              <div style={{ flexShrink: 0 }}>
                <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>Active Cases</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap' }}>
                  Managing {realCases.length} case{realCases.length !== 1 ? 's' : ''}
                  {activeFilter !== 'all' && <span style={{ color: '#0891B2', marginLeft: '6px' }}>· filtered</span>}
                </p>
              </div>

              {/* Tiles — right side, compact, act as filter buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                {/* ── TOTAL CASES — standalone summary tile, separated from filters ── */}
                {(() => {
                  const isActive = activeFilter === 'all';
                  return (
                    <button
                      title={isActive ? 'Showing: All Cases — click to reset' : 'Show all cases'}
                      onClick={() => { setActiveFilter(isActive ? 'all' : 'all'); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        background:     isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                        border:         `1.5px solid ${isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'}`,
                        boxShadow:      'none',
                        borderRadius:   '8px',
                        padding:        '6px 14px',
                        backdropFilter: 'blur(10px)',
                        minWidth:       '90px',
                        cursor:         'pointer',
                        transition:     'all 0.15s ease',
                        textAlign:      'left' as const,
                        outline:        'none',
                        transform:      isActive ? 'translateY(-1px)' : 'none',
                        marginRight:    '6px', // extra breathing room before divider
                      }}
                    >
                      <div style={{ fontSize: '8px', fontWeight: 800, color: isActive ? '#e2e8f0' : '#8899aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#e2e8f0', display: 'inline-block', flexShrink: 0 }} />}
                        ⬡ Total Cases
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                        {stats.total}
                      </div>
                    </button>
                  );
                })()}

                {/* ── Vertical divider ── */}
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.10)', alignSelf: 'stretch', margin: '0 4px', flexShrink: 0 }} />

                {/* ── Filter tiles group ── */}
                {([
                  { key: 'pool',       label: 'Pool Cases',      count: stats.pool,           color: '#6366f1', bg: 'rgba(99,102,241,0.05)',  border: 'rgba(99,102,241,0.18)',  activeBg: 'rgba(99,102,241,0.18)',  activeBorder: '#6366f1',               glow: '0 0 12px rgba(99,102,241,0.4)' },
                  { key: 'delegated',  label: 'Delegated to Me', count: delegatedToMeCount,   color: '#38bdf8', bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.18)',  activeBg: 'rgba(56,189,248,0.18)',  activeBorder: '#38bdf8',               glow: '0 0 12px rgba(56,189,248,0.4)' },
                  { key: 'urgent',     label: 'Critical',        count: stats.urgent,         color: '#EF4444', bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.18)',   activeBg: 'rgba(239,68,68,0.18)',   activeBorder: '#EF4444',               glow: '0 0 12px rgba(239,68,68,0.4)' },
                  { key: 'inprogress', label: 'In Progress',     count: stats.inProgress,     color: '#0891B2', bg: 'rgba(8,145,178,0.05)',   border: 'rgba(8,145,178,0.18)',   activeBg: 'rgba(8,145,178,0.18)',   activeBorder: '#0891B2',               glow: '0 0 12px rgba(8,145,178,0.4)' },
                  { key: 'review',     label: 'Needs Review',    count: stats.needsReview,    color: '#F59E0B', bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.18)',  activeBg: 'rgba(245,158,11,0.18)',  activeBorder: '#F59E0B',               glow: '0 0 12px rgba(245,158,11,0.4)' },
                  { key: 'amended',    label: 'Amended',         count: stats.amended,        color: '#8B5CF6', bg: 'rgba(139,92,246,0.05)',  border: 'rgba(139,92,246,0.18)',  activeBg: 'rgba(139,92,246,0.18)',  activeBorder: '#8B5CF6',               glow: '0 0 12px rgba(139,92,246,0.4)' },
                  { key: 'completed',  label: 'Completed Today', count: stats.completedToday, color: '#10B981', bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.18)',  activeBg: 'rgba(16,185,129,0.18)',  activeBorder: '#10B981',               glow: '0 0 12px rgba(16,185,129,0.4)' },
                  { key: 'draft',      label: 'Draft',           count: stats.draft,          color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.18)', activeBg: 'rgba(148,163,184,0.18)', activeBorder: '#94a3b8',               glow: '0 0 12px rgba(148,163,184,0.3)' },
                  { key: 'finalizing', label: 'Finalizing',      count: stats.finalizing,     color: '#34d399', bg: 'rgba(52,211,153,0.05)',  border: 'rgba(52,211,153,0.18)',  activeBg: 'rgba(52,211,153,0.18)',  activeBorder: '#34d399',               glow: '0 0 12px rgba(52,211,153,0.4)' },
                ] as const).map(tile => {
                  const isActive = activeFilter === tile.key;
                  return (
                    <button
                      key={tile.key}
                      title={isActive ? `Showing: ${tile.label} — click to reset` : `Filter by: ${tile.label}`}
                      onClick={() => { setActiveFilter(isActive ? 'all' : tile.key as any); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        background:     isActive ? tile.activeBg  : tile.bg,
                        border:         `1.5px solid ${isActive ? tile.activeBorder : tile.border}`,
                        boxShadow:      isActive ? tile.glow : 'none',
                        borderRadius:   '8px',
                        padding:        '6px 12px',
                        backdropFilter: 'blur(10px)',
                        minWidth:       '80px',
                        cursor:         'pointer',
                        transition:     'all 0.15s ease',
                        textAlign:      'left' as const,
                        outline:        'none',
                        transform:      isActive ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '8px', fontWeight: 800, color: isActive ? tile.color : '#8899aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: tile.color, display: 'inline-block', flexShrink: 0 }} />}
                        {tile.label}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: tile.color, lineHeight: 1 }}>
                        {tile.count}
                      </div>
                    </button>
                  );
                })}
                {activeFilter === 'physician' && physicianFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(139,92,246,0.15)', border: '1.5px solid rgba(139,92,246,0.4)', borderRadius: '8px', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
                    👤 {physicianFilter}
                    <button onClick={() => { setActiveFilter('all'); setPhysicianFilter(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 4px', lineHeight: 1 }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Physician voice prompt — conditional, fixed height */}
            {physicianPrompt && (
              <div style={{ flexShrink: 0, marginBottom: '8px', padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 500 }}>🎙️ {physicianPrompt}</span>
                <button onClick={() => setPhysicianPrompt(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            )}

            {/* Worklist table — takes all remaining vertical space, scrolls internally */}
            <div data-capture-hide="true" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <WorklistTable
                cases={realCases}
                activeFilter={activeFilter}
                selectedIndex={selectedIndex}
                selectedCaseId={selectedCaseId}
                onRowSelect={(idx: number, id: string) => { setSelectedIndex(idx); setSelectedCaseId(id); }}
                onFirstCaseId={(id: string | null) => {
                  if ((location.state as any)?.fromCaseId) return;
                  if (selectedCaseId) return;
                  if (id) { setSelectedIndex(0); setSelectedCaseId(id); }
                }}
                onDisplayOrder={useCallback((ids: string[]) => setDisplayOrder(ids), [])}
              />
            </div>

          </div>
        </main>

      </div>

      <ResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        quickLinks={quickLinks}
      />
      <LogoutWarningModal
        isOpen={showLogoutWarning}
        onClose={() => setShowLogoutWarning(false)}
        onLogout={handleLogout}
      />
      <PoolClaimModal
        isOpen={!!claimModal}
        caseId={claimModal?.caseId ?? null}
        caseSummary={claimModal?.summary}
        poolName={claimModal?.poolName}
        currentUserId={CURRENT_USER_ID}
        currentUserName={CURRENT_USER_NAME}
        onAccepted={() => {
          setClaimModal(null);
          mockCaseService.listCasesForUser('current').then(setRealCases).catch(() => {});
        }}
        onPassed={() => setClaimModal(null)}
        onClose={() => setClaimModal(null)}
      />

    </div>
  );
};

export default WorklistPage;
