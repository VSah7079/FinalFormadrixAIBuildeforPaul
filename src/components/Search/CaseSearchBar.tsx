import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../../contexts/VoiceProvider';

const CaseSearchBar: React.FC = () => {
  const [caseNumber, setCaseNumber] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Notice: 'stopListening' is removed from the destructuring here
  const { phase, transcript } = useVoice();

  useEffect(() => {
    const handleVoiceAction = (e: any) => {
      const { action, payload } = e.detail;

      if (action === 'FOCUS_SEARCH') {
        // 1. Give the input focus (Simulating the Keyboard Shortcut)
        inputRef.current?.focus();
        
        // 2. If a case number was provided in the command, fill and navigate
        if (payload) {
          setCaseNumber(payload);
          // Optional: Auto-navigate if it's a valid ID format
          if (payload.length > 3) {
             navigate(`/case/${payload}/synoptic`);
          }
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

  // Visual feedback: If we are in 'Direct' mode, show the interim transcript in the box
  useEffect(() => {
    if (phase === 'direct' && transcript) {
      setCaseNumber(transcript.toUpperCase().replace(/\s+/g, ''));
    }
  }, [transcript, phase]);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={caseNumber}
        onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
        placeholder="Enter case number..."
        style={{
          width: '100%',
          padding: '12px 20px 12px 48px',
          background: 'rgba(255,255,255,0.05)',
          border: `2px solid ${phase === 'direct' ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          color: '#fff',
          outline: 'none',
          transition: 'all 0.2s'
        }}
      />
      {/* Icon */}
      <div style={{ position: 'absolute', left: '16px', top: '12px', color: phase === 'direct' ? '#F59E0B' : '#64748b' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </div>
  );
};

export default CaseSearchBar;
