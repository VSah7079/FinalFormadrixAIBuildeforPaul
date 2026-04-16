import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { aiBehaviorService, AIBehaviorConfig } from '../../../services';
import AiProviderSettings from './AiProviderSettings';

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px', padding: '20px', marginBottom: '12px',
};

const AITab: React.FC = () => {
  const [config,  setConfig]  = useState<AIBehaviorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) setConfig(res.data);
      setLoading(false);
    });
  }, []);

  const update = async (changes: Partial<AIBehaviorConfig>) => {
    if (!config) return;
    setSaving(true);
    const res = await aiBehaviorService.update(changes);
    if (res.ok) setConfig(res.data);
    setSaving(false);
  };

  if (loading || !config) return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading AI settings...</div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>AI Behavior</h2>
      <p style={{ fontSize: '14px', color: '#9AA0A6', marginBottom: '24px' }}>Configure how the AI assists with gross and microscopic reporting.</p>

      <div style={card}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#DEE4E7', marginBottom: '4px' }}>Gross-Driven AI</h3>
        <p style={{ fontSize: '13px', color: '#9AA0A6', marginBottom: '16px' }}>AI suggestions based on gross examination findings.</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={config.grossEnabled} onChange={e => update({ grossEnabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#8AB4F8' }} />
          <span style={{ fontSize: '14px', color: '#DEE4E7' }}>Enable gross-driven AI suggestions</span>
        </label>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#DEE4E7', marginBottom: '4px' }}>Microscopic-Driven AI</h3>
        <p style={{ fontSize: '13px', color: '#9AA0A6', marginBottom: '16px' }}>AI suggestions based on microscopic diagnosis findings.</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={config.microscopicEnabled} onChange={e => update({ microscopicEnabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#8AB4F8' }} />
          <span style={{ fontSize: '14px', color: '#DEE4E7' }}>Enable microscopic-driven AI suggestions</span>
        </label>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#DEE4E7', marginBottom: '4px' }}>Confidence Threshold</h3>
        <p style={{ fontSize: '13px', color: '#9AA0A6', marginBottom: '16px' }}>Minimum confidence score before AI suggestions are shown.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input type="range" min={0} max={100} value={config.confidenceThreshold}
            onChange={e => update({ confidenceThreshold: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#8AB4F8' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#8AB4F8', minWidth: '44px' }}>{config.confidenceThreshold}%</span>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#DEE4E7', marginBottom: '4px' }}>Advanced</h3>
        <p style={{ fontSize: '13px', color: '#9AA0A6', marginBottom: '16px' }}>Additional AI behaviour settings.</p>
        {([
          ['autoInsertSuggestions', 'Auto-insert suggestions at or above confidence threshold'],
          ['showConfidenceScores',  'Show confidence scores in the editor UI'],
          ['macroSuggestions',      'Suggest macros based on diagnosis context'],
          ['subspecialtyRouting',   'Filter AI suggestions by subspecialty'],
        ] as [keyof AIBehaviorConfig, string][]).map(([key, label]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
            <input type="checkbox" checked={config[key] as boolean} onChange={e => update({ [key]: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#8AB4F8' }} />
            <span style={{ fontSize: '14px', color: '#DEE4E7' }}>{label}</span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={async () => { setSaving(true); const res = await aiBehaviorService.reset(); if (res.ok) setConfig(res.data); setSaving(false); }}
          style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#9AA0A6' }}
        >Reset to Defaults</button>
        {saving && <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>Saving…</span>}
      </div>

      {/* ── AI Provider Configuration ─────────────────────────────────────── */}
      <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
        <AiProviderSettings isAdmin={true} />
      </div>
    </div>
  );
};

export default AITab;
