import React from 'react';
import { Message } from '../../services/messages/IMessageService';

interface MessageSidebarProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompose: () => void;
}

export const MessageSidebar: React.FC<MessageSidebarProps> = ({ 
  messages, 
  selectedId, 
  onSelect, 
  onCompose 
}) => {
  return (
    <div style={{ 
      width: '320px', 
      borderRight: '1px solid rgba(255,255,255,0.1)', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#0f172a',
      height: '100%' 
    }}>
      {/* Sidebar Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px' }}>Inbox</h2>
        <button 
          onClick={onCompose}
          style={{ 
            width: '100%', 
            padding: '10px', 
            background: '#0891B2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          + New Message
        </button>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '20px', color: '#64748b', textAlign: 'center', fontSize: '14px' }}>
            No messages found
          </div>
        ) : (
          messages.map((m) => (
            <div 
              key={m.id} 
              onClick={() => onSelect(m.id)}
              className={`ps-msg-item ${selectedId === m.id ? 'active' : ''}`}
              style={{ 
                padding: '16px', 
                cursor: 'pointer', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: selectedId === m.id ? 'rgba(8, 145, 178, 0.1)' : 'transparent',
                borderLeft: selectedId === m.id ? '4px solid #0891B2' : '4px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: m.isUrgent ? '#ef4444' : '#0891B2', fontSize: '11px', fontWeight: 'bold' }}>
                  {m.isUrgent ? 'URGENT' : 'DIRECT'}
                </span>
                <span style={{ color: '#64748b', fontSize: '10px' }}>
                  {new Date(m.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div style={{ color: 'white', fontWeight: m.isRead ? '400' : '700', fontSize: '14px' }}>
                {m.senderName}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m.subject}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
