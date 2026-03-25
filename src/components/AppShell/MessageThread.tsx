import React, { useState } from 'react';
import { Message } from '../../services/messageService';

interface Props {
  message: Message;
  userId: string;
  onSend: (text: string) => void;
  isListening: boolean;
  onVoiceTrigger: () => void;
}

export const MessageThread: React.FC<Props> = ({ message, userId, onSend, isListening, onVoiceTrigger }) => {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSend(replyText);
    setReplyText('');
  };

  // Simulated thread: combines the original body with any replies
  const thread = message.thread || [
    { senderId: message.senderId, sender: message.senderName, text: message.body, timestamp: message.timestamp }
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 1. The Scrollable Chat Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {thread.map((t, i) => {
          const isMe = t.senderId === userId;
          return (
            <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                {t.sender} &bull; {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                background: isMe ? '#0891B2' : '#1e293b',
                color: 'white',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {t.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. The Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#020617' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#1e293b', padding: '6px 12px', borderRadius: '24px' }}>
          <button 
            onClick={onVoiceTrigger} 
            style={{ background: 'none', border: 'none', color: isListening ? '#ef4444' : '#64748b', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isListening ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </button>
          
          <input 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a reply..."
            style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', padding: '8px 0' }}
          />
          
          <button 
            onClick={handleSend}
            disabled={!replyText.trim()}
            style={{ 
              background: replyText.trim() ? '#0891B2' : 'transparent', 
              color: replyText.trim() ? 'white' : '#475569',
              border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' 
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};
