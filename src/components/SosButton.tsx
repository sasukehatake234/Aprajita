import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface SosButtonProps {
  onTrigger: () => void;
  holdDurationMs?: number;
}

export function SosButton({ onTrigger, holdDurationMs = 1500 }: SosButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const cancelPress = useCallback(() => {
    setIsPressing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
    setProgress(0);
  }, []);

  const completePress = useCallback(() => {
    cancelPress();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 150]);
    }
    onTrigger();
  }, [cancelPress, onTrigger]);

  const updateProgress = useCallback((now: number) => {
    if (!startTimeRef.current) return;
    const elapsed = now - startTimeRef.current;
    const pct = Math.min((elapsed / holdDurationMs) * 100, 100);
    setProgress(pct);

    // Micro-vibrate feedback as it charges
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (Math.floor(pct) % 30 === 0 && pct > 0 && pct < 100) {
        navigator.vibrate(20);
      }
    }

    if (pct >= 100) {
      completePress();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [holdDurationMs, completePress]);

  const startPress = useCallback(() => {
    setIsPressing(true);
    startTimeRef.current = performance.now();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const size = 220;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center select-none py-2">
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow ring */}
        <div
          className={`absolute rounded-full transition-all duration-300 ${
            isPressing
              ? 'w-64 h-64 bg-rose-600/30 blur-2xl scale-110'
              : 'w-56 h-56 bg-rose-600/15 blur-xl animate-pulse'
          }`}
        />

        {/* SVG Circular Progress Track */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 pointer-events-none z-10"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(244, 63, 94, 0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Active progress fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#roseGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
          <defs>
            <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
        </svg>

        {/* Core Touch-Target Button */}
        <button
          type="button"
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !isPressing) {
              startPress();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              cancelPress();
            }
          }}
          aria-label="Hold to trigger Emergency SOS"
          className={`absolute z-20 w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/50 ${
            isPressing
              ? 'bg-gradient-to-b from-rose-600 to-rose-800 scale-98 shadow-rose-900/60'
              : 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 shadow-rose-950/80 hover:brightness-105'
          }`}
        >
          <div className="flex flex-col items-center justify-center text-white pointer-events-none">
            <ShieldAlert className={`w-10 h-10 mb-1 transition-transform ${isPressing ? 'scale-110' : ''}`} />
            <span className="text-3xl font-black tracking-widest leading-none drop-shadow-md">
              SOS
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-100/90 mt-1">
              {isPressing ? `Holding ${Math.round(progress)}%` : 'Press & Hold'}
            </span>
          </div>
        </button>
      </div>

      {/* Reassuring micro-instruction */}
      <div className="mt-4 text-center">
        <p className="text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Hold for 1.5 seconds to initiate emergency alert</span>
        </p>
        <button
          onClick={onTrigger}
          className="mt-1 text-[11px] text-slate-400 hover:text-rose-400 underline decoration-slate-700 hover:decoration-rose-400 transition-colors"
        >
          Can't hold? Tap here for 5s Grace Countdown
        </button>
      </div>
    </div>
  );
}
