import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock case database - in real app this would be an API call
const CASE_DATABASE: Record<string, boolean> = {
  'S26-4401': true, 'S26-4402': true, 'S26-4403': true, 'S26-4404': true, 'S26-4405': true,
  'S26-4406': true, 'S26-4407': true, 'S26-4408': true, 'S26-4409': true, 'S26-4410': true,
  'S26-4411': true, 'S26-4412': true, 'S26-4413': true, 'S26-4414': true, 'S26-4415': true,
  'S26-4416': true, 'S26-4417': true, 'S26-4418': true, 'S26-4419': true, 'S26-4420': true,
  'S26-4421': true, 'S26-4422': true, 'S26-4423': true, 'S26-4424': true, 'S26-4425': true,
};

interface CaseSearchBarProps {
  autoFocus?: boolean;
}

const CaseSearchBar: React.FC<CaseSearchBarProps> = ({ autoFocus = false }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caseNumber, setCaseNumber] = useState('');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Clear error when user starts typing
  useEffect(() => {
    if (caseNumber) setError('');
  }, [caseNumber]);

  const lookupCase = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;

    if (CASE_DATABASE[trimmed]) {
      // Found - navigate immediately
      setCaseNumber('');
      setError('');
      navigate(`/case/${trimmed}/synoptic`);
    } else {
      // Not found - shake and show error
      setIsShaking(true);
      setError(`Case "${trimmed}" not found. Please check the case number and try again.`);
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      lookupCase(caseNumber);
    }
    if (e.key === 'Escape') {
      setCaseNumber('');
      setError('');
      inputRef.current?.blur();
    }
  };

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript.trim();
      // Clean up spoken case number - handle "S 26 4401" → "S26-4401"
      const cleaned = spoken
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/(\w{1,3})(\d{2})(\d{4})/, '$1$2-$3'); // Format as S26-4401
      setCaseNumber(cleaned);
      setIsListening(false);
      // Auto-lookup after voice input
      setTimeout(() => lookupCase(cleaned), 100);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError('Voice input failed. Please try again or type the case number.');
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Search Bar Container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        animation: isShaking ? 'shake 0.5s ease' : 'none',
        position: 'relative'
      }}>
        {/* Barcode/Search Icon */}
        <div style={{
          position: 'absolute',
          left: '18px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isFocused ? '#0891B2' : '#64748b',
          transition: 'color 0.2s',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="3" height="16"></rect>
            <rect x="6" y="4" width="1" height="16"></rect>
            <rect x="9" y="4" width="2" height="16"></rect>
            <rect x="13" y="4" width="1" height="16"></rect>
            <rect x="16" y="4" width="3" height="16"></rect>
            <rect x="21" y="4" width="1" height="16"></rect>
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={caseNumber}
          onChange={(e) => setCaseNumber(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter or scan case number  (e.g. S26-4401)"
          style={{
            flex: 1,
            padding: '14px 120px 14px 52px',
            fontSize: '15px',
            fontWeight: 500,
            background: isFocused ? 'rgba(8,145,178,0.08)' : 'rgba(255,255,255,0.06)',
            border: `2px solid ${error ? '#EF4444' : isFocused ? '#0891B2' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '12px',
            color: '#ffffff',
            outline: 'none',
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
            fontFamily: "'Inter', sans-serif",
            width: '100%',
            boxSizing: 'border-box' as const
          }}
        />

        {/* Right side buttons inside input */}
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {/* Voice Button */}
          <button
            onClick={handleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isListening ? 'rgba(239,68,68,0.15)' : 'transparent',
              border: `1px solid ${isListening ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
              color: isListening ? '#EF4444' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isListening) {
                e.currentTarget.style.borderColor = '#0891B2';
                e.currentTarget.style.color = '#0891B2';
              }
            }}
            onMouseLeave={(e) => {
              if (!isListening) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            {isListening ? (
              // Animated listening indicator
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="6">
                  <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
          </button>

          {/* Go Button */}
          <button
            onClick={() => lookupCase(caseNumber)}
            title="Open case"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: caseNumber ? '#0891B2' : 'transparent',
              border: `1px solid ${caseNumber ? '#0891B2' : 'rgba(255,255,255,0.15)'}`,
              color: caseNumber ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: caseNumber ? 'pointer' : 'default',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (caseNumber) e.currentTarget.style.background = '#0E7490';
            }}
            onMouseLeave={(e) => {
              if (caseNumber) e.currentTarget.style.background = '#0891B2';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          color: '#FCA5A5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
          color: '#FCA5A5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: '#EF4444', display: 'inline-block',
            animation: 'pulse 1s infinite'
          }} />
          Listening... say the case number clearly (e.g. "S 26 4401")
        </div>
      )}

      {/* Shake + Fade animation styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default CaseSearchBar;
