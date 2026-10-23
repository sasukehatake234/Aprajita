/**
 * SURAKSHA KEY - Emergency & GPS Service
 * Manages Phone GPS fetching, NEO-6M fallback, Active SOS workflow, and A7670C dispatch
 */

import { GpsLocation, SosAlertEvent, RecipientSmsStatus, TrustedContact } from '../types';
import { loadContacts, loadActiveSos, saveActiveSos } from '../utils/storage';
import { deviceService } from './deviceService';

type ActiveSosListener = (event: SosAlertEvent | null) => void;

class EmergencyService {
  private activeEvent: SosAlertEvent | null = null;
  private listeners: Set<ActiveSosListener> = new Set();
  private lastPhoneLocation: GpsLocation | null = null;

  constructor() {
    this.activeEvent = loadActiveSos();

    // Listen for physical SOS button notification forwarded by ESP32 over BLE
    deviceService.onSosTrigger((source) => {
      this.handlePhysicalSosTrigger(source);
    });
  }

  public getActiveEvent(): SosAlertEvent | null {
    return this.activeEvent;
  }

  public getLastPhoneLocation(): GpsLocation | null {
    return this.lastPhoneLocation;
  }

  public subscribe(listener: ActiveSosListener): () => void {
    this.listeners.add(listener);
    listener(this.activeEvent);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    saveActiveSos(this.activeEvent);
    this.listeners.forEach((fn) => fn(this.activeEvent));
  }

  /**
   * Fetch Android Phone GPS location
   */
  public async getPhoneLocation(): Promise<{ location: GpsLocation | null; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { location: null, error: 'Geolocation is not supported by this browser/device.' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: GpsLocation = {
            lat: +pos.coords.latitude.toFixed(6),
            lng: +pos.coords.longitude.toFixed(6),
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date(pos.timestamp).toISOString(),
            source: 'PHONE_GPS',
            isStale: false,
          };
          this.lastPhoneLocation = loc;

          // Stream coordinates to ESP32 over BLE
          deviceService.sendPhoneGpsToEsp32(loc.lat, loc.lng, loc.accuracy);

          resolve({ location: loc });
        },
        (err) => {
          let msg = 'Failed to obtain phone GPS coordinates.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please allow location access in your phone settings.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Phone GPS location unavailable. Turn on Location in Android settings.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Phone GPS request timed out.';
          }
          resolve({ location: null, error: msg });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * Determine best available coordinates:
   * 1. Phone GPS if recent (< 2 mins)
   * 2. Keychain NEO-6M GPS if locked
   * 3. Null (never invent coordinates)
   */
  public async getBestLocation(): Promise<GpsLocation | null> {
    // 1. Try querying phone GPS
    const { location: phoneLoc } = await this.getPhoneLocation();
    if (phoneLoc) return phoneLoc;

    if (this.lastPhoneLocation) {
      const ageMs = Date.now() - new Date(this.lastPhoneLocation.timestamp).getTime();
      if (ageMs < 120000) {
        return { ...this.lastPhoneLocation, isStale: true };
      }
    }

    // 2. Check NEO-6M on ESP32
    const hw = deviceService.getTelemetry();
    if (hw.gps.neo6mFix && hw.gps.neo6mLat !== null && hw.gps.neo6mLng !== null) {
      return {
        lat: hw.gps.neo6mLat,
        lng: hw.gps.neo6mLng,
        accuracy: 15,
        timestamp: hw.gps.neo6mLastFixTime || new Date().toISOString(),
        source: 'KEYCHAIN_GPS',
      };
    }

    // 3. Unavailable
    return null;
  }

  /**
   * Generate message content
   */
  public generateEmergencyMessage(location: GpsLocation | null, isTest = false): string {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isTest) {
      if (location) {
        return `[SURAKSHA KEY TEST] Safety prototype verification test. Location: https://maps.google.com/?q=${location.lat},${location.lng} (Accuracy: ±${location.accuracy}m, Source: ${location.source}). Time: ${timeStr}.`;
      }
      return `[SURAKSHA KEY TEST] Safety prototype verification test. Location: Unavailable. Time: ${timeStr}.`;
    }

    if (location) {
      return `EMERGENCY SOS: I need help! My location: https://maps.google.com/?q=${location.lat},${location.lng} (Lat: ${location.lat}, Lng: ${location.lng}, Source: ${location.source}, Accuracy: ±${location.accuracy}m). Sent via SURAKSHA KEY at ${timeStr}.`;
    }

    return `EMERGENCY SOS: I need help! My location is currently unavailable. Please contact me immediately. Sent via SURAKSHA KEY at ${timeStr}.`;
  }

  /**
   * Handle incoming physical SOS button trigger from ESP32
   */
  private async handlePhysicalSosTrigger(source: 'PHYSICAL_SOS_BUTTON') {
    await this.triggerSos(source);
  }

  /**
   * Trigger SOS Emergency workflow
   */
  public async triggerSos(
    source: 'PHYSICAL_SOS_BUTTON' | 'APP_SOS_BUTTON' | 'SMS_TEST_RUN' = 'APP_SOS_BUTTON'
  ): Promise<SosAlertEvent> {
    const contacts = loadContacts().filter((c) => c.isEmergencyRecipient);
    const location = await this.getBestLocation();

    const mapUrl = location
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : 'https://maps.google.com';

    const eventId = 'sos-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5);

    const initialRecipients: RecipientSmsStatus[] = contacts.map((c) => ({
      contactId: c.id,
      name: c.name,
      phone: c.phone,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      detailNote: 'Queued on ESP32 / A7670C...',
    }));

    const event: SosAlertEvent = {
      id: eventId,
      timestamp: new Date().toISOString(),
      isTestEvent: source === 'SMS_TEST_RUN',
      source,
      status: 'ACTIVE',
      location,
      mapUrl,
      recipients: initialRecipients,
      lastEsp32Message:
        source === 'PHYSICAL_SOS_BUTTON'
          ? 'Physical push button pressed on keychain'
          : source === 'SMS_TEST_RUN'
          ? 'SMS diagnostic test dispatched'
          : 'Emergency SOS activated via mobile app',
    };

    this.activeEvent = event;
    this.notify();

    // Send coordinates to ESP32 if not already sent
    if (location) {
      deviceService.sendPhoneGpsToEsp32(location.lat, location.lng, location.accuracy);
    }

    // Command SMS transmission through A7670C
    this.dispatchSosSmsToRecipients(event, location);

    return event;
  }

  /**
   * Process dispatch to configured recipients with distinct state tracking
   */
  private async dispatchSosSmsToRecipients(event: SosAlertEvent, location: GpsLocation | null) {
    const message = this.generateEmergencyMessage(location, event.isTestEvent);
    const isConnected = deviceService.getTelemetry().connectionState === 'CONNECTED';
    const isDemo = deviceService.getTelemetry().isDemoMode;

    for (let i = 0; i < event.recipients.length; i++) {
      const rec = event.recipients[i];
      if (!this.activeEvent || this.activeEvent.id !== event.id) break;

      // State 1: Submission Attempted
      rec.status = 'SUBMITTED';
      rec.timestamp = new Date().toISOString();
      rec.detailNote = 'Transmitting command to SIMCom A7670C...';
      this.notify();

      if (!isConnected && !isDemo) {
        rec.status = 'FAILED';
        rec.detailNote = 'ESP32 not connected over Bluetooth. Cellular SMS could not be sent.';
        this.notify();
        continue;
      }

      try {
        const result = await deviceService.requestTestSms(rec.phone, message);

        if (!this.activeEvent || this.activeEvent.id !== event.id) break;

        if (result.success) {
          rec.status = 'DELIVERED';
          rec.messageRef = result.messageRef;
          rec.detailNote = `Confirmed by A7670C: ${result.response}`;
        } else {
          rec.status = 'FAILED';
          rec.detailNote = result.error || 'Modem failed to send SMS';
        }
      } catch (err: any) {
        rec.status = 'FAILED';
        rec.detailNote = `BLE communication error: ${err.message}`;
      }

      this.notify();
    }

    // Save event snapshot in history
    if (this.activeEvent && this.activeEvent.id === event.id) {
      const { addSosHistoryRecord } = await import('../utils/storage');
      addSosHistoryRecord({ ...this.activeEvent });
    }
  }

  /**
   * Mark active SOS as resolved
   */
  public async resolveSos(): Promise<void> {
    if (!this.activeEvent) return;
    const resolvedEvent: SosAlertEvent = {
      ...this.activeEvent,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
    };
    const { addSosHistoryRecord } = await import('../utils/storage');
    addSosHistoryRecord(resolvedEvent);

    this.activeEvent = null;
    this.notify();
  }
}

export const emergencyService = new EmergencyService();

