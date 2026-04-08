import React, { useEffect, useState } from 'react';
import '../../pathscribe.css';
import { mockUserService } from '../../services/users/mockUserService'; // Adjust path if needed
import { StaffUser } from '../../services/users/IUserService';

interface UserSelectorProps {
  onSelect: (userName: string) => void;
  onClose: () => void;
}

export const UserSelectorModal: React.FC<UserSelectorProps> = ({ onSelect, onClose }) => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Fetch from your existing mock service on mount
  useEffect(() => {
    const loadUsers = async () => {
      const result = await mockUserService.getAll();
      if (result.ok) {
        setUsers(result.data);
      }
      setLoading(false);
    };
    loadUsers();
  }, []);

  // 2. Filter logic: search by name or department
  const filtered = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || u.department.toLowerCase().includes(search);
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#0B121F', width: '500px', borderRadius: '12px',
        border: '1px solid #262626', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        
        {/* Modal Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#FFF', fontSize: '18px' }}>Select Recipient</h3>
            <p style={{ margin: '4px 0 0', color: '#8E8E93', fontSize: '12px' }}>Search staff, residents, or admin</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '15px' }}>
          <input 
            autoFocus
            type="text" 
            placeholder="Search by name or department..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', background: '#1C1C1E', border: '1px solid #3A3A3C', 
              borderRadius: '8px', padding: '12px', color: '#FFF', outline: 'none' 
            }} 
          />
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#0B121F' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8E8E93' }}>Loading staff...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8E8E93' }}>No users found</div>
          ) : (
            filtered.map((user) => {
              const fullName = `${user.firstName} ${user.lastName}`;
              const initials = `${user.firstName[0]}${user.lastName[0]}`;
              const role = user.roles[0] || 'Staff';

              return (
                <div 
                  key={user.id} 
                  onClick={() => onSelect(fullName)}
                  style={{ 
                    padding: '12px 20px', display: 'flex', alignItems: 'center', 
                    justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #1C1C1E',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#161B22'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#FFF', fontWeight: 500 }}>{fullName}</span>
                      <span style={{ 
                        fontSize: '10px', background: 'rgba(8, 145, 178, 0.1)', 
                        color: '#0891B2', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' 
                      }}>
                        {role}
                      </span>
                    </div>
                    <div style={{ color: '#8E8E93', fontSize: '12px', marginTop: '2px' }}>{user.department}</div>
                  </div>

                  {/* Initials Badge */}
                  <div style={{ 
                    background: '#1C1C1E', color: '#8E8E93', width: '36px', height: '36px', 
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '12px', fontWeight: 700, border: '1px solid #262626' 
                  }}>
                    {initials}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
