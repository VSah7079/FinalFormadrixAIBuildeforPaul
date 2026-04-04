import React from "react";
import '../../../pathscribe.css';
import { ActionDefinition, PSShortcut } from "../../../actions/actionRegistry";

interface ShortcutRowProps {
  action: ActionDefinition;
  onChange: (actionId: string) => void;
}

export const ShortcutRow: React.FC<ShortcutRowProps> = ({ action, onChange }) => {
  const renderShortcut = () => {
    if (!action.shortcut) return "None";

    if (typeof action.shortcut === "string") {
      return action.shortcut;
    }

    const ps = action.shortcut as PSShortcut;
    return ps.display ?? "None";
  };

  return (
    <div className="shortcut-row">
      <div className="shortcut-label">{action.label}</div>

      <div className="shortcut-display">
        {renderShortcut()}
      </div>

      <button
        className="shortcut-change-btn"
        onClick={() => onChange(action.id)}
      >
        Change
      </button>
    </div>
  );
};
