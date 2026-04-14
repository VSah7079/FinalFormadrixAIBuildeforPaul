# PathScribe AI — API Contract

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Draft — working document for simultaneous frontend/backend development  
**Owner:** ForMedrix Engineering  
**API Docs:** Swagger UI served at `/api/docs` (both dev and staging)

---

## Overview

This document defines the API contract between the PathScribe AI frontend and the PathScribe backend service. The frontend mocks against these interfaces during development. The backend implements them. Both teams work independently against this shared contract.

| Environment | Base URL |
|---|---|
| Development | `http://localhost:3001/v1` |
| Staging | `https://staging-api.pathscribe.ai/v1` |
| Production | `https://api.pathscribe.ai/v1` |

**Auth:** Bearer JWT token in `Authorization` header  
**Content-Type:** `application/json`

---

## 1. Authentication

### POST /auth/login
Authenticate a user and return a JWT token.

**Request:**
```json
{
  "email": "demo@pathscribe.ai",
  "password": "string"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "expiresAt": "2026-04-10T08:00:00Z",
  "user": {
    "id": "u1",
    "name": "Dr. Sarah Johnson",
    "email": "demo@pathscribe.ai",
    "role": "pathologist",
    "initials": "SJ",
    "voiceProfile": "EN-US",
    "locale": "en-GB"
  }
}
```

**Response 401:** `{ "error": "Invalid credentials" }`

---

### POST /auth/logout
Invalidate the current session token.

**Response 200:** `{ "success": true }`

---

### GET /auth/me
Return the current authenticated user profile.

**Response 200:** Same as login user object.

---

### PATCH /auth/me
Update the current user's profile preferences.

**Request:**
```json
{
  "locale": "en-GB",
  "voiceProfile": "EN-GB",
  "theme": "dark"
}
```

**Response 200:** Updated user object.

---

## 2. Cases

### POST /cases/receive
Receive a new case from the LIS via HL7 ORM^O01 message translation.
Called by the HL7 integration layer when a case is accessioned in the LIS.

**Request:**
```json
{
  "accessionNumber": "S26-4401-BX-001",
  "receivedDate": "2026-04-09T08:30:00Z",
  "patient": {
    "lastName": "Thompson",
    "firstName": "Grace",
    "dateOfBirth": "1974-03-14",
    "sex": "F",
    "mrn": "100001"
  },
  "specimens": [
    {
      "label": "A",
      "description": "Left breast mastectomy",
      "procedure": "Mastectomy"
    }
  ],
  "orderingPhysician": "Dr. Sarah Chen",
  "clinicalHistory": "Known BRCA1 mutation. Prophylactic mastectomy.",
  "priority": "Routine",
  "lisSource": "WinPath"
}
```

**Response 201:**
```json
{
  "caseId": "case-uuid",
  "accessionNumber": "S26-4401-BX-001",
  "status": "draft",
  "deepLinkUrl": "https://pathscribe.ai/case/S26-4401-BX-001"
}
```

---

### GET /cases
Get the worklist for the authenticated user.

**Query params:**
- `status` — filter by status (draft, in-progress, pending-review, finalized)
- `priority` — filter by priority (STAT, Urgent, Routine)
- `assignedTo` — filter by pathologist ID
- `page` — page number (default 1)
- `limit` — results per page (default 50)

**Response 200:**
```json
{
  "cases": [ /* Case[] */ ],
  "total": 142,
  "page": 1,
  "limit": 50
}
```

---

### GET /cases/:accessionNumber
Get a single case by accession number.

**Response 200:** Full Case object including specimens, synoptic reports, flags.

**Response 404:** `{ "error": "Case not found" }`

---

### PATCH /cases/:accessionNumber/status
Update the status of a case.

**Request:**
```json
{
  "status": "finalized",
  "pathologistId": "u1",
  "finalizedAt": "2026-04-09T14:22:00Z",
  "synopticData": { /* completed synoptic fields */ }
}
```

**Response 200:** Updated case object.

**Side effects:**
- In Copilot mode: PathScribe sends HL7 ORU^R01 result message to LIS
- In Orchestration mode: PathScribe sends HL7 ORM^O01 status update to LIS
- TAT is calculated and stored: `finalizedAt - receivedDate`
- Audit event `CASE_FINALIZED` is logged

---

## 3. Synoptic Templates

### GET /templates
Get all available synoptic templates for the authenticated user's institution.

**Query params:**
- `standard` — CAP or RCPath
- `organ` — filter by organ system
- `locale` — en-US or en-GB (affects field labels)

**Response 200:**
```json
{
  "templates": [
    {
      "id": "cap-breast-invasive-v4.2",
      "name": "Breast — Invasive Carcinoma",
      "standard": "CAP",
      "version": "4.2.0",
      "organ": "Breast",
      "fields": [ /* TemplateField[] */ ]
    }
  ]
}
```

---

### GET /templates/:id
Get a single template with all fields and value options.

**Response 200:** Full template object.

---

### POST /templates/sync
Trigger a sync of templates from the CAP or RCPath source.
Called on a schedule or manually by an admin.

**Request:**
```json
{
  "standard": "CAP",
  "force": false
}
```

**Response 200:**
```json
{
  "synced": 12,
  "updated": 3,
  "unchanged": 9,
  "syncedAt": "2026-04-09T06:00:00Z"
}
```

---

## 4. Flags

### GET /flags/definitions
Get all flag definitions for the institution.

**Query params:**
- `type` — clinical, qa, admin
- `active` — true/false

**Response 200:**
```json
{
  "flags": [
    {
      "id": "flag-001",
      "code": "STAT",
      "name": "STAT — Rush Processing",
      "description": "Rush processing required",
      "severity": "high",
      "type": "clinical",
      "color": "red",
      "active": true
    }
  ]
}
```

---

### GET /cases/:accessionNumber/flags
Get all flags applied to a case.

**Response 200:**
```json
{
  "caseFlags": [ /* Flag[] */ ],
  "specimenFlags": [ /* SpecimenFlag[] */ ]
}
```

---

### POST /cases/:accessionNumber/flags
Apply a flag to a case or specimen.

**Request:**
```json
{
  "flagId": "flag-001",
  "target": "case",
  "specimenLabel": null,
  "appliedBy": "u1",
  "note": "Optional clinical note"
}
```

**Response 201:** Applied flag object.

---

### DELETE /cases/:accessionNumber/flags/:flagId
Remove a flag from a case.

**Response 200:** `{ "success": true }`

---

## 5. Messaging

### GET /messages
Get the inbox for the authenticated user.

**Response 200:**
```json
{
  "messages": [
    {
      "id": "m1",
      "senderId": "u2",
      "senderName": "Lab Manager",
      "recipientId": "u1",
      "recipientName": "Dr. Sarah Johnson",
      "subject": "Urgent: Morphology Review",
      "body": "Please review case S26-4401 urgently.",
      "caseNumber": "S26-4401-BX-001",
      "timestamp": "2026-04-09T14:12:00Z",
      "isUrgent": true,
      "isRead": false,
      "isDeleted": false,
      "thread": []
    }
  ],
  "unreadCount": 3,
  "hasUrgent": true
}
```

---

### POST /messages
Send a new internal message.

**Request:**
```json
{
  "recipientIds": ["u2", "u3"],
  "subject": "Frozen Section Result",
  "body": "Margins clear. Proceed.",
  "caseNumber": "S26-4401-BX-001",
  "isUrgent": false
}
```

**Response 201:** Created message object.

---

### POST /messages/:id/reply
Reply to an existing message thread.

**Request:**
```json
{
  "text": "Thank you, I will review now."
}
```

**Response 201:** Updated message with new thread entry.

---

### PATCH /messages/:id
Update message state (read, deleted, restored).

**Request:**
```json
{
  "isRead": true,
  "isDeleted": false
}
```

**Response 200:** Updated message object.

---

### DELETE /messages/:id
Permanently delete a message.

**Response 200:** `{ "success": true }`

---

### POST /messages/secure-email
Send a message via secure external email gateway (Paubox/Virtru/Zix).

**Request:**
```json
{
  "recipients": [
    { "name": "Dr. External", "email": "external@hospital.nhs.uk" }
  ],
  "subject": "Pathology Report — S26-4401",
  "body": "Please find the report attached.",
  "caseNumber": "S26-4401-BX-001",
  "isUrgent": false
}
```

**Response 200:**
```json
{
  "success": true,
  "gatewayMessageId": "paubox-msg-uuid",
  "sentAt": "2026-04-09T14:22:00Z"
}
```

---

## 6. Contribution Dashboard

### GET /contribution/summary
Get KPI summary for the authenticated pathologist.

**Query params:**
- `period` — 30d, 90d, ytd (default: 30d)

**Response 200:**
```json
{
  "period": "30d",
  "casesFinalised": 128,
  "casesFinalisedDelta": "+12%",
  "casesInProgress": 14,
  "casesInProgressDelta": "-3",
  "aiAssistedCases": 92,
  "aiAssistedDelta": "+8%",
  "avgTatHours": 27.4,
  "avgTatDelta": "-2.1 hrs",
  "rvuTotal": 387,
  "rvuDelta": "+6.2%",
  "rvuAvgPerCase": 21.8
}
```

---

### GET /contribution/productivity
Get productivity metrics including daily case and RVU breakdown.

**Query params:**
- `period` — 30d, 90d, ytd
- `groupBy` — day, week, month, subspecialty, specimenType

**Response 200:**
```json
{
  "daily": [
    { "date": "2026-04-07", "day": "Mon", "cases": 22, "rvus": 70 }
  ],
  "bySubspecialty": [
    { "subspecialty": "Breast", "cases": 42, "rvus": 145, "pct": 32 }
  ],
  "bySpecimenType": [
    { "type": "Biopsy", "cases": 68, "rvus": 210, "avgTat": 24.1 }
  ],
  "peerComparison": {
    "userRvu": 387,
    "peerMedianRvu": 342,
    "percentile": 72
  }
}
```

---

### GET /contribution/tat
Get turnaround time metrics and outliers.

**Query params:**
- `period` — 30d, 90d, ytd

**Response 200:**
```json
{
  "avgTatHours": 27.4,
  "medianTatHours": 24.0,
  "p90TatHours": 48.2,
  "frozenSectionAvgMinutes": 18.4,
  "frozenSectionBenchmarkMinutes": 20,
  "outliers": [
    {
      "accessionNumber": "S26-4401",
      "caseType": "Soft Tissue Mass",
      "tatDays": 9,
      "benchmarkDays": 5,
      "date": "2026-04-08"
    }
  ],
  "bySpecimenType": [
    { "type": "Biopsy", "avgTatHours": 22.1, "benchmarkHours": 24 }
  ]
}
```

---

### GET /contribution/quality
Get quality metrics including discordances, amendments, and QA flags.

**Query params:**
- `period` — 30d, 90d, ytd

**Response 200:**
```json
{
  "concordanceRate": 94.2,
  "discordantCount": 4,
  "amendedCount": 4,
  "tatOutlierCount": 3,
  "discordantCases": [ /* DiscordantCase[] */ ],
  "amendedCases": [ /* AmendedCase[] */ ],
  "tatOutliers": [ /* TATOutlier[] */ ],
  "qaFlags": [ /* QAFlag[] */ ]
}
```

---

### GET /contribution/casemix
Get case mix distribution.

**Query params:**
- `period` — 30d, 90d, ytd
- `groupBy` — subspecialty, organSystem, caseType

**Response 200:**
```json
{
  "total": 130,
  "distribution": [
    { "label": "Breast", "cases": 42, "pct": 32 },
    { "label": "GI",     "cases": 38, "pct": 29 },
    { "label": "GU",     "cases": 21, "pct": 16 },
    { "label": "Derm",   "cases": 17, "pct": 13 },
    { "label": "Other",  "cases": 12, "pct": 9  }
  ]
}
```

---

### GET /contribution/consults
Get consultation metrics.

**Query params:**
- `period` — 30d, 90d, ytd

**Response 200:**
```json
{
  "totalConsults": 23,
  "avgConsultTatHours": 6.4,
  "byType": [
    { "type": "Frozen Section",  "count": 8,  "avgTatMinutes": 18 },
    { "type": "Second Opinion",  "count": 11, "avgTatHours": 8.2  },
    { "type": "Specialist Referral", "count": 4, "avgTatDays": 2.1 }
  ]
}
```

---

## 7. Audit Log

### GET /audit
Get audit log entries.

**Query params:**
- `userId` — filter by user
- `caseId` — filter by case
- `eventType` — filter by event type
- `from` — ISO datetime
- `to` — ISO datetime
- `page`, `limit`

**Response 200:**
```json
{
  "events": [
    {
      "id": "audit-uuid",
      "eventType": "CASE_FINALIZED",
      "userId": "u1",
      "userName": "Dr. Sarah Johnson",
      "caseId": "S26-4401-BX-001",
      "detail": "Case finalized by Dr. Sarah Johnson",
      "timestamp": "2026-04-09T14:22:00Z"
    }
  ],
  "total": 1842,
  "page": 1,
  "limit": 50
}
```

---

## 8. HL7 Integration

### POST /hl7/inbound
Receive raw HL7 v2.x messages from the LIS.
Handled by the integration layer — not called directly by the frontend.

**Request:** Raw HL7 message (text/plain)  
**Response 200:** `{ "ack": "AA", "messageId": "..." }`

**Supported message types:**
- `ORM^O01` — New order / case accessioned
- `ORM^O01` — Status update (sign-out)
- `ORU^R01` — Result message (IHC, molecular)
- `OML^O21` — Frozen section request
- `ADT^A08` — Patient information update

### POST /hl7/outbound/result
Send a completed synoptic result back to the LIS.
Triggered automatically on case finalisation.

**Generates:** `ORU^R01` result message to LIS endpoint  
**Configured via:** `LIS_ENDPOINT` environment variable

---

## 9. System Configuration

### GET /config/institution
Get institution-wide configuration.

**Response 200:**
```json
{
  "institutionName": "PathScribe Demo",
  "locale": "en-GB",
  "templateStandard": "RCPath",
  "orchestratorEnabled": false,
  "lisType": "WinPath",
  "lisEndpoint": "hl7://lis.institution.nhs.uk:2575",
  "secureEmailGateway": "paubox",
  "features": {
    "voiceEnabled": true,
    "aiEnabled": true,
    "messagingEnabled": true,
    "qaFlagsEnabled": true
  }
}
```

---

### PATCH /config/institution
Update institution configuration. Admin only.

---

### GET /config/templates/check-updates
Check if newer versions of CAP or RCPath templates are available.

**Response 200:**
```json
{
  "updatesAvailable": true,
  "updates": [
    {
      "templateId": "cap-breast-invasive",
      "currentVersion": "4.1.0",
      "availableVersion": "4.2.0",
      "releaseDate": "2026-03-15",
      "changesSummary": "Updated pTNM staging per AJCC 9th edition"
    }
  ],
  "lastChecked": "2026-04-09T06:00:00Z"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": { }
}
```

**Standard HTTP status codes:**
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request — validation error |
| 401 | Unauthenticated |
| 403 | Forbidden — insufficient role |
| 404 | Not found |
| 409 | Conflict — duplicate |
| 422 | Unprocessable entity |
| 500 | Internal server error |

---

## Notes for Backend Team

1. **Swagger UI** — serve the OpenAPI 3.0 spec at `/api/docs` in both dev and staging
2. **Authentication** — JWT with 8-hour expiry, refresh token with 30-day expiry
3. **HIPAA compliance** — all PHI fields must be encrypted at rest (AES-256) and in transit (TLS 1.3)
4. **Audit logging** — every write operation must generate an audit event
5. **HL7 endpoint** — the `/hl7/inbound` endpoint must be on a separate port with IP allowlist (LIS IPs only)
6. **Locale** — all date fields returned as ISO 8601 UTC — the frontend handles locale formatting
7. **Pagination** — all list endpoints must support `page` and `limit` query params
8. **PostgreSQL** — primary database for all clinical data, configuration, audit logs, and templates
9. **TAT calculation** — calculated server-side on case finalisation, stored in `tat_minutes` field
10. **Template sync** — scheduled job to check CAP/RCPath for updates daily at 06:00 UTC

---

## Frontend Mock → Real Service Migration

When the backend is ready, swap these files:

| Mock (current) | Real (replace with) |
|---|---|
| `mockMessageService.ts` | `restMessageService.ts` implementing `IMessageService` |
| `mockActionRegistryService.ts` | `restActionRegistryService.ts` |
| `mockAuditService.ts` | `restAuditService.ts` |
| Seed data in `ContributionDashboardPage.tsx` | `ContributionDashboardService.ts` calling real endpoints |
| `AuthContext.tsx` mock login | `AuthContext.tsx` calling `POST /auth/login` |

All mock services implement the same TypeScript interfaces as the real services — zero component changes required on migration.

---

## 10. Organisation & Site Management

### Data Model

```
Organisation (contracting entity)
  └── Sites[] (physical locations)
        └── Labs[] (pathology departments)
```

PathScribe is deployed per **Organisation**. Cases carry `originSiteId` identifying which physical location sent the specimen. The processing lab may be at a different site (centralised reporting model — common in NHS).

---

### Entities

#### Organisation
```typescript
interface Organisation {
  id:            string;           // e.g. "ORG-MFT"
  name:          string;           // "Manchester University NHS Foundation Trust"
  shortName:     string;           // "MFT"
  type:          OrganisationType; // see below
  country:       'UK' | 'US' | 'AU' | 'CA';
  locale:        string;           // "en-GB"
  timezone:      string;           // "Europe/London"
  contractStart: string;           // ISO date
  contractTier:  'starter' | 'professional' | 'enterprise';
  active:        boolean;
}

type OrganisationType =
  | 'nhs_trust'
  | 'nhs_foundation_trust'
  | 'nhs_integrated_care_board'
  | 'private_hospital'
  | 'health_system'           // US
  | 'independent_lab';
```

#### Site
```typescript
interface Site {
  id:                      string;   // e.g. "SITE-MRI"
  organisationId:          string;   // parent organisation
  name:                    string;   // "Manchester Royal Infirmary"
  shortName:               string;   // "MRI"
  siteCode:                string;   // accession prefix e.g. "MFT"
  address:                 string;
  active:                  boolean;

  // LIS Integration
  lisType:                 'WinPath' | 'Telepath' | 'Epic' | 'CoPath' | 'Beaker' | 'Other';
  lisEndpoint:             string;   // HL7 endpoint
  lisVersion?:             string;

  // PathScribe Configuration
  defaultTemplateStandard: 'CAP' | 'RCPath';
  defaultLocale:           string;
  defaultWorkflowMode:     'copilot' | 'orchestration';
  secureEmailGateway?:     'Paubox' | 'Virtru' | 'Zix';
}
```

#### Lab
```typescript
interface Lab {
  id:               string;          // e.g. "LAB-MFT-CELL"
  siteId:           string;          // parent site
  organisationId:   string;          // parent organisation
  name:             string;          // "Cellular Pathology"
  subspecialties:   string[];        // ["GI", "Breast", "GU", "Neuro"]
  pathologistIds:   string[];        // pathologists assigned to this lab
  poolIds:          string[];        // workgroup pools in this lab
}
```

---

### Case Field Changes

The `Case` type should be updated to carry site-level identifiers:

```typescript
// Current (replace)
originHospitalId:   string;  // → originSiteId
originEnterpriseId: string;  // → originOrganisationId

// Add
processingLabId:    string;  // lab reporting the case (may differ from origin site)
```

---

### API Endpoints

### GET /organisations
List all organisations (admin only).

**Response 200:**
```json
{
  "organisations": [ /* Organisation[] */ ],
  "total": 3
}
```

---

### GET /organisations/:id
Get a single organisation with its sites and labs.

**Response 200:**
```json
{
  "id": "ORG-MFT",
  "name": "Manchester University NHS Foundation Trust",
  "shortName": "MFT",
  "type": "nhs_foundation_trust",
  "country": "UK",
  "locale": "en-GB",
  "timezone": "Europe/London",
  "contractTier": "enterprise",
  "active": true,
  "sites": [
    {
      "id": "SITE-MRI",
      "name": "Manchester Royal Infirmary",
      "shortName": "MRI",
      "siteCode": "MFT",
      "lisType": "WinPath",
      "defaultTemplateStandard": "RCPath",
      "defaultLocale": "en-GB",
      "defaultWorkflowMode": "copilot"
    }
  ],
  "labs": [
    {
      "id": "LAB-MFT-CELL",
      "name": "Cellular Pathology",
      "subspecialties": ["GI", "Breast", "GU", "Uropathology", "Neuropathology"]
    }
  ]
}
```

---

### GET /organisations/:id/sites
List all sites for an organisation.

---

### GET /sites/:id/config
Get the full configuration for a site. Used by PathScribe on login to configure locale, template standard, LIS endpoint, and workflow mode.

**Response 200:** Full `Site` object.

---

### PATCH /sites/:id/config
Update site configuration. Admin only.

**Request:**
```json
{
  "defaultTemplateStandard": "RCPath",
  "defaultLocale": "en-GB",
  "defaultWorkflowMode": "copilot",
  "lisEndpoint": "hl7://lis.mft.nhs.uk:2575"
}
```

---

### GET /organisations/current
Get the organisation for the currently authenticated user. Called on login to configure the PathScribe session.

**Response 200:** Organisation with sites and labs.

**Used to set:**
- UI locale (`en-GB` vs `en-US`)
- Default template standard (CAP vs RCPath)
- LIS endpoint for HL7 outbound
- Accession prefix for case display
- Secure email gateway

---

### Notes for Backend Team

1. **Every case must carry `originSiteId` and `processingLabId`** — these drive billing, audit, and reporting
2. **Site config is loaded on login** — cache aggressively, invalidate on `PATCH /sites/:id/config`
3. **Accession prefix comes from `Site.siteCode`** — the LIS sets this, PathScribe reads it from the HL7 `ORC` segment
4. **Multi-site billing** — RVUs and TAT metrics are aggregated at organisation level but reported at lab level
5. **NHS-specific** — CHI numbers (Scotland) vs NHS numbers (England/Wales) are site-level config
6. **Pathologist pools are lab-scoped** — a pathologist in the GI pool at MRI cannot see the GI pool at Wythenshawe unless explicitly added

