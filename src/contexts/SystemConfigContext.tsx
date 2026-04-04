/**
 * SystemConfigContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * React context, provider, and hook for PathScribe system-level configuration.
 *
 * Architecture role:
 *   This is the runtime layer that sits on top of the pure types in
 *   types/systemConfig.ts. It handles:
 *     - Loading config from localStorage on mount
 *     - Providing config values to any component in the tree
 *     - Persisting changes back to localStorage on every update
 *     - Merging saved config with DEFAULT_SYSTEM_CONFIG so that newly added
 *       fields always have a valid value even if the user's saved config
 *       pre-dates the field being added
 *
 * Usage:
 *   1. Wrap your app (or at minimum the router) with <SystemConfigProvider>
 *      in main.tsx / App.tsx — alongside AuthProvider.
 *
 *   2. In any component that needs config values:
 *        import { useSystemConfig } from '../contexts/SystemConfigContext';
 *        const { config, updateConfig } = useSystemConfig();
 *
 *   3. To read a value:
 *        const { lisIntegrationEnabled } = config;
 *
 *   4. To update a value (e.g. from a toggle in LISSection):
 *        updateConfig({ lisIntegrationEnabled: true });
 *      updateConfig does a shallow merge — pass only the fields you want to change.
 *
 * Persistence:
 *   Config is stored in localStorage under the key defined by LS_KEY.
 *   Bump LS_VERSION if the SystemConfig shape changes in a breaking way —
 *   this discards old saved config and falls back to defaults cleanly.
 *
 * Related files:
 *   types/systemConfig.ts               ← shape + defaults (no React)
 *   components/Config/System/LISSection.tsx  ← primary UI for editing config
 *   pages/SynopticReportPage.tsx         ← consumer (reads LIS flags)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

import {
  SystemConfig,
  DEFAULT_SYSTEM_CONFIG,
} from '../types/systemConfig';

// NEW — typed enterprise + hospital config
import { EnterpriseConfig } from '@app-types/config/EnterpriseConfig';
import { HospitalConfig } from '@app-types/config/HospitalConfig';

// ─── Persistence helpers ──────────────────────────────────────────────────────

const LS_VERSION = 'v1';
const LS_KEY     = `pathscribe_system_config_${LS_VERSION}`;

const loadConfig = (): SystemConfig => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const merged: SystemConfig = raw
      ? { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(raw) as Partial<SystemConfig> }
      : { ...DEFAULT_SYSTEM_CONFIG };

    // Hard env override — VITE_VOICE_ENABLED=false disables voice entirely
    const envVoice = (import.meta as any).env?.VITE_VOICE_ENABLED;
    if (envVoice === 'false') merged.voiceEnabled = false;

    return merged;
  } catch {
    // Corrupted storage — fall back to defaults silently
  }
  return { ...DEFAULT_SYSTEM_CONFIG };
};

const saveConfig = (config: SystemConfig): void => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable — fail silently
  }
};

// ─── Context shape ────────────────────────────────────────────────────────────

interface SystemConfigContextValue {
  /** The current system configuration. Read-only from consumers. */
  config: SystemConfig;

  /**
   * Shallow-merge update. Pass only the fields you want to change.
   * Changes are immediately reflected in the context and persisted to
   * localStorage.
   */
  updateConfig: (patch: Partial<SystemConfig>) => void;

  /** Reset all config values back to DEFAULT_SYSTEM_CONFIG. */
  resetConfig: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SystemConfigContext = createContext<SystemConfigContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  // NEW — typed enterprise + hospital config state
  // These do NOT replace your SystemConfig. They are inputs used elsewhere.


  // Existing combined system config
  const [config, setConfig] = useState<SystemConfig>(loadConfig);

  // Persist to localStorage whenever config changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<SystemConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({ ...DEFAULT_SYSTEM_CONFIG });
  }, []);

  return (
    <SystemConfigContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useSystemConfig = (): SystemConfigContextValue => {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    throw new Error(
      'useSystemConfig must be used within a <SystemConfigProvider>. ' +
      'Add <SystemConfigProvider> to your app root in main.tsx or App.tsx.'
    );
  }
  return ctx;
};