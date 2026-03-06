import React, { useState, useEffect } from 'react';
import { Subspecialty } from '../../../contexts/useSubspecialties';

// Define the interface that was missing
interface Props {
  isOpen: boolean;
  onClose: () => void;
  subId: string | null;
  onSave: (id: string, updates: Partial<Subspecialty>) => void;
  onAdd: (sub: Omit<Subspecialty, 'id'>) => void;
  initialData?: Subspecialty;
}

export const SubspecialtyEditorModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  subId, 
  onSave, 
  onAdd, 
  initialData 
}) => {
  // 1. Placeholder data until we link your real Dictionary/Users
  const mockSpecimens = [
    { id: 'spec_1', name: 'Appendix' },
    { id: 'spec_2', name: 'Colon Biopsy' },
    { id: 'spec_3', name: 'Skin Shave' }
  ];

  const mockUsers = [
    { id: 'user_1', name: 'Dr. Sarah Chen', role: 'Pathologist' },
    { id: 'user_2', name: 'Dr. James Okafor', role: 'Resident' }
  ];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSpecimenIds, setSelectedSpecimenIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'specimens' | 'users'>('specimens');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setSelectedSpecimenIds(initialData?.specimenIds || []);
      setSelectedUserIds(initialData?.userIds || []);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Subspecialty, 'id'> = { 
      name, 
      description, 
      specimenIds: selectedSpecimenIds, 
      userIds: selectedUserIds 
    };
    
    if (subId) onSave(subId, payload);
    else onAdd(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-gray-800 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-xl font-semibold text-white">
              {subId ? `Edit ${name}` : 'New Subspecialty'}
            </h3>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input 
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-[#00A3C4]" 
                placeholder="Subspecialty Name" 
                value={name} onChange={e => setName(e.target.value)} required
              />
              <input 
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-[#00A3C4]" 
                placeholder="Description" 
                value={description} onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex bg-gray-800/50 border-b border-gray-800 text-sm">
                <button 
                  type="button"
                  onClick={() => setActiveTab('specimens')}
                  className={`px-4 py-2 ${activeTab === 'specimens' ? 'text-[#00A3C4] border-b-2 border-[#00A3C4]' : 'text-gray-400'}`}
                >
                  Specimens ({selectedSpecimenIds.length})
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 ${activeTab === 'users' ? 'text-[#00A3C4] border-b-2 border-[#00A3C4]' : 'text-gray-400'}`}
                >
                  Staff ({selectedUserIds.length})
                </button>
              </div>

              <div className="h-48 overflow-y-auto p-2 bg-gray-900/20">
                {activeTab === 'specimens' ? (
                  mockSpecimens.map(s => (
                    <label key={s.id} className="flex items-center p-2 hover:bg-gray-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSpecimenIds.includes(s.id)}
                        onChange={() => setSelectedSpecimenIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                        className="mr-3 rounded border-gray-700 text-[#00A3C4] bg-gray-900"
                      />
                      <span className="text-gray-300 text-sm">{s.name}</span>
                    </label>
                  ))
                ) : (
                  mockUsers.map(u => (
                    <label key={u.id} className="flex items-center p-2 hover:bg-gray-800 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className="mr-3 rounded border-gray-700 text-[#00A3C4] bg-gray-900"
                      />
                      <span className="text-gray-300 text-sm">{u.name} ({u.role})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-800 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white px-4">Cancel</button>
            <button type="submit" className="bg-[#00A3C4] text-white px-6 py-2 rounded font-semibold">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};