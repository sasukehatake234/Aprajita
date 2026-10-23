/**
 * SURAKSHA KEY - Complete Android Safety Companion Mobile App
 * Built for ESP32 + SIMCom A7670C 4G LTE + u-blox NEO-6M GPS Prototype
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TabType,
  HardwareTelemetry,
  GpsLocation,
  TrustedContact,
  SosAlertEvent,
  computeDeviceReadiness,
} from './types';
import {
  loadContacts,
  saveContacts,
  loadActiveSos,
  loadSosHistory,
} from './utils/storage';
import { deviceService } from './services/deviceService';
import { emergencyService } from './services/emergencyService';

// Shell Navigation Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SosCountdownModal } from './components/SosCountdownModal';

// Primary Views
import { HomeView } from './views/HomeView';
import { ContactsView } from './views/ContactsView';
import { GpsView } from './views/GpsView';
import { DeviceTestsView } from './views/DeviceTestsView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { ActiveSosView } from './views/ActiveSosView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Persistent Contacts state
  const [contacts, setContacts] = useState<TrustedContact[]>(loadContacts);

  // Live Hardware & Location Telemetry
  const [telemetry, setTelemetry] = useState<HardwareTelemetry>(() => deviceService.getTelemetry());
  const [location, setLocation] = useState<GpsLocation | null>(null);

  // Active Emergency SOS state & modal
  const [activeSos, setActiveSos] = useState<SosAlertEvent | null>(() => emergencyService.getActiveEvent());
  const [showCountdown, setShowCountdown] = useState(false);
  const [showActiveSosOverlay, setShowActiveSosOverlay] = useState(false);

  // Recent SOS history record for Home preview
  const [historyList, setHistoryList] = useState<SosAlertEvent[]>(loadSosHistory);

  // Continuous GPS watch reference
  const watchIdRef = useRef<number | null>(null);

  // Compute Device Readiness
  const readiness = computeDeviceReadiness(telemetry, contacts, location);

  // Subscribe to Hardware Telemetry and Emergency Events
  useEffect(() => {
    const unsubHw = deviceService.subscribe((hw) => {
      setTelemetry(hw);
    });

    const unsubSos = emergencyService.subscribe((event) => {
      setActiveSos(event);
      if (event && event.status === 'ACTIVE') {
        setShowActiveSosOverlay(true);
      }
      setHistoryList(loadSosHistory());
    });

    return () => {
      unsubHw();
      unsubSos();
    };
  }, []);

  // Fetch Phone GPS Location
  const handleRefreshLocation = useCallback(async () => {
    const { location: loc } = await emergencyService.getPhoneLocation();
    if (loc) {
      setLocation(loc);
      deviceService.sendPhoneGpsToEsp32(loc.lat, loc.lng, loc.accuracy);
    }
  }, []);

  useEffect(() => {
    handleRefreshLocation();

    // Start watchPosition for continuous phone GPS updates
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc: GpsLocation = {
            lat: +pos.coords.latitude.toFixed(6),
            lng: +pos.coords.longitude.toFixed(6),
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date(pos.timestamp).toISOString(),
            source: 'PHONE_GPS',
          };
          setLocation(loc);
          deviceService.sendPhoneGpsToEsp32(loc.lat, loc.lng, loc.accuracy);
        },
        (err) => {
          console.warn('Geolocation continuous watch notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [handleRefreshLocation]);

  // Synchronize Contacts to ESP32 Flash Memory over BLE
  const handleSyncContactsToKeychain = useCallback(async () => {
    await deviceService.syncContactsToEsp32(contacts);
    const updated = contacts.map((c) => ({ ...c, syncedToKeychain: true }));
    setContacts(updated);
    saveContacts(updated);
  }, [contacts]);

  // SOS Emergency Activation Handlers
  const handleInitiateSos = useCallback(() => {
    setShowCountdown(true);
  }, []);

  const handleConfirmSos = useCallback(async () => {
    setShowCountdown(false);
    await emergencyService.triggerSos('APP_SOS_BUTTON');
    setShowActiveSosOverlay(true);
  }, []);

  const handleCancelCountdown = useCallback(() => {
    setShowCountdown(false);
  }, []);

  // Contact CRUD Handlers
  const handleAddContact = useCallback((newContact: Omit<TrustedContact, 'id' | 'addedAt' | 'syncedToKeychain'>) => {
    const contact: TrustedContact = {
      ...newContact,
      id: 'cnt-' + Date.now().toString(36),
      syncedToKeychain: false,
      addedAt: new Date().toISOString(),
    };
    setContacts((prev) => {
      const updated = [...prev, contact];
      saveContacts(updated);
      return updated;
    });
  }, []);

  const handleUpdateContact = useCallback((updated: TrustedContact) => {
    setContacts((prev) => {
      const list = prev.map((c) => (c.id === updated.id ? { ...updated, syncedToKeychain: false } : c));
      saveContacts(list);
      return list;
    });
  }, []);

  const handleDeleteContact = useCallback((id: string) => {
    setContacts((prev) => {
      const list = prev.filter((c) => c.id !== id);
      saveContacts(list);
      return list;
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-red-500 selection:text-white pt-[env(safe-area-inset-top)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6">
      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        connectionState={telemetry.connectionState}
        readinessState={readiness.state}
        activeSos={activeSos}
        onOpenSos={() => setShowActiveSosOverlay(true)}
      />

      {/* Main Screen Content View */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6">
        {currentTab === 'home' && (
          <HomeView
            telemetry={telemetry}
            location={location}
            contacts={contacts}
            recentSosEvent={historyList.length > 0 ? historyList[0] : null}
            onRefreshLocation={handleRefreshLocation}
            onSelectTab={setCurrentTab}
            onTriggerSos={handleInitiateSos}
            onSyncContacts={handleSyncContactsToKeychain}
          />
        )}

        {currentTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onSyncContacts={handleSyncContactsToKeychain}
            isBleConnected={telemetry.connectionState === 'CONNECTED'}
            contactsSyncedCount={telemetry.contactsSyncedCount}
            lastSyncTimestamp={telemetry.lastSyncTimestamp}
          />
        )}

        {currentTab === 'gps' && (
          <GpsView
            telemetry={telemetry}
            location={location}
            onRefreshLocation={handleRefreshLocation}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === 'tests' && (
          <DeviceTestsView
            telemetry={telemetry}
            location={location}
            contacts={contacts}
            onRefreshLocation={handleRefreshLocation}
            onSyncContacts={handleSyncContactsToKeychain}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView onSelectTab={setCurrentTab} />
        )}

        {currentTab === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (6 Tabs) */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeSos={activeSos}
      />

      {/* 5-second Grace Window SOS Confirmation Modal */}
      {showCountdown && (
        <SosCountdownModal
          countdownSeconds={5}
          onConfirm={handleConfirmSos}
          onCancel={handleCancelCountdown}
        />
      )}

      {/* Full Active SOS Overlay Modal */}
      {showActiveSosOverlay && activeSos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full my-8">
            <ActiveSosView
              activeSos={activeSos}
              telemetry={telemetry}
              onSelectTab={(tab) => {
                setShowActiveSosOverlay(false);
                setCurrentTab(tab);
              }}
              onTriggerSos={handleInitiateSos}
            />
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowActiveSosOverlay(false)}
                className="text-xs text-white/80 hover:text-white underline font-semibold"
              >
                Minimize &amp; Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
