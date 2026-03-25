import React from 'react';
import '../../../formedrix.css';
import { Subspecialty } from '../../../contexts/useSubspecialties';

interface Props {
  data: Subspecialty[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SubspecialtyTable: React.FC<Props> = ({ data, onEdit, onDelete }) => {
  return (
    <table className="w-full text-left text-sm text-gray-300">
      <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs">
        <tr>
          <th className="px-6 py-3 font-medium">Subspecialty Name</th>
          <th className="px-6 py-3 font-medium">Description</th>
          <th className="px-6 py-3 font-medium text-center">Specimens</th>
          <th className="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800">
        {data.map((sub) => (
          <tr key={sub.id} className="hover:bg-gray-800/30 transition-colors">
            <td className="px-6 py-4 font-medium text-white">{sub.name}</td>
            <td className="px-6 py-4 text-gray-400">{sub.description}</td>
            <td className="px-6 py-4 text-center">
              <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                {sub.specimenIds?.length || 0}
              </span>
            </td>
            <td className="px-6 py-4 text-right space-x-3">
              <button onClick={() => onEdit(sub.id)} className="text-[#00A3C4] hover:underline">Edit</button>
              <button onClick={() => onDelete(sub.id)} className="text-red-400 hover:underline">Delete</button>
            </td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
              No subspecialties defined yet. Click "+ Add Subspecialty" to begin.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
