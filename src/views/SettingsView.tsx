import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Smartphone,
  Cpu,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  ListChecks,
  Lock,
  Radio,
  ExternalLink,
  Download,
} from 'lucide-react';
import { ARDUINO_FIRMWARE_CODE } from '../data/arduinoCode';
import { BLE_PROTOCOL_SPEC } from '../data/protocolSpec';
import { MobileInstallBanner } from '../components/MobileInstallBanner';

export function SettingsView() {
  const [copiedFirmware, setCopiedFirmware] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [activeSection, setActiveSection] = useState<'permissions' | 'protocol' | 'wiring' | 'flashing' | 'checklist'>('protocol');

  const handleCopyFirmware = () => {
    navigator.clipboard.writeText(ARDUINO_FIRMWARE_CODE);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 2500);
  };

  const handleCopyProtocol = () => {
    navigator.clipboard.writeText(BLE_PROTOCOL_SPEC);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          <span>App Settings & Hardware Guide</span>
        </h2>
        <p className="text-xs text-slate-500">
          Android permissions, hardware wiring diagrams, firmware flashing instructions, and test checklist.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-200/70 rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveSection('protocol')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'protocol' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>BLE Protocol</span>
        </button>
        <button
          onClick={() => setActiveSection('flashing')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'flashing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>ESP32 Firmware</span>
        </button>
        <button
          onClick={() => setActiveSection('wiring')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'wiring' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Hardware Wiring</span>
        </button>
        <button
          onClick={() => setActiveSection('permissions')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'permissions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Permissions</span>
        </button>
        <button
          onClick={() => setActiveSection('checklist')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'checklist' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>Acceptance Tests</span>
        </button>
      </div>

      {/* 0. BLE GATT Communication Protocol Section */}
      {activeSection === 'protocol' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-600" />
                  <span>SURAKSHA KEY BLE GATT Protocol (v3.0.0)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized binary/ASCII contract between ESP32 and Android companion app.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyProtocol}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-95 transition self-start sm:self-auto"
              >
                {copiedProtocol ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Protocol!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Protocol</span>
                  </>
                )}
              </button>
            </div>

            {/* Core Identification Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Device Advertising Name</span>
                <div className="font-mono font-bold text-slate-900 text-sm">SURAKSHA-KEY</div>
                <p className="text-[11px] text-slate-500">Scanned by Android Chrome &amp; Web Bluetooth API</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Primary Service UUID</span>
                <div className="font-mono font-bold text-red-600 text-xs break-all">4fafc201-1fb5-459e-8fcc-c5c9c331914b</div>
                <p className="text-[11px] text-slate-500">Includes all 6 custom hardware characteristics</p>
              </div>
            </div>

            {/* Characteristic Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                GATT Characteristics &amp; Payload Schemas
              </h4>

              {/* 1. CHAR_SOS_EVENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    <span className="font-bold text-slate-900 text-xs">1. CHAR_SOS_EVENT</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">NOTIFY</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">ESP32 ➔ App</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Example:</span>
                  <code className="text-red-700 font-bold font-mono">"SOS:PHYSICAL_BUTTON"</code>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Notified immediately when the GPIO 4 button is pressed for &gt; 100ms. Enforces 10s cooldown.
                  </p>
                </div>
              </div>

              {/* 2. CHAR_PHONE_GPS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-bold text-slate-900 text-xs">2. CHAR_PHONE_GPS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">WRITE / NO RESP</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">App ➔ ESP32</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26a9</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Format &amp; Example:</span>
                  <code className="text-slate-900 font-mono font-bold">"&lt;lat&gt;,&lt;lng&gt;,&lt;accuracy&gt;"</code> ➔ <code className="text-blue-700 font-bold font-mono">"19.076090,72.877426,8"</code>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Streamed upon phone GPS change. ESP32 treats this as primary if fresh (&lt; 2 minutes old).
                  </p>
                </div>
              </div>

              {/* 3. CHAR_SYNC_CONTACTS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs">3. CHAR_SYNC_CONTACTS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">WRITE</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">App ➔ ESP32</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26aa</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Format &amp; Example:</span>
                  <code className="text-emerald-700 font-mono font-bold">"COUNT:2;+919876543210;+919811122233"</code>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Persistently stored in ESP32 Flash via <code>Preferences.h</code>. Retained for autonomous SMS dispatch.
                  </p>
                </div>
              </div>

              {/* 4. CHAR_MODEM_STATUS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="font-bold text-slate-900 text-xs">4. CHAR_MODEM_STATUS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">READ / NOTIFY</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">ESP32 ➔ App</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26ab</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Format &amp; Example:</span>
                  <code className="text-purple-700 font-mono font-bold text-[11px] break-all">"CSQ:24;REG:REGISTERED_HOME;OP:Jio 4G;GPS_FIX:YES;CONTACTS:2"</code>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Polled from A7670C AT commands and broadcasted every 10 seconds.
                  </p>
                </div>
              </div>

              {/* 5. CHAR_CMD_SMS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span className="font-bold text-slate-900 text-xs">5. CHAR_CMD_SMS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">WRITE</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">App ➔ ESP32</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26ac</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Example:</span>
                  <code className="text-amber-800 font-mono font-bold text-[11px] break-all">"SEND_TEST_SMS:+919876543210:SURAKSHA KEY test alert coordinates 19.076090, 72.877426"</code>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Instructs the ESP32 to command the A7670C modem via UART AT+CMGS sequence.
                  </p>
                </div>
              </div>

              {/* 6. CHAR_SMS_RESPONSE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-600" />
                    <span className="font-bold text-slate-900 text-xs">6. CHAR_SMS_RESPONSE</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">NOTIFY</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">ESP32 ➔ App</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-600 break-all">UUID: beb5483e-36e1-4688-b7f5-ea07361b26ad</div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold">Payload Examples:</span>
                  <div>Success: <code className="text-emerald-700 font-mono font-bold">"OK:42:+CMGS 42"</code></div>
                  <div>Failure: <code className="text-red-700 font-mono font-bold">"ERROR:MODEM_FAILED:AT+CMGS prompt timeout"</code></div>
                  <p className="text-[11px] text-slate-600 pt-0.5">
                    Modem's genuine cellular response. Prevents false reporting of SMS delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Protocol Specification Document */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900">Complete Protocol Spec (Text Reference)</span>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800">
                {BLE_PROTOCOL_SPEC}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 1. Android Permissions Section */}
      {activeSection === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Android System Permissions & Purpose</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* Permission 1: Bluetooth */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-blue-600" />
                    <span>Bluetooth Low Energy (Nearby Devices / Location)</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Required for Hardware
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Allows scanning and connecting to the <code>SURAKSHA-KEY</code> ESP32 board over BLE. On Android 12+, requires the <em>Nearby Devices (BLUETOOTH_SCAN, BLUETOOTH_CONNECT)</em> permission. On older Android versions, location access is needed for BLE beacons.
                </p>
              </div>

              {/* Permission 2: Geolocation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Precise Geolocation (ACCESS_FINE_LOCATION)</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Primary Location Source
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Used by Android location services to fetch high-precision GPS coordinates from your phone. These coordinates are streamed over BLE to the keychain to be dispatched in emergency SMS messages.
                </p>
              </div>

              {/* Permission 3: Privacy Guarantee */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1 text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Privacy & Local Storage Guarantee</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed pt-1">
                  SURAKSHA KEY operates strictly on-device. No telemetry, contacts, or coordinates are ever uploaded to an external server or cloud backend. All emergency SMS transmissions occur entirely via the physical SIMCom A7670C module.
                </p>
              </div>

              {/* Android PWA Mobile Installation Status */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Smartphone className="w-4 h-4 text-red-400" />
                    <span>Android Application Installation</span>
                  </div>
                  <MobileInstallBanner compact />
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Installing SURAKSHA KEY to your Android home screen provides native standalone execution, full viewport display (no browser search or navigation bars), and persistent Web Bluetooth pairing for the ESP32 hardware.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hardware Wiring Documentation */}
      {activeSection === 'wiring' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-700" />
              <span>Prototype Hardware Interconnects</span>
            </h3>

            <p className="text-xs text-slate-600">
              Verify your physical solder/breadboard connections against this pinout table before powering up the prototype:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Module Component</th>
                    <th className="p-3">Module Pin</th>
                    <th className="p-3">ESP32 Pin</th>
                    <th className="p-3">Description / Logic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">Tactile SOS Button</td>
                    <td className="p-3">Pin 1 / Signal</td>
                    <td className="p-3 text-red-600 font-bold">GPIO 4</td>
                    <td className="p-3 font-sans text-slate-600">Active LOW, internal INPUT_PULLUP enabled</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">Tactile SOS Button</td>
                    <td className="p-3">Pin 2 / Ground</td>
                    <td className="p-3 text-slate-600">GND</td>
                    <td className="p-3 font-sans text-slate-600">Ground connection</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">SIMCom A7670C (4G)</td>
                    <td className="p-3">TXD</td>
                    <td className="p-3 text-blue-600 font-bold">GPIO 16 (RX2)</td>
                    <td className="p-3 font-sans text-slate-600">Modem serial output into ESP32 HardwareSerial 2</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">SIMCom A7670C (4G)</td>
                    <td className="p-3">RXD</td>
                    <td className="p-3 text-blue-600 font-bold">GPIO 17 (TX2)</td>
                    <td className="p-3 font-sans text-slate-600">ESP32 commands into modem AT parser (115200 baud)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">SIMCom A7670C (4G)</td>
                    <td className="p-3">GND &amp; VBAT/VCC</td>
                    <td className="p-3 text-slate-600">GND &amp; Ext 3.8V-4.2V (2A)</td>
                    <td className="p-3 font-sans text-slate-600">Cellular module requires peak 2A current supply</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">u-blox NEO-6M GPS</td>
                    <td className="p-3">TX</td>
                    <td className="p-3 text-violet-600 font-bold">GPIO 26 (RX1)</td>
                    <td className="p-3 font-sans text-slate-600">NEO-6M NMEA sentences into ESP32 HardwareSerial 1 (9600 baud)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">u-blox NEO-6M GPS</td>
                    <td className="p-3">RX</td>
                    <td className="p-3 text-violet-600 font-bold">GPIO 27 (TX1)</td>
                    <td className="p-3 font-sans text-slate-600">Configuration commands from ESP32</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-bold text-slate-900">u-blox NEO-6M GPS</td>
                    <td className="p-3">VCC &amp; GND</td>
                    <td className="p-3 text-slate-600">3.3V &amp; GND</td>
                    <td className="p-3 font-sans text-slate-600">GPS power supply</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Cellular Power Note:</span>
              </div>
              <p>
                The SIMCom A7670C module draws up to 2A bursts when transmitting 4G LTE packets. Ensure a dedicated 3.7V Li-Po battery or external 5V/2A supply with appropriate step-down is connected to avoid brownouts on the ESP32.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. ESP32 Firmware Instructions */}
      {activeSection === 'flashing' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-slate-700" />
                  <span>Arduino IDE 2.x Flashing Guide</span>
                </h3>
                <p className="text-xs text-slate-500">Step-by-step instructions to compile and flash the ESP32 firmware</p>
              </div>

              <button
                onClick={handleCopyFirmware}
                className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {copiedFirmware ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFirmware ? 'Firmware Copied!' : 'Copy C++ Code'}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <li>
                <strong>Install ESP32 Board Package:</strong> Open Arduino IDE &rarr; Settings &rarr; Add <code>https://espressif.github.io/arduino-esp32/package_esp32_index.json</code> to Board Manager URLs. Then in Boards Manager, install <em>esp32 by Espressif Systems</em> (v2.0.14 or later).
              </li>
              <li>
                <strong>Install Libraries:</strong> Go to Sketch &rarr; Include Library &rarr; Manage Libraries. Search for and install <strong>TinyGPSPlus</strong> by Mikal Hart. (<em>Preferences.h</em> and <em>BLEDevice.h</em> are included built-in with the ESP32 core).
              </li>
              <li>
                <strong>Select Board:</strong> Select <code>ESP32 Dev Module</code> under Tools &rarr; Board &rarr; esp32.
              </li>
              <li>
                <strong>Paste Firmware:</strong> Click "Copy C++ Code" above and paste into a new Arduino sketch named <code>suraksha_key.ino</code>.
              </li>
              <li>
                <strong>Upload:</strong> Connect the ESP32 via micro-USB, select the correct COM port, and click Upload.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* 4. Acceptance Test Checklist */}
      {activeSection === 'checklist' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-slate-700" />
              <span>Hardware Prototype Acceptance Checklist</span>
            </h3>
            <p className="text-xs text-slate-500">
              Verify these 12 critical acceptance requirements on the physical board:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'App discovers and connects to ESP32 over BLE with accurate status indication.',
                'Emergency contacts synchronize over BLE and persist in ESP32 Flash memory.',
                'Keychain retains emergency contacts in Flash when disconnected from phone.',
                'App obtains high-accuracy Phone GPS and transfers coordinates over BLE.',
                'ESP32 reads valid NEO-6M GPS coordinates when satellite lock is achieved.',
                'App accurately distinguishes between Phone GPS, NEO-6M GPS, and Location Unavailable.',
                'Physical SOS button press triggers the emergency workflow with software debounce.',
                'A7670C cellular modem transmits SMS to configured emergency contacts.',
                'Emergency SMS contains valid coordinates and map link (or explicitly states unavailable).',
                'Keychain initiates autonomous SMS dispatch without the phone connected.',
                'App displays genuine modem response codes and SMS delivery states without false positives.',
                'Accidental disconnects, SIM removal, or invalid GPS do not crash or produce false success.',
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-slate-800 leading-relaxed font-medium">
                    <strong>Test {idx + 1}:</strong> {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
