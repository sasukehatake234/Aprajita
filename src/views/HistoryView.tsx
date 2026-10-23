import React, { useState } from 'react';
import {
  History,
  ShieldAlert,
  MapPin,
  ExternalLink,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  AlertTriangle,
  Trash2,
  Filter,
} from 'lucide-react';
import { SosAlertEvent, TabType } from '../types';
import { loadSosHistory, clearSosHistory } from '../utils/storage';

interface HistoryViewProps {
  onSelectTab: (tab: TabType) => void;
}

export function HistoryView({ onSelectTab }: HistoryViewProps) {
  const [history, setHistory] = useState<SosAlertEvent[]>(loadSosHistory);
  const [filter, setFilter] = useState<'all' | 'real' | 'test'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredHistory = history.filter((item) => {
    if (filter === 'real') return !item.isTestEvent;
    if (filter === 'test') return item.isTestEvent;
    return true;
  });

  const handleClear = () => {
    clearSosHistory();
    setHistory([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Title & Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-slate-700" />
            <span>SOS Activity History</span>
          </h2>
          <p className="text-xs text-slate-500">
            Local device audit log of all emergency alerts, test dispatches, and modem acknowledgments.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="self-start sm:self-auto text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit text-xs font-semibold">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Activity ({history.length})
        </button>
        <button
          onClick={() => setFilter('real')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filter === 'real'
              ? 'bg-white text-red-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Emergency SOS ({history.filter((h) => !h.isTestEvent).length})
        </button>
        <button
          onClick={() => setFilter('test')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            filter === 'test'
              ? 'bg-white text-blue-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Test Dispatches ({history.filter((h) => h.isTestEvent).length})
        </button>
      </div>

      {/* Event List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-md mx-auto my-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No History Records Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {filter === 'all'
              ? 'No emergency alerts or test runs have occurred yet on this device.'
              : `No ${filter === 'real' ? 'real emergency' : 'test'} events recorded.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString();
            const isTest = item.isTestEvent;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3"
              >
                {/* Header: Type, Timestamp & Source */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1 ${
                        isTest
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800 font-extrabold'
                      }`}
                    >
                      {isTest ? <Radio className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      <span>{isTest ? 'Test Dispatch' : 'Emergency SOS'}</span>
                    </span>

                    <span className="text-xs text-slate-600 font-medium">
                      Trigger: {item.source.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    {dateStr}
                  </span>
                </div>

                {/* Location Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    {item.location ? (
                      <span className="font-mono text-slate-800">
                        {item.location.lat.toFixed(6)}°, {item.location.lng.toFixed(6)}°
                        <span className="text-slate-500 font-sans ml-1 text-[11px]">
                          (Source: {item.location.source}, ±{item.location.accuracy}m)
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Location Unavailable at time of broadcast
                      </span>
                    )}
                  </div>

                  {item.mapUrl && item.location && (
                    <a
                      href={item.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>View Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Recipients and delivery results */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    SMS Recipients & Modem Result
                  </span>
                  <div className="space-y-1">
                    {item.recipients.map((rec, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{rec.name}</span>{' '}
                          <span className="font-mono text-slate-500">({rec.phone})</span>
                          {rec.detailNote && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{rec.detailNote}</p>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
                            rec.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rec.status === 'DELIVERED' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : rec.status === 'SUBMITTED' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{rec.status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Clear History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Clear SOS Activity History?</h3>
            <p className="text-xs text-slate-500">
              This will permanently delete the local log of all previous SOS events and test dispatches.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-colors shadow-xs"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
