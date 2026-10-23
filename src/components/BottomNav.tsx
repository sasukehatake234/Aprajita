import React from 'react';
import {
  Home,
  Users,
  Compass,
  Wrench,
  History,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { TabType, SosAlertEvent } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeSos: SosAlertEvent | null;
}

export function BottomNav({ currentTab, onSelectTab, activeSos }: BottomNavProps) {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'contacts' as TabType, label: 'Contacts', icon: Users },
    { id: 'gps' as TabType, label: 'GPS', icon: Compass },
    { id: 'tests' as TabType, label: 'Tests', icon: Wrench },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-lg">
      <div className="grid grid-cols-6 items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-all relative ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-transform relative ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'
                  }`}
                />
                {activeSos && tab.id === 'home' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white animate-ping" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
