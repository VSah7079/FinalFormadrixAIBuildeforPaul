/**
 * ActiveProtocolsSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the validated CAP protocols currently active in the reporting workflow.
 * Previously this was the entire Protocols tab content.
 *
 * Architecture role:
 *   One of three sub-sections in the merged Protocols tab. Only shows protocols
 *   with lifecycle === 'validated'. Each entry links to ProtocolEditor for editing.
 *
 * Consumed by:
 *   components/Config/Protocols/index.tsx  (renders as 'active' sub-section)
 *
 * Related files:
 *   protocols/protocolRegistry.ts   ← base CAP definitions + localStorage overrides
 *   protocols/ProtocolEditor.tsx     ← full-page editor (navigated to on click)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadProtocolRegistry } from '../../../protocols/protocolRegistry';

const CATEGORY_COLORS: Record<string, string> = {
  Breast:  '#f472b6',
  Colon:   '#34d399',
  Prostate:'#60a5fa',
  Lung:    '#a78bfa',
  Skin:    '#fbbf24',
};

const ActiveProtocolsSection: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const registry  = loadProtocolRegistry();
  const protocols = Object.values(registry).filter(p => p.lifecycle === 'validated');

  const filtered = protocols.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, p) => {
    const cat = p.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          ✅ Active Protocols
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          Validated CAP checklists currently available in the synoptic reporting workflow.
          Click any protocol to open the editor.
        </p>
      </div>

      {/* ── Search ── */}
      <input
        type="text"
        placeholder="Search protocols…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', marginBottom: '20px',
          borderRadius: '7px', border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
          fontSize: '13px', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* ── Grouped list ── */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700,
            color: CATEGORY_COLORS[category] ?? '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.6px',
            marginBottom: '8px', paddingLeft: '2px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: CATEGORY_COLORS[category] ?? '#94a3b8',
              display: 'inline-block',
            }} />
            {category}
          </div>

          {items.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/configuration/protocols/${p.id}?from=protocols`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', marginBottom: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(8,145,178,0.06)';
                e.currentTarget.style.borderColor = 'rgba(8,145,178,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '2px' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px' }}>
                  <span>v{p.version}</span>
                  <span>•</span>
                  <span>{p.source}</span>
                  {p.isBaseTemplate && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#475569' }}>Base template</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: '#10B981',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  padding: '2px 8px', borderRadius: '99px',
                }}>
                  Validated
                </span>
                <span style={{ color: '#475569', fontSize: '16px' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{
          padding: '32px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
          color: '#475569', fontSize: '14px',
        }}>
          No active protocols found{search ? ` matching "${search}"` : ''}.
        </div>
      )}
    </div>
  );
};

export default ActiveProtocolsSection;
