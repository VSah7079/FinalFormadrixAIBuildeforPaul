import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../../contexts/VoiceProvider';

const CaseSearchBar: React.FC = () => {
  const [caseNumber, setCaseNumber] = useState('');
  const [scanFlash, setScanFlash]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { phase, transcript } = useVoice();

  // Listen for scanner events from ScannerProvider — show visual feedback
  useEffect(() => {
    const onScan = (e: CustomEvent) => {
      const { raw, type } = e.detail;
      setCaseNumber(raw);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 1200);
    };
    window.addEventListener('PATHSCRIBE_SCAN', onScan as EventListener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', onScan as EventListener);
  }, []);

  useEffect(() => {
    const handleVoiceAction = (e: any) => {
      const { action, payload } = e.detail;
      if (action === 'FOCUS_SEARCH') {
        inputRef.current?.focus();
        if (payload) {
          setCaseNumber(payload);
          if (payload.length > 3) navigate(`/case/${payload}/synoptic`);
        }
      }
      if (action === 'CLOSE_ALL') {
        inputRef.current?.blur();
        setCaseNumber('');
      }
    };
    window.addEventListener('SYSTEM_ACTION', handleVoiceAction);
    return () => window.removeEventListener('SYSTEM_ACTION', handleVoiceAction);
  }, [navigate]);

  useEffect(() => {
    if (phase === 'direct' && transcript) {
      setCaseNumber(transcript.toUpperCase().replace(/\s+/g, ''));
    }
  }, [transcript, phase]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && caseNumber.trim().length > 3) {
      navigate(`/case/${caseNumber.trim()}/synoptic`);
      setCaseNumber('');
    }
  };

  const borderColor = scanFlash
    ? '#10B981'
    : phase === 'direct'
      ? '#F59E0B'
      : 'rgba(255,255,255,0.1)';

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={caseNumber}
        onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder="Enter or scan case number..."
        style={{
          width: '100%',
          padding: '12px 48px 12px 48px',
          background: scanFlash ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${borderColor}`,
          borderRadius: '10px',
          color: '#fff',
          outline: 'none',
          transition: 'all 0.2s',
        }}
      />
      {/* Icon */}
      <div style={{ position: 'absolute', left: '16px', top: '12px', color: scanFlash ? '#10B981' : phase === 'direct' ? '#F59E0B' : '#64748b' }}>
        {scanFlash ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        )}
      </div>
      {/* Go button */}
      {caseNumber.trim().length > 3 && !scanFlash && (
        <button
          onClick={() => { navigate(`/case/${caseNumber.trim()}/synoptic`); setCaseNumber(''); }}
          style={{ position: 'absolute', right: '8px', top: '7px', padding: '5px 12px', background: '#0891B2', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
        >
          Go →
        </button>
      )}
      {/* Scan success indicator */}
      {scanFlash && (
        <div style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', fontWeight: 600, color: '#10B981' }}>
          ✓ Scanned
        </div>
      )}
    </div>
  );
};

export default CaseSearchBar;
