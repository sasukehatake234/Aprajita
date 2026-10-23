/**
 * SURAKSHA KEY - Complete BLE GATT Communication Protocol Specification
 * Physical Prototype (ESP32 + SIMCom A7670C 4G + NEO-6M GPS) <-> Android Companion App
 */

export const BLE_PROTOCOL_SPEC = `================================================================================
SURAKSHA KEY - COMPLETE BLE GATT COMMUNICATION PROTOCOL SPECIFICATION (v3.0.0)
Hardware: ESP32 DevKit | SIMCom A7670C 4G | u-blox NEO-6M | Tactile SOS Button
Companion: Android Mobile Application (PWA / Web Bluetooth API)
================================================================================

1. PHYSICAL & LINK LAYER SPECIFICATIONS
--------------------------------------------------------------------------------
- Transport:             Bluetooth Low Energy (BLE 4.2 / 5.0)
- Operating Frequency:   2.402 GHz - 2.480 GHz ISM Band
- GAP Role (ESP32):      GATT Server / Peripheral (Broadcaster & Responder)
- GAP Role (Android):    GATT Client / Central (Scanner & Initiator)
- BLE Advertising Name:  "SURAKSHA-KEY"
- Advertising Interval:  100 ms (Min: 0x06, Max: 0x12)
- MTU Size:              512 bytes (Standard 23-byte MTU supported with fragmentation)
- Primary Service UUID:  4fafc201-1fb5-459e-8fcc-c5c9c331914b

--------------------------------------------------------------------------------
2. GATT CHARACTERISTICS DEFINITION TABLE
--------------------------------------------------------------------------------
Name:             CHAR_SOS_EVENT
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26a8
Properties:       NOTIFY
Descriptor:       0x2902 (Client Characteristic Configuration Descriptor - CCCD)
Direction:        ESP32 -> Android App
Encoding:         UTF-8 ASCII String
Format:           "SOS:<EVENT_TYPE>"
Payload Example:  "SOS:PHYSICAL_BUTTON"
Trigger:          Fires instantly when user presses GPIO 4 tactile button for > 100ms.
Debounce:         10-second retrigger cooldown (SOS_COOLDOWN_MS = 10000).

--------------------------------------------------------------------------------
Name:             CHAR_PHONE_GPS
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26a9
Properties:       WRITE, WRITE WITHOUT RESPONSE
Direction:        Android App -> ESP32
Encoding:         UTF-8 ASCII String
Format:           "<latitude>,<longitude>,<accuracy_meters>"
Payload Example:  "19.076090,72.877426,8"
Stream Rate:      Pushed upon phone location change or every 10 seconds.
Freshness Window: ESP32 considers phone GPS valid if received within 120,000 ms (2 min).
Fallback Rule:    If phone GPS > 2 min old or absent, ESP32 falls back to NEO-6M satellite fix.

--------------------------------------------------------------------------------
Name:             CHAR_SYNC_CONTACTS
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26aa
Properties:       WRITE
Direction:        Android App -> ESP32
Encoding:         UTF-8 ASCII String
Format:           "COUNT:<N>;<NUMBER_1>;<NUMBER_2>;...;<NUMBER_N>"
Constraints:      Maximum 5 contacts (N <= 5). Indian E.164 numbers (+91XXXXXXXXXX).
Payload Example:  "COUNT:2;+919876543210;+919811122233"
ESP32 Action:     Writes immediately to non-volatile Flash via Preferences.h ("suraksha" namespace).
Persistence:      Retained across battery removal, deep sleep, and phone disconnections.

--------------------------------------------------------------------------------
Name:             CHAR_MODEM_STATUS
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26ab
Properties:       READ, NOTIFY
Descriptor:       0x2902 (CCCD)
Direction:        ESP32 -> Android App
Encoding:         UTF-8 ASCII String
Format:           "CSQ:<0-31>;REG:<STATUS>;OP:<NAME>;GPS_FIX:<YES|NO>;CONTACTS:<N>"
Fields:
  - CSQ:          Cellular Signal Quality (0-31 from AT+CSQ). 99 = No signal.
  - REG:          Network Registration ("REGISTERED_HOME", "ROAMING", "SEARCHING").
  - OP:           Cellular Operator name from AT+COPS? (e.g. "Jio 4G", "airtel", "Vi").
  - GPS_FIX:      NEO-6M satellite lock ("YES" if TinyGPSPlus valid, "NO" if searching).
  - CONTACTS:     Count of emergency contacts stored in Flash (0 to 5).
Payload Example:  "CSQ:24;REG:REGISTERED_HOME;OP:Jio 4G;GPS_FIX:YES;CONTACTS:2"
Broadcast Rate:   Queried & notified every 10 seconds.

--------------------------------------------------------------------------------
Name:             CHAR_CMD_SMS
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26ac
Properties:       WRITE
Direction:        Android App -> ESP32
Encoding:         UTF-8 ASCII String
Format:           "SEND_TEST_SMS:<PHONE_NUMBER>:<MESSAGE_TEXT>"
Payload Example:  "SEND_TEST_SMS:+919876543210:TEST ALERT: SIMCom A7670C diagnostics verified. Loc: 19.076090,72.877426"
ESP32 Action:     Commands A7670C via AT+CMGS="<NUMBER>" UART sequence.

--------------------------------------------------------------------------------
Name:             CHAR_SMS_RESPONSE
UUID:             beb5483e-36e1-4688-b7f5-ea07361b26ad
Properties:       NOTIFY
Descriptor:       0x2902 (CCCD)
Direction:        ESP32 -> Android App
Encoding:         UTF-8 ASCII String
Format (Success): "OK:<MESSAGE_REF>:<RAW_MODEM_DETAILS>"
Format (Failure): "ERROR:<ERROR_CODE>:<DESCRIPTION>"
Payload Examples: "OK:42:+CMGS 42"
                  "ERROR:MODEM_FAILED:AT+CMGS prompt timeout"
                  "ERROR:NO_SIM:SIM card missing or locked"

--------------------------------------------------------------------------------
3. EMERGENCY SOS DISPATCH SEQUENCE (PHYSICAL BUTTON ACTIVATION)
--------------------------------------------------------------------------------
Step 1: User presses GPIO 4 tactile button. Hardware interrupt detects LOW state.
Step 2: Debounce check verifies millis() - lastButtonPressTime > 10,000 ms.
Step 3: If companion app is connected, ESP32 pushes CHAR_SOS_EVENT ("SOS:PHYSICAL_BUTTON").
Step 4: Location Resolver chooses highest accuracy source:
        a) If Phone GPS received < 120s ago -> uses Phone GPS (±5-15m).
        b) Else if NEO-6M has satellite 3D lock -> uses NEO-6M coordinates.
        c) Else -> uses "Location Unavailable" template.
Step 5: Formats emergency distress SMS:
        "EMERGENCY SOS: I need help! My location: https://maps.google.com/?q=19.076090,72.877426 (Source: PHONE_GPS). Sent via SURAKSHA KEY."
Step 6: Iterates through contacts in Flash memory, invoking A7670C UART driver:
        AT+CMGS="<recipient>"
        <message text><Ctrl+Z (ASCII 26)>
Step 7: Verifies modem confirms with "+CMGS: <ref>\\r\\nOK". Logs dispatch to serial console.
`;
