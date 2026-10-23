import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, ExternalLink, X, ShieldAlert } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface MobileInstallBannerProps {
  compact?: boolean;
}

export const MobileInstallBanner: React.FC<MobileInstallBannerProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  // If already installed and running standalone as an Android app, show subtle status badge or nothing
  if (isInstalled) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed</span>
        </span>
      );
    }
    return null;
  }

  if (dismissed && !compact) {
    return null;
  }

  // Compact button for Header or Settings
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (isInstallable) {
              install();
            } else {
              setShowAndroidModal(true);
            }
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs hover:from-red-700 hover:to-rose-700 active:scale-95 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showAndroidModal && (
          <AndroidInstallGuideModal onClose={() => setShowAndroidModal(false)} />
        )}
      </>
    );
  }

  // Full Banner on Home View
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-5 shadow-md border border-slate-700 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0 shadow-inner border border-red-400/30">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  Android App
                </span>
                <span className="text-xs text-slate-300 font-medium">Native Home Screen Experience</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Install SURAKSHA KEY on Your Android Phone
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
                Run SURAKSHA KEY as a standalone app with full-screen view, zero browser bars, instant offline cache, and direct Bluetooth Low Energy pairing for your physical ESP32 prototype.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={install}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide shadow-md active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install to Phone Now</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAndroidModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide shadow-md active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>How to Install on Android</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAndroidModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <span>Installation Steps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAndroidModal && (
        <AndroidInstallGuideModal onClose={() => setShowAndroidModal(false)} />
      )}
    </>
  );
};

export const AndroidInstallGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Install on Android Phone</h3>
            <p className="text-xs text-slate-500">Standalone App &amp; WebAPK Installation</p>
          </div>
        </div>

        <div className="mt-5 space-y-3.5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <div className="text-xs text-slate-700">
              <strong className="text-slate-900 block font-semibold">Open in Android Google Chrome</strong>
              Navigate to the app URL on your Android device in the Chrome browser.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <div className="text-xs text-slate-700">
              <strong className="text-slate-900 block font-semibold">Tap the 3 Dots Menu (⋮)</strong>
              Tap the three-dot overflow menu in the top right corner of Chrome.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <div className="text-xs text-slate-700">
              <strong className="text-slate-900 block font-semibold">Select "Install App" or "Add to Home screen"</strong>
              Chrome will prompt to install SURAKSHA KEY as an Android application with its red shield icon.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <div className="text-xs text-slate-700">
              <strong className="text-slate-900 block font-semibold">Launch from Home Screen</strong>
              The app opens full-screen without URL bars and grants persistent Bluetooth Low Energy permissions for your ESP32 keychain!
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Android 8.0+ &amp; Chrome 89+</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
