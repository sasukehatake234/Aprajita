import React from 'react';
import {
  ShieldAlert,
  MapPin,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { SosAlertEvent, HardwareTelemetry, TabType } from '../types';
import { emergencyService } from '../services/emergencyService';

interface ActiveSosViewProps {
  activeSos: SosAlertEvent | null;
  telemetry: HardwareTelemetry;
  onSelectTab: (tab: TabType) => void;
  onTriggerSos: () => void;
}

export function ActiveSosView({
  activeSos,
  telemetry,
  onSelectTab,
  onTriggerSos,
}: ActiveSosViewProps) {
  const handleResolve = () => {
    emergencyService.resolveSos();
  };

  if (!activeSos) {
    return (
      <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-700" />
            <span>Active SOS Screen</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time status of emergency distress broadcasts and modem SMS acknowledgments.
          </p>
        </div>

        {/* Clean Standby State */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-md mx-auto my-6 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Active Emergency Alert</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              SURAKSHA KEY is armed and monitoring. When the physical push button on your keychain
              is pressed, this screen displays live GPS coordinates and cellular SMS delivery receipts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={onTriggerSos}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Trigger Emergency Alert Now
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('tests')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
            >
              Test SMS Module
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active SOS State
  const confirmedCount = activeSos.recipients.filter((r) => r.status === 'DELIVERED').length;

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Alert Header Banner */}
      <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-red-900 uppercase tracking-wide">
                  Emergency SOS Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                  {activeSos.source}
                </span>
              </div>
              <p className="text-xs text-red-700 mt-0.5 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Initiated at {new Date(activeSos.timestamp).toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResolve}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors self-start sm:self-auto shrink-0"
          >
            Mark Emergency Resolved
          </button>
        </div>
      </div>

      {/* GPS Location Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Coordinates Transmitted</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {activeSos.location?.source || 'LOCATION UNAVAILABLE'}
                </span>
              </p>

              {activeSos.location ? (
                <p className="text-xs font-mono text-slate-800 mt-0.5 tabular-nums">
                  {activeSos.location.lat.toFixed(5)}, {activeSos.location.lng.toFixed(5)}{' '}
                  <span className="text-slate-500 font-normal">
                    (Accuracy: ±{activeSos.location.accuracy}m)
                  </span>
                </p>
              ) : (
                <p className="text-xs text-amber-700 mt-0.5">
                  GPS coordinates were unavailable during alert initiation.
                </p>
              )}
            </div>
          </div>

          {activeSos.location && (
            <a
              href={activeSos.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Emergency Contacts SMS Delivery Tracking */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <span>Emergency SMS Delivery Telemetry</span>
          </h3>
          <span className="text-xs font-semibold text-slate-600">
            {confirmedCount} of {activeSos.recipients.length} confirmed by A7670C
          </span>
        </div>

        {activeSos.recipients.length > 0 ? (
          <div className="space-y-2">
            {activeSos.recipients.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-slate-900">{rec.name}</p>
                  <p className="text-[11px] font-mono text-slate-600">{rec.phone}</p>
                  {rec.detailNote && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{rec.detailNote}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      rec.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : rec.status === 'SUBMITTED'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : rec.status === 'FAILED'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            No emergency contacts were selected for this broadcast. Add numbers in the Contacts page.
          </p>
        )}
      </div>

      {/* Hardware Telemetry Note */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1 shadow-sm font-mono">
        <p className="font-bold text-slate-900 font-sans">Last Device Communication:</p>
        <p className="text-[11px]">
          Status: {telemetry.lastModemResponse || activeSos.lastEsp32Message}
        </p>
        <p className="text-[11px] text-slate-500">
          Last BLE Ping: {telemetry.lastHeartbeat ? new Date(telemetry.lastHeartbeat).toLocaleTimeString() : 'Active'}
        </p>
      </div>
    </div>
  );
}
