import React, { useState } from 'react';
import {
  KeyRound,
  Bluetooth,
  MapPin,
  Signal,
  Users,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Wrench,
  Settings,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  HardwareTelemetry,
  GpsLocation,
  TrustedContact,
  TabType,
  SosAlertEvent,
  computeDeviceReadiness,
} from '../types';
import { deviceService } from '../services/deviceService';
import { SosButton } from '../components/SosButton';
import { BleConnectModal } from '../components/BleConnectModal';
import { MobileInstallBanner } from '../components/MobileInstallBanner';

interface HomeViewProps {
  telemetry: HardwareTelemetry;
  location: GpsLocation | null;
  contacts: TrustedContact[];
  recentSosEvent: SosAlertEvent | null;
  onRefreshLocation: () => Promise<void>;
  onSelectTab: (tab: TabType) => void;
  onTriggerSos: () => void;
  onSyncContacts: () => Promise<void>;
}

export function HomeView({
  telemetry,
  location,
  contacts,
  recentSosEvent,
  onRefreshLocation,
  onSelectTab,
  onTriggerSos,
  onSyncContacts,
}: HomeViewProps) {
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showReadinessReasons, setShowReadinessReasons] = useState(false);

  const isConnected = telemetry.connectionState === 'CONNECTED';
  const emergencyRecipients = contacts.filter((c) => c.isEmergencyRecipient);

  // Compute strict readiness state
  const readiness = computeDeviceReadiness(telemetry, contacts, location);

  const handleDisconnectBle = () => {
    deviceService.disconnectDevice();
  };

  const handleRefreshLocation = async () => {
    setIsRefreshingGps(true);
    try {
      await onRefreshLocation();
    } finally {
      setIsRefreshingGps(false);
    }
  };

  // Determine current active location source description
  const activeGpsSource = location && !location.isStale
    ? 'Phone GPS (High Accuracy)'
    : telemetry.gps.neo6mFix && telemetry.gps.neo6mLat
    ? 'Keychain NEO-6M GPS (Autonomous)'
    : 'GPS Unavailable';

  const lastGpsTime = location?.timestamp
    ? new Date(location.timestamp).toLocaleTimeString()
    : telemetry.gps.neo6mLastFixTime
    ? new Date(telemetry.gps.neo6mLastFixTime).toLocaleTimeString()
    : 'No fix recorded';

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* PWA Mobile App Installation Prompt */}
      <MobileInstallBanner />

      {/* 1. Device Header Card: Logo, Device Name, BLE Connection */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  SURAKSHA KEY
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  ESP32 + A7670C
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Hardware Device ID: <span className="font-mono text-slate-700">{telemetry.deviceId}</span>
              </p>
            </div>
          </div>

          {/* BLE Connection Button / Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isConnected ? (
              <button
                onClick={handleDisconnectBle}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors"
                title="Tap to Disconnect"
              >
                <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected</span>
                <span className="text-[10px] text-emerald-600 underline ml-1">Disconnect</span>
              </button>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-xs"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Connect Keychain</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Device Readiness Status Card (Strictly Verified, Never Falsely Green) */}
      <div
        className={`border rounded-3xl p-5 shadow-xs transition-all ${
          readiness.state === 'READY'
            ? 'bg-emerald-50/70 border-emerald-300'
            : readiness.state === 'ATTENTION_REQUIRED'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                readiness.state === 'READY'
                  ? 'bg-emerald-100 text-emerald-800'
                  : readiness.state === 'ATTENTION_REQUIRED'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {readiness.state === 'READY' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : readiness.state === 'ATTENTION_REQUIRED' ? (
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              ) : (
                <Bluetooth className="w-5 h-5 text-slate-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hardware Readiness State
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    readiness.state === 'READY'
                      ? 'bg-emerald-200 text-emerald-950 font-black'
                      : readiness.state === 'ATTENTION_REQUIRED'
                      ? 'bg-amber-200 text-amber-950 font-black'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {readiness.state.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-800 mt-1">
                {readiness.state === 'READY'
                  ? 'All hardware checks passed. Emergency SOS is armed and operational.'
                  : readiness.state === 'ATTENTION_REQUIRED'
                  ? `${readiness.reasons.length} hardware check(s) require attention.`
                  : 'Keychain is disconnected. Turn on Bluetooth and connect to verify readiness.'}
              </p>
            </div>
          </div>

          {readiness.state === 'ATTENTION_REQUIRED' && (
            <button
              onClick={() => setShowReadinessReasons(!showReadinessReasons)}
              className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              {showReadinessReasons ? 'Hide Details' : 'View Issues'}
            </button>
          )}
        </div>

        {/* Readiness Detailed Reasons dropdown */}
        {showReadinessReasons && readiness.state === 'ATTENTION_REQUIRED' && (
          <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-1.5 text-xs text-amber-950">
            {readiness.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="font-bold text-amber-700">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Core Telemetry Grid: GPS, Cellular, Sync Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card A: GPS Status & Active Source */}
        <div
          onClick={() => onSelectTab('gps')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 shadow-xs cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">GPS Status</span>
            <Compass className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  location || telemetry.gps.neo6mFix ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{activeGpsSource}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Last GPS Update: {lastGpsTime}
            </div>
          </div>
        </div>

        {/* Card B: SIM & Cellular Network */}
        <div
          onClick={() => onSelectTab('tests')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 shadow-xs cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Cellular 4G LTE</span>
            <Signal className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.cellular.registration.includes('REGISTERED') ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>
                {telemetry.cellular.simStatus === 'READY'
                  ? telemetry.cellular.operator || '4G Connected'
                  : 'SIM Absent'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              CSQ: {telemetry.cellular.csq}/31 ({telemetry.cellular.registration.replace('_', ' ')})
            </div>
          </div>
        </div>

        {/* Card C: Emergency Contact Sync */}
        <div
          onClick={() => onSelectTab('contacts')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 shadow-xs cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Contact Sync</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.contactsSyncedCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{telemetry.contactsSyncedCount} in ESP32 Flash</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {telemetry.lastSyncTimestamp
                ? `Synced ${new Date(telemetry.lastSyncTimestamp).toLocaleTimeString()}`
                : 'Not yet synchronized'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Prominent Intentional SOS Button Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-center space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Emergency SOS Control</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
            Press and hold below or click the physical push button on your keychain to dispatch distress SMS with your live coordinates.
          </p>
        </div>

        {/* Tactile Hold Button Component */}
        <div className="flex justify-center py-2">
          <SosButton onTrigger={onTriggerSos} holdDurationMs={1500} />
        </div>

        <p className="text-[11px] text-slate-400">
          Features a 5-second accidental press cancellation window before SMS transmission begins.
        </p>
      </div>

      {/* 5. Recent SOS Activity Preview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Recent SOS Activity</span>
          </h3>
          <button
            onClick={() => onSelectTab('history')}
            className="text-xs text-slate-900 font-bold hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentSosEvent ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    recentSosEvent.isTestEvent
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800 font-black'
                  }`}
                >
                  {recentSosEvent.isTestEvent ? 'Test Dispatch' : 'Emergency SOS'}
                </span>
                <span className="font-bold text-slate-900">
                  {recentSosEvent.recipients.length} Recipient(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {new Date(recentSosEvent.timestamp).toLocaleString()} • Trigger: {recentSosEvent.source.replace(/_/g, ' ')}
              </p>
            </div>

            {recentSosEvent.location && (
              <a
                href={recentSosEvent.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View Map</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-2 italic text-center">
            No recent SOS activations recorded.
          </div>
        )}
      </div>

      {/* 6. Quick Access Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => onSelectTab('contacts')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl text-left shadow-xs transition-all space-y-1"
        >
          <Users className="w-4 h-4 text-slate-700" />
          <div className="text-xs font-bold text-slate-900">Contacts</div>
          <p className="text-[10px] text-slate-500">Manage SMS recipients</p>
        </button>

        <button
          onClick={() => onSelectTab('gps')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl text-left shadow-xs transition-all space-y-1"
        >
          <Compass className="w-4 h-4 text-slate-700" />
          <div className="text-xs font-bold text-slate-900">GPS System</div>
          <p className="text-[10px] text-slate-500">Phone vs NEO-6M</p>
        </button>

        <button
          onClick={() => onSelectTab('tests')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl text-left shadow-xs transition-all space-y-1"
        >
          <Wrench className="w-4 h-4 text-slate-700" />
          <div className="text-xs font-bold text-slate-900">Diagnostics</div>
          <p className="text-[10px] text-slate-500">10-point test suite</p>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl text-left shadow-xs transition-all space-y-1"
        >
          <Settings className="w-4 h-4 text-slate-700" />
          <div className="text-xs font-bold text-slate-900">Settings</div>
          <p className="text-[10px] text-slate-500">Wiring &amp; permissions</p>
        </button>
      </div>

      {/* Guided Bluetooth Connection & Troubleshooting Modal */}
      <BleConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={() => setShowConnectModal(false)}
      />
    </div>
  );
}
