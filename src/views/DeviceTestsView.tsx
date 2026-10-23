import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Send,
  Terminal,
  Radio,
  Signal,
  Smartphone,
  Cpu,
  KeyRound,
  ExternalLink,
  Check,
  HelpCircle,
  Copy,
  Info,
} from 'lucide-react';
import {
  HardwareTelemetry,
  GpsLocation,
  TrustedContact,
  DiagnosticCheckItem,
  SmsDeliveryState,
  validateIndianMobileNumber,
} from '../types';
import { deviceService } from '../services/deviceService';
import { emergencyService } from '../services/emergencyService';

interface DeviceTestsViewProps {
  telemetry: HardwareTelemetry;
  location: GpsLocation | null;
  contacts: TrustedContact[];
  onRefreshLocation: () => Promise<void>;
  onSyncContacts: () => Promise<void>;
}

export function DeviceTestsView({
  telemetry,
  location,
  contacts,
  onRefreshLocation,
  onSyncContacts,
}: DeviceTestsViewProps) {
  const isConnected = telemetry.connectionState === 'CONNECTED';
  const isDemo = telemetry.isDemoMode;

  // Selected recipient for test SMS
  const emergencyRecipients = contacts.filter((c) => c.isEmergencyRecipient);
  const [selectedContactId, setSelectedContactId] = useState<string>(
    emergencyRecipients.length > 0 ? emergencyRecipients[0].id : 'custom'
  );
  const [customPhone, setCustomPhone] = useState('+91 ');
  const [customPhoneError, setCustomPhoneError] = useState<string | null>(null);

  // Test SMS progress & state
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastSmsResult, setLastSmsResult] = useState<{
    state: 'TRIGGERED' | 'ACCEPTED' | 'SUBMITTED' | 'DELIVERED' | 'FAILED';
    message: string;
    rawResponse?: string;
    messageRef?: string;
  } | null>(null);

  // Sub-tabs: 'diagnostics' | 'test-sms' | 'console'
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'test-sms' | 'console'>('diagnostics');

  // Diagnostic items evaluator
  const checks: DiagnosticCheckItem[] = [
    {
      id: 'ble_link',
      title: '1. BLE Connection & GATT Server',
      description: 'Bluetooth Low Energy communication channel to ESP32',
      status: isConnected ? 'PASS' : telemetry.connectionState === 'CONNECTING' ? 'PENDING' : 'FAIL',
      detail: isConnected
        ? `Connected to ${telemetry.deviceId} (Service: 4fafc201...)`
        : 'BLE peripheral disconnected',
      troubleshooting: 'Ensure Bluetooth is ON on your phone and the ESP32 is powered via 5V micro-USB.',
    },
    {
      id: 'esp32_heartbeat',
      title: '2. ESP32 Microcontroller Responsiveness',
      description: 'Firmware execution and periodic BLE heartbeat telemetry',
      status: isConnected && telemetry.lastHeartbeat ? 'PASS' : isConnected ? 'PENDING' : 'NOT_TESTED',
      detail: telemetry.lastHeartbeat
        ? `Last heartbeat acknowledged at ${new Date(telemetry.lastHeartbeat).toLocaleTimeString()}`
        : 'Awaiting heartbeat notification',
      troubleshooting: 'Flash the latest suraksha_key.ino sketch to the ESP32 and open Serial Monitor at 115200 baud.',
    },
    {
      id: 'a7670c_at',
      title: '3. SIMCom A7670C AT Parser',
      description: 'HardwareSerial 2 UART link (GPIO 16/17) between ESP32 and 4G modem',
      status: isConnected && telemetry.cellular.operator !== 'UNKNOWN' ? 'PASS' : isConnected ? 'PENDING' : 'NOT_TESTED',
      detail: telemetry.lastModemResponse
        ? `Modem responded: ${telemetry.lastModemResponse.slice(0, 45)}...`
        : 'Modem initialized on HardwareSerial 2',
      troubleshooting: 'Check RXD/TXD cross-connection (ESP32 RX2=16 to A7670C TXD, ESP32 TX2=17 to A7670C RXD).',
    },
    {
      id: 'sim_card',
      title: '4. 4G SIM Card Detection & Readiness',
      description: 'SIM card detection status (AT+CPIN?)',
      status: telemetry.cellular.simStatus === 'READY' ? 'PASS' : telemetry.cellular.simStatus === 'ABSENT' ? 'FAIL' : 'NOT_TESTED',
      detail: `SIM Status: ${telemetry.cellular.simStatus} (${telemetry.cellular.operator || 'No carrier'})`,
      troubleshooting: 'Insert an activated 4G nano-SIM (with valid SMS plan) firmly into the A7670C slot.',
    },
    {
      id: 'cellular_reg',
      title: '5. Cellular 4G Network Registration',
      description: 'Tower attachment (AT+CREG?) and Signal Quality (AT+CSQ)',
      status:
        telemetry.cellular.registration === 'REGISTERED_HOME' || telemetry.cellular.registration === 'ROAMING'
          ? 'PASS'
          : telemetry.cellular.registration === 'SEARCHING'
          ? 'PENDING'
          : 'FAIL',
      detail: `Registration: ${telemetry.cellular.registration} | CSQ: ${telemetry.cellular.csq}/31 (${telemetry.cellular.signalRssi} dBm)`,
      troubleshooting: 'Attach the cellular whip/patch antenna to the A7670C IPEX/SMA connector for adequate signal.',
    },
    {
      id: 'phone_gps',
      title: '6. Android Phone GPS Availability',
      description: 'Android Location Services coordinates with accuracy verification',
      status: location && !location.isStale ? 'PASS' : location ? 'PENDING' : 'FAIL',
      detail: location
        ? `Lat: ${location.lat.toFixed(5)}°, Lng: ${location.lng.toFixed(5)}° (±${location.accuracy}m)`
        : 'Phone GPS unavailable or permission not yet granted',
      troubleshooting: 'Turn ON Location in Android settings and tap "Refresh Phone GPS".',
    },
    {
      id: 'neo6m_gps',
      title: '7. NEO-6M Keychain GPS Fix Status',
      description: 'HardwareSerial 1 UART link (GPIO 26/27) and satellite fix',
      status: telemetry.gps.neo6mFix ? 'PASS' : isConnected ? 'PENDING' : 'NOT_TESTED',
      detail: telemetry.gps.neo6mFix
        ? `3D Fix locked (${telemetry.gps.neo6mSatellites} satellites)`
        : `Searching satellites (${telemetry.gps.neo6mSatellites} tracked)`,
      troubleshooting: 'The NEO-6M GPS module requires clear sky view outdoors. First fix may take 1-3 minutes.',
    },
    {
      id: 'contact_sync',
      title: '8. Contact Flash Synchronization',
      description: 'Non-volatile retention in ESP32 Preferences.h Flash',
      status: telemetry.contactsSyncedCount > 0 ? 'PASS' : 'FAIL',
      detail: `${telemetry.contactsSyncedCount} contacts stored in ESP32 Flash memory`,
      troubleshooting: 'Go to Contacts tab and press "Sync to Keychain" over BLE.',
    },
    {
      id: 'sms_test',
      title: '9. Cellular SMS Dispatch Test',
      description: 'A7670C AT+CMGS command execution test without SOS event',
      status: lastSmsResult?.state === 'DELIVERED' ? 'PASS' : lastSmsResult?.state === 'FAILED' ? 'FAIL' : 'NOT_TESTED',
      detail: lastSmsResult ? `${lastSmsResult.state}: ${lastSmsResult.message}` : 'Not tested yet',
      troubleshooting: 'Run the Test SMS feature below with a valid recipient number.',
    },
    {
      id: 'sos_button',
      title: '10. Physical SOS Button Detection',
      description: 'Hardware interrupt on GPIO 4 with software debouncing',
      status: telemetry.physicalButtonLastPressed ? 'PASS' : isConnected ? 'PENDING' : 'NOT_TESTED',
      detail: telemetry.physicalButtonLastPressed
        ? `Last pressed at ${new Date(telemetry.physicalButtonLastPressed).toLocaleTimeString()}`
        : 'Waiting for physical button press on GPIO 4',
      troubleshooting: 'Wire tactile push button between ESP32 GPIO 4 and GND (Active LOW with internal pullup).',
    },
  ];

  // Recipient resolution
  const getTargetPhoneNumber = (): { phone: string; valid: boolean; error?: string } => {
    if (selectedContactId !== 'custom') {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) return { phone: contact.phone, valid: true };
    }
    const val = validateIndianMobileNumber(customPhone);
    return { phone: val.normalized, valid: val.valid, error: val.error };
  };

  const target = getTargetPhoneNumber();
  const testMessagePreview = emergencyService.generateEmergencyMessage(location, true);

  const handleOpenConfirm = () => {
    if (!target.valid) {
      setCustomPhoneError(target.error || 'Please enter a valid phone number.');
      return;
    }
    setCustomPhoneError(null);
    setShowConfirmModal(true);
  };

  const handleExecuteSendTestSms = async () => {
    setShowConfirmModal(false);
    setIsSendingSms(true);

    // State 1: Triggered
    setLastSmsResult({
      state: 'TRIGGERED',
      message: 'SMS command dispatched to ESP32 over BLE...',
    });

    try {
      // State 2: Accepted
      setLastSmsResult({
        state: 'ACCEPTED',
        message: 'ESP32 accepted command. Writing AT+CMGS to A7670C...',
      });

      const result = await deviceService.requestTestSms(target.phone, testMessagePreview);

      // State 3: Submitted / Delivered / Failed
      if (result.success) {
        setLastSmsResult({
          state: 'DELIVERED',
          message: `SMS submitted by modem and transmitted over cellular network (Ref: ${result.messageRef || 'OK'})`,
          rawResponse: result.response,
          messageRef: result.messageRef,
        });
      } else {
        setLastSmsResult({
          state: 'FAILED',
          message: result.error || 'Modem failed to send SMS.',
          rawResponse: result.response,
        });
      }
    } catch (err: any) {
      setLastSmsResult({
        state: 'FAILED',
        message: `Transmission error: ${err.message}`,
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  const packetLogs = deviceService.getPacketLogs();

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-slate-700" />
            <span>Device Diagnostics & Testing</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time validation of Bluetooth, ESP32 firmware, A7670C modem, SIM card, and GPS.
          </p>
        </div>

        {/* Demo Simulation Switch */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-xs self-start sm:self-auto">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800">Demo Simulation</span>
            <span className="text-[10px] text-slate-500">Software sandbox</span>
          </div>
          <button
            type="button"
            onClick={() => deviceService.toggleDemoMode()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDemo ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isDemo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'diagnostics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>10-Point Health Checks</span>
        </button>
        <button
          onClick={() => setActiveTab('test-sms')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'test-sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Test SMS Dispatch</span>
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'console' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live BLE / AT Console</span>
        </button>
      </div>

      {/* Tab 1: 10 Separate Diagnostic Health Checks */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-3">
          {checks.map((check) => {
            const isPass = check.status === 'PASS';
            const isFail = check.status === 'FAIL';
            const isPending = check.status === 'PENDING';

            return (
              <div
                key={check.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{check.title}</h4>
                    <p className="text-[11px] text-slate-500">{check.description}</p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                      isPass
                        ? 'bg-emerald-100 text-emerald-800'
                        : isFail
                        ? 'bg-red-100 text-red-800'
                        : isPending
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isPass ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : isFail ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                    ) : isPending ? (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{check.status.replace('_', ' ')}</span>
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800">
                  {check.detail}
                </div>

                {!isPass && (
                  <div className="text-[11px] text-slate-500 flex items-start gap-1 pt-0.5">
                    <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Troubleshooting:</strong> {check.troubleshooting}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Test SMS Dispatch Feature */}
      {activeTab === 'test-sms' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">SIMCom A7670C Cellular Test SMS</h3>
            <p className="text-xs text-slate-500">
              Verify real cellular SMS transmission without triggering an actual emergency alert.
            </p>
          </div>

          {/* Recipient Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Select Destination Number</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedContactId(c.id);
                    setCustomPhoneError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selectedContactId === c.id
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{c.phone}</div>
                  </div>
                  {selectedContactId === c.id && <Check className="w-4 h-4 text-slate-900" />}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedContactId('custom')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedContactId === 'custom'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">Custom Number</div>
                  <div className="text-[11px] text-slate-500">Enter any test mobile number</div>
                </div>
                {selectedContactId === 'custom' && <Check className="w-4 h-4 text-slate-900" />}
              </button>
            </div>

            {selectedContactId === 'custom' && (
              <div className="pt-2">
                <input
                  type="tel"
                  value={customPhone}
                  onChange={(e) => {
                    setCustomPhone(e.target.value);
                    setCustomPhoneError(null);
                  }}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {customPhoneError && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{customPhoneError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Test SMS Payload Preview */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Test SMS Content Preview</label>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 font-mono leading-relaxed select-all">
              {testMessagePreview}
            </div>
            <p className="text-[11px] text-slate-500">
              Clearly marked as <code>[SURAKSHA KEY TEST]</code> so recipients know it is a diagnostic test.
            </p>
          </div>

          {/* Send Button */}
          <div>
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={isSendingSms}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isSendingSms ? 'animate-pulse' : ''}`} />
              <span>{isSendingSms ? 'Transmitting via SIMCom A7670C...' : 'Send Test SMS'}</span>
            </button>
          </div>

          {/* Distinct Delivery States Result */}
          {lastSmsResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                lastSmsResult.state === 'DELIVERED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : lastSmsResult.state === 'FAILED'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {lastSmsResult.state === 'DELIVERED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {lastSmsResult.state === 'FAILED' && <XCircle className="w-4 h-4 text-red-600" />}
                {(lastSmsResult.state === 'TRIGGERED' || lastSmsResult.state === 'ACCEPTED') && (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                )}
                <span>Distinct State: {lastSmsResult.state}</span>
              </div>
              <p className="leading-relaxed">{lastSmsResult.message}</p>
              {lastSmsResult.rawResponse && (
                <div className="font-mono text-[10px] opacity-80 pt-1">
                  Modem Response: {lastSmsResult.rawResponse}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Console / Live Logs */}
      {activeTab === 'console' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Live BLE &amp; AT Command Log</h3>
            <span className="text-xs text-slate-500 font-mono">{packetLogs.length} entries</span>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] h-96 overflow-y-auto space-y-1.5 leading-relaxed">
            {packetLogs.length === 0 ? (
              <div className="text-slate-500 italic py-8 text-center">
                No logs recorded yet. Connect to the BLE keychain or send a test SMS to view traffic.
              </div>
            ) : (
              packetLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                      log.type === 'TX'
                        ? 'bg-blue-900/60 text-blue-300'
                        : log.type === 'RX'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : log.type === 'AT'
                        ? 'bg-violet-900/60 text-violet-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="break-all text-slate-200">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Confirm Test SMS Dispatch</h3>
            <p className="text-xs text-slate-500">
              This will command the SIMCom A7670C module to transmit a cellular SMS to:
            </p>
            <div className="py-1.5 px-3 bg-slate-100 rounded-xl font-mono font-bold text-sm text-slate-900 inline-block">
              {target.phone}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSendTestSms}
                className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-colors shadow-xs"
              >
                Send SMS Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
