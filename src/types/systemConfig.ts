/**
 * systemConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions for the PathScribe system-level configuration.
 *
 * Architecture role:
 *   This file is the single source of truth for the *shape* of system config.
 *   It is intentionally kept free of any React, context, or persistence logic —
 *   those live in SystemConfigContext.tsx. Components import only what they need
 *   (the interface and defaults) without pulling in React overhead.
 *
 * Consumed by:
 *   - contexts/SystemConfigContext.tsx        (provider + hook)
 *   - components/Config/System/LISSection.tsx (renders + edits LIS settings)
 *   - components/Config/System/FontsSection.tsx (renders + edits approved fonts)
 *   - pages/SynopticReportPage.tsx            (reads lisIntegrationEnabled, allowPathScribePostFinalActions)
 *   - components/Editor/PathScribeEditor.tsx  (reads approvedFonts for toolbar font picker)
 *   - any future page that needs to branch on system-level settings
 *
 * To add a new setting:
 *   1. Add the field here with a JSDoc comment explaining its effect.
 *   2. Add its default value to DEFAULT_SYSTEM_CONFIG below.
 *   3. Add a UI control in the relevant Config/System section component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SystemConfig {
  // ── LIS Integration ────────────────────────────────────────────────────────

  /**
   * Whether a Laboratory Information System is connected to PathScribe.
   * When true, PathScribe operates in LIS-integrated mode:
   *   - Case statuses are authoritative in the LIS
   *   - PathScribe sends status updates to the LIS at key workflow events
   *     (synoptic finalized, case signed out, addendum signed out, amendment finalized)
   *   - The "Allow PathScribe to initiate post-final actions" setting becomes relevant
   */
  lisIntegrationEnabled: boolean;

  /**
   * Display name or URL of the connected LIS endpoint.
   * Used for display in the LIS Integration config section.
   * e.g. "CoPath Plus — https://lis.hospital.org/api"
   */
  lisEndpoint: string;

  /**
   * When true and lisIntegrationEnabled is true, the LIS is treated as the
   * owner of all major case statuses (Received, In Progress, Signed Out,
   * Amended, etc.). PathScribe will not independently set these statuses —
   * it will only send notifications and await LIS confirmation where applicable.
   */
  lisOwnsStatuses: boolean;

  /**
   * Controls whether pathologists can initiate Addendum or Amendment workflows
   * directly within PathScribe after a case is signed out.
   *
   * When lisIntegrationEnabled = false:
   *   - This setting has no effect; PathScribe always owns the full workflow.
   *
   * When lisIntegrationEnabled = true:
   *   - true  → Addendum/Amendment can be initiated in PathScribe; PathScribe
   *             notifies the LIS of the action so statuses stay in sync.
   *   - false → Addendum/Amendment buttons are hidden in PathScribe; pathologists
   *             are directed to initiate these actions in the LIS instead.
   */
  allowPathScribePostFinalActions: boolean;

  // ── Editor Fonts ───────────────────────────────────────────────────────────

  /**
   * List of font family names currently enabled for use in the PathScribeEditor.
   * Only fonts in this array will appear in the editor toolbar font picker.
   * The full available pool is defined in FontsSection.tsx (AVAILABLE_FONTS).
   * Admins toggle individual fonts on/off in Configuration → System → Approved Fonts.
   */
  approvedFonts: string[];

  // ── Future settings (add here as the product grows) ────────────────────────
  // e.g. auditRetentionDays, defaultProtocolId, etc.
}

/**
 * DEFAULT_SYSTEM_CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 * Baseline values used when no persisted config exists (first run) or when
 * a new field is added that isn't yet present in a user's saved config.
 *
 * Defaults are intentionally conservative:
 *   - LIS integration off  → PathScribe works standalone out of the box
 *   - Post-final actions allowed → pathologist has full capability by default
 *   - Core clinical fonts approved → Arial, Times New Roman, Courier New enabled
 */
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  lisIntegrationEnabled:           false,
  lisEndpoint:                     '',
  lisOwnsStatuses:                 true,
  allowPathScribePostFinalActions: true,
  approvedFonts:                   ['Arial', 'Times New Roman', 'Courier New'],
};
