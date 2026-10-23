/**
 * SURAKSHA KEY - Persistent Device Storage Manager
 * Stores user-entered emergency contacts, SOS history, test logs, and device state on phone.
 * Sensitive data stays 100% on-device; never uploaded to external servers.
 * Never stores or displays fake example contacts.
 */

import {
  TrustedContact,
  SosAlertEvent,
  HardwareTelemetry,
  SmsTestRecord,
} from '../types';

const CONTACTS_KEY = 'suraksha_contacts_v4';
const ACTIVE_SOS_KEY = 'suraksha_active_sos_v4';
const SOS_HISTORY_KEY = 'suraksha_history_v4';
const TEST_LOGS_KEY = 'suraksha_test_logs_v4';

export const INITIAL_HARDWARE_STATE: HardwareTelemetry = {
  deviceId: 'SURAKSHA-KEY',
  firmwareVersion: 'v3.0.0-SURAKSHA',
  connectionState: 'DISCONNECTED',
  isDemoMode: false,
  contactsSyncedCount: 0,
  lastSyncTimestamp: null,
  cellular: {
    operator: 'A7670C Standby',
    signalRssi: -99,
    csq: 0,
    signalBars: 0,
    simStatus: 'UNKNOWN',
    registration: 'UNKNOWN',
    lastChecked: null,
  },
  gps: {
    activeSource: 'NONE',
    phoneLat: null,
    phoneLng: null,
    phoneAccuracy: null,
    phoneLastUpdate: null,
    neo6mFix: false,
    neo6mSatellites: 0,
    neo6mLat: null,
    neo6mLng: null,
    neo6mLastFixTime: null,
  },
  physicalButtonLastPressed: null,
  lastHeartbeat: null,
  lastModemResponse: null,
  lastError: null,
};

// ---------------- CONTACTS ----------------
export function loadContacts(): TrustedContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveContacts(contacts: TrustedContact[]): void {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error('Failed to save contacts:', err);
  }
}

// ---------------- ACTIVE SOS ----------------
export function loadActiveSos(): SosAlertEvent | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SOS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveSos(sos: SosAlertEvent | null): void {
  try {
    if (sos) {
      localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(sos));
    } else {
      localStorage.removeItem(ACTIVE_SOS_KEY);
    }
  } catch (err) {
    console.error('Failed to save active SOS event:', err);
  }
}

// ---------------- SOS HISTORY ----------------
export function loadSosHistory(): SosAlertEvent[] {
  try {
    const raw = localStorage.getItem(SOS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSosHistory(history: SosAlertEvent[]): void {
  try {
    localStorage.setItem(SOS_HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save SOS history:', err);
  }
}

export function addSosHistoryRecord(event: SosAlertEvent): void {
  try {
    const current = loadSosHistory();
    // Prepend and cap at 100 entries
    const updated = [event, ...current.filter((e) => e.id !== event.id)].slice(0, 100);
    saveSosHistory(updated);
  } catch (err) {
    console.error('Failed to append SOS history record:', err);
  }
}

export function clearSosHistory(): void {
  try {
    localStorage.removeItem(SOS_HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear SOS history:', err);
  }
}

// ---------------- TEST LOGS ----------------
export function loadTestLogs(): SmsTestRecord[] {
  try {
    const raw = localStorage.getItem(TEST_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTestLogs(logs: SmsTestRecord[]): void {
  try {
    localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save test logs:', err);
  }
}

export const loadSmsTestRecords = loadTestLogs;
export const saveSmsTestRecords = saveTestLogs;
