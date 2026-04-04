import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { Message, MessageThread, IMessageService } from './IMessageService';
import { mockAuditService } from '../auditLog/mockAuditService';

// ─── Audit Helper ─────────────────────────────────────────────────────────────

const audit = (
  event: string,
  detail: string,
  user: string,
  caseId: string | null = null
) => mockAuditService.logEvent({ type: 'user', event, detail, user, caseId, confidence: null });

// ─── Seed Data ────────────────────────────────────────────────────────────────
// All seeded messages are addressed to Dr. Sarah Johnson (userId: 'u1')

const SEED_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderId: 'u2',
    senderName: 'Lab Manager',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Urgent: Morphology Review',
    body: 'Please review the secondary morphology for this case immediately.',
    caseNumber: '24-8821',
    timestamp: new Date(),
    isUrgent: true,
    isRead: false,
    isDeleted: false,
    thread: [
      { sender: 'Lab Manager',       senderId: 'u2', text: 'Please review the secondary morphology for this case immediately.',  timestamp: new Date(Date.now() - 1000 * 60 * 20) },
      { sender: 'Dr. Sarah Johnson', senderId: 'u1', text: 'Checking now. Is this for Case 24-8821?',                            timestamp: new Date(Date.now() - 1000 * 60 * 10) },
      { sender: 'Lab Manager',       senderId: 'u2', text: 'Correct. Block A-4 specifically.',                                   timestamp: new Date(Date.now() - 1000 * 60 * 5)  },
    ],
  },
  {
    id: 'm2',
    senderId: 'u3',
    senderName: 'System Admin',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Version 2.4.2 Update',
    body: 'The new CAP protocols have been successfully synchronized.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isUrgent: false,
    isRead: false,
    isDeleted: false,
    thread: [
      { sender: 'System Admin', senderId: 'u3', text: 'The new CAP protocols have been successfully synchronized.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    ],
  },
  {
    id: 'm3',
    senderId: 'u4',
    senderName: 'Dr. Sarah Chen',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Frozen Section Follow-up',
    body: 'The permanent sections for the margin check are now available for review.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'Dr. Sarah Chen', senderId: 'u4', text: 'The permanent sections for the margin check are now available for review.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
    ],
  },
  {
    id: 'm4',
    senderId: 'u5',
    senderName: 'Dr. Aristhone',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Consultation Request',
    body: 'I have shared a complex lung biopsy case for your review.',
    caseNumber: '24-7710',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'Dr. Aristhone', senderId: 'u5', text: 'I have shared a complex lung biopsy case for your review.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6) },
    ],
  },
  {
    id: 'm5',
    senderId: 'u6',
    senderName: 'IT Support',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Workstation Maintenance',
    body: 'Your primary workstation is scheduled for a security patch update.',
    timestamp: new Date('2026-02-15T09:00:00'),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'IT Support', senderId: 'u6', text: 'Your primary workstation is scheduled for a security patch update.', timestamp: new Date('2026-02-15T09:00:00') },
    ],
  },
  {
    id: 'm6',
    senderId: 'u7',
    senderName: 'Billing Dept',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Coding Query',
    body: 'Please clarify the CPT codes for the skin excision case.',
    timestamp: new Date('2026-02-14T14:30:00'),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'Billing Dept', senderId: 'u7', text: 'Please clarify the CPT codes for the skin excision case.', timestamp: new Date('2026-02-14T14:30:00') },
    ],
  },
  {
    id: 'm7',
    senderId: 'u8',
    senderName: 'Dr. Miller',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Frozen Section',
    body: 'Great job on the quick turnaround this morning.',
    timestamp: new Date('2026-02-14T11:00:00'),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'Dr. Miller', senderId: 'u8', text: 'Great job on the quick turnaround this morning.', timestamp: new Date('2026-02-14T11:00:00') },
    ],
  },
  {
    id: 'm8',
    senderId: 'u9',
    senderName: 'Archives',
    recipientId: 'u1',
    recipientName: 'Dr. Sarah Johnson',
    subject: 'Slide Retrieval',
    body: 'The historical slides for patient Case-8829 have been pulled.',
    timestamp: new Date('2026-02-13T10:00:00'),
    isUrgent: false,
    isRead: true,
    isDeleted: false,
    thread: [
      { sender: 'Archives', senderId: 'u9', text: 'The historical slides for patient Case-8829 have been pulled.', timestamp: new Date('2026-02-13T10:00:00') },
    ],
  },
  { id: 'm9',  senderId: 'u10', senderName: 'QA Team',         recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Audit Review',    body: 'Stats ready.',             timestamp: new Date('2026-02-12'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'QA Team',         senderId: 'u10', text: 'Stats ready.',             timestamp: new Date('2026-02-12') }] },
  { id: 'm10', senderId: 'u11', senderName: 'Dr. Patel',        recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'GI Consult',      body: 'Unusual case.',            timestamp: new Date('2026-02-11'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Dr. Patel',        senderId: 'u11', text: 'Unusual case.',            timestamp: new Date('2026-02-11') }] },
  { id: 'm11', senderId: 'u12', senderName: 'Transcription',    recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Draft Ready',     body: 'Case 24-110.',             timestamp: new Date('2026-02-10'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Transcription',    senderId: 'u12', text: 'Case 24-110.',             timestamp: new Date('2026-02-10') }] },
  { id: 'm12', senderId: 'u13', senderName: 'Medical Records',  recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Patient History', body: 'Prior pathology.',         timestamp: new Date('2026-02-09'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Medical Records',  senderId: 'u13', text: 'Prior pathology.',         timestamp: new Date('2026-02-09') }] },
  { id: 'm13', senderId: 'u14', senderName: 'Dr. Wilson',       recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Tumor Board',     body: 'Agenda attached.',         timestamp: new Date('2026-02-08'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Dr. Wilson',       senderId: 'u14', text: 'Agenda attached.',         timestamp: new Date('2026-02-08') }] },
  { id: 'm14', senderId: 'u15', senderName: 'Compliance',       recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Training Due',    body: 'Annual update.',           timestamp: new Date('2026-02-07'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Compliance',       senderId: 'u15', text: 'Annual update.',           timestamp: new Date('2026-02-07') }] },
  { id: 'm15', senderId: 'u16', senderName: 'Supply Room',      recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Reagents',        body: 'Order confirmed.',         timestamp: new Date('2026-02-06'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Supply Room',      senderId: 'u16', text: 'Order confirmed.',         timestamp: new Date('2026-02-06') }] },
  { id: 'm16', senderId: 'u17', senderName: 'Dr. Lee',          recipientId: 'u1', recipientName: 'Dr. Sarah Johnson', subject: 'Dermpath Query',  body: 'Need second opinion.',     timestamp: new Date('2026-02-05'), isUrgent: false, isRead: true, isDeleted: false, thread: [{ sender: 'Dr. Lee',          senderId: 'u17', text: 'Need second opinion.',     timestamp: new Date('2026-02-05') }] },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pathscribe_messages';
const load = () => storageGet<Message[]>(STORAGE_KEY, SEED_MESSAGES);
const persist = (data: Message[]) => storageSet(STORAGE_KEY, data);
let MOCK_MESSAGES: Message[] = load();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockMessageService: IMessageService = {

  async getInbox(userId: ID) {
    await delay();
    const inbox = MOCK_MESSAGES.filter(
      m => m.recipientId === userId || m.senderId === userId
    );
    return ok([...inbox]);
  },

  async getById(id: ID) {
    await delay();
    const m = MOCK_MESSAGES.find(m => m.id === id);
    return m ? ok({ ...m }) : err(`Message ${id} not found`);
  },

  async send(message) {
    await delay();
    const newMsg: Message = {
      ...message,
      id: 'm' + Date.now(),
      isRead: false,
      isDeleted: false,
      thread: [{
        sender: message.senderName,
        senderId: message.senderId,
        text: message.body,
        timestamp: message.timestamp,
      }],
    };
    MOCK_MESSAGES = [...MOCK_MESSAGES, newMsg];
    persist(MOCK_MESSAGES);
    await audit(
      'MESSAGE_SENT',
      `Message sent to ${message.recipientName} — Subject: "${message.subject}"${message.caseNumber ? ` — Case: ${message.caseNumber}` : ''}${message.isUrgent ? ' [URGENT]' : ''}`,
      message.senderName,
      message.caseNumber ?? null
    );
    return ok({ ...newMsg });
  },

  async reply(messageId: ID, senderId: ID, senderName: string, text: string) {
    await delay();
    const idx = MOCK_MESSAGES.findIndex(m => m.id === messageId);
    if (idx === -1) return err(`Message ${messageId} not found`);
    const newThread: MessageThread = { sender: senderName, senderId, text, timestamp: new Date() };
    MOCK_MESSAGES = MOCK_MESSAGES.map(m =>
      m.id === messageId
        ? { ...m, body: text, thread: [...(m.thread || []), newThread] }
        : m
    );
    persist(MOCK_MESSAGES);
    const msg = MOCK_MESSAGES[idx];
    await audit(
      'MESSAGE_REPLIED',
      `Reply sent to ${msg.senderName} — Subject: "${msg.subject}"${msg.caseNumber ? ` — Case: ${msg.caseNumber}` : ''}`,
      senderName,
      msg.caseNumber ?? null
    );
    return ok({ ...MOCK_MESSAGES[idx] });
  },

  async markRead(id: ID) {
    await delay();
    const idx = MOCK_MESSAGES.findIndex(m => m.id === id);
    if (idx === -1) return err(`Message ${id} not found`);
    MOCK_MESSAGES = MOCK_MESSAGES.map(m => m.id === id ? { ...m, isRead: true } : m);
    persist(MOCK_MESSAGES);
    return ok({ ...MOCK_MESSAGES[idx], isRead: true });
  },

  async markAllRead(userId: ID) {
    await delay();
    MOCK_MESSAGES = MOCK_MESSAGES.map(m =>
      m.recipientId === userId ? { ...m, isRead: true } : m
    );
    persist(MOCK_MESSAGES);
    return ok(undefined);
  },

  async softDelete(id: ID) {
    await delay();
    const idx = MOCK_MESSAGES.findIndex(m => m.id === id);
    if (idx === -1) return err(`Message ${id} not found`);
    const target = MOCK_MESSAGES[idx];
    MOCK_MESSAGES = MOCK_MESSAGES.map(m => m.id === id ? { ...m, isDeleted: true } : m);
    persist(MOCK_MESSAGES);
    await audit(
      'MESSAGE_DELETED',
      `Message moved to Recently Deleted — Subject: "${target.subject}" from ${target.senderName}${target.caseNumber ? ` — Case: ${target.caseNumber}` : ''}`,
      target.recipientName,
      target.caseNumber ?? null
    );
    return ok({ ...MOCK_MESSAGES[idx], isDeleted: true });
  },

  async restore(id: ID) {
    await delay();
    const idx = MOCK_MESSAGES.findIndex(m => m.id === id);
    if (idx === -1) return err(`Message ${id} not found`);
    const target = MOCK_MESSAGES[idx];
    MOCK_MESSAGES = MOCK_MESSAGES.map(m => m.id === id ? { ...m, isDeleted: false } : m);
    persist(MOCK_MESSAGES);
    await audit(
      'MESSAGE_RESTORED',
      `Message restored from Recently Deleted — Subject: "${target.subject}" from ${target.senderName}${target.caseNumber ? ` — Case: ${target.caseNumber}` : ''}`,
      target.recipientName,
      target.caseNumber ?? null
    );
    return ok({ ...MOCK_MESSAGES[idx], isDeleted: false });
  },

  async permanentDelete(id: ID) {
    await delay();
    const target = MOCK_MESSAGES.find(m => m.id === id);
    MOCK_MESSAGES = MOCK_MESSAGES.filter(m => m.id !== id);
    persist(MOCK_MESSAGES);
    if (target) {
      await audit(
        'MESSAGE_PERMANENTLY_DELETED',
        `Message permanently deleted — Subject: "${target.subject}" from ${target.senderName}${target.caseNumber ? ` — Case: ${target.caseNumber}` : ''}`,
        target.recipientName,
        target.caseNumber ?? null
      );
    }
    return ok(undefined);
  },

  async emptyDeleted(userId: ID) {
    await delay();
    const toDelete = MOCK_MESSAGES.filter(
      m => m.isDeleted && (m.recipientId === userId || m.senderId === userId)
    );
    MOCK_MESSAGES = MOCK_MESSAGES.filter(
      m => !(m.isDeleted && (m.recipientId === userId || m.senderId === userId))
    );
    persist(MOCK_MESSAGES);
    const actor = toDelete[0]?.recipientName ?? userId;
    await audit(
      'INBOX_EMPTIED',
      `Recently Deleted emptied — ${toDelete.length} message(s) permanently removed`,
      actor,
      null
    );
    return ok(undefined);
  },
};
