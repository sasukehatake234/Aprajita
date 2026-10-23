import React, { useState } from 'react';
import {
  Bluetooth,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Radio,
  Cpu,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { deviceService } from '../services/deviceService';

interface BleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export function BleConnectModal({ isOpen, onClose, onConnected }: BleConnectModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const env = deviceService.getBluetoothEnvironmentInfo();

  const handleConnect = async (scanAll = false) => {
    setIsScanning(true);
    setErrorMessage(null);

    try {
      await deviceService.connectBleDevice(scanAll);
      onConnected();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Bluetooth connection failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleEnableDemo = () => {
    deviceService.toggleDemoMode(true);
    onConnected();
    onClose();
  };

  const handleOpenStandalone = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Bluetooth className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Connect SURAKSHA KEY</h3>
              <p className="text-xs text-slate-500">Bluetooth Low Energy (BLE) Pairing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Iframe Notice */}
        {env.inIframe && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-950">
            <div className="flex items-start gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Preview Window Detected</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Web Bluetooth requires a standalone browser tab for security permissions. If the device picker does not appear, click below to open the app directly in Chrome.
            </p>
            <button
              onClick={handleOpenStandalone}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Open in Standalone Chrome Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Web Bluetooth Support Status */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Web Bluetooth API:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                env.isSupported ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {env.isSupported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available (Chrome / Android)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Not Supported on this Browser</span>
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Works natively on Google Chrome on Android phones, Chromebooks, and PCs.
          </p>
        </div>

        {/* Error Message if connection failed */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Connection Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Physical Hardware Pre-Flight Checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
          <span className="font-bold text-slate-900 block">Pre-Flight Hardware Check:</span>
          <ul className="space-y-1 text-slate-600 text-[11px]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>ESP32 is flashed with <code>suraksha_key.ino</code> &amp; powered via 5V USB.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Phone's Bluetooth is turned <strong>ON</strong> in system settings.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Serial Monitor shows <code>[BLE] Advertising as 'SURAKSHA-KEY'</code>.</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => handleConnect(false)}
            disabled={isScanning}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Bluetooth className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning for Keychain...' : 'Scan & Pair SURAKSHA-KEY'}</span>
          </button>

          <button
            onClick={() => handleConnect(true)}
            disabled={isScanning}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>Scan All BLE Devices (Fallback)</span>
          </button>
        </div>

        {/* Demo Fallback Option */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 mb-2">
            Don't have the physical hardware connected right now?
          </p>
          <button
            onClick={handleEnableDemo}
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Switch to Demo Simulation Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
