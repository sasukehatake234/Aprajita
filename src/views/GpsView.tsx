import React, { useState } from 'react';
import {
  MapPin,
  RefreshCw,
  ExternalLink,
  Smartphone,
  KeyRound,
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Info,
} from 'lucide-react';
import { HardwareTelemetry, GpsLocation, TabType } from '../types';
import { LeafletMap } from '../components/LeafletMap';

interface GpsViewProps {
  telemetry: HardwareTelemetry;
  location: GpsLocation | null;
  onRefreshLocation: () => Promise<void>;
  onSelectTab: (tab: TabType) => void;
}

export function GpsView({
  telemetry,
  location,
  onRefreshLocation,
  onSelectTab,
}: GpsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConnected = telemetry.connectionState === 'CONNECTED';
  const hasPhoneLocation = location !== null;
  const isPhoneStale = location?.isStale;

  const hasNeoFix = telemetry.gps.neo6mFix && telemetry.gps.neo6mLat !== null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      await onRefreshLocation();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to refresh GPS location.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine active display coordinates for the interactive map
  const activeLat = location ? location.lat : telemetry.gps.neo6mLat || 28.6139;
  const activeLng = location ? location.lng : telemetry.gps.neo6mLng || 77.2090;
  const activeAccuracy = location ? location.accuracy : 15;
  const activeSource = location ? location.source : hasNeoFix ? 'KEYCHAIN_GPS' : 'NONE';

  const mapUrl = location
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : telemetry.gps.neo6mLat
    ? `https://maps.google.com/?q=${telemetry.gps.neo6mLat},${telemetry.gps.neo6mLng}`
    : null;

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-slate-700" />
            <span>Dual-Source GPS System</span>
          </h2>
          <p className="text-xs text-slate-500">
            Android Phone GPS is primary. Keychain NEO-6M GPS acts as autonomous hardware fallback.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Fetching GPS...' : 'Refresh Phone GPS'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Dual Source Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source 1: Android Phone GPS (Primary) */}
        <div
          className={`bg-white border rounded-3xl p-5 shadow-xs space-y-3 transition-all ${
            hasPhoneLocation && !isPhoneStale
              ? 'border-emerald-300 ring-1 ring-emerald-400'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Android Phone GPS</h3>
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Primary Source
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                hasPhoneLocation && !isPhoneStale
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {hasPhoneLocation && !isPhoneStale ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Available</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{hasPhoneLocation ? 'Stale' : 'Unavailable'}</span>
                </>
              )}
            </span>
          </div>

          {/* Phone GPS Details */}
          {hasPhoneLocation ? (
            <div className="space-y-2 pt-1 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude:</span>
                  <span className="font-bold text-slate-900">{location.lat.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude:</span>
                  <span className="font-bold text-slate-900">{location.lng.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accuracy:</span>
                  <span className="font-bold text-slate-900">±{location.accuracy} meters</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                  <span>Last Updated:</span>
                  <span>{new Date(location.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Streamed over BLE to ESP32 RAM for instantaneous emergency dispatch.</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
              <p>Phone GPS location is currently unavailable.</p>
              <p className="text-[11px] text-slate-500">
                Ensure Android Location (GPS) is turned ON and location permission is granted in browser settings.
              </p>
            </div>
          )}
        </div>

        {/* Source 2: Keychain NEO-6M GPS (Secondary Fallback) */}
        <div
          className={`bg-white border rounded-3xl p-5 shadow-xs space-y-3 transition-all ${
            hasNeoFix ? 'border-violet-300 ring-1 ring-violet-400' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Keychain NEO-6M GPS</h3>
                <span className="text-[10px] uppercase font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                  Autonomous Hardware Fallback
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                hasNeoFix
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {hasNeoFix ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                  <span>3D Fix</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                  <span>Searching Fix</span>
                </>
              )}
            </span>
          </div>

          {/* NEO-6M Details */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Hardware Serial:</span>
                <span className="text-slate-800">ESP32 UART1 (GPIO 26/27)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Satellites Locked:</span>
                <span className="font-bold text-slate-900">{telemetry.gps.neo6mSatellites} satellites</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reported Fix:</span>
                <span className="font-bold text-slate-900">
                  {hasNeoFix
                    ? `${telemetry.gps.neo6mLat?.toFixed(6)}°, ${telemetry.gps.neo6mLng?.toFixed(6)}°`
                    : 'Awaiting Satellite Lock'}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                <span>Last Telemetry Sync:</span>
                <span>{telemetry.gps.neo6mLastFixTime ? new Date(telemetry.gps.neo6mLastFixTime).toLocaleTimeString() : 'No fix logged'}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Used automatically when phone is disconnected or phone GPS is turned off.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Selection Logic Explainer Card */}
      <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 shadow-xs space-y-2 text-xs">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-700" />
          <span>Location Selection Logic for Emergency SMS</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed">
          <li>
            <strong>Priority 1: Phone GPS</strong> — When phone is connected and supplied valid coordinates within 2 minutes.
          </li>
          <li>
            <strong>Priority 2: NEO-6M GPS</strong> — If phone GPS is unavailable, stale, or phone is disconnected, the ESP32 uses its onboard NEO-6M GPS fix.
          </li>
          <li>
            <strong>Priority 3: Location Unavailable</strong> — If neither has a valid fix, SMS is sent immediately stating: <em>"Location is currently unavailable"</em> (coordinates are never invented).
          </li>
        </ol>
      </div>

      {/* Interactive Map & Direct Google Maps Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-700" />
              <span>Live Location Visualizer</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Active Source: {activeSource === 'PHONE_GPS' ? 'Android Phone GPS' : activeSource === 'KEYCHAIN_GPS' ? 'NEO-6M Keychain GPS' : 'No Active Lock'}
            </p>
          </div>

          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-xs"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Map Container */}
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <LeafletMap
            lat={activeLat}
            lng={activeLng}
            accuracy={activeAccuracy}
            source={activeSource}
            height="320px"
          />
        </div>
      </div>
    </div>
  );
}
