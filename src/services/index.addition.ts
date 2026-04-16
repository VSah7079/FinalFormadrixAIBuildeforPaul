// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS to src/services/index.ts
//
// To swap to Firestore, change one line:
//   import { firestoreAuditService } from './auditLog/firestoreAuditService';
//   export const auditService = firestoreAuditService;
// ─────────────────────────────────────────────────────────────────────────────

import { mockAuditService }     from './auditLog/mockAuditService';
// import { firestoreAuditService } from './auditLog/firestoreAuditService';

export const auditService = mockAuditService;
// export const auditService = firestoreAuditService;
