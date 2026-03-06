import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useLogout } from '@hooks/useLogout';
import WorklistTable from './Worklist/WorklistTable';
import { caseService } from '../services';
import type { PathologyCase, CaseFilterParams } from '../services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateString = (d: Date): string => d.toISOString().split('T')[0];
const today   = (): string => toDateString(new Date());
const daysAgo = (n: number): string => { const d = new Date(); d.setDate(d.getDate() - n); return toDateString(d); };
const fmtDate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
};

// ─── localStorage / sessionStorage ───────────────────────────────────────────

const LS_KEY = 'pathscribe:savedSearches';
const lsLoad = (): SavedSearch[] => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const lsSave = (s: SavedSearch[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

const SS_KEY = 'pathscribe:lastSearch';
interface LastSearchSnapshot { filters: FilterState; results: PathologyCase[]; hasSearched: boolean; }
const ssLoad  = (): LastSearchSnapshot | null => { try { const r = sessionStorage.getItem(SS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const ssSave  = (s: LastSearchSnapshot) => { try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch {} };
const ssClear = () => { try { sessionStorage.removeItem(SS_KEY); } catch {} };

// ─── Specimen dictionary (used for inline typeahead only) ─────────────────────
// Full specimen list lives in mockSpecimenService — this is just for the
// search field suggestions until that service is wired to this page.
const SPECIMEN_DICTIONARY = [
  'Left Breast Mastectomy','Right Breast Mastectomy','Right Breast Lumpectomy','Left Breast Lumpectomy',
  'Right Hemicolectomy','Left Hemicolectomy','Radical Prostatectomy','Left Lower Lobe Lobectomy',
  'Right Upper Lobe Lobectomy','Total Thyroidectomy','Partial Thyroidectomy',
  'Cholecystectomy','Appendectomy','Partial Nephrectomy','Radical Nephrectomy',
  'Total Hysterectomy','Wide Local Excision','Axillary Node Dissection',
  'TURBT Specimen','Endocervical Curettage','Cervical Cone Biopsy',
  'Sentinel Lymph Node Biopsy','Core Needle Biopsy Breast','Prostate Biopsy Cores',
];

// ─── SNOMED CT codes ──────────────────────────────────────────────────────────

type CodeSystem = 'SNOMED' | 'ICD';
interface CodeSuggestion { system: CodeSystem; code: string; display: string; }

const SNOMED_CODES: CodeSuggestion[] = [
  { system:'SNOMED', code:'413448000', display:'Invasive ductal carcinoma of breast' },
  { system:'SNOMED', code:'413449008', display:'Invasive lobular carcinoma of breast' },
  { system:'SNOMED', code:'413448001', display:'Triple negative breast carcinoma' },
  { system:'SNOMED', code:'363406005', display:'Adenocarcinoma of colon' },
  { system:'SNOMED', code:'399068003', display:'Adenocarcinoma of prostate' },
  { system:'SNOMED', code:'35919005',  display:'Gleason grade 3+3 adenocarcinoma of prostate' },
  { system:'SNOMED', code:'55557003',  display:'Gleason grade 3+4 adenocarcinoma of prostate' },
  { system:'SNOMED', code:'80581009',  display:'Gleason grade 4+3 adenocarcinoma of prostate' },
  { system:'SNOMED', code:'254637007', display:'Non-small cell carcinoma of lung' },
  { system:'SNOMED', code:'254637006', display:'Squamous cell carcinoma of lung' },
  { system:'SNOMED', code:'254637008', display:'Adenocarcinoma of lung' },
  { system:'SNOMED', code:'363478007', display:'Malignant neoplasm of thyroid gland' },
  { system:'SNOMED', code:'372130007', display:'Malignant melanoma of skin' },
  { system:'SNOMED', code:'363518003', display:'Malignant neoplasm of endometrium' },
  { system:'SNOMED', code:'363440005', display:'Transitional cell carcinoma of bladder' },
  { system:'SNOMED', code:'444810001', display:'High grade serous carcinoma of ovary' },
  { system:'SNOMED', code:'255082004', display:'Clear cell renal cell carcinoma' },
  { system:'SNOMED', code:'413449009', display:'Papillary renal cell carcinoma' },
  { system:'SNOMED', code:'413448002', display:'Chromophobe renal cell carcinoma' },
  { system:'SNOMED', code:'276828006', display:'Stage I breast carcinoma' },
  { system:'SNOMED', code:'276829003', display:'Stage II breast carcinoma' },
  { system:'SNOMED', code:'369900003', display:'pT1 prostate carcinoma' },
  { system:'SNOMED', code:'369901004', display:'pT2 prostate carcinoma' },
  { system:'SNOMED', code:'369902006', display:'pT3 prostate carcinoma' },
];

const ICD_CODES: CodeSuggestion[] = [
  { system:'ICD', code:'C50.512', display:'Malignant neoplasm lower-outer quadrant left female breast' },
  { system:'ICD', code:'C50.412', display:'Malignant neoplasm upper-outer quadrant left female breast' },
  { system:'ICD', code:'C50.119', display:'Malignant neoplasm of central portion of breast, unspecified' },
  { system:'ICD', code:'C18.2',   display:'Malignant neoplasm of ascending colon' },
  { system:'ICD', code:'C18.7',   display:'Malignant neoplasm of sigmoid colon' },
  { system:'ICD', code:'C19',     display:'Malignant neoplasm of rectosigmoid junction' },
  { system:'ICD', code:'C20',     display:'Malignant neoplasm of rectum' },
  { system:'ICD', code:'C61',     display:'Malignant neoplasm of prostate' },
  { system:'ICD', code:'C34.10',  display:'Malignant neoplasm of upper lobe bronchus/lung, unspecified' },
  { system:'ICD', code:'C34.30',  display:'Malignant neoplasm of lower lobe bronchus/lung, unspecified' },
  { system:'ICD', code:'C73',     display:'Malignant neoplasm of thyroid gland' },
  { system:'ICD', code:'C43.9',   display:'Malignant melanoma of skin, unspecified' },
  { system:'ICD', code:'C54.1',   display:'Malignant neoplasm of endometrium' },
  { system:'ICD', code:'C67.9',   display:'Malignant neoplasm of bladder, unspecified' },
  { system:'ICD', code:'C64.1',   display:'Malignant neoplasm of right kidney, except renal pelvis' },
  { system:'ICD', code:'C64.2',   display:'Malignant neoplasm of left kidney, except renal pelvis' },
  { system:'ICD', code:'C56.1',   display:'Malignant neoplasm of right ovary' },
  { system:'ICD', code:'C56.2',   display:'Malignant neoplasm of left ovary' },
  { system:'ICD', code:'C53.9',   display:'Malignant neoplasm of cervix uteri, unspecified' },
  { system:'ICD', code:'C77.0',   display:'Secondary malignant neoplasm lymph nodes head/face/neck' },
  { system:'ICD', code:'C49.9',   display:'Malignant neoplasm connective/soft tissue, unspecified' },
];

// ─── Synoptics ────────────────────────────────────────────────────────────────

interface SynopticTemplate { id: string; name: string; organ: string; category: string; }
const ALL_SYNOPTICS: SynopticTemplate[] = [
  { id:'p01', name:'CAP Breast Invasive Carcinoma', organ:'Breast',     category:'Breast'      },
  { id:'p02', name:'CAP Breast DCIS',               organ:'Breast DCIS',category:'Breast'      },
  { id:'p03', name:'CAP Colon Resection',           organ:'Colon',      category:'GI'          },
  { id:'p04', name:'CAP Rectum Resection',          organ:'Rectum',     category:'GI'          },
  { id:'p05', name:'CAP Appendix',                  organ:'Appendix',   category:'GI'          },
  { id:'p06', name:'CAP Prostatectomy',             organ:'Prostate',   category:'GU'          },
  { id:'p07', name:'CAP Prostate Biopsy',           organ:'Prostate Bx',category:'GU'          },
  { id:'p08', name:'CAP Kidney Resection',          organ:'Kidney',     category:'GU'          },
  { id:'p09', name:'CAP Bladder Resection',         organ:'Bladder',    category:'GU'          },
  { id:'p10', name:'CAP Lung Resection',            organ:'Lung',       category:'Thoracic'    },
  { id:'p11', name:'CAP Mesothelioma',              organ:'Pleura',     category:'Thoracic'    },
  { id:'p12', name:'CAP Thyroid',                   organ:'Thyroid',    category:'Endocrine'   },
  { id:'p13', name:'CAP Adrenal',                   organ:'Adrenal',    category:'Endocrine'   },
  { id:'p14', name:'CAP Endometrium',               organ:'Uterus',     category:'Gynaecology' },
  { id:'p15', name:'CAP Cervix Resection',          organ:'Cervix',     category:'Gynaecology' },
  { id:'p16', name:'CAP Ovary',                     organ:'Ovary',      category:'Gynaecology' },
  { id:'p17', name:'CAP Melanoma',                  organ:'Skin',       category:'Skin'        },
  { id:'p18', name:'CAP Squamous Cell Carcinoma',   organ:'Skin SCC',   category:'Skin'        },
  { id:'p19', name:'CAP Soft Tissue',               organ:'Soft Tissue',category:'Bone/Soft'   },
  { id:'p20', name:'CAP Bone',                      organ:'Bone',       category:'Bone/Soft'   },
  { id:'p21', name:'CAP Lymph Node',                organ:'Lymph Node', category:'Haem'        },
  { id:'p22', name:'CAP Hodgkin Lymphoma',          organ:'Lymphoma',   category:'Haem'        },
];

// ─── Users ────────────────────────────────────────────────────────────────────

interface UserStub { id: string; name: string; }
const ALL_PATHOLOGISTS: UserStub[] = [
  { id:'path-1', name:'Dr. Sarah Johnson'   },
  { id:'path-2', name:'Dr. Michael Chen'    },
  { id:'path-3', name:'Dr. Emily Rodriguez' },
  { id:'path-4', name:'Dr. James Okafor'    },
  { id:'path-5', name:'Dr. Priya Nair'      },
  { id:'path-6', name:'Dr. David Lee'       },
  { id:'path-7', name:'Dr. Anna Fischer'    },
  { id:'path-8', name:'Dr. Raj Patel'       },
];
const ALL_ATTENDINGS: UserStub[] = [
  { id:'att-1',  name:'Dr. Robert Williams'  },
  { id:'att-2',  name:'Dr. Linda Martinez'   },
  { id:'att-3',  name:'Dr. Kevin Thompson'   },
  { id:'att-4',  name:'Dr. Susan Clark'      },
  { id:'att-5',  name:'Dr. Brian Park'       },
  { id:'att-6',  name:'Dr. Catherine Moore'  },
  { id:'att-7',  name:'Dr. Thomas Harris'    },
  { id:'att-8',  name:'Dr. Patricia Allen'   },
  { id:'att-9',  name:'Dr. Mark Davis'       },
  { id:'att-10', name:'Dr. Nicole Wilson'    },
];

// ─── Flags ────────────────────────────────────────────────────────────────────

const ALL_FLAGS = [
  'RUSH','Frozen Section','QI Review','Clinician Query','Recut Requested',
  'Additional Levels','Special Stains Pending','IHC Pending','Molecular Pending',
  'Correlation Required','Second Opinion','Amended Report','Addendum Added',
  'Tumour Board','MDT Discussion','Conference Case','Teaching Case',
  'Research Consent','Clinical Trial','Rare Diagnosis',
];

const CASE_STATUS_OPTIONS = ['Grossed','Awaiting Micro','Finalizing','Completed'] as const;
const PRIORITY_OPTIONS    = ['Routine','STAT'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  patientName: string; hospitalId: string; accessionNo: string;
  diagnosisList: string[]; specimenList: string[];
  snomedList: CodeSuggestion[]; icdList: CodeSuggestion[];
  synopticIds: string[]; flagsList: string[];
  pathologistIds: string[]; attendingIds: string[];
  submittingNames: string[]; statusList: string[]; priorityList: string[];
  dateFrom: string; dateTo: string;
}
interface SavedSearch { id: string; name: string; filters: FilterState; createdAt: string; }

// ─── English summary ──────────────────────────────────────────────────────────

const buildSummary = (f: FilterState): string => {
  const parts: string[] = [];
  if (f.dateFrom || f.dateTo) parts.push(`accession ${fmtDate(f.dateFrom)||'…'} – ${fmtDate(f.dateTo)||'today'}`);
  if (f.patientName)           parts.push(`patient "${f.patientName}"`);
  if (f.accessionNo)           parts.push(`accession "${f.accessionNo}"`);
  if (f.hospitalId)            parts.push(`MRN "${f.hospitalId}"`);
  if (f.specimenList.length)   parts.push(`specimen: ${f.specimenList.join(', ')}`);
  if (f.diagnosisList.length)  parts.push(`diagnosis: ${f.diagnosisList.join(', ')}`);
  if (f.snomedList.length)     parts.push(`SNOMED: ${f.snomedList.map(s=>s.code).join(', ')}`);
  if (f.icdList.length)        parts.push(`ICD: ${f.icdList.map(s=>s.code).join(', ')}`);
  if (f.statusList.length)     parts.push(`status: ${f.statusList.join(', ')}`);
  if (f.priorityList.length)   parts.push(`priority: ${f.priorityList.join(', ')}`);
  if (f.flagsList.length)      parts.push(`flags: ${f.flagsList.join(', ')}`);
  if (f.synopticIds.length)    parts.push(`synoptic: ${f.synopticIds.map(id=>ALL_SYNOPTICS.find(t=>t.id===id)?.organ??id).join(', ')}`);
  if (f.pathologistIds.length) parts.push(`pathologist: ${f.pathologistIds.map(id=>ALL_PATHOLOGISTS.find(u=>u.id===id)?.name??id).join(', ')}`);
  if (f.attendingIds.length)   parts.push(`attending: ${f.attendingIds.map(id=>ALL_ATTENDINGS.find(u=>u.id===id)?.name??id).join(', ')}`);
  return parts.length===0 ? 'Showing all cases' : 'Showing cases with '+parts.join(' · ');
};

// ─── Virtual scroll wrapper — scroll listener NOW properly attached ───────────

const ROW_CHUNK = 25;
const ROW_LOAD  = 25;

const VirtualWorklist: React.FC<{ cases: PathologyCase[]; onBeforeNavigate: () => void }> = ({ cases, onBeforeNavigate }) => {
  const [visibleCount, setVisibleCount] = useState(ROW_CHUNK);
  const scrollRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => { setVisibleCount(ROW_CHUNK); }, [cases]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200)
      setVisibleCount(v => Math.min(v + ROW_LOAD, cases.length));
  }, [cases.length]);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <div ref={scrollRef} style={{ height:'100%', overflowY:'auto' }}>
      <WorklistTable cases={cases.slice(0, visibleCount)} onBeforeNavigate={onBeforeNavigate} />
      {visibleCount < cases.length && (
        <div style={{ textAlign:'center', padding:'12px 0', fontSize:12, color:'#374151' }}>
          Showing {visibleCount} of {cases.length} — scroll to load more
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:999, background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.4)', fontSize:11, color:'#7dd3fc' }}>
    {label}
    <button type="button" onClick={onRemove} style={{ border:'none', background:'transparent', color:'#7dd3fc', cursor:'pointer', fontSize:13, lineHeight:1, padding:0 }}>×</button>
  </span>
);

const CheckPill: React.FC<{ label: string; checked: boolean; onChange: () => void; accent?: string }> = ({ label, checked, onChange, accent='#0891B2' }) => (
  <button type="button" onClick={onChange} style={{
    display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999,
    cursor:'pointer', fontSize:11, fontWeight:500, transition:'all 0.15s', whiteSpace:'nowrap' as const,
    background: checked ? `${accent}22` : 'rgba(15,23,42,0.5)',
    border:`1px solid ${checked ? accent : 'rgba(148,163,184,0.2)'}`,
    color: checked ? '#e2e8f0' : '#64748b',
  }}>
    <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:checked?accent:'transparent', border:`1.5px solid ${checked?accent:'#475569'}` }} />
    {label}
  </button>
);

// SectionLabel: dim by default, vivid when active
const SectionLabel: React.FC<{ title: string; active?: boolean }> = ({ title, active=false }) => (
  <div style={{
    fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.7px', marginBottom:5,
    color: active ? '#7dd3fc' : '#4b5563',
    transition:'color 0.15s',
  }}>{title}</div>
);

// Browse button — opens lookup modal
const BrowseBtn: React.FC<{ onClick: () => void; count?: number }> = ({ onClick, count }) => (
  <button type="button" onClick={onClick} style={{
    display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:5,
    border:'1px dashed rgba(8,145,178,0.45)', background:'transparent',
    color:'#0891B2', fontSize:10, fontWeight:600, cursor:'pointer', transition:'all 0.15s', marginLeft:5,
  }}
    onMouseEnter={e=>{e.currentTarget.style.background='rgba(8,145,178,0.1)';}}
    onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
    Browse{count!==undefined?` (${count})`:''}…
  </button>
);

const DROPDOWN_STYLE: React.CSSProperties = {
  position:'absolute', top:'100%', left:0, right:0, marginTop:3,
  background:'#020617', borderRadius:8, border:'1px solid rgba(148,163,184,0.35)',
  maxHeight:180, overflowY:'auto', zIndex:60, boxShadow:'0 8px 24px rgba(0,0,0,0.7)',
};
const DROP_BTN: React.CSSProperties = {
  width:'100%', textAlign:'left', padding:'6px 10px',
  border:'none', background:'transparent', color:'#e5e7eb', fontSize:12, cursor:'pointer',
};

// ─── Lookup Modal shell ───────────────────────────────────────────────────────

const LookupModal: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 }}
    onClick={onClose}>
    <div style={{ width:640, maxHeight:'80vh', display:'flex', flexDirection:'column', backgroundColor:'#0a0f1e', borderRadius:16, border:'1px solid rgba(8,145,178,0.3)', boxShadow:'0 30px 60px rgba(0,0,0,0.8)', overflow:'hidden' }}
      onClick={e=>e.stopPropagation()}>
      <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9' }}>{title}</div>
          {subtitle && <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ border:'none', background:'transparent', color:'#64748b', fontSize:20, cursor:'pointer', lineHeight:1, padding:'0 4px' }}
          onMouseEnter={e=>(e.currentTarget.style.color='#e2e8f0')} onMouseLeave={e=>(e.currentTarget.style.color='#64748b')}>×</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>{children}</div>
    </div>
  </div>
);

// ─── Code lookup modal (SNOMED / ICD) ─────────────────────────────────────────

const CodeLookupContent: React.FC<{ system: CodeSystem; codes: CodeSuggestion[]; selected: CodeSuggestion[]; onToggle: (c: CodeSuggestion) => void }> = ({ system, codes, selected, onToggle }) => {
  const [q, setQ] = useState('');
  const accent = system === 'SNOMED' ? '#0891B2' : '#8B5CF6';
  const filtered = q.length < 2 ? codes : codes.filter(c => c.code.toLowerCase().includes(q.toLowerCase()) || c.display.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search ${system} codes or descriptions…`}
        style={{ width:'100%', padding:'9px 12px', background:'rgba(15,23,42,0.8)', border:`1px solid rgba(148,163,184,0.3)`, borderRadius:8, color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:12 }}
        onFocus={e=>(e.currentTarget.style.borderColor=accent)} onBlur={e=>(e.currentTarget.style.borderColor='rgba(148,163,184,0.3)')} />
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {filtered.map(c => {
          const sel = selected.some(x=>x.code===c.code);
          return (
            <button key={c.code} type="button" onClick={()=>onToggle(c)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:8, cursor:'pointer', textAlign:'left' as const, transition:'all 0.12s',
              background: sel ? `rgba(${system==='SNOMED'?'8,145,178':'139,92,246'},0.14)` : 'rgba(255,255,255,0.02)',
              border:`1px solid ${sel ? (system==='SNOMED'?'rgba(8,145,178,0.5)':'rgba(139,92,246,0.5)') : 'rgba(255,255,255,0.05)'}`,
            }}
              onMouseEnter={e=>{if(!sel)e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
              onMouseLeave={e=>{if(!sel)e.currentTarget.style.background='rgba(255,255,255,0.02)';}}>
              <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:sel?(system==='SNOMED'?'#7dd3fc':'#c4b5fd'):'#64748b', flexShrink:0, minWidth:76 }}>{c.code}</span>
              <span style={{ fontSize:12, color:sel?'#e2e8f0':'#94a3b8', flex:1, lineHeight:1.4 }}>{c.display}</span>
              {sel && <span style={{ color:system==='SNOMED'?'#7dd3fc':'#c4b5fd', fontSize:14, flexShrink:0 }}>✓</span>}
            </button>
          );
        })}
        {filtered.length===0 && <div style={{ color:'#475569', fontSize:13, padding:'20px 0', textAlign:'center' as const }}>No results{q?' for "'+q+'"':''}</div>}
      </div>
    </>
  );
};

// ─── Synoptic lookup modal ────────────────────────────────────────────────────

const SynopticLookupContent: React.FC<{ selected: string[]; onToggle: (id: string) => void }> = ({ selected, onToggle }) => {
  const [q, setQ] = useState('');
  const categories = Array.from(new Set(ALL_SYNOPTICS.map(s=>s.category)));
  const filtered = q.length < 1 ? ALL_SYNOPTICS : ALL_SYNOPTICS.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.organ.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search protocols…"
        style={{ width:'100%', padding:'9px 12px', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(148,163,184,0.3)', borderRadius:8, color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:14 }}
        onFocus={e=>(e.currentTarget.style.borderColor='#0891B2')} onBlur={e=>(e.currentTarget.style.borderColor='rgba(148,163,184,0.3)')} />
      {q.length < 1
        ? categories.map(cat => {
            const items = ALL_SYNOPTICS.filter(s=>s.category===cat);
            return (
              <div key={cat} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#475569', textTransform:'uppercase' as const, letterSpacing:'0.6px', marginBottom:6 }}>{cat}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {items.map(s => { const sel=selected.includes(s.id); return (
                    <button key={s.id} type="button" onClick={()=>onToggle(s.id)} style={{ padding:'5px 12px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.12s', background:sel?'rgba(8,145,178,0.2)':'rgba(255,255,255,0.04)', border:`1px solid ${sel?'#0891B2':'rgba(255,255,255,0.1)'}`, color:sel?'#7dd3fc':'#94a3b8' }}>{s.organ}</button>
                  ); })}
                </div>
              </div>
            );
          })
        : <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {filtered.map(s => { const sel=selected.includes(s.id); return (
              <button key={s.id} type="button" onClick={()=>onToggle(s.id)} style={{ padding:'5px 12px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.12s', background:sel?'rgba(8,145,178,0.2)':'rgba(255,255,255,0.04)', border:`1px solid ${sel?'#0891B2':'rgba(255,255,255,0.1)'}`, color:sel?'#7dd3fc':'#94a3b8' }}>{s.name}</button>
            ); })}
          </div>
      }
    </>
  );
};

// ─── User lookup modal ────────────────────────────────────────────────────────

const UserLookupContent: React.FC<{ users: UserStub[]; selected: string[]; onToggle: (id: string) => void; accent?: string }> = ({ users, selected, onToggle, accent='#0891B2' }) => {
  const [q, setQ] = useState('');
  const filtered = q.length < 1 ? users : users.filter(u=>u.name.toLowerCase().includes(q.toLowerCase()));
  const initials = (name: string) => name.replace('Dr. ','').split(' ').map(w=>w[0]).join('').slice(0,2);
  return (
    <>
      <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name…"
        style={{ width:'100%', padding:'9px 12px', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(148,163,184,0.3)', borderRadius:8, color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:12 }}
        onFocus={e=>(e.currentTarget.style.borderColor=accent)} onBlur={e=>(e.currentTarget.style.borderColor='rgba(148,163,184,0.3)')} />
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {filtered.map(u => { const sel=selected.includes(u.id); return (
          <button key={u.id} type="button" onClick={()=>onToggle(u.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:8, cursor:'pointer', textAlign:'left' as const, transition:'all 0.12s', background:sel?'rgba(8,145,178,0.14)':'rgba(255,255,255,0.02)', border:`1px solid ${sel?'rgba(8,145,178,0.5)':'rgba(255,255,255,0.05)'}` }}
            onMouseEnter={e=>{if(!sel)e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
            onMouseLeave={e=>{if(!sel)e.currentTarget.style.background='rgba(255,255,255,0.02)';}}>
            <div style={{ width:30, height:30, borderRadius:7, background:'rgba(8,145,178,0.12)', border:'1px solid rgba(8,145,178,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#0891B2', flexShrink:0 }}>{initials(u.name)}</div>
            <span style={{ fontSize:13, color:sel?'#e2e8f0':'#94a3b8', flex:1 }}>{u.name}</span>
            {sel && <span style={{ color:'#0891B2', fontSize:14 }}>✓</span>}
          </button>
        ); })}
      </div>
    </>
  );
};

// ─── Flags lookup modal ───────────────────────────────────────────────────────

const FlagsLookupContent: React.FC<{ selected: string[]; onToggle: (f: string) => void }> = ({ selected, onToggle }) => {
  const [q, setQ] = useState('');
  const filtered = q.length < 1 ? ALL_FLAGS : ALL_FLAGS.filter(f=>f.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input autoFocus type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search flags…"
        style={{ width:'100%', padding:'9px 12px', background:'rgba(15,23,42,0.8)', border:'1px solid rgba(148,163,184,0.3)', borderRadius:8, color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:12 }}
        onFocus={e=>(e.currentTarget.style.borderColor='#f59e0b')} onBlur={e=>(e.currentTarget.style.borderColor='rgba(148,163,184,0.3)')} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {filtered.map(f => { const sel=selected.includes(f); return (
          <button key={f} type="button" onClick={()=>onToggle(f)} style={{ padding:'6px 14px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.12s', background:sel?'rgba(245,158,11,0.18)':'rgba(255,255,255,0.04)', border:`1px solid ${sel?'#f59e0b':'rgba(255,255,255,0.1)'}`, color:sel?'#fbbf24':'#94a3b8' }}>{f}</button>
        ); })}
      </div>
    </>
  );
};

// ─── Nav icon button ──────────────────────────────────────────────────────────

const IconBtn: React.FC<{ children: React.ReactNode; onClick: () => void; title: string; circle?: boolean }> = ({ children, onClick, title, circle=false }) => (
  <button onClick={onClick} title={title} style={{ width:42, height:42, borderRadius:circle?'50%':8, background:'transparent', border:'2px solid #0891B2', color:'#0891B2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:800, fontSize:14 }}
    onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.1)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>{children}</button>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const SearchPage: React.FC = () => {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const handleLogout = useLogout();

  const [isLoaded,        setIsLoaded]        = useState(false);
  const [isProfileOpen,   setIsProfileOpen]   = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Lookup modals
  const [snomedModal,    setSnomedModal]    = useState(false);
  const [icdModal,       setIcdModal]       = useState(false);
  const [synopticModal,  setSynopticModal]  = useState(false);
  const [flagsModal,     setFlagsModal]     = useState(false);
  const [pathModal,      setPathModal]      = useState(false);
  const [attendingModal, setAttendingModal] = useState(false);

  // Active section (for label intensity)
  const [activeSection, setActiveSection] = useState('');

  // Filter state
  const [patientName,  setPatientName]  = useState('');
  const [hospitalId,   setHospitalId]   = useState('');
  const [accessionNo,  setAccessionNo]  = useState('');
  const [dateFrom,     setDateFrom]     = useState(daysAgo(30));
  const [dateTo,       setDateTo]       = useState(today());

  const [specimenQuery,       setSpecimenQuery]       = useState('');
  const [specimenList,        setSpecimenList]        = useState<string[]>([]);
  const [specimenSuggestions, setSpecimenSuggestions] = useState<string[]>([]);
  const [showSpecimenDrop,    setShowSpecimenDrop]    = useState(false);
  const specimenRef = useRef<HTMLDivElement|null>(null);

  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisList, setDiagnosisList] = useState<string[]>([]);

  const [snomedQuery,       setSnomedQuery]       = useState('');
  const [snomedList,        setSnomedList]        = useState<CodeSuggestion[]>([]);
  const [snomedSuggestions, setSnomedSuggestions] = useState<CodeSuggestion[]>([]);
  const [showSnomedDrop,    setShowSnomedDrop]    = useState(false);
  const snomedRef = useRef<HTMLDivElement|null>(null);

  const [icdQuery,       setIcdQuery]       = useState('');
  const [icdList,        setIcdList]        = useState<CodeSuggestion[]>([]);
  const [icdSuggestions, setIcdSuggestions] = useState<CodeSuggestion[]>([]);
  const [showIcdDrop,    setShowIcdDrop]    = useState(false);
  const icdRef = useRef<HTMLDivElement|null>(null);

  const [synopticIds,    setSynopticIds]    = useState<string[]>([]);
  const [flagsList,      setFlagsList]      = useState<string[]>([]);
  const [pathologistIds, setPathologistIds] = useState<string[]>([]);
  const [attendingIds,   setAttendingIds]   = useState<string[]>([]);
  const [submittingNames,setSubmittingNames]= useState<string[]>([]);
  const [statusList,     setStatusList]     = useState<string[]>([]);
  const [priorityList,   setPriorityList]   = useState<string[]>([]);

  const [results,     setResults]     = useState<PathologyCase[]|null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(lsLoad);
  const [activeSavedId, setActiveSavedId] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const saveInputRef = useRef<HTMLInputElement|null>(null);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const returning = sessionStorage.getItem('pathscribe:searchReturn') === '1';
    sessionStorage.removeItem('pathscribe:searchReturn');
    if (!returning) { ssClear(); return; }
    const snap = ssLoad(); if (!snap) return;
    const f = snap.filters;
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setAccessionNo(f.accessionNo);
    setDateFrom(f.dateFrom); setDateTo(f.dateTo);
    setSpecimenList(f.specimenList); setDiagnosisList(f.diagnosisList);
    setSnomedList(f.snomedList); setIcdList(f.icdList);
    setSynopticIds(f.synopticIds); setFlagsList(f.flagsList);
    setPathologistIds(f.pathologistIds ?? []); setAttendingIds(f.attendingIds ?? []);
    setSubmittingNames(f.submittingNames); setStatusList(f.statusList); setPriorityList(f.priorityList);
    setResults(snap.results); setHasSearched(snap.hasSearched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const t = setTimeout(()=>setIsLoaded(true), 80); return ()=>clearTimeout(t); }, []);
  useEffect(() => { lsSave(savedSearches); }, [savedSearches]);
  useEffect(() => { if (showSaveInput) saveInputRef.current?.focus(); }, [showSaveInput]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (specimenRef.current && !specimenRef.current.contains(e.target as Node)) setShowSpecimenDrop(false);
      if (snomedRef.current   && !snomedRef.current.contains(e.target as Node))   setShowSnomedDrop(false);
      if (icdRef.current      && !icdRef.current.contains(e.target as Node))      setShowIcdDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!specimenQuery || specimenQuery.length < 2) { setSpecimenSuggestions([]); setShowSpecimenDrop(false); return; }
    const q = specimenQuery.toLowerCase();
    const hits = SPECIMEN_DICTIONARY.filter(s=>s.toLowerCase().includes(q)&&!specimenList.includes(s)).slice(0,8);
    setSpecimenSuggestions(hits); setShowSpecimenDrop(hits.length>0);
  }, [specimenQuery, specimenList]);

  useEffect(() => {
    if (!snomedQuery || snomedQuery.length < 2) { setSnomedSuggestions([]); setShowSnomedDrop(false); return; }
    const q = snomedQuery.toLowerCase();
    const hits = SNOMED_CODES.filter(c=>c.code.toLowerCase().includes(q)||c.display.toLowerCase().includes(q)).slice(0,6);
    setSnomedSuggestions(hits); setShowSnomedDrop(hits.length>0);
  }, [snomedQuery]);

  useEffect(() => {
    if (!icdQuery || icdQuery.length < 2) { setIcdSuggestions([]); setShowIcdDrop(false); return; }
    const q = icdQuery.toLowerCase();
    const hits = ICD_CODES.filter(c=>c.code.toLowerCase().includes(q)||c.display.toLowerCase().includes(q)).slice(0,6);
    setIcdSuggestions(hits); setShowIcdDrop(hits.length>0);
  }, [icdQuery]);

  useEffect(() => {
    if (!hasSearched) return; void runSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientName,hospitalId,accessionNo,diagnosisList,specimenList,snomedList,icdList,synopticIds,flagsList,pathologistIds,attendingIds,submittingNames,statusList,priorityList,dateFrom,dateTo]);

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const currentFilters = (): FilterState => ({
    patientName, hospitalId, accessionNo, diagnosisList, specimenList,
    snomedList, icdList, synopticIds, flagsList, pathologistIds, attendingIds,
    submittingNames, statusList, priorityList, dateFrom, dateTo,
  });

  const applyFilters = (f: FilterState) => {
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setAccessionNo(f.accessionNo);
    setDiagnosisList(f.diagnosisList); setSpecimenList(f.specimenList);
    setSnomedList(f.snomedList); setIcdList(f.icdList);
    setSynopticIds(f.synopticIds); setFlagsList(f.flagsList);
    setPathologistIds(f.pathologistIds ?? []); setAttendingIds(f.attendingIds ?? []);
    setSubmittingNames(f.submittingNames); setStatusList(f.statusList); setPriorityList(f.priorityList);
    setDateFrom(f.dateFrom); setDateTo(f.dateTo);
  };

  const toggle = (val: string, list: string[], setter: (v: string[]) => void) =>
    list.includes(val) ? setter(list.filter(x=>x!==val)) : setter([...list, val]);

  const addSpecimen = (val: string) => {
    const v = val.trim(); if (!v) return;
    setSpecimenList(p=>p.includes(v)?p:[...p,v]); setSpecimenQuery(''); setShowSpecimenDrop(false);
  };
  const addDiagnosis = () => {
    const v = diagnosisText.trim(); if (!v) return;
    setDiagnosisList(p=>p.includes(v)?p:[...p,v]); setDiagnosisText('');
  };
  const addSnomed = (s: CodeSuggestion) => {
    setSnomedList(p=>p.some(x=>x.code===s.code)?p:[...p,s]); setSnomedQuery(''); setShowSnomedDrop(false);
  };
  const addIcd = (s: CodeSuggestion) => {
    setIcdList(p=>p.some(x=>x.code===s.code)?p:[...p,s]); setIcdQuery(''); setShowIcdDrop(false);
  };

  const runSearch = async () => {
    setIsSearching(true);
    const params: CaseFilterParams = {
      patientName,
      hospitalId,
      accessionNo,
      diagnosisList,
      specimenList,
      snomedCodes:    snomedList.map(s => s.display),
      icdCodes:       icdList.map(s => s.display),
      statusList:     statusList as CaseFilterParams['statusList'],
      priorityList:   priorityList as CaseFilterParams['priorityList'],
    };
    const result = await caseService.getAll(params);
    if (result.ok) {
      setResults(result.data);
      ssSave({ filters: currentFilters(), results: result.data, hasSearched: true });
    }
    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setHasSearched(true); void runSearch(); };

  const handleClear = () => {
    setPatientName(''); setHospitalId(''); setAccessionNo('');
    setDiagnosisText(''); setDiagnosisList([]);
    setSpecimenQuery(''); setSpecimenList([]);
    setSnomedQuery(''); setSnomedList([]);
    setIcdQuery(''); setIcdList([]);
    setSynopticIds([]); setFlagsList([]); setPathologistIds([]); setAttendingIds([]);
    setSubmittingNames([]); setStatusList([]); setPriorityList([]);
    setDateFrom(daysAgo(30)); setDateTo(today());
    setResults(null); setHasSearched(false); setActiveSavedId('');
    ssClear();
  };

  const handleSaveSearch = () => {
    const name = saveNameInput.trim(); if (!name) return;
    const ns: SavedSearch = { id:crypto.randomUUID(), name, filters:currentFilters(), createdAt:new Date().toISOString() };
    setSavedSearches(p=>[...p,ns]); setActiveSavedId(ns.id); setSaveNameInput(''); setShowSaveInput(false);
  };

  const handleLoadSearch = (id: string) => {
    const s = savedSearches.find(x=>x.id===id); if (!s) return;
    applyFilters(s.filters); setActiveSavedId(id); setHasSearched(true); void runSearch();
  };

  const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); setSavedSearches(p=>p.filter(x=>x.id!==id));
    if (activeSavedId===id) setActiveSavedId('');
  };

  // ── Style helpers ──────────────────────────────────────────────────────────

  const INPUT: React.CSSProperties = {
    width:'100%', padding:'7px 10px',
    background:'rgba(15,23,42,0.7)', border:'1px solid rgba(148,163,184,0.25)',
    borderRadius:7, color:'#e2e8f0', fontSize:12, outline:'none', boxSizing:'border-box',
    transition:'border-color 0.15s',
  };

  // onF/onB now also update activeSection via data-section attribute
  const onF = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#0891B2';
    setActiveSection(e.currentTarget.dataset.section ?? '');
  };
  const onB = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)';
    setActiveSection('');
  };

  const activeCount = [
    patientName, hospitalId, accessionNo,
    ...diagnosisList, ...specimenList,
    ...snomedList.map(s=>s.code), ...icdList.map(s=>s.code),
    ...synopticIds, ...flagsList, ...pathologistIds, ...attendingIds, ...submittingNames,
    ...statusList, ...priorityList, dateFrom?'df':'', dateTo?'dt':'',
  ].filter(Boolean).length;

  const summary = hasSearched ? buildSummary(currentFilters()) : null;

  const quickLinks = {
    Protocols:  [{ title:'CAP Cancer Protocols', url:'https://www.cap.org/protocols-and-guidelines' }, { title:'WHO Classification', url:'https://www.who.int/publications' }],
    References: [{ title:'PathologyOutlines', url:'https://www.pathologyoutlines.com' }, { title:'UpToDate', url:'https://www.uptodate.com' }],
    Systems:    [{ title:'Hospital LIS', url:'#' }, { title:'Lab Management', url:'#' }],
  };

  const modalOverlay: React.CSSProperties = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 };

  const sec = (name: string) => ({ active: activeSection===name });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh', backgroundColor:'#000', color:'#fff', fontFamily:"'Inter',sans-serif", opacity:isLoaded?1:0, transition:'opacity 0.5s ease', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      <div style={{ position:'absolute', inset:0, backgroundImage:'url(/main_background.jpg)', backgroundSize:'cover', backgroundPosition:'center', zIndex:0, filter:'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,#000 100%)', zIndex:1 }} />

      <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav style={{ padding:'10px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }}>
          <img src="/pathscribe-logo-dark.svg" alt="PathScribe AI" style={{ height:44, cursor:'pointer' }} onClick={()=>navigate('/')} />
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, borderRight:'1px solid rgba(255,255,255,0.2)', paddingRight:20 }}>
              <span style={{ fontSize:17, fontWeight:600 }}>{user?.name||'Dr. Johnson'}</span>
              <span style={{ fontSize:12, color:'#0891B2', fontWeight:700 }}>MD, FCAP</span>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <IconBtn circle onClick={()=>setIsProfileOpen(o=>!o)} title="Profile">
                {(user?.name||'DJ').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </IconBtn>
              <IconBtn onClick={()=>setIsResourcesOpen(o=>!o)} title="Quick Links">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </IconBtn>
              <IconBtn onClick={()=>setShowLogoutModal(true)} title="Sign Out">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </IconBtn>
            </div>
          </div>
        </nav>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)', padding:'8px 40px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:4, display:'flex', alignItems:'center', gap:8, fontWeight:500 }}>
            <span onClick={()=>navigate('/')} style={{ cursor:'pointer' }} onMouseEnter={e=>(e.currentTarget.style.color='#0891B2')} onMouseLeave={e=>(e.currentTarget.style.color='#64748b')}>Home</span>
            <span style={{ color:'#334155' }}>›</span>
            <span style={{ color:'#0891B2', fontWeight:600 }}>Case Search</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', marginBottom:1 }}>Case Search</div>
              <div style={{ color:'#64748b', fontSize:12 }}>Search across cases, specimens, diagnoses, and clinical codes</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:560 }}>
              {savedSearches.map(s => (
                <button key={s.id} type="button" onClick={()=>handleLoadSearch(s.id)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px 4px 11px', borderRadius:999, cursor:'pointer', fontSize:11, fontWeight:500, background:activeSavedId===s.id?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${activeSavedId===s.id?'#8B5CF6':'rgba(255,255,255,0.1)'}`, color:activeSavedId===s.id?'#c4b5fd':'#94a3b8' }}>
                  🔖 {s.name}
                  <span onClick={e=>handleDeleteSearch(s.id,e)} style={{ marginLeft:2, color:'#cbd5e1', fontSize:13, cursor:'pointer', padding:'0 2px' }} onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>×</span>
                </button>
              ))}
              {showSaveInput ? (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <input ref={saveInputRef} type="text" value={saveNameInput} onChange={e=>setSaveNameInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSaveSearch();if(e.key==='Escape'){setShowSaveInput(false);setSaveNameInput('');}}}
                    placeholder="Name this search…" style={{ padding:'4px 9px', fontSize:11, border:'1px solid rgba(255,255,255,0.15)', borderRadius:7, outline:'none', color:'#e2e8f0', background:'rgba(15,23,42,0.7)', width:145 }} />
                  <button type="button" onClick={handleSaveSearch} style={{ border:'none', background:'#8B5CF6', color:'#fff', borderRadius:7, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>Save</button>
                  <button type="button" onClick={()=>{setShowSaveInput(false);setSaveNameInput('');}} style={{ border:'1px solid #e2e8f0', background:'transparent', color:'#94a3b8', borderRadius:7, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>✕</button>
                </div>
              ) : (
                <button type="button" onClick={()=>setShowSaveInput(true)} style={{ border:'1px dashed #8B5CF6', background:'transparent', color:'#8B5CF6', borderRadius:999, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Save Search</button>
              )}
              {activeCount>0&&<span style={{ background:'#8B5CF6', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 8px', marginLeft:4 }}>{activeCount} filter{activeCount!==1?'s':''}</span>}
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div style={{ flex:1, minHeight:0, display:'flex', overflow:'hidden' }}>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside style={{ width:360, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.06)', background:'rgba(2,6,23,0.65)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <form onSubmit={handleSubmit} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* Accession Date */}
              <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, background:'rgba(8,145,178,0.04)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <SectionLabel title="Accession Date" active={activeSection==='date'} />
                  <div style={{ display:'flex', gap:3 }}>
                    {([['7d',7],['30d',30],['90d',90],['1yr',365]] as [string,number][]).map(([label,days])=>(
                      <button key={label} type="button" onClick={()=>{setDateFrom(daysAgo(days));setDateTo(today());}}
                        style={{ fontSize:10, padding:'2px 6px', borderRadius:5, cursor:'pointer', border:'1px solid rgba(8,145,178,0.4)', background:'rgba(8,145,178,0.08)', color:'#7dd3fc', fontWeight:600 }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:activeSection==='date'?'#7dd3fc':'#475569', marginBottom:3, transition:'color 0.15s' }}>From</div>
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} onFocus={onF} onBlur={onB} data-section="date" style={{...INPUT, colorScheme:'dark' as any}} />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:activeSection==='date'?'#7dd3fc':'#475569', marginBottom:3, transition:'color 0.15s' }}>To</div>
                    <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} onFocus={onF} onBlur={onB} data-section="date" style={{...INPUT, colorScheme:'dark' as any}} />
                  </div>
                </div>
              </div>

              {/* Scrollable filters */}
              <div style={{ flex:1, overflowY:'auto', padding:'10px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>

                {/* Identifiers */}
                <div onMouseEnter={()=>setActiveSection('id')} onMouseLeave={()=>setActiveSection(s=>s==='id'?'':s)}>
                  <SectionLabel title="Identifiers" active={activeSection==='id'} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <input type="text" value={accessionNo} onChange={e=>setAccessionNo(e.target.value)} onFocus={onF} onBlur={onB} data-section="id" style={INPUT} placeholder="Accession #" />
                    <input type="text" value={patientName} onChange={e=>setPatientName(e.target.value)} onFocus={onF} onBlur={onB} data-section="id" style={INPUT} placeholder="Patient name" />
                  </div>
                  <div style={{ marginTop:5 }}>
                    <input type="text" value={hospitalId} onChange={e=>setHospitalId(e.target.value)} onFocus={onF} onBlur={onB} data-section="id" style={INPUT} placeholder="MRN / Hospital ID" />
                  </div>
                </div>

                {/* Status + Priority */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div onMouseEnter={()=>setActiveSection('status')} onMouseLeave={()=>setActiveSection(s=>s==='status'?'':s)}>
                    <SectionLabel title="Status" active={activeSection==='status'} />
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {CASE_STATUS_OPTIONS.map(s=><CheckPill key={s} label={s} checked={statusList.includes(s)} onChange={()=>toggle(s,statusList,setStatusList)} />)}
                    </div>
                  </div>
                  <div onMouseEnter={()=>setActiveSection('priority')} onMouseLeave={()=>setActiveSection(s=>s==='priority'?'':s)}>
                    <SectionLabel title="Priority" active={activeSection==='priority'} />
                    <div style={{ display:'flex', gap:4 }}>
                      {PRIORITY_OPTIONS.map(p=><CheckPill key={p} label={p} checked={priorityList.includes(p)} onChange={()=>toggle(p,priorityList,setPriorityList)} accent={p==='STAT'?'#ef4444':'#0891B2'} />)}
                    </div>
                  </div>
                </div>

                {/* Flags */}
                <div onMouseEnter={()=>setActiveSection('flags')} onMouseLeave={()=>setActiveSection(s=>s==='flags'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="Flags" active={activeSection==='flags'} />
                    <BrowseBtn onClick={()=>setFlagsModal(true)} count={ALL_FLAGS.length} />
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {ALL_FLAGS.slice(0,5).map(f=><CheckPill key={f} label={f} checked={flagsList.includes(f)} onChange={()=>toggle(f,flagsList,setFlagsList)} accent="#f59e0b" />)}
                  </div>
                  {flagsList.filter(f=>!ALL_FLAGS.slice(0,5).includes(f)).length>0&&(
                    <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>
                      {flagsList.filter(f=>!ALL_FLAGS.slice(0,5).includes(f)).map(f=><Chip key={f} label={f} onRemove={()=>setFlagsList(p=>p.filter(x=>x!==f))} />)}
                    </div>
                  )}
                </div>

                {/* Synoptic */}
                <div onMouseEnter={()=>setActiveSection('synoptic')} onMouseLeave={()=>setActiveSection(s=>s==='synoptic'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="Synoptic Protocol" active={activeSection==='synoptic'} />
                    <BrowseBtn onClick={()=>setSynopticModal(true)} count={ALL_SYNOPTICS.length} />
                  </div>
                  {synopticIds.length>0
                    ? <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{synopticIds.map(id=>{const t=ALL_SYNOPTICS.find(s=>s.id===id);return t?<Chip key={id} label={t.organ} onRemove={()=>setSynopticIds(p=>p.filter(x=>x!==id))} />:null;})}</div>
                    : <div style={{ fontSize:11, color:'#374151', fontStyle:'italic' }}>None selected — use Browse to pick protocols</div>
                  }
                </div>

                {/* Pathologist */}
                <div onMouseEnter={()=>setActiveSection('path')} onMouseLeave={()=>setActiveSection(s=>s==='path'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="Pathologist" active={activeSection==='path'} />
                    <BrowseBtn onClick={()=>setPathModal(true)} count={ALL_PATHOLOGISTS.length} />
                  </div>
                  {pathologistIds.length>0
                    ? <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{pathologistIds.map(id=>{const u=ALL_PATHOLOGISTS.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setPathologistIds(p=>p.filter(x=>x!==id))} />:null;})}</div>
                    : <div style={{ fontSize:11, color:'#374151', fontStyle:'italic' }}>None selected</div>
                  }
                </div>

                {/* Attending Physician */}
                <div onMouseEnter={()=>setActiveSection('attending')} onMouseLeave={()=>setActiveSection(s=>s==='attending'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="Attending Physician" active={activeSection==='attending'} />
                    <BrowseBtn onClick={()=>setAttendingModal(true)} count={ALL_ATTENDINGS.length} />
                  </div>
                  {attendingIds.length>0
                    ? <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{attendingIds.map(id=>{const u=ALL_ATTENDINGS.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setAttendingIds(p=>p.filter(x=>x!==id))} />:null;})}</div>
                    : <div style={{ fontSize:11, color:'#374151', fontStyle:'italic' }}>None selected</div>
                  }
                </div>

                {/* Specimen */}
                <div onMouseEnter={()=>setActiveSection('specimen')} onMouseLeave={()=>setActiveSection(s=>s==='specimen'?'':s)}>
                  <SectionLabel title="Specimen" active={activeSection==='specimen'} />
                  <div style={{ position:'relative' }} ref={specimenRef}>
                    <input type="text" value={specimenQuery} onChange={e=>setSpecimenQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="specimen" style={INPUT} placeholder="Search specimen dictionary…"
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(specimenQuery.trim())addSpecimen(specimenQuery);}}} />
                    {showSpecimenDrop&&(
                      <div style={DROPDOWN_STYLE}>
                        {specimenSuggestions.map(s=>(
                          <button key={s} type="button" onClick={()=>addSpecimen(s)} style={DROP_BTN}
                            onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>{s}</button>
                        ))}
                        {specimenQuery.trim()&&!SPECIMEN_DICTIONARY.some(s=>s.toLowerCase()===specimenQuery.toLowerCase())&&(
                          <button type="button" onClick={()=>addSpecimen(specimenQuery)} style={{...DROP_BTN,color:'#7dd3fc',borderTop:'1px solid rgba(148,163,184,0.1)'}}
                            onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>+ Add "{specimenQuery}"</button>
                        )}
                      </div>
                    )}
                  </div>
                  {specimenList.length>0&&<div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>{specimenList.map(s=><Chip key={s} label={s} onRemove={()=>setSpecimenList(p=>p.filter(x=>x!==s))} />)}</div>}
                </div>

                {/* Diagnosis */}
                <div onMouseEnter={()=>setActiveSection('diagnosis')} onMouseLeave={()=>setActiveSection(s=>s==='diagnosis'?'':s)}>
                  <SectionLabel title="Diagnosis" active={activeSection==='diagnosis'} />
                  <div style={{ display:'flex', gap:4 }}>
                    <input type="text" value={diagnosisText} onChange={e=>setDiagnosisText(e.target.value)} onFocus={onF} onBlur={onB} data-section="diagnosis" style={INPUT} placeholder="e.g. Carcinoma"
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDiagnosis();}}} />
                    <button type="button" onClick={addDiagnosis} style={{ border:'none', borderRadius:6, padding:'0 8px', background:'#0891B2', color:'#e5e7eb', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>+</button>
                  </div>
                  {diagnosisList.length>0&&<div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>{diagnosisList.map(d=><Chip key={d} label={d} onRemove={()=>setDiagnosisList(p=>p.filter(x=>x!==d))} />)}</div>}
                </div>

                {/* SNOMED CT */}
                <div onMouseEnter={()=>setActiveSection('snomed')} onMouseLeave={()=>setActiveSection(s=>s==='snomed'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="SNOMED CT" active={activeSection==='snomed'} />
                    <BrowseBtn onClick={()=>setSnomedModal(true)} count={SNOMED_CODES.length} />
                  </div>
                  <div style={{ position:'relative' }} ref={snomedRef}>
                    <input type="text" value={snomedQuery} onChange={e=>setSnomedQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="snomed" style={INPUT} placeholder="Search code or description…" />
                    {showSnomedDrop&&(
                      <div style={DROPDOWN_STYLE}>
                        {snomedSuggestions.map(s=>(
                          <button key={s.code} type="button" onClick={()=>addSnomed(s)} style={DROP_BTN}
                            onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                            <span style={{ fontFamily:'monospace', color:'#7dd3fc', marginRight:5, fontSize:11 }}>{s.code}</span>
                            <span style={{ color:'#94a3b8', fontSize:10 }}>{s.display.substring(0,38)}…</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {snomedList.length>0&&<div style={{ marginTop:3, display:'flex', flexWrap:'wrap', gap:3 }}>{snomedList.map(s=><Chip key={s.code} label={s.code} onRemove={()=>setSnomedList(p=>p.filter(x=>x.code!==s.code))} />)}</div>}
                </div>

                {/* ICD-10 */}
                <div onMouseEnter={()=>setActiveSection('icd')} onMouseLeave={()=>setActiveSection(s=>s==='icd'?'':s)} style={{ paddingBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:5 }}>
                    <SectionLabel title="ICD-10" active={activeSection==='icd'} />
                    <BrowseBtn onClick={()=>setIcdModal(true)} count={ICD_CODES.length} />
                  </div>
                  <div style={{ position:'relative' }} ref={icdRef}>
                    <input type="text" value={icdQuery} onChange={e=>setIcdQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="icd" style={INPUT} placeholder="Search code or description…" />
                    {showIcdDrop&&(
                      <div style={DROPDOWN_STYLE}>
                        {icdSuggestions.map(s=>(
                          <button key={s.code} type="button" onClick={()=>addIcd(s)} style={DROP_BTN}
                            onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                            <span style={{ fontFamily:'monospace', color:'#c4b5fd', marginRight:5, fontSize:11 }}>{s.code}</span>
                            <span style={{ color:'#94a3b8', fontSize:10 }}>{s.display.substring(0,38)}…</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {icdList.length>0&&<div style={{ marginTop:3, display:'flex', flexWrap:'wrap', gap:3 }}>{icdList.map(s=><Chip key={s.code} label={s.code} onRemove={()=>setIcdList(p=>p.filter(x=>x.code!==s.code))} />)}</div>}
                </div>

              </div>{/* end scrollable filters */}

              {/* Action buttons */}
              <div style={{ padding:'10px 16px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', gap:8 }}>
                <button type="button" onClick={handleClear} style={{ flex:1, borderRadius:8, border:'1px solid rgba(148,163,184,0.3)', background:'transparent', color:'#64748b', padding:'8px', fontSize:12, cursor:'pointer' }}>Clear</button>
                <button type="submit" disabled={isSearching} style={{ flex:2.5, borderRadius:8, border:'none', background:isSearching?'#0f172a':'#22c55e', color:isSearching?'#64748b':'#022c22', padding:'8px', fontSize:13, fontWeight:700, cursor:isSearching?'default':'pointer' }}>
                  {isSearching?'Searching…':'Search Cases'}
                </button>
              </div>

            </form>
          </aside>

          {/* ── Results pane ─────────────────────────────────────────────── */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Summary bar */}
            <div style={{ padding:'9px 24px', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(2,6,23,0.5)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              {summary ? (
                <p style={{ margin:0, fontSize:12, color:'#94a3b8', lineHeight:1.5, flex:1 }}>
                  <span style={{ color:'#374151', marginRight:6 }}>🔍</span>
                  {summary.split(' · ').map((part,i,arr)=>(
                    <React.Fragment key={i}>
                      <span style={{ color:i===0?'#cbd5e1':'#7dd3fc', fontWeight:i===0?400:500 }}>{part}</span>
                      {i<arr.length-1&&<span style={{ color:'#1e293b', margin:'0 5px' }}>·</span>}
                    </React.Fragment>
                  ))}
                </p>
              ) : (
                <p style={{ margin:0, fontSize:12, color:'#374151' }}>Set filters and press <strong style={{ color:'#22c55e' }}>Search Cases</strong> to begin</p>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                {results!==null&&<span style={{ fontSize:12, color:'#475569' }}>{results.length} case{results.length!==1?'s':''}</span>}
                {results!==null&&results.length>0&&(
                  <button type="button" style={{ border:'1px solid rgba(148,163,184,0.2)', background:'transparent', color:'#64748b', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer' }}>Export CSV</button>
                )}
              </div>
            </div>

            {/* Result table — VirtualWorklist owns its scroll */}
            <div style={{ flex:1, minHeight:0 }}>
              {hasSearched
                ? <VirtualWorklist cases={results??[]} onBeforeNavigate={()=>sessionStorage.setItem('pathscribe:navFrom','search')} />
                : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#1e293b', fontSize:13 }}>No search run yet</div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Lookup modals ─────────────────────────────────────────────────────── */}

      {snomedModal&&(
        <LookupModal title="SNOMED CT" subtitle="Select one or more clinical findings or morphology codes" onClose={()=>setSnomedModal(false)}>
          <CodeLookupContent system="SNOMED" codes={SNOMED_CODES} selected={snomedList}
            onToggle={s=>setSnomedList(p=>p.some(x=>x.code===s.code)?p.filter(x=>x.code!==s.code):[...p,s])} />
        </LookupModal>
      )}

      {icdModal&&(
        <LookupModal title="ICD-10" subtitle="Select one or more diagnosis codes" onClose={()=>setIcdModal(false)}>
          <CodeLookupContent system="ICD" codes={ICD_CODES} selected={icdList}
            onToggle={s=>setIcdList(p=>p.some(x=>x.code===s.code)?p.filter(x=>x.code!==s.code):[...p,s])} />
        </LookupModal>
      )}

      {synopticModal&&(
        <LookupModal title="Synoptic Protocol" subtitle={`${ALL_SYNOPTICS.length} protocols across ${Array.from(new Set(ALL_SYNOPTICS.map(s=>s.category))).length} categories`} onClose={()=>setSynopticModal(false)}>
          <SynopticLookupContent selected={synopticIds} onToggle={id=>toggle(id,synopticIds,setSynopticIds)} />
        </LookupModal>
      )}

      {flagsModal&&(
        <LookupModal title="Case Flags" subtitle={`${ALL_FLAGS.length} available flags`} onClose={()=>setFlagsModal(false)}>
          <FlagsLookupContent selected={flagsList} onToggle={f=>toggle(f,flagsList,setFlagsList)} />
        </LookupModal>
      )}

      {pathModal&&(
        <LookupModal title="Pathologist" subtitle="Filter by assigned pathologist" onClose={()=>setPathModal(false)}>
          <UserLookupContent users={ALL_PATHOLOGISTS} selected={pathologistIds} onToggle={id=>toggle(id,pathologistIds,setPathologistIds)} />
        </LookupModal>
      )}

      {attendingModal&&(
        <LookupModal title="Attending Physician" subtitle="Filter by referring or attending physician" onClose={()=>setAttendingModal(false)}>
          <UserLookupContent users={ALL_ATTENDINGS} selected={attendingIds} onToggle={id=>toggle(id,attendingIds,setAttendingIds)} accent="#10B981" />
        </LookupModal>
      )}

      {/* ── Profile modal ─────────────────────────────────────────────────── */}
      {isProfileOpen&&(
        <div style={modalOverlay} onClick={()=>setIsProfileOpen(false)}>
          <div style={{ width:400, backgroundColor:'#111', borderRadius:20, padding:40, border:'1px solid rgba(8,145,178,0.3)', textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:'#0891B2', fontSize:24, fontWeight:700, marginBottom:24 }}>User Preferences</div>
            <button onClick={()=>setIsProfileOpen(false)} style={{ padding:'12px 24px', borderRadius:10, background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.3)', color:'#0891B2', fontWeight:600, fontSize:15, cursor:'pointer', width:'100%' }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Resources modal ───────────────────────────────────────────────── */}
      {isResourcesOpen&&(
        <div style={modalOverlay} onClick={()=>setIsResourcesOpen(false)}>
          <div style={{ width:500, maxHeight:'80vh', overflowY:'auto', backgroundColor:'#111', borderRadius:20, padding:40, border:'1px solid rgba(8,145,178,0.3)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:'#0891B2', fontSize:24, fontWeight:700, marginBottom:24, textAlign:'center' }}>Quick Links</div>
            {Object.entries(quickLinks).map(([section,links])=>(
              <div key={section} style={{ marginBottom:24 }}>
                <div style={{ color:'#94a3b8', fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase' }}>{section}</div>
                {links.map((link,i)=>(
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={()=>setIsResourcesOpen(false)}
                    style={{ display:'block', color:'#cbd5e1', textDecoration:'none', padding:'12px 16px', fontSize:16, borderRadius:8, marginBottom:8 }}
                    onMouseEnter={e=>{e.currentTarget.style.color='#0891B2';e.currentTarget.style.background='rgba(8,145,178,0.1)';}}
                    onMouseLeave={e=>{e.currentTarget.style.color='#cbd5e1';e.currentTarget.style.background='transparent';}}>→ {link.title}</a>
                ))}
              </div>
            ))}
            <button onClick={()=>setIsResourcesOpen(false)} style={{ padding:'12px 24px', borderRadius:10, background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.3)', color:'#0891B2', fontWeight:600, fontSize:15, cursor:'pointer', width:'100%' }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Logout modal ──────────────────────────────────────────────────── */}
      {showLogoutModal&&(
        <div style={modalOverlay}>
          <div style={{ width:400, backgroundColor:'#111', padding:40, borderRadius:28, textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize:48, marginBottom:20 }}>⚠️</div>
            <h2 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>Sign out?</h2>
            <p style={{ color:'#94a3b8', marginBottom:30, lineHeight:1.6, fontSize:15 }}>You'll be signed out of PathScribeAI.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button onClick={()=>setShowLogoutModal(false)} style={{ padding:16, borderRadius:12, background:'#0891B2', border:'none', color:'#fff', fontWeight:700, fontSize:16, cursor:'pointer' }}>← Stay on Search</button>
              <button onClick={handleLogout} style={{ padding:16, borderRadius:12, background:'transparent', border:'2px solid #F59E0B', color:'#F59E0B', fontWeight:600, fontSize:15, cursor:'pointer' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#F59E0B';e.currentTarget.style.color='#000';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#F59E0B';}}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
