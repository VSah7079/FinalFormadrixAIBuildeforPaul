import React, { useState } from 'react';
import '../../../formedrix.css';
import type { MedicalCode } from '../synopticTypes';
import { MOCK_CODES } from './codeConstants';

interface SpecimenOption { index: number; id: number; name: string; }

interface AddCodeModalProps {
  existingCodes: MedicalCode[];
  allSpecimens: SpecimenOption[];
  activeSpecimenIndex: number;
  onAddToSpecimens: (codes: Omit<MedicalCode, 'id' | 'source'>[], specimenIndices: number[]) => void;
  onClose: () => void;
}

const SYSTEM_META = {
  SNOMED: { label: 'SNOMED CT', color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' },
  ICD:    { label: 'ICD-10',    color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
};

const AddCodeModal: React.FC<AddCodeModalProps> = ({
  existingCodes, allSpecimens, activeSpecimenIndex, onAddToSpecimens, onClose,
}) => {
  const [query,    setQuery]    = useState('');
  const [system,   setSystem]   = useState<'SNOMED' | 'ICD'>('SNOMED');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused,  setFocused]  = useState<number>(-1);
  const [targetSpecimens, setTargetSpecimens] = useState<Set<number>>(new Set([activeSpecimenIndex]));
  const inputRef = React.useRef<HTMLInputElement>(null);

  const meta = SYSTEM_META[system];

  // Results — instant, no debounce needed for a small local dataset
  const results = React.useMemo(() => {
    const pool = MOCK_CODES.filter(c => c.system === system);
    if (!query.trim()) return pool.slice(0, 12);
    const q = query.toLowerCase();
    return pool.filter(c =>
      c.code.toLowerCase().includes(q) || c.display.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, system]);

  const allPool = MOCK_CODES.filter(c => c.system === system);

  const toggleCode = (key: string) => setSelected(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  const toggleSpecimen = (idx: number) => setTargetSpecimens(prev => {
    const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next;
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && focused >= 0) {
      const r = results[focused];
      if (r && !existingCodes.some(c => c.code === r.code)) toggleCode(r.code);
    }
    if (e.key === 'Escape') onClose();
  };

  const handleAssign = () => {
    const codesToAdd = allPool.filter(r => selected.has(r.code));
    onAddToSpecimens(codesToAdd, Array.from(targetSpecimens));
    onClose();
  };

  const canAssign = selected.size > 0 && targetSpecimens.size > 0;

  // Switch system — clear selection
  const switchSystem = (s: 'SNOMED' | 'ICD') => {
    setSystem(s); setSelected(new Set()); setFocused(-1);
    inputRef.current?.focus();
  };

  return (
    <div data-capture-hide="true" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '580px', background: '#0F172A', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '80vh' }}>

        {/* ── Search bar + system toggle ── */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* System toggle pill */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px' }}>
              {(['SNOMED', 'ICD'] as const).map(s => (
                <button key={s} onClick={() => switchSystem(s)} style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: system === s ? SYSTEM_META[s].color : 'transparent', color: system === s ? 'white' : '#94a3b8' }}>
                  {s === 'SNOMED' ? 'SNOMED CT' : 'ICD-10'}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <span style={{ fontSize: '12px', color: meta.color, fontWeight: 600, marginLeft: '6px' }}>
                {selected.size} selected
              </span>
            )}
          </div>

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px', pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setFocused(-1); }}
              onKeyDown={handleKeyDown}
              placeholder={system === 'SNOMED' ? 'Search SNOMED CT — code or term…' : 'Search ICD-10 — code or description…'}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1.5px solid ${meta.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Results list ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No results for "{query}"</div>
          ) : results.map((r, i) => {
            const already = existingCodes.some(c => c.code === r.code && c.system === r.system);
            const isSel   = selected.has(r.code);
            const isFocus = focused === i;
            return (
              <div
                key={r.code}
                onClick={() => { if (!already) toggleCode(r.code); }}
                onMouseEnter={() => setFocused(i)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderLeft: `3px solid ${isSel ? meta.color : 'transparent'}`, background: isFocus && !isSel ? 'rgba(255,255,255,0.05)' : isSel ? 'rgba(8,145,178,0.1)' : 'transparent', cursor: already ? 'default' : 'pointer', transition: 'background 0.1s', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                {/* Checkbox */}
                <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${already ? 'rgba(255,255,255,0.1)' : isSel ? meta.color : 'rgba(255,255,255,0.2)'}`, background: isSel ? meta.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                  {isSel && <span style={{ color: 'white', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                </div>
                {/* Code + label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: meta.color, background: meta.bg, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${meta.color}33`, flexShrink: 0 }}>{r.code}</span>
                    <span style={{ fontSize: '13px', color: already ? '#475569' : '#e2e8f0', fontWeight: isSel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display}</span>
                  </div>
                </div>
                {already && <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓ Added</span>}
              </div>
            );
          })}
        </div>

        {/* ── Specimen strip ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Assign to</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allSpecimens.map(sp => {
              const checked   = targetSpecimens.has(sp.index);
              const isCurrent = sp.index === activeSpecimenIndex;
              return (
                <button
                  key={sp.index}
                  onClick={() => toggleSpecimen(sp.index)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: `1.5px solid ${checked ? '#0891B2' : 'rgba(255,255,255,0.1)'}`, background: checked ? 'rgba(8,145,178,0.15)' : 'transparent', color: checked ? '#38bdf8' : '#94a3b8', cursor: 'pointer', transition: 'all 0.12s' }}
                  title={sp.name}
                >
                  {checked && <span style={{ fontSize: '10px' }}>✓</span>}
                  <span>Specimen {sp.id}</span>
                  {isCurrent && <span style={{ fontSize: '9px', opacity: 0.7 }}>★</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {canAssign
              ? <span style={{ color: '#e2e8f0' }}><strong>{selected.size}</strong> code{selected.size !== 1 ? 's' : ''} → <strong>{targetSpecimens.size}</strong> specimen{targetSpecimens.size !== 1 ? 's' : ''}</span>
              : 'Select codes above · ↑↓ to navigate · Enter to toggle'
            }
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#94a3b8' }}>Cancel</button>
            <button onClick={handleAssign} disabled={!canAssign}
              style={{ padding: '7px 18px', background: canAssign ? meta.color : 'rgba(255,255,255,0.08)', color: canAssign ? 'white' : '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: canAssign ? 'pointer' : 'default', transition: 'all 0.15s' }}>
              ✓ Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── CodesPanel ───────────────────────────────────────────────────────────────

export { AddCodeModal };
export type { AddCodeModalProps };
