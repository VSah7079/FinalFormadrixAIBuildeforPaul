import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: IActionRegistryService;
}

// Mock data for staff - in a real app, this might come from a hook or API
const MOCK_STAFF = [
  { id: '1', name: 'Dr. Sarah Chen', role: 'Pathologist', status: 'Available' },
  { id: '2', name: 'Dr. James Wilson', role: 'Pathologist', status: 'Busy' },
  { id: '3', name: 'Dr. Elena Rodriguez', role: 'Resident', status: 'Available' },
  { id: '4', name: 'Unassigned Queue', role: 'System', status: 'Active' },
];

export const DelegateModal: React.FC<DelegateModalProps> = ({ isOpen, onClose, registry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // FIXED: Added safety checks to prevent 'undefined' filter errors
  const filteredStaff = MOCK_STAFF?.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Listen for the voice command to close or specific modal actions
  useEffect(() => {
    if (!isOpen) return;

    // This uses the new onAction listener we just built in the service
    const unsubscribe = registry.onAction((actionId) => {
      if (actionId === 'CLOSE_MODAL' || actionId === 'NAVIGATE_BACK') {
        onClose();
      }
    });

    return () => unsubscribe();
  }, [isOpen, registry, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Delegate Case</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or role (e.g., 'Resident')..."
              className="w-full rounded-lg bg-slate-800 border border-slate-700 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Staff List */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <button
                key={staff.id}
                onClick={() => {
                  console.log(`Delegated to ${staff.name}`);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-slate-800 transition-colors group"
              >
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-blue-400">{staff.name}</div>
                  <div className="text-xs text-slate-500">{staff.role}</div>
                </div>
                <div className={`text-[10px] uppercase px-2 py-1 rounded-full ${
                  staff.status === 'Available' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                }`}>
                  {staff.status}
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              No staff members found matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800/30 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={true}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Confirm Delegation
          </button>
        </div>
      </div>
    </div>
  );
};
export default DelegateModal;