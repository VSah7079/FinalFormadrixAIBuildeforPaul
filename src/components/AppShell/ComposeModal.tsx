/**
 * ComposeModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * New internal message composer with:
 *   • Smart To: field — type to match contacts inline; 100% match auto-adds
 *   • 🔍 spyglass button → opens full user-search modal overlay
 *   • Recipient chips with × remove
 *   • Subject, body, case# optional, urgent toggle
 *   • "Send Internally" button  ←→  "🔒 Send Secure Email" button
 *
 * All layout via messaging.css classes.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';

// ─── Internal user directory ──────────────────────────────────────────────────
// In production this would come from a user service / API.

export interface InternalUser {
  id:   string;
  name: string;
  role: string;
}

export const INTERNAL_USERS: InternalUser[] = [
  { id: 'u2',  name: 'Lab Manager',      role: 'Laboratory'         },
  { id: 'u3',  name: 'System Admin',     role: 'IT / Administration' },
  { id: 'u4',  name: 'Dr. Sarah Chen',   role: 'Pathology'          },
  { id: 'u5',  name: 'Dr. Aristhone',    role: 'Pathology'          },
  { id: 'u6',  name: 'IT Support',       role: 'IT / Administration' },
  { id: 'u7',  name: 'Billing Dept',     role: 'Finance'            },
  { id: 'u8',  name: 'Dr. Miller',       role: 'Pathology'          },
  { id: 'u9',  name: 'Archives',         role: 'Medical Records'    },
  { id: 'u10', name: 'QA Team',          role: 'Quality Assurance'  },
  { id: 'u11', name: 'Dr. Patel',        role: 'Gastroenterology'   },
  { id: 'u12', name: 'Transcription',    role: 'Medical Transcription'},
  { id: 'u13', name: 'Medical Records',  role: 'Medical Records'    },
  { id: 'u14', name: 'Dr. Wilson',       role: 'Oncology'           },
  { id: 'u15', name: 'Compliance',       role: 'Compliance'         },
  { id: 'u16', name: 'Supply Room',      role: 'Operations'         },
  { id: 'u17', name: 'Dr. Lee',          role: 'Dermatopathology'   },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComposeModalProps {
  currentUserId:   string;
  currentUserName: string;
  onSend:          (draft: ComposeDraft) => void;
  onSecureEmail:   (draft: ComposeDraft) => void;
  onClose:         () => void;
}

export interface ComposeDraft {
  recipients:  InternalUser[];
  subject:     string;
  body:        string;
  caseNumber:  string;
  isUrgent:    boolean;
  sendAsEmail: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase();

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconMail = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

// ─── User Search Modal (full-screen overlay over compose) ─────────────────────

interface UserSearchModalProps {
  alreadyAdded: string[];
  onSelect:     (user: InternalUser) => void;
  onClose:      () => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({ alreadyAdded, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const lower = q.toLowerCase().trim();
    return INTERNAL_USERS.filter(u =>
      !alreadyAdded.includes(u.id) &&
      (u.name.toLowerCase().includes(lower) || u.role.toLowerCase().includes(lower))
    );
  }, [q, alreadyAdded]);

  return (
    <div className="ps-msg-modal-overlay" onClick={onClose}>
      <div className="ps-msg-user-search-modal" onClick={e => e.stopPropagation()}>

        <div className="ps-msg-user-search-header">
          <span className="ps-msg-user-search-title">Find a recipient</span>
          <button className="ps-msg-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="ps-msg-user-search-input-wrap">
          <div className="ps-msg-user-search-bar">
            <IconSearch />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name or department…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="ps-msg-user-results">
          {results.length === 0 ? (
            <div className="ps-msg-recipient-no-match">No internal users found.</div>
          ) : results.map(u => (
            <div
              key={u.id}
              className="ps-msg-user-result-item"
              onClick={() => { onSelect(u); onClose(); }}
            >
              <div className="ps-msg-user-result-avatar">{initials(u.name)}</div>
              <div>
                <div className="ps-msg-user-result-name">{u.name}</div>
                <div className="ps-msg-user-result-role">{u.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ps-msg-user-search-footer">
          <button className="ps-msg-modal-close" onClick={onClose} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--msg-border)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Compose Modal ────────────────────────────────────────────────────────────

export const ComposeModal: React.FC<ComposeModalProps> = ({
  currentUserId, currentUserName, onSend, onSecureEmail, onClose,
}) => {
  const [recipients, setRecipients] = useState<InternalUser[]>([]);
  const [toInput,    setToInput]    = useState('');
  const [subject,    setSubject]    = useState('');
  const [body,       setBody]       = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [isUrgent,   setIsUrgent]   = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [highlightIdx,   setHighlightIdx]   = useState(0);
  const toInputRef = useRef<HTMLInputElement>(null);

  // ── Inline dropdown matching ──
  const suggestions = useMemo(() => {
    const q = toInput.toLowerCase().trim();
    if (!q) return [];
    const addedIds = recipients.map(r => r.id);
    return INTERNAL_USERS.filter(u =>
      !addedIds.includes(u.id) &&
      (u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
    );
  }, [toInput, recipients]);

  useEffect(() => {
    setDropdownOpen(suggestions.length > 0 && toInput.trim().length > 0);
    setHighlightIdx(0);
  }, [suggestions, toInput]);

  const addRecipient = (user: InternalUser) => {
    setRecipients(r => [...r, user]);
    setToInput('');
    setDropdownOpen(false);
    toInputRef.current?.focus();
  };

  const removeRecipient = (id: string) => setRecipients(r => r.filter(u => u.id !== id));

  // Auto-add on exact match or Tab
  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (dropdownOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[highlightIdx]) addRecipient(suggestions[highlightIdx]);
        return;
      }
      if (e.key === 'Escape') { setDropdownOpen(false); return; }
    }
    if (e.key === 'Backspace' && !toInput && recipients.length > 0) {
      setRecipients(r => r.slice(0, -1));
    }
  };

  // Check for 100% case-insensitive exact match on blur
  const handleToBlur = () => {
    const exact = INTERNAL_USERS.find(
      u => u.name.toLowerCase() === toInput.toLowerCase().trim() &&
           !recipients.find(r => r.id === u.id)
    );
    if (exact) { addRecipient(exact); }
    setTimeout(() => setDropdownOpen(false), 150);
  };

  const draft: ComposeDraft = { recipients, subject, body, caseNumber, isUrgent, sendAsEmail: false };
  const canSend = recipients.length > 0 && subject.trim() && body.trim();

  return (
    <>
      {/* Main compose overlay */}
      <div className="ps-msg-modal-overlay" onClick={onClose}>
        <div className="ps-msg-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="ps-msg-modal-header">
            <span className="ps-msg-modal-title">New Message</span>
            <button className="ps-msg-modal-close" onClick={onClose}>×</button>
          </div>

          {/* Body */}
          <div className="ps-msg-modal-body">

            {/* ── To: row ── */}
            <div className="ps-msg-form-row" style={{ position: 'relative', alignItems: 'flex-start', paddingTop: 6 }}>
              <span className="ps-msg-form-label">To:</span>

              <div className="ps-msg-to-field">
                {/* Recipient chips */}
                {recipients.map(r => (
                  <span key={r.id} className="ps-msg-to-chip">
                    {r.name}
                    <button onClick={() => removeRecipient(r.id)} title={`Remove ${r.name}`}>×</button>
                  </span>
                ))}

                {/* Inline search input */}
                <input
                  ref={toInputRef}
                  className="ps-msg-to-input"
                  type="text"
                  placeholder={recipients.length === 0 ? 'Type a name…' : ''}
                  value={toInput}
                  onChange={e => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  onBlur={handleToBlur}
                  autoComplete="off"
                />

                {/* Spyglass — full search */}
                <button
                  className="ps-msg-to-search-btn"
                  onMouseDown={e => e.preventDefault()} // prevent blur
                  onClick={() => setShowUserSearch(true)}
                  title="Browse all internal users"
                >
                  <IconSearch />
                </button>
              </div>

              {/* Inline suggestion dropdown */}
              {dropdownOpen && (
                <div
                  className="ps-msg-recipient-dropdown"
                  style={{ position: 'absolute', top: '100%', left: 52, right: 0 }}
                >
                  {suggestions.map((u, i) => (
                    <div
                      key={u.id}
                      className={`ps-msg-recipient-option${i === highlightIdx ? ' highlighted' : ''}`}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => addRecipient(u)}
                    >
                      <div className="ps-msg-user-result-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <div className="ps-msg-recipient-option-name">{u.name}</div>
                        <div className="ps-msg-recipient-option-role">{u.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject row */}
            <div className="ps-msg-form-row">
              <span className="ps-msg-form-label">Subject</span>
              <input
                className="ps-msg-form-input"
                type="text"
                placeholder="Enter subject…"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            {/* Case # row (optional) */}
            <div className="ps-msg-form-row">
              <span className="ps-msg-form-label">Case #</span>
              <input
                className="ps-msg-form-input"
                type="text"
                placeholder="Optional — e.g. 24-8821"
                value={caseNumber}
                onChange={e => setCaseNumber(e.target.value)}
              />
            </div>

            {/* Body */}
            <textarea
              className="ps-msg-form-textarea"
              placeholder="Write your message…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
            />

            {/* Options row */}
            <div className="ps-msg-compose-options">
              {/* Urgent toggle */}
              <label
                className={`ps-msg-urgent-toggle${isUrgent ? ' on' : ''}`}
                onClick={() => setIsUrgent(v => !v)}
              >
                <div className="ps-msg-urgent-toggle-track">
                  <div className="ps-msg-urgent-toggle-thumb" />
                </div>
                Mark as Urgent
              </label>

              {/* Internal-only notice */}
              <span style={{ fontSize: 11, color: 'var(--msg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconLock /> Internal only
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="ps-msg-modal-footer">
            <button className="ps-msg-modal-close" onClick={onClose} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--msg-border)' }}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Secure external email */}
              <button
                className="ps-msg-send-email-btn"
                disabled={!canSend}
                onClick={() => onSecureEmail({ ...draft, sendAsEmail: true })}
                title="Send as a secure encrypted external email"
              >
                <IconLock /> <IconMail /> Secure Email
              </button>

              {/* Internal send */}
              <button
                className="ps-msg-send-internal-btn"
                disabled={!canSend}
                onClick={() => onSend(draft)}
              >
                <IconSend /> Send Internally
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Full user-search modal (stacked on top) */}
      {showUserSearch && (
        <UserSearchModal
          alreadyAdded={recipients.map(r => r.id)}
          onSelect={addRecipient}
          onClose={() => setShowUserSearch(false)}
        />
      )}
    </>
  );
};
