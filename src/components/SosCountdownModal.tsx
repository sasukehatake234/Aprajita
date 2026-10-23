import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Send } from 'lucide-react';
import { playCountdownBeep } from '../utils/audio';

interface SosCountdownModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
}

export function SosCountdownModal({
  onConfirm,
  onCancel,
  countdownSeconds = 5,
}: SosCountdownModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  useEffect(() => {
    playCountdownBeep(secondsLeft === 1);

    if (secondsLeft <= 0) {
      onConfirm();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, onConfirm]);

  const progressPct = ((countdownSeconds - secondsLeft) / countdownSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Warning Icon Header */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-4 animate-bounce">
          <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Emergency SOS Activated
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Transmitting coordinates and SMS in...
        </p>

        {/* Big Countdown Number & Progress */}
        <div className="my-6 relative flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="50"
                fill="none"
                stroke="#dc2626"
                strokeWidth="5"
                strokeDasharray="314"
                strokeDashoffset={314 - (314 * progressPct) / 100}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="text-5xl font-black text-red-600 font-mono tabular-nums">
              {secondsLeft}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium px-4 mb-6 leading-relaxed">
          Sending distress SMS to your configured emergency contacts via SIMCom A7670C 4G.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 border border-slate-200 active:scale-98 transition-all"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancel (Accidental Press)</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Alert Immediately</span>
          </button>
        </div>
      </div>
    </div>
  );
}
