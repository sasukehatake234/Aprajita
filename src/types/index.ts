/**
 * SURAKSHA KEY - Core Data Types & BLE Architecture
 * Hardware: ESP32 + SIMCom A7670C 4G LTE + u-blox NEO-6M GPS + SOS Button
 */

export type TabType = 'home' | 'contacts' | 'gps' | 'tests' | 'history' | 'settings';

export type DeviceConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';

export type DeviceReadinessState = 'READY' | 'ATTENTION_REQUIRED' | 'DISCONNECTED';

export type GpsSource = 'PHONE_GPS' | 'KEYCHAIN_GPS' | 'NONE';

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  timestamp: string;
  source: GpsSource;
  isStale?: boolean;
}

export type SimCardState = 'READY' | 'ABSENT' | 'CHECKING' | 'UNKNOWN';

export type NetworkRegistrationState =
  | 'REGISTERED_HOME'
  | 'ROAMING'
  | 'SEARCHING'
  | 'DENIED'
  | 'OFFLINE'
  | 'UNKNOWN';

export interface CellularStatus {
  operator: string;
  signalRssi: number; // dBm
  csq: number; // 0-31
  signalBars: number; // 0 to 4
  simStatus: SimCardState;
  registration: NetworkRegistrationState;
  lastChecked: string | null;
}

export interface HardwareTelemetry {
  deviceId: string;
  firmwareVersion: string;
  connectionState: DeviceConnectionState;
  isDemoMode: boolean;
  contactsSyncedCount: number;
  lastSyncTimestamp: string | null;
  cellular: CellularStatus;
  gps: {
    activeSource: GpsSource;
    phoneLat: number | null;
    phoneLng: number | null;
    phoneAccuracy: number | null;
    phoneLastUpdate: string | null;
    neo6mFix: boolean;
    neo6mSatellites: number;
    neo6mLat: number | null;
    neo6mLng: number | null;
    neo6mLastFixTime: string | null;
  };
  physicalButtonLastPressed: string | null;
  lastHeartbeat: string | null;
  lastModemResponse: string | null;
  lastError: string | null;
  batteryLevel?: number; // only if hardware telemetry provides it
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string; // Validated Indian number: +91 XXXXXXXXXX
  isEmergencyRecipient: boolean;
  syncedToKeychain: boolean;
  addedAt: string;
}

export type SmsDeliveryState = 'PENDING' | 'SUBMITTED' | 'DELIVERED' | 'FAILED';

export interface RecipientSmsStatus {
  contactId: string;
  name: string;
  phone: string;
  status: SmsDeliveryState;
  timestamp: string;
  messageRef?: string;
  detailNote?: string;
}

export interface SosAlertEvent {
  id: string;
  timestamp: string;
  isTestEvent: boolean;
  source: 'PHYSICAL_SOS_BUTTON' | 'APP_SOS_BUTTON' | 'SMS_TEST_RUN';
  status: 'ACTIVE' | 'RESOLVED';
  location: GpsLocation | null;
  mapUrl: string;
  recipients: RecipientSmsStatus[];
  lastEsp32Message: string;
  resolvedAt?: string;
  incompleteDueToDisconnect?: boolean;
}

export interface SmsTestRecord {
  id: string;
  timestamp: string;
  recipient: string;
  coords: string;
  status: SmsDeliveryState;
  rawResponse: string;
  messageRef?: string;
  isDemo: boolean;
}

export type DiagnosticStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_TESTED';

export type DiagnosticCheckId =
  | 'ble_link'
  | 'esp32_heartbeat'
  | 'a7670c_at'
  | 'sim_card'
  | 'cellular_reg'
  | 'phone_gps'
  | 'neo6m_gps'
  | 'contact_sync'
  | 'sms_test'
  | 'sos_button';

export interface DiagnosticCheckItem {
  id: DiagnosticCheckId;
  title: string;
  description: string;
  status: DiagnosticStatus;
  detail: string;
  troubleshooting: string;
}

/**
 * Validates Indian standard mobile numbers:
 * Must be 10 digits starting with 6, 7, 8, or 9 (with optional +91 or 0 prefix).
 */
export function validateIndianMobileNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, normalized: '', error: 'Phone number is required.' };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const indianRegex = /^(?:\+91|91|0)?([6789]\d{9})$/;
  const match = cleaned.match(indianRegex);

  if (!match) {
    return {
      valid: false,
      normalized: '',
      error: 'Enter a valid 10-digit Indian mobile number (e.g., +91 98765 43210).',
    };
  }

  const tenDigits = match[1];
  return {
    valid: true,
    normalized: `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`,
  };
}

/**
 * Check if a phone number already exists in contact list (normalized comparison)
 */
export function isDuplicatePhoneNumber(newPhone: string, contacts: TrustedContact[], excludeContactId?: string): boolean {
  const normNew = newPhone.replace(/[\s\-\(\)]/g, '').replace(/^(?:\+91|91|0)/, '');
  return contacts.some((c) => {
    if (excludeContactId && c.id === excludeContactId) return false;
    const normExisting = c.phone.replace(/[\s\-\(\)]/g, '').replace(/^(?:\+91|91|0)/, '');
    return normExisting === normNew;
  });
}

/**
 * Compute the strict Device Readiness State
 * Never display green "Ready" unless all hardware checks pass!
 */
export function computeDeviceReadiness(
  telemetry: HardwareTelemetry,
  contacts: TrustedContact[],
  phoneLocation: GpsLocation | null
): { state: DeviceReadinessState; reasons: string[] } {
  if (telemetry.connectionState !== 'CONNECTED') {
    return {
      state: 'DISCONNECTED',
      reasons: ['Keychain is not connected over Bluetooth Low Energy.'],
    };
  }

  const reasons: string[] = [];

  // Check 1: SIM card
  if (telemetry.cellular.simStatus !== 'READY') {
    reasons.push('SIM card is missing, locked, or not detected by A7670C.');
  }

  // Check 2: Cellular registration
  if (
    telemetry.cellular.registration !== 'REGISTERED_HOME' &&
    telemetry.cellular.registration !== 'ROAMING'
  ) {
    reasons.push('Cellular modem is not registered to a 4G network.');
  }

  // Check 3: Synchronized contacts
  const emergencyCount = contacts.filter((c) => c.isEmergencyRecipient).length;
  if (emergencyCount === 0) {
    reasons.push('No emergency contacts configured on phone.');
  } else if (telemetry.contactsSyncedCount === 0) {
    reasons.push('Contacts not synchronized to ESP32 Flash memory.');
  }

  // Check 4: Location availability
  const hasPhoneGps = phoneLocation && !phoneLocation.isStale;
  const hasNeo6mGps = telemetry.gps.neo6mFix && telemetry.gps.neo6mLat !== null;
  if (!hasPhoneGps && !hasNeo6mGps) {
    reasons.push('Neither Phone GPS nor NEO-6M GPS has a valid location lock.');
  }

  if (reasons.length > 0) {
    return {
      state: 'ATTENTION_REQUIRED',
      reasons,
    };
  }

  return {
    state: 'READY',
    reasons: ['All systems operational. Hardware armed and ready.'],
  };
}
