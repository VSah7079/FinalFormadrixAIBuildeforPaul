import React, { useState, useRef } from 'react';
import { mockActionRegistryService } from '../../../services/actionRegistry/mockActionRegistryService';
import { SystemAction } from '../../../services/actionRegistry/IActionRegistryService';

export const ActionsTab: React.FC = () => {
  const [actions, setActions] = useState<SystemAction[]>(mockActionRegistryService.getActions());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingAction, setEditingAction] = useState<SystemAction | null>(null);
  const [tempShortcut, setTempShortcut] = useState('');
  const [tempTriggers, setTempTriggers] = useState('');

  const openEditModal = (action: SystemAction) => {
    setEditingAction(action);
    setTempShortcut(action.shortcut);
    setTempTriggers(action.voiceTriggers.join(', '));
  };

  const handleSave = async () => {
    if (!editingAction) return;
    const triggers = tempTriggers.split(',').map(t => t.trim()).filter(t => t !== "");
    await mockActionRegistryService.updateAction(editingAction.id, { 
      shortcut: tempShortcut, 
      voiceTriggers: triggers 
    });
    setActions([...mockActionRegistryService.getActions()]);
    setEditingAction(null);
  };

  // ─── Export Logic ───────────────────────────────────────────────────────
  const exportCurrentRegistry = () => {
    const instructions = [
      ["# ================================================================================"],
      ["# pathscribe SYSTEM ACTION REGISTRY - EDITING RULES"],
      ["# ================================================================================"],
      ["# 1. ONLY edit columns 'Shortcut' and 'Voice Triggers'."],
      ["# 2. SHORTCUTS MUST BE UNIQUE: The system will block duplicate keyboard combos."],
      ["# 3. DO NOT change ID, Label, or Category columns."],
      ["# 4. DO NOT add new rows. Only existing System Actions are supported."],
      ["# 5. VOICE TRIGGERS: Use a semi-colon (;) to separate multiple phrases."],
      ["# ================================================================================"],
      [""], 
      ["ID (DO NOT ALTER)", "Label (READ ONLY)", "Category (READ ONLY)", "Shortcut (UNIQUE)", "Voice Triggers (EDITABLE)"]
    ];

    const rows = actions.map(a => [
      a.id,
      `"${a.label}"`,
      `"${a.category}"`,
      `"${a.shortcut}"`,
      `"${a.voiceTriggers.join('; ')}"`
    ]);

    const csvContent = [...instructions, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "pathscribe_system_config.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Import Logic (With Shortcut Collision Detection) ───────────────────
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      
      const successLog: string[] = [];
      const errorLog: string[] = [];
      const seenIds = new Set<string>();
      const usedShortcutsInFile = new Map<string, string>(); // shortcut -> label
      let noChangeCount = 0;

      lines.forEach((line, index) => {
        const excelRow = index + 1;
        if (line.startsWith('#') || line.toLowerCase().includes('(do not alter)')) return;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length >= 5) {
          const id = parts[0].replace(/["\s]/g, ''); 
          const label = parts[1].replace(/"/g, '').trim();
          const category = parts[2].replace(/"/g, '').trim();
          const shortcut = parts[3].replace(/"/g, '').trim().toLowerCase();
          const triggersRaw = parts[4] || "";
          
          const voiceTriggers = triggersRaw.replace(/"/g, '').split(';').map(t => t.trim()).filter(t => t !== "");

          const original = actions.find(a => a.id === id);
          
          // 1. Basic Validations
          if (!original) {
            errorLog.push(`Line ${excelRow}: Unknown ID "${id}".`);
            return;
          }
          if (seenIds.has(id)) {
            errorLog.push(`Line ${excelRow}: Duplicate ID "${id}" in file.`);
            return;
          }
          if (original.label !== label || original.category !== category) {
            errorLog.push(`Line ${excelRow} (${original.label}): Blocked change to Label/Category.`);
            return;
          }

          // 2. Shortcut Collision Detection
          // Check if this shortcut is used by another action in this file
          if (shortcut && usedShortcutsInFile.has(shortcut)) {
            errorLog.push(`Line ${excelRow}: Shortcut "${shortcut}" already assigned to "${usedShortcutsInFile.get(shortcut)}" in this file.`);
            return;
          }
          
          // Check if this shortcut is used by an action NOT in this file (global system check)
          const globalCollision = actions.find(a => a.id !== id && a.shortcut.toLowerCase() === shortcut);
          if (shortcut && globalCollision) {
            errorLog.push(`Line ${excelRow}: Shortcut "${shortcut}" is already reserved for "${globalCollision.label}".`);
            return;
          }

          seenIds.add(id);
          usedShortcutsInFile.set(shortcut, label);

          // 3. Change Detection
          const hasShortcutChanged = original.shortcut.toLowerCase() !== shortcut;
          const hasTriggersChanged = JSON.stringify([...original.voiceTriggers].sort()) !== JSON.stringify([...voiceTriggers].sort());

          if (!hasShortcutChanged && !hasTriggersChanged) {
            noChangeCount++;
            return;
          }

          mockActionRegistryService.updateAction(id, { shortcut, voiceTriggers });
          successLog.push(`Line ${excelRow}: ${original.label}`);
        }
      });

      setActions([...mockActionRegistryService.getActions()]);

      let summary = `Import Report\n----------------\n`;
      if (successLog.length > 0) {
        summary += `✅ UPDATED (${successLog.length}):\n`;
        successLog.slice(0, 5).forEach(s => summary += ` &bull; ${s}\n`);
        if (successLog.length > 5) summary += ` ...and ${successLog.length - 5} more.\n`;
        summary += `\n`;
      }
      if (noChangeCount > 0) summary += `ℹ️ ${noChangeCount} rows skipped (no changes).\n\n`;
      if (errorLog.length > 0) {
        summary += `❌ FAILURES/COLLISIONS (${errorLog.length}):\n`;
        errorLog.slice(0, 5).forEach(err => summary += ` &bull; ${err}\n`);
        if (errorLog.length > 5) summary += ` ...and ${errorLog.length - 5} more.`;
      }
      alert(summary);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const allCategories = Array.from(new Set(actions.map(a => a.category)));
  const filterOptions = ['All', ...allCategories];
  const filteredActions = actions.filter(a => {
    const matchesSearch = a.label.toLowerCase().includes(search.toLowerCase()) || 
                         a.voiceTriggers.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const displayedCategories = Array.from(new Set(filteredActions.map(a => a.category)));

  return (
    <div style={{ padding: '24px', color: '#fff' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️ System Action Registry</h3>
          <p style={{ color: '#94a3b8' }}>Admin-only command configuration. Keyboard shortcuts must be unique system-wide.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={exportCurrentRegistry} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Download Template</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>📥 Bulk Import</button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".csv" />
        </div>
      </div>

      <input className="registry-search" type="text" placeholder="Search actions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '16px', outline: 'none' }} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterOptions.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: selectedCategory === cat ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)', color: selectedCategory === cat ? '#38bdf8' : '#64748b', border: `1px solid ${selectedCategory === cat ? '#38bdf8' : 'rgba(255,255,255,0.1)'}` }}>{cat}</button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', opacity: editingAction ? 0.2 : 1, pointerEvents: editingAction ? 'none' : 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px' }}>Action</th>
              <th style={{ padding: '12px' }}>Shortcut</th>
              <th style={{ padding: '12px' }}>Voice Triggers</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Settings</th>
            </tr>
          </thead>
          <tbody>
            {displayedCategories.map(cat => (
              <React.Fragment key={cat}>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>{cat}</td>
                </tr>
                {filteredActions.filter(a => a.category === cat).map((action) => (
                  <tr key={action.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: '16px 32px' }}>
                       <div style={{ fontWeight: '500', fontSize: '14px' }}>{action.label}</div>
                       <div style={{ fontSize: '10px', color: '#475569' }}>{action.requiredRole}</div>
                    </td>
                    <td style={{ padding: '16px' }}><code style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', color: '#38bdf8' }}>{action.shortcut}</code></td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {action.voiceTriggers.map(t => <span key={t} style={{ background: 'rgba(8, 145, 178, 0.15)', color: '#22d3ee', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>{t}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => openEditModal(action)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '6px 16px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editingAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '32px', width: '480px' }}>
            <h4 style={{ fontSize: '20px', marginBottom: '4px' }}>Edit Action</h4>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>{editingAction.label}</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>Shortcut</label>
              <input value={tempShortcut} onChange={(e) => setTempShortcut(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '12px', borderRadius: '6px', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>Voice Triggers (Comma Separated)</label>
              <textarea value={tempTriggers} onChange={(e) => setTempTriggers(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '12px', borderRadius: '6px', height: '100px', resize: 'none', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingAction(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>CANCEL</button>
              <button onClick={handleSave} style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '10px 28px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>SAVE CHANGES</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
