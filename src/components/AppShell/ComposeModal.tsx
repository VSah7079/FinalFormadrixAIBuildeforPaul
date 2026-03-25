import React, { useState } from 'react';
import { mockMessageService, Message } from '../../services/messages/IMessageService';
import { ID } from '../../services/types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMessage: Message) => void;
  currentUser: { id: string; name: string };
}

const RECIPIENTS = [
  { id: 'u2', name: 'Lab Manager' },
  { id: 'u3', name: 'System Admin' },
  { id: 'u4', name: 'Dr. Sarah Chen' },
  { id: 'u5', name: 'Dr. Aristhone' },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    const target = RECIPIENTS.find(r => r.id === recipientId);
    if (!target || !subject || !body) return;

    setIsSending(true);
    // Note: We do NOT pass isRead or isDeleted here per the IMessageService Omit type
    const result = await mockMessageService.send({
      senderId: currentUser.id as ID,
      senderName: currentUser.name,
      recipientId: target.id as ID,
      recipientName: target.name,
      subject,
      body,
      timestamp: new Date(),
      isUrgent,
    });

    setIsSending(true);
    if (result.ok) {
      onSuccess(result.data);
      setSubject('');
      setBody('');
      setRecipientId('');
      onClose();
    }
    setIsSending(false);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 3000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'rgba(0,0,0,0.7)' 
    }}>
      <div style={{ background: '#0f172a', width: '500px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>New Message</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>To</label>
            <select 
              value={recipientId} 
              onChange={(e) => setRecipientId(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px' }}
            >
              <option value="">Select Recipient...</option>
              {RECIPIENTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Subject</label>
            <input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Message</label>
            <textarea 
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px', resize: 'none' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
            Mark as Urgent
          </label>
        </div>

        <div style={{ padding: '16px', background: '#1e293b', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
          <button 
            onClick={handleSend} 
            disabled={isSending || !recipientId || !subject || !body}
            style={{ 
              background: (isSending || !recipientId || !subject || !body) ? '#334155' : '#0891B2', 
              color: 'white', 
              border: 'none', 
              padding: '8px 20px', 
              borderRadius: '4px', 
              cursor: isSending ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};
