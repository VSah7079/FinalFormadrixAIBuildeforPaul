export interface PSShortcut {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  display?: string;
  meta: boolean;
  key: string;
}

export interface ActionDefinition {
  id: string;                 // internal stable ID
  label: string;              // user-facing name
  category: string;           // Editing, Navigation, AI, etc.
  description?: string;
  voice?: string | null;
  shortcut?: PSShortcut | null;
}

export type ActionRegistry = Record<string, ActionDefinition>;

export const actionRegistry: ActionRegistry = {
  bold: {
    id: "cmd_bold",
    label: "Bold",
    category: "Editing",
    shortcut: null,
  },
  italic: {
    id: "cmd_italic",
    label: "Italic",
    category: "Editing",
    shortcut: null,
  },
  underline: {
    id: "cmd_underline",
    label: "Underline",
    category: "Editing",
    shortcut: null,
  },
  bullets: {
    id: "cmd_bullets",
    label: "Bullet List",
    category: "Editing",
    shortcut: null,
  },
  numbering: {
    id: "cmd_numbering",
    label: "Numbered List",
    category: "Editing",
    shortcut: null,
  },
  increaseIndent: {
    id: "cmd_increase_indent",
    label: "Increase Indent",
    category: "Editing",
    shortcut: null,
  },
  decreaseIndent: {
    id: "cmd_decrease_indent",
    label: "Decrease Indent",
    category: "Editing",
    shortcut: null,
  },
  insertMacro: {
    id: "cmd_insert_macro",
    label: "Insert Macro",
    category: "Reporting",
    shortcut: null,
  },
  insertTable: {
    id: "cmd_insert_table",
    label: "Insert Table",
    category: "Reporting",
    shortcut: null,
  },
  insertSignature: {
    id: "cmd_insert_signature",
    label: "Insert Signature",
    category: "Reporting",
    shortcut: null,
  },
  find: {
    id: "cmd_find",
    label: "Find",
    category: "Navigation",
    shortcut: null,
  },
  replace: {
    id: "cmd_replace",
    label: "Find & Replace",
    category: "Navigation",
    shortcut: null,
  },
  selectAll: {
    id: "cmd_select_all",
    label: "Select All",
    category: "Navigation",
    shortcut: null,
  },
  showRuler: {
    id: "cmd_show_ruler",
    label: "Show Ruler",
    category: "View",
    shortcut: null,
  },
  toggleFormatting: {
    id: "cmd_toggle_formatting",
    label: "Toggle Formatting Marks",
    category: "View",
    shortcut: null,
  },
};
