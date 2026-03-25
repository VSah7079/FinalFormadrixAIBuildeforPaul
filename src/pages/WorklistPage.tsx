import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '@hooks/useLogout';
import { PathologyCase } from '../components/Worklist/types';
import WorklistTable from '../components/Worklist/WorklistTable';
import CaseSearchBar from '../components/Search/CaseSearchBar';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../constants/systemActions';

const WorklistPage: React.FC = () => {
  const handleLogout = useLogout();
  const [activeFilter, setActiveFilter]       = useState<'all' | 'review' | 'completed' | 'urgent' | 'physician'>('all');
  const [physicianFilter, setPhysicianFilter] = useState<string>('');
  const [physicianPrompt, setPhysicianPrompt] = useState<string | null>(null); // clarification prompt
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

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
      id: 'S26-4401', 
      patient: 'Miller, Jane', 
      protocol: 'Breast Invasive Carcinoma', 
      specimen: 'Left Breast Mastectomy',
      status: 'Grossed', 
      aiStatus: 'Draft Ready', 
      confidence: 94,
      time: '2h ago', 
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      caseFlags: [
        { id: 'pending_clinical_cor', name: 'Pending Clinical Correlation', color: 'yellow', severity: 3 },
        { id: 'tumor_board_schedule', name: 'Tumor Board Scheduled', color: 'blue', severity: 2 }
      ],
      specimenFlags: [
        { id: 'margins_involved', name: 'Margins Involved', color: 'red', severity: 5 }
      ]
    },
    { 
      id: 'S26-4402', 
      patient: 'Smith, Alice', 
      protocol: 'Lung Resection', 
      specimen: 'Right Upper Lobe Wedge',
      status: 'Awaiting Micro', 
      aiStatus: 'Staged', 
      confidence: 0,
      time: '45m ago', 
      priority: 'STAT',
      isCritical: true,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Marcus Webb',
      caseFlags: [
        { id: 'stat___rush_processi', name: 'STAT — Rush Processing', color: 'red', severity: 5 }
      ]
    },
    { 
      id: 'S26-4405', 
      patient: 'Davis, Robert', 
      protocol: 'Colon Resection', 
      specimen: 'Right Hemicolectomy',
      status: 'Finalizing', 
      aiStatus: 'Syncing Micro...', 
      confidence: 89,
      time: '5m ago', 
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/25/2026',
      submittingPhysician: 'Dr. Lisa Patel',
      specimenFlags: [
        { id: 'additional_levels_re', name: 'Additional Levels Requested', color: 'orange', severity: 4 }
      ]
    },
    { 
      id: 'S26-4410', 
      patient: 'Wilson, Karen', 
      protocol: 'Prostatectomy', 
      specimen: 'Radical Prostatectomy',
      status: 'Grossed', 
      aiStatus: 'Draft Ready', 
      confidence: 96,
      time: '1h ago', 
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/24/2026',
      submittingPhysician: 'Dr. James Nguyen'
    },
    { 
      id: 'S26-4412', 
      patient: 'Johnson, Michael', 
      protocol: 'Breast Invasive Carcinoma', 
      specimen: 'Right Breast Lumpectomy',
      status: 'Completed', 
      aiStatus: 'Finalized', 
      confidence: 97,
      time: '3h ago', 
      priority: 'Routine',
      isCritical: false,
      accessionDate: '02/23/2026',
      submittingPhysician: 'Dr. Sarah Chen',
      caseFlags: [
        { id: 'second_opinion_reque', name: 'Second Opinion Requested', color: 'purple', severity: 3 }
      ],
      specimenFlags: [
        { id: 'er_pr_her2_pending', name: 'ER/PR/HER2 Pending', color: 'blue', severity: 2 },
        { id: 'ihc_ordered', name: 'IHC Ordered', color: 'green', severity: 2 }
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

  // Refs so voice closures always see current values without stale captures
  const selectedCaseIdRef = useRef<string | null>(null);
  const displayOrderRef   = useRef<string[]>([]);

  useEffect(() => { selectedCaseIdRef.current = selectedCaseId; }, [selectedCaseId]);
  useEffect(() => { displayOrderRef.current   = displayOrder;   }, [displayOrder]);

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
    if (activeFilter === 'all')       return true;
    if (activeFilter === 'review')    return c.aiStatus === 'Draft Ready';
    if (activeFilter === 'completed') return c.status === 'Completed';
    if (activeFilter === 'urgent')    return c.priority === 'STAT' || c.isCritical === true;
    if (activeFilter === 'physician') return (c.submittingPhysician ?? '').toLowerCase().includes(physicianFilter.toLowerCase());
    return true;
  });

  const stats = {
    grossedToday: allCases.filter(c => c.status === 'Grossed').length,
    pendingMicro: allCases.filter(c => c.status === 'Awaiting Micro').length,
    needsReview: allCases.filter(c => c.aiStatus === 'Draft Ready').length,
    critical: allCases.filter(c => c.isCritical).length
  };

  // ── Voice: set WORKLIST context on mount ──────────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Keyboard: Alt+Enter opens selected case ───────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        const id = selectedCaseIdRef.current;
        if (id) navigate(`/case/${id}/synoptic`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  // ── Voice: table navigation listeners ────────────────────────────────────────
  useEffect(() => {
    // Navigate by display order (actual rendered order from WorklistTable)
    // Always read from ref so closures are never stale
    const clampOrder = (i: number) => Math.max(0, Math.min(i, displayOrderRef.current.length - 1));

    const selectByOrderIdx = (idx: number) => {
      const order = displayOrderRef.current;
      if (!order.length) return;
      const clamped = clampOrder(idx);
      const id = order[clamped];
      setSelectedIndex(clamped);
      setSelectedCaseId(id);
    };

    const currentOrderIdx = () => {
      const id = selectedCaseIdRef.current;
      const order = displayOrderRef.current;
      if (!id || !order.length) return 0;
      const i = order.indexOf(id);
      return i < 0 ? 0 : i;
    };

    const next     = () => selectByOrderIdx(currentOrderIdx() + 1);
    const previous = () => selectByOrderIdx(currentOrderIdx() - 1);
    const pageDown = () => selectByOrderIdx(currentOrderIdx() + 10);
    const pageUp   = () => selectByOrderIdx(currentOrderIdx() - 10);
    const first    = () => selectByOrderIdx(0);
    const last     = () => selectByOrderIdx(displayOrderRef.current.length - 1);
    const refresh  = () => window.location.reload();

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
        ...(focused.caseFlags    ?? []).map(f => f.name),
        ...(focused.specimenFlags ?? []).map(f => f.name),
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
    const sortDate     = () => window.dispatchEvent(new CustomEvent('ForMedrix_TABLE_SORT_APPLY', { detail: { key: 'accessionDate', dir: 'desc' } }));
    const sortPriority = () => window.dispatchEvent(new CustomEvent('ForMedrix_TABLE_SORT_APPLY', { detail: { key: 'flagSeverity',  dir: 'desc' } }));
    const sortStatus   = () => window.dispatchEvent(new CustomEvent('ForMedrix_TABLE_SORT_APPLY', { detail: { key: 'status',        dir: 'asc'  } }));

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
    const clearSort    = () => window.dispatchEvent(new CustomEvent('ForMedrix_TABLE_SORT_CLEAR'));

    const openResources = () => setIsResourcesOpen(true);

    const openSelected = () => {
      const id = selectedCaseIdRef.current;
      if (id) navigate(`/case/${id}/synoptic`);
    };

    const nextCase = () => {
      const idx = currentOrderIdx() + 1;
      if (idx < displayOrderRef.current.length) {
        const id = displayOrderRef.current[idx];
        selectByOrderIdx(idx);
        navigate(`/case/${id}/synoptic`);
      }
    };

    const prevCase = () => {
      const idx = currentOrderIdx() - 1;
      if (idx >= 0) {
        const id = displayOrderRef.current[idx];
        selectByOrderIdx(idx);
        navigate(`/case/${id}/synoptic`);
      }
    };

    window.addEventListener('ForMedrix_TABLE_NEXT',             next);
    window.addEventListener('ForMedrix_TABLE_PREVIOUS',         previous);
    window.addEventListener('ForMedrix_TABLE_PAGE_DOWN',        pageDown);
    window.addEventListener('ForMedrix_TABLE_PAGE_UP',          pageUp);
    window.addEventListener('ForMedrix_TABLE_FIRST',            first);
    window.addEventListener('ForMedrix_TABLE_LAST',             last);
    window.addEventListener('ForMedrix_TABLE_OPEN_SELECTED',    openSelected);
    window.addEventListener('ForMedrix_TABLE_REFRESH',          refresh);
    window.addEventListener('ForMedrix_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('ForMedrix_TABLE_FILTER_REVIEW',    filterReview);
    window.addEventListener('ForMedrix_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('ForMedrix_TABLE_FILTER_PHYSICIAN', filterPhysician);
    window.addEventListener('ForMedrix_TABLE_CLEAR_FILTER',     clearFilter);
    window.addEventListener('ForMedrix_READ_FLAGS',             readFlags);
    window.addEventListener('ForMedrix_READ_SPECIMEN',          readSpecimen);
    window.addEventListener('ForMedrix_TABLE_SORT_DATE',        sortDate);
    window.addEventListener('ForMedrix_TABLE_SORT_PRIORITY',    sortPriority);
    window.addEventListener('ForMedrix_TABLE_SORT_STATUS',      sortStatus);
    window.addEventListener('ForMedrix_TABLE_SORT_BY_COLUMN',   sortByColumn);
    window.addEventListener('ForMedrix_TABLE_CLEAR_SORT',       clearSort);
    window.addEventListener('ForMedrix_NAV_NEXT_CASE',          nextCase);
    window.addEventListener('ForMedrix_NAV_PREVIOUS_CASE',      prevCase);
    window.addEventListener('ForMedrix_PAGE_OPEN_RESOURCES',    openResources);

    return () => {
      window.removeEventListener('ForMedrix_TABLE_NEXT',             next);
      window.removeEventListener('ForMedrix_TABLE_PREVIOUS',         previous);
      window.removeEventListener('ForMedrix_TABLE_PAGE_DOWN',        pageDown);
      window.removeEventListener('ForMedrix_TABLE_PAGE_UP',          pageUp);
      window.removeEventListener('ForMedrix_TABLE_FIRST',            first);
      window.removeEventListener('ForMedrix_TABLE_LAST',             last);
      window.removeEventListener('ForMedrix_TABLE_OPEN_SELECTED',    openSelected);
      window.removeEventListener('ForMedrix_TABLE_REFRESH',          refresh);
      window.removeEventListener('ForMedrix_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('ForMedrix_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('ForMedrix_TABLE_CLEAR_FILTER',     clearFilter);
      window.removeEventListener('ForMedrix_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('ForMedrix_TABLE_FILTER_REVIEW',    filterReview);
      window.removeEventListener('ForMedrix_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('ForMedrix_TABLE_FILTER_PHYSICIAN', filterPhysician);
      window.removeEventListener('ForMedrix_READ_FLAGS',             readFlags);
      window.removeEventListener('ForMedrix_READ_SPECIMEN',          readSpecimen);
      window.removeEventListener('ForMedrix_TABLE_SORT_DATE',        sortDate);
      window.removeEventListener('ForMedrix_TABLE_SORT_PRIORITY',    sortPriority);
      window.removeEventListener('ForMedrix_TABLE_SORT_STATUS',      sortStatus);
      window.removeEventListener('ForMedrix_TABLE_SORT_BY_COLUMN',   sortByColumn);
      window.removeEventListener('ForMedrix_TABLE_CLEAR_SORT',       clearSort);
      window.removeEventListener('ForMedrix_NAV_NEXT_CASE',          nextCase);
      window.removeEventListener('ForMedrix_NAV_PREVIOUS_CASE',      prevCase);
      window.removeEventListener('ForMedrix_PAGE_OPEN_RESOURCES',    openResources);
    };
  }, [navigate, allCases, setActiveFilter, setPhysicianFilter, setPhysicianPrompt, setIsResourcesOpen]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      fontFamily: "'Inter', sans-serif",
      transition: 'opacity 0.6s ease',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Background */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        backgroundImage: 'url(/main_background.jpg)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        zIndex: 0,
        filter: 'brightness(0.3) contrast(1.1)'
      }} />
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, #000000 100%)', 
        zIndex: 1 
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Top Navigation */}

        {/* Case Search Bar — PHI: typed case number hidden during capture */}
        <div
          data-capture-hide="true"
          style={{
            padding: '16px 40px',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <CaseSearchBar />
        </div>

        {/* Main Content */}
        <main style={{ 
          flex: 1,
          minHeight: 0,
          padding: '40px', 
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            
            {/* Header Section — PHI: case counts derived from PHI data */}
            <div data-capture-hide="true" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '42px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                    Active Cases
                  </h1>
                  <p style={{ fontSize: '16px', color: '#94a3b8', marginTop: '8px' }}>
                    Managing {filteredCases.length} assignment{filteredCases.length !== 1 ? 's' : ''} in the current queue
                  </p>
                </div>
                
                {/* Stats Cards */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* Critical Cases Card */}
                  <div style={{ 
                    background: 'rgba(239,68,68,0.08)', 
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '12px', 
                    padding: '16px 24px',
                    backdropFilter: 'blur(10px)',
                    minWidth: '140px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#EF4444',
                        display: 'inline-block',
                        boxShadow: '0 0 6px #EF4444'
                      }} />
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Critical
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444' }}>
                      {stats.critical}
                    </div>
                  </div>

                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', 
                    padding: '16px 24px',
                    backdropFilter: 'blur(10px)',
                    minWidth: '140px'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Grossed Today
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#0891B2' }}>
                      {stats.grossedToday}
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', 
                    padding: '16px 24px',
                    backdropFilter: 'blur(10px)',
                    minWidth: '140px'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Needs Review
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>
                      {stats.needsReview}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'all',       label: 'All Cases'    },
                  { key: 'urgent',    label: '🔴 Urgent',    urgentColor: true },
                  { key: 'review',    label: 'Needs Review' },
                  { key: 'completed', label: 'Completed'    },
                ].map(filter => {
                  const isActive = activeFilter === filter.key;
                  const activeColor = (filter as any).urgentColor ? '#ef4444' : '#0891B2';
                  return (
                    <button
                      key={filter.key}
                      onClick={() => { setActiveFilter(filter.key as any); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        padding: '10px 20px',
                        background: isActive ? activeColor : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? activeColor : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '8px',
                        color: isActive ? '#fff' : '#94a3b8',
                        fontWeight: 700, fontSize: '14px',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; } }}
                    >
                      {filter.label}
                    </button>
                  );
                })}
                {/* Active physician filter chip */}
                {activeFilter === 'physician' && physicianFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', fontSize: '13px', color: '#a78bfa', fontWeight: 600 }}>
                    👤 {physicianFilter}
                    <button onClick={() => { setActiveFilter('all'); setPhysicianFilter(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 4px', lineHeight: 1 }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Physician clarification prompt */}
            {physicianPrompt && (
              <div style={{ margin: '8px 0', padding: '10px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 500 }}>🎙️ {physicianPrompt}</span>
                <button onClick={() => setPhysicianPrompt(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            )}

            {/* Worklist Table — PHI: entire table hidden during screen capture */}
            <div data-capture-hide="true">
              <WorklistTable
                cases={filteredCases}
                activeFilter={activeFilter}
                selectedIndex={selectedIndex}
                selectedCaseId={selectedCaseId}
                onRowSelect={(idx, id) => { setSelectedIndex(idx); setSelectedCaseId(id); }}
                onFirstCaseId={(id) => {
                  // Only apply on fresh load — return-from-case is handled separately
                  if ((location.state as any)?.fromCaseId) return;
                  if (selectedCaseId) return; // already set
                  if (id) { setSelectedIndex(0); setSelectedCaseId(id); }
                }}
                onDisplayOrder={(ids) => setDisplayOrder(ids)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Resources Modal */}
      {isResourcesOpen && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          onClick={() => setIsResourcesOpen(false)}
        >
          <div
            style={{
              width: '400px',
              backgroundColor: '#111', 
              borderRadius: '20px', 
              padding: '40px', 
              border: '1px solid rgba(8, 145, 178, 0.3)', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              color: '#0891B2', 
              fontSize: '24px', 
              fontWeight: 700, 
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              Quick Links
            </div>

            {/* Protocols Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                color: '#94a3b8', 
                fontSize: '12px', 
                fontWeight: 700, 
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                Protocols
              </div>
              {quickLinks.protocols.map((link, i) => (
                <a            
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsResourcesOpen(false)}
                  style={{
                    display: 'block',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    padding: '12px 16px',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0891B2';
                    e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  → {link.title}
                </a>
              ))}
            </div>

            {/* References Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                color: '#94a3b8', 
                fontSize: '12px', 
                fontWeight: 700, 
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                References
              </div>
              {quickLinks.references.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsResourcesOpen(false)}
                  style={{
                    display: 'block',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    padding: '12px 16px',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0891B2';
                    e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  → {link.title}
                </a>
              ))}
            </div>

            {/* Systems Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                color: '#94a3b8', 
                fontSize: '12px', 
                fontWeight: 700, 
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                Systems
              </div>
              {quickLinks.systems.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsResourcesOpen(false)}
                  style={{
                    display: 'block',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    padding: '12px 16px',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0891B2';
                    e.currentTarget.style.backgroundColor = 'rgba(8, 145, 178, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  → {link.title}
                </a>
              ))}
            </div>

            <button 
              onClick={() => setIsResourcesOpen(false)} 
              autoFocus
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                background: 'rgba(8, 145, 178, 0.15)',
                border: '1px solid rgba(8, 145, 178, 0.3)',
                color: '#0891B2',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(8, 145, 178, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(8, 145, 178, 0.15)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* LOGOUT WARNING MODAL */}
      {showLogoutWarning && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowLogoutWarning(false); }}
        >
          <div style={{ width: '400px', backgroundColor: '#111', padding: '40px', borderRadius: '28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 12px 0' }}>Unsaved Data</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: '1.6', fontSize: '15px' }}>
              You have an active session with unsaved changes. Logging out now will discard your current progress.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutWarning(false)}
                autoFocus
                style={{ padding: '16px 24px', borderRadius: '12px', background: '#0891B2', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', width: '100%', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0E7490'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0891B2'}
              >
                ← Return to Page
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: '16px 24px', borderRadius: '12px', background: 'transparent', border: '2px solid #F59E0B', color: '#F59E0B', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F59E0B'; }}
              >
                Log Out & Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorklistPage;
