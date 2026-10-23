/**
 * SURAKSHA KEY - Hardware Communication Layer
 * Real Android BLE Interface & Communication Protocol for ESP32 + SIMCom A7670C 4G
 */

import { HardwareTelemetry, DeviceConnectionState, TrustedContact } from '../types';
import { INITIAL_HARDWARE_STATE } from '../utils/storage';

export const BLE_CONFIG = {
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHAR_SOS_EVENT: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',       // Notify: ESP32 SOS button press
  CHAR_PHONE_GPS: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',        // Write: App sends phone GPS
  CHAR_SYNC_CONTACTS: 'beb5483e-36e1-4688-b7f5-ea07361b26aa',    // Write: Sync contacts to ESP32 Flash
  CHAR_MODEM_STATUS: 'beb5483e-36e1-4688-b7f5-ea07361b26ab',     // Read/Notify: A7670C & NEO-6M status
  CHAR_CMD_SMS: 'beb5483e-36e1-4688-b7f5-ea07361b26ac',          // Write: Command test SMS
  CHAR_SMS_RESPONSE: 'beb5483e-36e1-4688-b7f5-ea07361b26ad',     // Notify: A7670C execution result
  DEVICE_NAME_PREFIX: 'SURAKSHA',
};

type HardwareListener = (telemetry: HardwareTelemetry) => void;
type SosButtonListener = (source: 'PHYSICAL_SOS_BUTTON') => void;
type SmsResultListener = (result: {
  status: 'SUBMITTED' | 'DELIVERED' | 'FAILED';
  response: string;
  messageRef?: string;
}) => void;

class DeviceService {
  private telemetry: HardwareTelemetry;
  private listeners: Set<HardwareListener> = new Set();
  private sosListeners: Set<SosButtonListener> = new Set();
  private smsResultListeners: Set<SmsResultListener> = new Set();

  private bluetoothDevice: any = null;
  private bleServer: any = null;

  // Cached characteristics
  private charGps: any = null;
  private charSyncContacts: any = null;
  private charCmdSms: any = null;
  private charModemStatus: any = null;

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private packetLogs: Array<{ id: string; timestamp: string; type: 'RX' | 'TX' | 'BLE' | 'AT' | 'STATUS'; message: string }> = [];

  constructor() {
    this.telemetry = { ...INITIAL_HARDWARE_STATE };
  }

  public getTelemetry(): HardwareTelemetry {
    return { ...this.telemetry };
  }

  public getPacketLogs() {
    return [...this.packetLogs];
  }

  public subscribe(listener: HardwareListener): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onSosTrigger(listener: SosButtonListener): () => void {
    this.sosListeners.add(listener);
    return () => {
      this.sosListeners.delete(listener);
    };
  }

  public onSmsResult(listener: SmsResultListener): () => void {
    this.smsResultListeners.add(listener);
    return () => {
      this.smsResultListeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getTelemetry();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  public logPacket(type: 'RX' | 'TX' | 'BLE' | 'AT' | 'STATUS', message: string) {
    const entry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
    };
    this.packetLogs = [entry, ...this.packetLogs.slice(0, 99)];
  }

  public isWebBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getBluetoothEnvironmentInfo() {
    const isSupported = this.isWebBluetoothAvailable();
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    return {
      isSupported,
      inIframe,
      standaloneUrl: typeof window !== 'undefined' ? window.location.href : '',
    };
  }

  /**
   * Scan and connect to real physical ESP32
   */
  public async connectBleDevice(scanAll = false): Promise<boolean> {
    if (!this.isWebBluetoothAvailable()) {
      throw new Error(
        'Web Bluetooth is not available on this browser. On Android, open in Chrome with Bluetooth enabled in phone settings.'
      );
    }

    try {
      this.telemetry.connectionState = 'CONNECTING';
      this.telemetry.lastError = null;
      this.notify();
      this.logPacket('BLE', scanAll ? 'Scanning all nearby BLE devices...' : 'Scanning for SURAKSHA-KEY BLE device...');

      const navBluetooth = (navigator as any).bluetooth;
      const requestOptions: any = scanAll
        ? {
            acceptAllDevices: true,
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
          }
        : {
            filters: [
              { namePrefix: BLE_CONFIG.DEVICE_NAME_PREFIX },
              { name: 'SURAKSHA-KEY' },
              { services: [BLE_CONFIG.SERVICE_UUID] },
            ],
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
          };

      const device = await navBluetooth.requestDevice(requestOptions);

      this.bluetoothDevice = device;
      this.telemetry.deviceId = device.name || 'SURAKSHA-KEY';

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect('ESP32 disconnected or moved out of range');
      });

      this.logPacket('BLE', `Connecting to GATT server on ${device.name}...`);
      const server = await device.gatt.connect();
      this.bleServer = server;

      const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);

      // 1. Subscribe to SOS button notifications
      try {
        const sosChar = await service.getCharacteristic(BLE_CONFIG.CHAR_SOS_EVENT);
        await sosChar.startNotifications();
        sosChar.addEventListener('characteristicvaluechanged', (e: any) => {
          this.handleSosNotification(e.target.value);
        });
        this.logPacket('BLE', 'Subscribed to Physical Button Events [CHAR_SOS_EVENT]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on SOS Char: ${err.message}`);
      }

      // 2. Cache GPS Write Characteristic
      try {
        this.charGps = await service.getCharacteristic(BLE_CONFIG.CHAR_PHONE_GPS);
        this.logPacket('BLE', 'Ready to stream Phone GPS to ESP32 [CHAR_PHONE_GPS]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on GPS Char: ${err.message}`);
      }

      // 3. Cache Contacts Sync Characteristic
      try {
        this.charSyncContacts = await service.getCharacteristic(BLE_CONFIG.CHAR_SYNC_CONTACTS);
        this.logPacket('BLE', 'Ready to synchronize contacts into ESP32 flash [CHAR_SYNC_CONTACTS]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on Contacts Sync Char: ${err.message}`);
      }

      // 4. Cache SMS Command Characteristic
      try {
        this.charCmdSms = await service.getCharacteristic(BLE_CONFIG.CHAR_CMD_SMS);
        this.logPacket('BLE', 'Ready to send test SMS commands [CHAR_CMD_SMS]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on SMS Cmd Char: ${err.message}`);
      }

      // 5. Subscribe to SMS Response Characteristic
      try {
        const smsResultChar = await service.getCharacteristic(BLE_CONFIG.CHAR_SMS_RESPONSE);
        await smsResultChar.startNotifications();
        smsResultChar.addEventListener('characteristicvaluechanged', (e: any) => {
          this.handleSmsResultNotification(e.target.value);
        });
        this.logPacket('BLE', 'Subscribed to A7670C SMS Delivery Receipts [CHAR_SMS_RESPONSE]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on SMS Response Char: ${err.message}`);
      }

      // 6. Read Modem & GPS Status
      try {
        this.charModemStatus = await service.getCharacteristic(BLE_CONFIG.CHAR_MODEM_STATUS);
        const val = await this.charModemStatus.readValue();
        this.parseModemStatus(new TextDecoder().decode(val));

        await this.charModemStatus.startNotifications();
        this.charModemStatus.addEventListener('characteristicvaluechanged', (e: any) => {
          this.parseModemStatus(new TextDecoder().decode(e.target.value));
        });
        this.logPacket('BLE', 'Subscribed to Modem & GPS Telemetry [CHAR_MODEM_STATUS]');
      } catch (err: any) {
        this.logPacket('BLE', `Notice on Modem Status Char: ${err.message}`);
      }

      this.telemetry.connectionState = 'CONNECTED';
      this.telemetry.lastHeartbeat = new Date().toISOString();
      this.startHeartbeat();
      this.notify();
      this.logPacket('BLE', `Connected to SURAKSHA KEY (${device.name})`);
      return true;
    } catch (err: any) {
      this.telemetry.connectionState = 'DISCONNECTED';
      let humanMsg = err.message || 'BLE connection failed';
      if (err.name === 'NotFoundError') {
        humanMsg = 'Bluetooth device pairing cancelled or no device was selected.';
      } else if (err.name === 'SecurityError') {
        humanMsg = 'Web Bluetooth is restricted inside this preview frame. Click "Open in Standalone Chrome Tab" to pair directly.';
      } else if (err.name === 'NotSupportedError') {
        humanMsg = 'Web Bluetooth is not supported on this browser. Please open in Google Chrome on an Android phone or PC.';
      }
      this.telemetry.lastError = humanMsg;
      this.notify();
      this.logPacket('BLE', `Connection failed: ${humanMsg}`);
      throw new Error(humanMsg);
    }
  }

  private handleSosNotification(dataView: DataView) {
    const raw = new TextDecoder().decode(dataView);
    this.logPacket('RX', `[HARDWARE SOS EVENT] Payload: ${raw}`);
    this.telemetry.physicalButtonLastPressed = new Date().toISOString();
    this.notify();

    if (raw.includes('SOS_TRIGGERED') || raw.includes('1')) {
      this.sosListeners.forEach((fn) => fn('PHYSICAL_SOS_BUTTON'));
    }
  }

  private handleSmsResultNotification(dataView: DataView) {
    const raw = new TextDecoder().decode(dataView);
    this.logPacket('AT', `[A7670C SMS TELEMETRY] ${raw}`);
    this.telemetry.lastModemResponse = raw;
    this.notify();

    if (raw.startsWith('SMS_PROGRESS:SUBMITTED')) {
      this.smsResultListeners.forEach((fn) =>
        fn({ status: 'SUBMITTED', response: raw })
      );
    } else if (raw.startsWith('SMS_RESULT:DELIVERED') || raw.includes('+CMGS:')) {
      const match = raw.match(/\+CMGS:\s*(\d+)/);
      this.smsResultListeners.forEach((fn) =>
        fn({
          status: 'DELIVERED',
          response: raw,
          messageRef: match ? match[1] : undefined,
        })
      );
    } else if (raw.startsWith('SMS_RESULT:FAILED') || raw.includes('ERROR')) {
      this.smsResultListeners.forEach((fn) =>
        fn({ status: 'FAILED', response: raw })
      );
    }
  }

  /**
   * Parse status string from ESP32:
   * "MODEM:SIM=READY,CSQ=24,REG=HOME,OP=Jio 4G,NEO=3D:8"
   */
  public parseModemStatus(statusStr: string) {
    this.logPacket('STATUS', `ESP32 Telemetry: ${statusStr}`);
    try {
      const parts = statusStr.replace(/^MODEM:/, '').split(',');
      const map: Record<string, string> = {};
      parts.forEach((p) => {
        const [k, v] = p.split('=');
        if (k && v) map[k.trim().toUpperCase()] = v.trim();
      });

      const simVal = (map['SIM'] || 'UNKNOWN').toUpperCase();
      const simStatus = simVal === 'READY' ? 'READY' : simVal === 'ABSENT' ? 'ABSENT' : 'CHECKING';

      const regVal = (map['REG'] || '').toUpperCase();
      const registration =
        regVal === 'HOME' || regVal === '1'
          ? 'REGISTERED_HOME'
          : regVal === 'ROAMING' || regVal === '5'
          ? 'ROAMING'
          : regVal === 'SEARCHING' || regVal === '2'
          ? 'SEARCHING'
          : 'UNKNOWN';

      const csq = parseInt(map['CSQ'] || '0', 10);
      const signalBars = csq >= 20 ? 4 : csq >= 15 ? 3 : csq >= 10 ? 2 : csq > 0 ? 1 : 0;
      const signalRssi = csq === 99 || csq === 0 ? -113 : -113 + csq * 2;

      // Check NEO-6M status reported by ESP32
      const neoVal = map['NEO'] || '';
      const hasNeoFix = neoVal.includes('3D') || neoVal.includes('2D');
      let neoSats = 0;
      if (neoVal.includes(':')) {
        neoSats = parseInt(neoVal.split(':')[1] || '0', 10);
      }

      this.telemetry.cellular = {
        operator: map['OP'] || 'Cellular 4G',
        signalRssi,
        csq,
        signalBars,
        simStatus,
        registration,
        lastChecked: new Date().toISOString(),
      };

      this.telemetry.gps.neo6mFix = hasNeoFix;
      this.telemetry.gps.neo6mSatellites = neoSats;
      if (hasNeoFix) {
        this.telemetry.gps.neo6mLastFixTime = new Date().toISOString();
        if (this.telemetry.gps.activeSource === 'NONE') {
          this.telemetry.gps.activeSource = 'KEYCHAIN_GPS';
        }
      }

      this.notify();
    } catch (e) {
      console.warn('Failed to parse modem status:', e);
    }
  }

  /**
   * Synchronize emergency contacts list to ESP32 Flash memory
   * Formats numbers and transmits over CHAR_SYNC_CONTACTS
   */
  public async syncContactsToEsp32(contacts: TrustedContact[]): Promise<{ success: boolean; count: number }> {
    const recipients = contacts.filter((c) => c.isEmergencyRecipient);
    const cleanPhones = recipients.map((c) => c.phone.replace(/[\s\-\(\)]/g, '')).join(',');
    const payload = `SYNC:${cleanPhones}`;

    this.logPacket('TX', `Synchronizing ${recipients.length} contacts to ESP32 Flash memory: ${cleanPhones}`);

    if (this.telemetry.isDemoMode) {
      await new Promise((r) => setTimeout(r, 400));
      this.telemetry.contactsSyncedCount = recipients.length;
      this.telemetry.lastSyncTimestamp = new Date().toISOString();
      this.notify();
      this.logPacket('STATUS', `[DEMO] ${recipients.length} contacts synchronized to simulated ESP32 Flash`);
      return { success: true, count: recipients.length };
    }

    if (this.telemetry.connectionState !== 'CONNECTED' || !this.charSyncContacts) {
      this.logPacket('STATUS', 'Bluetooth not connected; contacts retained locally on phone');
      return { success: false, count: 0 };
    }

    try {
      const encoder = new TextEncoder();
      await this.charSyncContacts.writeValue(encoder.encode(payload));
      this.telemetry.contactsSyncedCount = recipients.length;
      this.telemetry.lastSyncTimestamp = new Date().toISOString();
      this.notify();
      this.logPacket('BLE', `Successfully synchronized ${recipients.length} contacts to ESP32 NVS memory`);
      return { success: true, count: recipients.length };
    } catch (err: any) {
      this.logPacket('BLE', `Failed to sync contacts over BLE: ${err.message}`);
      return { success: false, count: 0 };
    }
  }

  /**
   * Send fresh Phone GPS coordinates to ESP32 over BLE
   */
  public async sendPhoneGpsToEsp32(lat: number, lng: number, accuracy: number): Promise<boolean> {
    const payload = `GPS:${lat.toFixed(6)},${lng.toFixed(6)},${Math.round(accuracy)}`;
    this.logPacket('TX', `Streaming Phone GPS to ESP32: ${payload}`);

    this.telemetry.gps.phoneLat = lat;
    this.telemetry.gps.phoneLng = lng;
    this.telemetry.gps.phoneAccuracy = accuracy;
    this.telemetry.gps.phoneLastUpdate = new Date().toISOString();
    this.telemetry.gps.activeSource = 'PHONE_GPS';
    this.notify();

    if (this.telemetry.isDemoMode) {
      this.logPacket('STATUS', '[DEMO] Phone coordinates cached in simulated ESP32 RAM');
      return true;
    }

    if (this.telemetry.connectionState !== 'CONNECTED' || !this.charGps) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      await this.charGps.writeValue(encoder.encode(payload));
      this.logPacket('BLE', 'Phone coordinates acknowledged by ESP32');
      return true;
    } catch (err: any) {
      this.logPacket('BLE', `Failed to write Phone GPS: ${err.message}`);
      return false;
    }
  }

  /**
   * Send test SMS command to ESP32
   */
  public async requestTestSms(
    recipientPhone: string,
    messageText: string
  ): Promise<{ success: boolean; response: string; messageRef?: string; error?: string }> {
    const cleanPhone = recipientPhone.replace(/[\s\-\(\)]/g, '');
    const payload = `TEST_SMS:${cleanPhone}|${messageText}`;

    this.logPacket('TX', `Commanding ESP32 -> A7670C Test SMS to ${cleanPhone}`);

    if (this.telemetry.isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
      const demoRef = Math.floor(10 + Math.random() * 90).toString();
      const resp = `+CMGS: ${demoRef} (DEMO MODE: No real SMS charged)`;
      this.logPacket('AT', `[DEMO A7670C] ${resp}`);
      return { success: true, response: resp, messageRef: demoRef };
    }

    if (this.telemetry.connectionState !== 'CONNECTED' || !this.charCmdSms) {
      const errMsg = 'ESP32 is not connected over Bluetooth.';
      this.logPacket('STATUS', errMsg);
      return { success: false, response: 'NO_BLUETOOTH', error: errMsg };
    }

    return new Promise(async (resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.logPacket('AT', 'AT+CMGS command timed out after 14s');
          resolve({
            success: false,
            response: 'ERROR: MODEM_TIMEOUT',
            error: 'No response from SIMCom A7670C modem within 14 seconds.',
          });
        }
      }, 14000);

      const cleanup = this.onSmsResult((res) => {
        if (!resolved && (res.status === 'DELIVERED' || res.status === 'FAILED')) {
          resolved = true;
          clearTimeout(timer);
          cleanup();
          resolve({
            success: res.status === 'DELIVERED',
            response: res.response,
            messageRef: res.messageRef,
            error: res.status === 'FAILED' ? res.response : undefined,
          });
        }
      });

      try {
        const encoder = new TextEncoder();
        await this.charCmdSms.writeValue(encoder.encode(payload));
        this.logPacket('BLE', 'TEST_SMS command packet written to ESP32. Awaiting A7670C response...');
      } catch (err: any) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          cleanup();
          resolve({
            success: false,
            response: 'BLE_WRITE_FAILED',
            error: `Failed to transmit over BLE: ${err.message}`,
          });
        }
      }
    });
  }

  public disconnectDevice() {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }
    this.handleDisconnect('Disconnected by user');
  }

  private handleDisconnect(reason: string) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.charGps = null;
    this.charSyncContacts = null;
    this.charCmdSms = null;
    this.charModemStatus = null;
    this.telemetry.connectionState = 'DISCONNECTED';
    this.notify();
    this.logPacket('BLE', `Device disconnected: ${reason}`);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.telemetry.connectionState === 'CONNECTED') {
        this.telemetry.lastHeartbeat = new Date().toISOString();
        this.notify();
      }
    }, 15000);
  }

  // --- DEMO MODE TOGGLE (Sample data, no real SMS) ---
  public toggleDemoMode(enable?: boolean) {
    const nextState = enable !== undefined ? enable : !this.telemetry.isDemoMode;
    this.telemetry.isDemoMode = nextState;
    if (nextState) {
      this.telemetry.connectionState = 'CONNECTED';
      this.telemetry.deviceId = 'DEMO-SURAKSHA-KEY';
      this.telemetry.lastHeartbeat = new Date().toISOString();
      this.telemetry.cellular = {
        operator: 'Airtel 4G (Demo)',
        signalRssi: -72,
        csq: 21,
        signalBars: 3,
        simStatus: 'READY',
        registration: 'REGISTERED_HOME',
        lastChecked: new Date().toISOString(),
      };
      this.telemetry.gps.neo6mFix = true;
      this.telemetry.gps.neo6mSatellites = 7;
      this.telemetry.gps.neo6mLat = 28.5355;
      this.telemetry.gps.neo6mLng = 77.391;
      this.telemetry.gps.neo6mLastFixTime = new Date().toISOString();
      this.logPacket('STATUS', '=== DEMO MODE ENABLED (Sample Data Only) ===');
    } else {
      this.telemetry.connectionState = 'DISCONNECTED';
      this.telemetry.deviceId = 'SURAKSHA-KEY';
      this.logPacket('STATUS', 'Demo mode disabled. Returned to Real Hardware Mode.');
    }
    this.notify();
  }

  public simulateDemoPhysicalButton() {
    this.logPacket('RX', '[DEMO] Physical SOS push button pressed on simulated keychain!');
    this.telemetry.physicalButtonLastPressed = new Date().toISOString();
    this.notify();
    this.sosListeners.forEach((fn) => fn('PHYSICAL_SOS_BUTTON'));
  }
}

export const deviceService = new DeviceService();
