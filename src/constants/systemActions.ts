// ─────────────────────────────────────────────────────────────────────────────
// systemActions.ts
// Single source of truth for ALL system actions in PathScribe AI.
//
// INTERNAL KEY DESIGN
// ───────────────────
// Each action has a stable internalKey (F13–F24 + PSxxx) that the keyboard
// handler dispatches. This key NEVER changes and is never a real browser
// shortcut. The user-facing shortcut string is separate and user-assignable.
//
// CONTEXT DESIGN
// ──────────────
// Actions belong to a context tier:
//   SYSTEM    — always available app-wide (open messages, go back/forward)
//   NAVIGATION — always available (open worklist, open config etc.)
//   WORKLIST  — only when worklist view is active
//   CASE_VIEW — only when a case is open
//   REPORTING — only when the reporting editor is active
//   MESSAGES  — only when the messages drawer is open
//   SEARCH    — only when the search page is active
//   CONFIGURATION — only when the config page is active
//
// Components call mockActionRegistryService.setCurrentContext('WORKLIST')
// on mount so only the right commands are eligible at any time.
//
// ADDING NEW ACTIONS
// ──────────────────
// Append to the relevant group. Pick the next PSxxx number in that Fnn block.
// Never reuse or reassign an internalKey even if an action is removed.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionId =
  // ── System (always available) ────────────────────────────────────────────
  | 'system.openMessages' | 'system.openWorklist'
  | 'system.openConfiguration' | 'system.openSearch'
  | 'system.openAudit' | 'system.openContribution'
  | 'system.goBack' | 'system.goForward'
  | 'system.saveDraft' | 'system.signOut'
  // ── Global navigation (always available) ─────────────────────────────────
  | 'nav.nextCase' | 'nav.previousCase'
  | 'nav.nextTab' | 'nav.previousTab'
  // ── Table / list navigation (context-specific) ───────────────────────────
  | 'table.next' | 'table.previous'
  | 'table.pageDown' | 'table.pageUp'
  | 'table.first' | 'table.last'
  | 'table.select' | 'table.selectAll' | 'table.deselectAll'
  | 'table.openSelected'
  | 'table.refresh'
  | 'table.sortByDate' | 'table.sortByPriority' | 'table.sortByStatus'
  | 'table.filterUrgent' | 'table.clearFilter'
  | 'table.search' | 'table.clearSearch' | 'table.refineSearch'
  // ── Reporting editor ─────────────────────────────────────────────────────
  | 'editor.nextField' | 'editor.previousField'
  | 'editor.nextSection' | 'editor.previousSection'
  | 'editor.insertMacro' | 'editor.insertTable' | 'editor.insertSignature'
  | 'editor.bold' | 'editor.italic' | 'editor.underline'
  | 'editor.bullets' | 'editor.numbering'
  | 'editor.increaseIndent' | 'editor.decreaseIndent'
  | 'editor.find' | 'editor.replace' | 'editor.selectAll'
  | 'editor.showRuler' | 'editor.toggleFormatting'
  // ── Diagnosis & dictation ─────────────────────────────────────────────────
  | 'diagnosis.grossDescription' | 'diagnosis.microscopicDescription'
  | 'diagnosis.enterDiagnosis' | 'diagnosis.enterAddendum'
  | 'diagnosis.signOut' | 'diagnosis.coSign'
  | 'diagnosis.amend' | 'diagnosis.revokeSignOut'
  // ── Messages ──────────────────────────────────────────────────────────────
  | 'messages.next' | 'messages.previous'
  | 'messages.reply' | 'messages.delete'
  | 'messages.markRead' | 'messages.markUrgent'
  | 'messages.compose' | 'messages.send' | 'messages.close'
  // ── Case management ───────────────────────────────────────────────────────
  | 'case.viewWorklist' | 'case.open' | 'case.create' | 'case.editDemographics'
  | 'case.assign' | 'case.reassign' | 'case.prioritize' | 'case.hold'
  | 'case.releaseHold' | 'case.archive' | 'case.delete'
  // ── Specimen ──────────────────────────────────────────────────────────────
  | 'specimen.add' | 'specimen.edit' | 'specimen.remove'
  | 'specimen.applyFlag' | 'specimen.removeFlag' | 'specimen.assignSubspecialty'
  // ── Reports ───────────────────────────────────────────────────────────────
  | 'report.preview' | 'report.generate' | 'report.deliver'
  | 'report.redeliver' | 'report.viewHistory' | 'report.download'
  // ── AI Assistance ─────────────────────────────────────────────────────────
  | 'ai.diagnosisSuggest' | 'ai.grossAssist' | 'ai.macroSuggest'
  | 'ai.viewConfidence' | 'ai.override'
  // ── Client & Physician ────────────────────────────────────────────────────
  | 'client.view' | 'client.edit'
  | 'physician.view' | 'physician.edit' | 'physician.verify'
  // ── Configuration ─────────────────────────────────────────────────────────
  | 'config.access' | 'config.staff' | 'config.roles' | 'config.subspecialties'
  | 'config.specimens' | 'config.flags' | 'config.ai' | 'config.macros'
  | 'config.shortcuts' | 'config.lis' | 'config.auditLog'
  // ── QC ────────────────────────────────────────────────────────────────────
  | 'qc.configure' | 'qc.viewQueue' | 'qc.claimReview'
  | 'qc.submitReview' | 'qc.escalateDiscordance' | 'qc.viewDashboard' | 'qc.exportReport'
  // ── Billing (prebuilt) ────────────────────────────────────────────────────
  | 'billing.viewCodes' | 'billing.editCodes' | 'billing.submitClaim'
  | 'billing.viewHistory' | 'billing.exportBatch'
  // ── Admin ─────────────────────────────────────────────────────────────────
  | '***REMOVED***.dashboard' | '***REMOVED***.reports' | '***REMOVED***.export'
  | '***REMOVED***.backups' | '***REMOVED***.eventLog' | '***REMOVED***.impersonate';

export interface SystemAction {
  id: ActionId;
  label: string;
  description?: string;
  /**
   * Stable internal dispatch key — never a real browser shortcut.
   * Format: F{13-24}+PS{001-999}. Fixed at build time, never reassigned.
   * The keyboard handler listens for this, not the user-facing shortcut.
   */
  internalKey: string;
  shortcutable?: boolean;
  prebuilt?: boolean;
}

export interface ActionGroup {
  id: string;
  title: string;
  actions: SystemAction[];
}

export const ACTION_GROUPS: ActionGroup[] = [

  // ── F13: System — always available ───────────────────────────────────────
  {
    id: 'system',
    title: 'System',
    actions: [
      { id: 'system.openMessages',       label: 'Open Messages',           internalKey: 'F13+PS001', shortcutable: true },
      { id: 'system.openWorklist',       label: 'Open Worklist',           internalKey: 'F13+PS002', shortcutable: true },
      { id: 'system.goBack',             label: 'Go Back',                 internalKey: 'F13+PS003', shortcutable: true },
      { id: 'system.goForward',          label: 'Go Forward',              internalKey: 'F13+PS004', shortcutable: true },
      { id: 'system.saveDraft',          label: 'Save Draft',              internalKey: 'F13+PS005', shortcutable: true },
      { id: 'system.signOut',            label: 'Sign Out Case',           internalKey: 'F13+PS006', shortcutable: true },
      { id: 'system.openConfiguration', label: 'Open Configuration',      internalKey: 'F13+PS007', shortcutable: true },
      { id: 'system.openSearch',         label: 'Open Search',             internalKey: 'F13+PS008', shortcutable: true },
      { id: 'system.openAudit',          label: 'System Audit',            internalKey: 'F13+PS009', shortcutable: true },
      { id: 'system.openContribution',   label: 'My Contribution',         internalKey: 'F13+PS010', shortcutable: true },
    ],
  },

  // ── F14: Global navigation — always available ─────────────────────────────
  {
    id: 'nav',
    title: 'Navigation',
    actions: [
      { id: 'nav.nextCase',      label: 'Next Case',      internalKey: 'F14+PS001', shortcutable: true },
      { id: 'nav.previousCase',  label: 'Previous Case',  internalKey: 'F14+PS002', shortcutable: true },
      { id: 'nav.nextTab',       label: 'Next Tab',       internalKey: 'F14+PS003', shortcutable: true },
      { id: 'nav.previousTab',   label: 'Previous Tab',   internalKey: 'F14+PS004', shortcutable: true },
    ],
  },

  // ── F15: Table / list navigation — context-specific ──────────────────────
  {
    id: 'table',
    title: 'Table & List Navigation',
    actions: [
      { id: 'table.next',          label: 'Next Row',            internalKey: 'F15+PS001', shortcutable: true },
      { id: 'table.previous',      label: 'Previous Row',        internalKey: 'F15+PS002', shortcutable: true },
      { id: 'table.pageDown',      label: 'Page Down',           internalKey: 'F15+PS003', shortcutable: true },
      { id: 'table.pageUp',        label: 'Page Up',             internalKey: 'F15+PS004', shortcutable: true },
      { id: 'table.first',         label: 'First Row',           internalKey: 'F15+PS005', shortcutable: true },
      { id: 'table.last',          label: 'Last Row',            internalKey: 'F15+PS006', shortcutable: true },
      { id: 'table.select',        label: 'Select Row',          internalKey: 'F15+PS007', shortcutable: true },
      { id: 'table.selectAll',     label: 'Select All',          internalKey: 'F15+PS008', shortcutable: true },
      { id: 'table.deselectAll',   label: 'Deselect All',        internalKey: 'F15+PS009', shortcutable: true },
      { id: 'table.openSelected',  label: 'Open Selected',       internalKey: 'F15+PS010', shortcutable: true },
      { id: 'table.refresh',       label: 'Refresh',             internalKey: 'F15+PS011', shortcutable: true },
      { id: 'table.sortByDate',    label: 'Sort by Date',        internalKey: 'F15+PS012' },
      { id: 'table.sortByPriority',label: 'Sort by Priority',    internalKey: 'F15+PS013' },
      { id: 'table.sortByStatus',  label: 'Sort by Status',      internalKey: 'F15+PS014' },
      { id: 'table.filterUrgent',  label: 'Filter Urgent',       internalKey: 'F15+PS015' },
      { id: 'table.clearFilter',   label: 'Clear Filter',        internalKey: 'F15+PS016' },
      { id: 'table.search',        label: 'Search',              internalKey: 'F15+PS017', shortcutable: true },
      { id: 'table.clearSearch',   label: 'Clear Search',        internalKey: 'F15+PS018' },
      { id: 'table.refineSearch',  label: 'Refine Search',       internalKey: 'F15+PS019' },
    ],
  },

  // ── F16: Reporting editor ─────────────────────────────────────────────────
  {
    id: 'editor',
    title: 'Reporting Editor',
    actions: [
      { id: 'editor.nextField',        label: 'Next Field',                   internalKey: 'F16+PS001', shortcutable: true },
      { id: 'editor.previousField',    label: 'Previous Field',               internalKey: 'F16+PS002', shortcutable: true },
      { id: 'editor.nextSection',      label: 'Next Section',                 internalKey: 'F16+PS003', shortcutable: true },
      { id: 'editor.previousSection',  label: 'Previous Section',             internalKey: 'F16+PS004', shortcutable: true },
      { id: 'editor.insertMacro',      label: 'Insert Macro',                 internalKey: 'F16+PS005', shortcutable: true },
      { id: 'editor.insertTable',      label: 'Insert Table',                 internalKey: 'F16+PS006', shortcutable: true },
      { id: 'editor.insertSignature',  label: 'Insert Signature Line',        internalKey: 'F16+PS007', shortcutable: true },
      { id: 'editor.bold',             label: 'Bold',                         internalKey: 'F16+PS008', shortcutable: true },
      { id: 'editor.italic',           label: 'Italic',                       internalKey: 'F16+PS009', shortcutable: true },
      { id: 'editor.underline',        label: 'Underline',                    internalKey: 'F16+PS010', shortcutable: true },
      { id: 'editor.bullets',          label: 'Bullets',                      internalKey: 'F16+PS011', shortcutable: true },
      { id: 'editor.numbering',        label: 'Numbered List',                internalKey: 'F16+PS012', shortcutable: true },
      { id: 'editor.increaseIndent',   label: 'Increase Indent',              internalKey: 'F16+PS013', shortcutable: true },
      { id: 'editor.decreaseIndent',   label: 'Decrease Indent',              internalKey: 'F16+PS014', shortcutable: true },
      { id: 'editor.find',             label: 'Find',                         internalKey: 'F16+PS015', shortcutable: true },
      { id: 'editor.replace',          label: 'Replace',                      internalKey: 'F16+PS016', shortcutable: true },
      { id: 'editor.selectAll',        label: 'Select All',                   internalKey: 'F16+PS017', shortcutable: true },
      { id: 'editor.showRuler',        label: 'Show / Hide Ruler',            internalKey: 'F16+PS018', shortcutable: true },
      { id: 'editor.toggleFormatting', label: 'Show / Hide Formatting Marks', internalKey: 'F16+PS019', shortcutable: true },
    ],
  },

  // ── F17: Diagnosis & dictation ────────────────────────────────────────────
  {
    id: 'diagnosis',
    title: 'Diagnosis & Sign-Out',
    actions: [
      { id: 'diagnosis.grossDescription',       label: 'Enter Gross Description',       internalKey: 'F17+PS001', shortcutable: true },
      { id: 'diagnosis.microscopicDescription', label: 'Enter Microscopic Description', internalKey: 'F17+PS002', shortcutable: true },
      { id: 'diagnosis.enterDiagnosis',         label: 'Enter Diagnosis',               internalKey: 'F17+PS003', shortcutable: true },
      { id: 'diagnosis.enterAddendum',          label: 'Enter Addendum',                internalKey: 'F17+PS004', shortcutable: true },
      { id: 'diagnosis.signOut',                label: 'Sign Out Case (Primary)',        internalKey: 'F17+PS005', shortcutable: true },
      { id: 'diagnosis.coSign',                 label: 'Co-Sign Case',                  internalKey: 'F17+PS006', description: 'Resident / Fellow' },
      { id: 'diagnosis.amend',                  label: 'Amend Signed-Out Case',         internalKey: 'F17+PS007' },
      { id: 'diagnosis.revokeSignOut',          label: 'Revoke Sign-Out',               internalKey: 'F17+PS008' },
    ],
  },

  // ── F18: Messages context ─────────────────────────────────────────────────
  {
    id: 'messages',
    title: 'Messages',
    actions: [
      { id: 'messages.next',         label: 'Next Message',     internalKey: 'F18+PS001', shortcutable: true },
      { id: 'messages.previous',     label: 'Previous Message', internalKey: 'F18+PS002', shortcutable: true },
      { id: 'messages.reply',        label: 'Reply',            internalKey: 'F18+PS003', shortcutable: true },
      { id: 'messages.delete',       label: 'Delete Message',   internalKey: 'F18+PS004', shortcutable: true },
      { id: 'messages.markRead',     label: 'Mark as Read',     internalKey: 'F18+PS005' },
      { id: 'messages.markUrgent',   label: 'Mark as Urgent',   internalKey: 'F18+PS006' },
      { id: 'messages.compose',      label: 'Compose Message',  internalKey: 'F18+PS007', shortcutable: true },
      { id: 'messages.send',         label: 'Send Message',     internalKey: 'F18+PS008', shortcutable: true },
      { id: 'messages.close',        label: 'Close Messages',   internalKey: 'F18+PS009', shortcutable: true },
    ],
  },

  // ── F19: Case management ──────────────────────────────────────────────────
  {
    id: 'case',
    title: 'Case Management',
    actions: [
      { id: 'case.viewWorklist',     label: 'View Case Worklist',         internalKey: 'F19+PS001' },
      { id: 'case.open',             label: 'Open / View Case',           internalKey: 'F19+PS002' },
      { id: 'case.create',           label: 'Create New Case',            internalKey: 'F19+PS003', description: 'Manual accession', prebuilt: true },
      { id: 'case.editDemographics', label: 'Edit Case Demographics',     internalKey: 'F19+PS004' },
      { id: 'case.assign',           label: 'Assign Case',                internalKey: 'F19+PS005' },
      { id: 'case.reassign',         label: 'Reassign Case',              internalKey: 'F19+PS006' },
      { id: 'case.prioritize',       label: 'Prioritize / Escalate Case', internalKey: 'F19+PS007' },
      { id: 'case.hold',             label: 'Place Case On Hold',         internalKey: 'F19+PS008' },
      { id: 'case.releaseHold',      label: 'Release Case From Hold',     internalKey: 'F19+PS009' },
      { id: 'case.archive',          label: 'Archive Case',               internalKey: 'F19+PS010' },
      { id: 'case.delete',           label: 'Delete Case',                internalKey: 'F19+PS011', description: 'Admin only' },
    ],
  },

  // ── F20: Specimen ─────────────────────────────────────────────────────────
  {
    id: 'specimen',
    title: 'Specimen',
    actions: [
      { id: 'specimen.add',                label: 'Add Specimen',              internalKey: 'F20+PS001' },
      { id: 'specimen.edit',               label: 'Edit Specimen Details',     internalKey: 'F20+PS002' },
      { id: 'specimen.remove',             label: 'Remove Specimen',           internalKey: 'F20+PS003' },
      { id: 'specimen.applyFlag',          label: 'Apply Flag to Specimen',    internalKey: 'F20+PS004' },
      { id: 'specimen.removeFlag',         label: 'Remove Flag from Specimen', internalKey: 'F20+PS005' },
      { id: 'specimen.assignSubspecialty', label: 'Assign to Subspecialty',    internalKey: 'F20+PS006' },
    ],
  },

  // ── F21: Reports ──────────────────────────────────────────────────────────
  {
    id: 'report',
    title: 'Reports',
    actions: [
      { id: 'report.preview',     label: 'Preview Report',               internalKey: 'F21+PS001' },
      { id: 'report.generate',    label: 'Generate / Print Report',      internalKey: 'F21+PS002' },
      { id: 'report.deliver',     label: 'Deliver Report to Physician',  internalKey: 'F21+PS003', description: 'Fax or email' },
      { id: 'report.redeliver',   label: 'Re-Deliver Report',            internalKey: 'F21+PS004' },
      { id: 'report.viewHistory', label: 'View Report History',          internalKey: 'F21+PS005' },
      { id: 'report.download',    label: 'Download Report PDF',          internalKey: 'F21+PS006' },
    ],
  },

  // ── F22: AI Assistance ────────────────────────────────────────────────────
  {
    id: 'ai',
    title: 'AI Assistance',
    actions: [
      { id: 'ai.diagnosisSuggest', label: 'Use AI Diagnosis Suggestion',      internalKey: 'F22+PS001' },
      { id: 'ai.grossAssist',      label: 'Use AI Gross Description Assist',  internalKey: 'F22+PS002' },
      { id: 'ai.macroSuggest',     label: 'Use AI Macro Suggestion',          internalKey: 'F22+PS003' },
      { id: 'ai.viewConfidence',   label: 'View AI Confidence Scores',        internalKey: 'F22+PS004' },
      { id: 'ai.override',         label: 'Override AI Suggestion',           internalKey: 'F22+PS005' },
    ],
  },

  // ── F23: Client & Physician ───────────────────────────────────────────────
  {
    id: 'clientPhysician',
    title: 'Client & Physician',
    actions: [
      { id: 'client.view',      label: 'View Client List',         internalKey: 'F23+PS001' },
      { id: 'client.edit',      label: 'Add / Edit Client',        internalKey: 'F23+PS002' },
      { id: 'physician.view',   label: 'View Physician Directory', internalKey: 'F23+PS003' },
      { id: 'physician.edit',   label: 'Add / Edit Physician',     internalKey: 'F23+PS004' },
      { id: 'physician.verify', label: 'Verify Physician Record',  internalKey: 'F23+PS005' },
    ],
  },

  // ── F24: Configuration & Admin ────────────────────────────────────────────
  {
    id: 'config',
    title: 'Configuration',
    actions: [
      { id: 'config.access',         label: 'Access Configuration Module',     internalKey: 'F24+PS001' },
      { id: 'config.staff',          label: 'Manage Staff',                    internalKey: 'F24+PS002' },
      { id: 'config.roles',          label: 'Manage Roles',                    internalKey: 'F24+PS003' },
      { id: 'config.subspecialties', label: 'Manage Subspecialties',           internalKey: 'F24+PS004' },
      { id: 'config.specimens',      label: 'Manage Specimen Dictionary',      internalKey: 'F24+PS005' },
      { id: 'config.flags',          label: 'Manage Flags',                    internalKey: 'F24+PS006' },
      { id: 'config.ai',             label: 'Manage AI Behavior Settings',     internalKey: 'F24+PS007' },
      { id: 'config.macros',         label: 'Manage Macros',                   internalKey: 'F24+PS008' },
      { id: 'config.shortcuts',      label: 'Manage Keyboard Shortcuts',       internalKey: 'F24+PS009' },
      { id: 'config.lis',            label: 'Manage LIS Integration Settings', internalKey: 'F24+PS010' },
      { id: 'config.auditLog',       label: 'View Audit Log',                  internalKey: 'F24+PS011' },
    ],
  },

  // QC, Billing, Admin reuse F24 block with higher PS numbers
  {
    id: 'qc',
    title: 'Quality Control',
    actions: [
      { id: 'qc.configure',           label: 'Configure QC Rules',   internalKey: 'F24+PS012' },
      { id: 'qc.viewQueue',           label: 'View QC Queue',        internalKey: 'F24+PS013' },
      { id: 'qc.claimReview',         label: 'Claim QC Review',      internalKey: 'F24+PS014' },
      { id: 'qc.submitReview',        label: 'Submit QC Review',     internalKey: 'F24+PS015' },
      { id: 'qc.escalateDiscordance', label: 'Escalate Discordance', internalKey: 'F24+PS016' },
      { id: 'qc.viewDashboard',       label: 'View QC Dashboard',    internalKey: 'F24+PS017' },
      { id: 'qc.exportReport',        label: 'Export QC Report',     internalKey: 'F24+PS018' },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    actions: [
      { id: 'billing.viewCodes',   label: 'View Billing Codes on Case', internalKey: 'F24+PS019', prebuilt: true },
      { id: 'billing.editCodes',   label: 'Edit Billing Codes',         internalKey: 'F24+PS020', prebuilt: true },
      { id: 'billing.submitClaim', label: 'Submit Claim',               internalKey: 'F24+PS021', prebuilt: true },
      { id: 'billing.viewHistory', label: 'View Billing History',       internalKey: 'F24+PS022', prebuilt: true },
      { id: 'billing.exportBatch', label: 'Export Billing Batch',       internalKey: 'F24+PS023', prebuilt: true },
    ],
  },
  {
    id: '***REMOVED***',
    title: 'System / Admin',
    actions: [
      { id: '***REMOVED***.dashboard',   label: 'View System Dashboard',  internalKey: 'F24+PS024' },
      { id: '***REMOVED***.reports',     label: 'Run System Reports',     internalKey: 'F24+PS025' },
      { id: '***REMOVED***.export',      label: 'Export Data',            internalKey: 'F24+PS026' },
      { id: '***REMOVED***.backups',     label: 'Manage Backups',         internalKey: 'F24+PS027' },
      { id: '***REMOVED***.eventLog',    label: 'View Error / Event Log', internalKey: 'F24+PS028' },
      { id: '***REMOVED***.impersonate', label: 'Impersonate User',       internalKey: 'F24+PS029', description: 'Super ***REMOVED*** only' },
    ],
  },
];

// ─── Flat lookup maps ─────────────────────────────────────────────────────────
export const ACTION_MAP: Record<ActionId, SystemAction> =
  {} as Record<ActionId, SystemAction>;

/** internalKey → action — used by keyboard handler to dispatch */
export const INTERNAL_KEY_MAP: Record<string, SystemAction> = {};

ACTION_GROUPS.forEach(g =>
  g.actions.forEach(a => {
    ACTION_MAP[a.id] = a;
    INTERNAL_KEY_MAP[a.internalKey] = a;
  })
);

// ─── Shortcutable actions only (for KeyboardShortcutsModal) ──────────────────
export const SHORTCUT_GROUPS = ACTION_GROUPS
  .map(g => ({ ...g, actions: g.actions.filter(a => a.shortcutable) }))
  .filter(g => g.actions.length > 0);

// ─── Voice context names — use these constants when calling setCurrentContext ─
export const VOICE_CONTEXT = {
  WORKLIST:      'WORKLIST',
  CASE_VIEW:     'CASE_VIEW',
  REPORTING:     'REPORTING',
  MESSAGES:      'MESSAGES',
  SEARCH:        'SEARCH',
  CONFIGURATION: 'CONFIGURATION',
} as const;

export type VoiceContextName = typeof VOICE_CONTEXT[keyof typeof VOICE_CONTEXT];

// ─── Default role permission sets ────────────────────────────────────────────
export type PermissionSet = Partial<Record<ActionId, boolean>>;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionSet> = {
  Pathologist: {
    'system.openMessages': true, 'system.openWorklist': true,
    'system.goBack': true, 'system.goForward': true,
    'system.saveDraft': true, 'system.signOut': true,
    'nav.nextCase': true, 'nav.previousCase': true,
    'nav.nextTab': true, 'nav.previousTab': true,
    'table.next': true, 'table.previous': true, 'table.pageDown': true, 'table.pageUp': true,
    'table.first': true, 'table.last': true, 'table.select': true,
    'table.selectAll': true, 'table.deselectAll': true, 'table.openSelected': true,
    'table.refresh': true, 'table.search': true, 'table.clearSearch': true,
    'case.viewWorklist': true, 'case.open': true, 'case.editDemographics': true,
    'case.assign': true, 'case.reassign': true, 'case.prioritize': true,
    'case.hold': true, 'case.releaseHold': true, 'case.archive': true,
    'specimen.add': true, 'specimen.edit': true, 'specimen.remove': true,
    'specimen.applyFlag': true, 'specimen.removeFlag': true, 'specimen.assignSubspecialty': true,
    'diagnosis.grossDescription': true, 'diagnosis.microscopicDescription': true,
    'diagnosis.enterDiagnosis': true, 'diagnosis.enterAddendum': true,
    'diagnosis.signOut': true, 'diagnosis.amend': true, 'diagnosis.revokeSignOut': true,
    'report.preview': true, 'report.generate': true, 'report.deliver': true,
    'report.redeliver': true, 'report.viewHistory': true, 'report.download': true,
    'ai.diagnosisSuggest': true, 'ai.grossAssist': true, 'ai.macroSuggest': true,
    'ai.viewConfidence': true, 'ai.override': true,
    'editor.nextField': true, 'editor.previousField': true,
    'editor.nextSection': true, 'editor.previousSection': true,
    'editor.insertMacro': true, 'editor.insertTable': true, 'editor.insertSignature': true,
    'editor.bold': true, 'editor.italic': true, 'editor.underline': true,
    'editor.bullets': true, 'editor.numbering': true,
    'editor.increaseIndent': true, 'editor.decreaseIndent': true,
    'editor.find': true, 'editor.replace': true, 'editor.selectAll': true,
    'editor.showRuler': true, 'editor.toggleFormatting': true,
    'messages.next': true, 'messages.previous': true, 'messages.reply': true,
    'messages.delete': true, 'messages.markRead': true, 'messages.compose': true,
    'messages.send': true, 'messages.close': true,
    'physician.view': true, 'client.view': true,
    'qc.viewQueue': true, 'qc.claimReview': true, 'qc.submitReview': true,
    'qc.escalateDiscordance': true, 'qc.viewDashboard': true,
  },
  Resident: {
    'system.openMessages': true, 'system.openWorklist': true,
    'system.goBack': true, 'system.goForward': true,
    'nav.nextCase': true, 'nav.previousCase': true,
    'nav.nextTab': true, 'nav.previousTab': true,
    'table.next': true, 'table.previous': true, 'table.pageDown': true, 'table.pageUp': true,
    'table.first': true, 'table.last': true, 'table.select': true,
    'table.openSelected': true, 'table.refresh': true, 'table.search': true,
    'case.viewWorklist': true, 'case.open': true, 'case.editDemographics': true,
    'case.prioritize': true, 'case.hold': true, 'case.releaseHold': true,
    'specimen.add': true, 'specimen.edit': true, 'specimen.applyFlag': true,
    'specimen.removeFlag': true, 'specimen.assignSubspecialty': true,
    'diagnosis.grossDescription': true, 'diagnosis.microscopicDescription': true,
    'diagnosis.enterDiagnosis': true, 'diagnosis.enterAddendum': true, 'diagnosis.coSign': true,
    'report.preview': true, 'report.viewHistory': true, 'report.download': true,
    'ai.diagnosisSuggest': true, 'ai.grossAssist': true, 'ai.macroSuggest': true,
    'ai.viewConfidence': true, 'ai.override': true,
    'editor.nextField': true, 'editor.previousField': true,
    'editor.insertMacro': true, 'editor.insertTable': true,
    'editor.bold': true, 'editor.italic': true, 'editor.underline': true,
    'editor.bullets': true, 'editor.numbering': true,
    'editor.find': true, 'editor.replace': true, 'editor.selectAll': true,
    'messages.next': true, 'messages.previous': true, 'messages.reply': true,
    'messages.delete': true, 'messages.markRead': true, 'messages.compose': true,
    'messages.send': true, 'messages.close': true,
    'physician.view': true, 'client.view': true,
    'qc.viewQueue': true, 'qc.viewDashboard': true,
  },
  Admin: {
    'system.openMessages': true, 'system.openWorklist': true,
    'system.goBack': true, 'system.goForward': true,
    'system.openConfiguration': true, 'system.openAudit': true,
    'nav.nextTab': true, 'nav.previousTab': true,
    'table.next': true, 'table.previous': true, 'table.pageDown': true, 'table.pageUp': true,
    'table.select': true, 'table.selectAll': true, 'table.refresh': true, 'table.search': true,
    'case.viewWorklist': true, 'case.assign': true, 'case.reassign': true,
    'case.archive': true, 'case.delete': true,
    'client.view': true, 'client.edit': true,
    'physician.view': true, 'physician.edit': true, 'physician.verify': true,
    'config.access': true, 'config.staff': true, 'config.roles': true,
    'config.subspecialties': true, 'config.specimens': true, 'config.flags': true,
    'config.ai': true, 'config.macros': true, 'config.shortcuts': true,
    'config.lis': true, 'config.auditLog': true,
    'messages.next': true, 'messages.previous': true, 'messages.reply': true,
    'messages.delete': true, 'messages.markRead': true, 'messages.compose': true,
    'messages.send': true, 'messages.close': true,
    'qc.configure': true, 'qc.viewDashboard': true, 'qc.exportReport': true,
    '***REMOVED***.dashboard': true, '***REMOVED***.reports': true, '***REMOVED***.export': true,
    '***REMOVED***.backups': true, '***REMOVED***.eventLog': true,
  },
  Physician: {},
};
