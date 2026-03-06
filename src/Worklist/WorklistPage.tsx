import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useLogout } from '@hooks/useLogout';
import { SunIcon, MoonIcon, HelpIcon, MonitorIcon } from "../components/Icons/Icons";
import { PathologyCase } from './types';
import WorklistTable from './WorklistTable';
import CaseSearchBar from '../components/Search/CaseSearchBar';

const WorklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleLogout = useLogout();
  const [activeFilter, setActiveFilter] = useState<'all' | 'review' | 'completed'>('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'auto'>('dark');
  
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

const handleNavigateHome = () => {
  navigate('/');
};



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
        { name: 'Pending Clinical Correlation', color: 'yellow' },
        { name: 'Tumor Board Scheduled', color: 'blue' }
      ],
      specimenFlags: [
        { name: 'Margins Involved', color: 'red' }
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
        { name: 'STAT — Rush Processing', color: 'red' }
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
        { name: 'Additional Levels Requested', color: 'orange' }
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
        { name: 'Second Opinion Requested', color: 'purple' }
      ],
      specimenFlags: [
        { name: 'ER/PR/HER2 Pending', color: 'blue' },
        { name: 'IHC Ordered', color: 'green' }
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
      caseFlags: [{ name: 'Intraoperative Consult', color: 'orange' }]
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
      caseFlags: [{ name: 'STAT — Rush Processing', color: 'red' }]
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
      specimenFlags: [{ name: 'Frozen Section Correlation', color: 'blue' }]
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
      specimenFlags: [{ name: 'Trichrome Pending', color: 'green' }]
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
      caseFlags: [{ name: 'STAT — Rush Processing', color: 'red' }]
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
      caseFlags: [{ name: 'STAT — Rush Processing', color: 'red' }, { name: 'Tumor Markers Ordered', color: 'blue' }]
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
      caseFlags: [{ name: 'Sarcoma Protocol', color: 'purple' }],
      specimenFlags: [{ name: 'Cytogenetics Pending', color: 'yellow' }]
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
      specimenFlags: [{ name: 'Flow Cytometry Ordered', color: 'green' }]
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
        { name: 'STAT — Rush Processing', color: 'red' },
        { name: 'Neuro-Oncology Consult', color: 'purple' }
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
      specimenFlags: [{ name: 'HER2 Testing Ordered', color: 'blue' }]
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
      caseFlags: [{ name: 'STAT — Rush Processing', color: 'red' }],
      specimenFlags: [{ name: 'Molecular Panel Ordered', color: 'orange' }]
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
      specimenFlags: [{ name: 'Decal in Progress', color: 'yellow' }]
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
      caseFlags: [{ name: 'Tumor Board Scheduled', color: 'blue' }]
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
        { name: 'STAT — Rush Processing', color: 'red' },
        { name: 'Rejection Rule-Out', color: 'orange' }
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
      specimenFlags: [{ name: 'MSI Testing Ordered', color: 'green' }]
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
        { name: 'STAT — Rush Processing', color: 'red' },
        { name: 'Molecular Profiling Pending', color: 'yellow' }
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
      caseFlags: [{ name: 'HPV Testing Ordered', color: 'blue' }]
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
      specimenFlags: [{ name: 'Sentinel Node Submitted', color: 'orange' }]
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
        { name: 'STAT — Rush Processing', color: 'red' },
        { name: 'Heme Oncology Notified', color: 'purple' }
      ],
      specimenFlags: [{ name: 'Flow Cytometry Ordered', color: 'green' }]
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
      caseFlags: [{ name: 'CA-125 Correlation', color: 'yellow' }]
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
      specimenFlags: [{ name: 'Calcifications Noted', color: 'orange' }]
    }
  ];

  const filteredCases = allCases.filter(c => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'review') return c.aiStatus === 'Draft Ready';
    if (activeFilter === 'completed') return c.status === 'Completed';
    return true;
  });

  const stats = {
    grossedToday: allCases.filter(c => c.status === 'Grossed').length,
    pendingMicro: allCases.filter(c => c.status === 'Awaiting Micro').length,
    needsReview: allCases.filter(c => c.aiStatus === 'Draft Ready').length,
    critical: allCases.filter(c => c.isCritical).length
  };

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
        <nav style={{ 
          padding: '20px 40px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.4)', 
          backdropFilter: 'blur(12px)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img 
              src="/pathscribe-logo-dark.svg" 
              alt="PathScribe AI" 
              style={{ height: '60px', width: 'auto', cursor: 'pointer' }} 
              onClick={handleNavigateHome} 
            />
            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
            
            {/* Breadcrumbs */}
            <div style={{ 
              fontSize: '14px', 
              color: '#64748b', 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500
            }}>
              <span 
                onClick={handleNavigateHome}
                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0891B2'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                Home
              </span>
              <span style={{ color: '#cbd5e1' }}>›</span>
              <span style={{ color: '#0891B2', fontWeight: 600 }}>Worklist</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)', 
              paddingRight: '20px' 
            }}>
              <span style={{ fontSize: '17px', fontWeight: 600 }}>
                {user?.name || 'Dr. Johnson'}
              </span>
              <span style={{ fontSize: '12px', color: '#0891B2', fontWeight: 700 }}>
                MD, FCAP
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* User Badge */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'transparent',
                    border: '2px solid #0891B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0891B2',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {user?.name ? user.name.split(' ').map((n:any)=>n[0]).join('') : 'DJ'}
                </button>
              </div>

              {/* Quick Links Button */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '2px solid #0891B2',
                    color: '#0891B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Quick Links"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
              </div>

              {/* Logout Button */}
              <button 
                onClick={() => setShowLogoutWarning(true)}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '2px solid #0891B2',
                  color: '#0891B2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Sign Out"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Case Search Bar */}
        <div style={{
          padding: '16px 40px',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
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
            
            {/* Header Section */}
            <div style={{ marginBottom: '40px' }}>
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
                  { key: 'all', label: 'All Cases' },
                  { key: 'review', label: 'Needs Review' },
                  { key: 'completed', label: 'Completed' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key as any)}
                    style={{
                      padding: '10px 20px',
                      background: activeFilter === filter.key ? '#0891B2' : 'rgba(255,255,255,0.03)',
                      border: activeFilter === filter.key ? '1px solid #0891B2' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: activeFilter === filter.key ? '#000' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (activeFilter !== filter.key) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFilter !== filter.key) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = '#94a3b8';
                      }
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Worklist Table */}
            <WorklistTable cases={filteredCases} activeFilter={activeFilter} />
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
