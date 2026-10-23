import React from 'react';
import {
  KeyRound,
  Bluetooth,
  ShieldAlert,
  Users,
  Compass,
  Wrench,
  History,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { TabType, DeviceConnectionState, DeviceReadinessState, SosAlertEvent } from '../types';
import { MobileInstallBanner } from './MobileInstallBanner';

interface HeaderProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  connectionState: DeviceConnectionState;
  readinessState: DeviceReadinessState;
  activeSos: SosAlertEvent | null;
  onOpenSos: () => void;
}

export function Header({
  currentTab,
  onSelectTab,
  connectionState,
  readinessState,
  activeSos,
  onOpenSos,
}: HeaderProps) {
  const isConnected = connectionState === 'CONNECTED';
  const isConnecting = connectionState === 'CONNECTING';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <KeyRound className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-base text-slate-900">
                SURAKSHA KEY
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                Android App
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              ESP32 + A7670C Companion
            </p>
          </div>
        </div>

        {/* Desktop / Tablet Navigation Links (6 tabs) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'home'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('contacts')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'contacts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => onSelectTab('gps')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'gps'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GPS
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'tests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tests
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              currentTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Status Indicators: BLE, Readiness & Install */}
        <div className="flex items-center gap-2">
          {/* Install Android App Quick Action */}
          <MobileInstallBanner compact />
          {/* Readiness Badge */}
          <div
            className={`hidden sm:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
              readinessState === 'READY'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : readinessState === 'ATTENTION_REQUIRED'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {readinessState === 'READY' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : readinessState === 'ATTENTION_REQUIRED' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            )}
            <span>{readinessState === 'READY' ? 'Armed' : readinessState === 'ATTENTION_REQUIRED' ? 'Check Needed' : 'Disconnected'}</span>
          </div>

          {/* BLE Pill */}
          <div
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isConnecting
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Bluetooth
              className={`w-3.5 h-3.5 ${
                isConnected
                  ? 'text-emerald-600'
                  : isConnecting
                  ? 'text-amber-600 animate-spin'
                  : 'text-slate-400'
              }`}
            />
            <span className="text-[11px]">
              {isConnected ? 'BLE' : isConnecting ? 'Connecting' : 'Disconnected'}
            </span>
          </div>

          {/* Active SOS notification button */}
          {activeSos && (
            <button
              onClick={onOpenSos}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS ACTIVE</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
