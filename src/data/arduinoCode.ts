/**
 * SURAKSHA KEY - Production-Grade ESP32 C++ Firmware
 * Hardware Architecture:
 *  - ESP32 WROOM-32 Dev Module
 *  - SIMCom A7670C 4G LTE Cellular Modem (UART2: RX=16, TX=17)
 *  - u-blox NEO-6M GPS Module (UART1: RX=26, TX=27)
 *  - Tactile SOS Push Button (GPIO 4, Active LOW with Internal Pull-Up)
 *  - ESP32 NVS Flash Storage via Preferences.h for autonomous contact retention
 * 
 * NOTE: As per hardware design, no buzzer, flash LED, vibration motor, or Wi-Fi.
 */

export const ARDUINO_FIRMWARE_CODE = `/*
 * ======================================================================================
 *  SURAKSHA KEY - ESP32 Physical Women's Safety Keychain Firmware (v3.0.0)
 *  Autonomous Physical SOS + SIMCom A7670C 4G + NEO-6M GPS + BLE Companion Link
 * ======================================================================================
 *  
 *  Target Hardware:
 *    - ESP32 Dev Module (ESP-WROOM-32)
 *    - SIMCom A7670C 4G LTE Cat-1 Modem (HardwareSerial 2: RX=16, TX=17)
 *    - u-blox NEO-6M GPS Module (HardwareSerial 1: RX=26, TX=27)
 *    - Physical SOS Button (GPIO 4: Active LOW with internal INPUT_PULLUP)
 *    - Non-Volatile Flash Memory (Preferences.h) for Autonomous Contact Storage
 * 
 *  GATT BLE Specifications:
 *    - Device Advertising Name: "SURAKSHA-KEY"
 *    - Service UUID:         4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *    - CHAR_SOS_EVENT:       beb5483e-36e1-4688-b7f5-ea07361b26a8 (Notify)
 *    - CHAR_PHONE_GPS:       beb5483e-36e1-4688-b7f5-ea07361b26a9 (Write)
 *    - CHAR_SYNC_CONTACTS:   beb5483e-36e1-4688-b7f5-ea07361b26aa (Write)
 *    - CHAR_MODEM_STATUS:    beb5483e-36e1-4688-b7f5-ea07361b26ab (Read/Notify)
 *    - CHAR_CMD_SMS:         beb5483e-36e1-4688-b7f5-ea07361b26ac (Write)
 *    - CHAR_SMS_RESPONSE:    beb5483e-36e1-4688-b7f5-ea07361b26ad (Notify)
 * ======================================================================================
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <Preferences.h>

// ---------- PIN DEFINITIONS ----------
#define PIN_SOS_BUTTON     4    // Tactile push button (Active LOW)
#define GSM_RX_PIN         16   // ESP32 RX2 <- A7670C TX
#define GSM_TX_PIN         17   // ESP32 TX2 -> A7670C RX
#define GPS_RX_PIN         26   // ESP32 RX1 <- NEO-6M TX
#define GPS_TX_PIN         27   // ESP32 TX1 -> NEO-6M RX

// ---------- BLE UUID CONSTANTS ----------
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SOS_EVENT      "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_PHONE_GPS      "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_SYNC_CONTACTS  "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_MODEM_STATUS   "beb5483e-36e1-4688-b7f5-ea07361b26ab"
#define CHAR_CMD_SMS        "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_SMS_RESPONSE   "beb5483e-36e1-4688-b7f5-ea07361b26ad"

// ---------- HARDWARE SERIAL INSTANCES ----------
HardwareSerial modemSerial(2); // SIMCom A7670C 4G UART
HardwareSerial gpsSerial(1);   // u-blox NEO-6M GPS UART
TinyGPSPlus gps;
Preferences prefs;             // ESP32 Non-Volatile Flash Storage

// ---------- RUNTIME STATE ----------
BLEServer* pServer = nullptr;
BLECharacteristic* pCharSos = nullptr;
BLECharacteristic* pCharModemStatus = nullptr;
BLECharacteristic* pCharSmsResponse = nullptr;

bool bleDeviceConnected = false;
bool oldBleDeviceConnected = false;

// Cached Phone GPS (streamed from companion Android app over BLE)
double phoneLat = 0.0;
double phoneLng = 0.0;
float phoneAccuracy = 0.0;
unsigned long phoneGpsTimestamp = 0;
bool hasValidPhoneGps = false;

// Stored Contacts Cache (loaded from Preferences Flash)
#define MAX_SAVED_CONTACTS 5
String savedContacts[MAX_SAVED_CONTACTS];
int savedContactCount = 0;

// Modem Cache
int modemCsq = 0;
String modemOperator = "";
String modemRegStatus = "SEARCHING";
bool modemSimReady = false;

// Button Debounce & Retrigger Policy
unsigned long lastButtonPressTime = 0;
const unsigned long SOS_COOLDOWN_MS = 10000; // 10-second lockout prevents duplicate SMS storms from switch bounce

// Function Prototypes
void initModemA7670C();
void pollModemStatus();
bool sendSmsViaA7670C(const String& phoneNumber, const String& messageText, String& outRef);
String queryAtCommand(const String& command, unsigned long timeoutMs = 2000);
void triggerAutonomousSosAlert();
void loadContactsFromFlash();
void saveContactsToFlash(const String& payload);

// ---------- BLE SERVER CALLBACKS ----------
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleDeviceConnected = true;
    Serial.println("[BLE] Companion Android App Connected.");
  }

  void onDisconnect(BLEServer* pServer) {
    bleDeviceConnected = false;
    Serial.println("[BLE] Companion Android App Disconnected. Restarting Advertising...");
    pServer->startAdvertising();
  }
};

// ---------- BLE PHONE GPS CHARACTERISTIC CALLBACKS ----------
class PhoneGpsCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String value = pChar->getValue().c_str();
    if (value.length() > 0) {
      Serial.print("[BLE RX] Phone GPS: ");
      Serial.println(value);

      // Expected format: "lat,lng,accuracy" e.g. "19.076090,72.877426,8"
      int comma1 = value.indexOf(',');
      int comma2 = value.indexOf(',', comma1 + 1);
      if (comma1 > 0 && comma2 > comma1) {
        phoneLat = value.substring(0, comma1).toDouble();
        phoneLng = value.substring(comma1 + 1, comma2).toDouble();
        phoneAccuracy = value.substring(comma2 + 1).toFloat();
        phoneGpsTimestamp = millis();
        hasValidPhoneGps = true;
        Serial.printf("[GPS] Updated Phone Location: %.6f, %.6f (±%.1fm)\\n", phoneLat, phoneLng, phoneAccuracy);
      }
    }
  }
};

// ---------- BLE CONTACT SYNCHRONIZATION CALLBACKS ----------
class SyncContactsCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String payload = pChar->getValue().c_str();
    Serial.println("[BLE RX] Synchronizing Emergency Contacts to NVS Flash...");
    saveContactsToFlash(payload);
  }
};

// ---------- BLE TEST SMS COMMAND CALLBACKS ----------
class CommandSmsCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String cmd = pChar->getValue().c_str();
    Serial.print("[BLE RX] SMS Command: ");
    Serial.println(cmd);

    // Format: "SEND_TEST_SMS:+919876543210:message text..."
    if (cmd.startsWith("SEND_TEST_SMS:")) {
      int firstColon = cmd.indexOf(':');
      int secondColon = cmd.indexOf(':', firstColon + 1);
      if (secondColon > firstColon) {
        String targetPhone = cmd.substring(firstColon + 1, secondColon);
        String msgText = cmd.substring(secondColon + 1);

        String messageRef = "";
        bool success = sendSmsViaA7670C(targetPhone, msgText, messageRef);

        if (pCharSmsResponse != nullptr && bleDeviceConnected) {
          String respPayload = success
            ? ("OK:" + messageRef + ":+CMGS " + messageRef)
            : ("ERROR:MODEM_FAILED:AT+CMGS error");
          pCharSmsResponse->setValue(respPayload.c_str());
          pCharSmsResponse->notify();
        }
      }
    }
  }
};

// ---------- ARDUINO SETUP ----------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n==================================================");
  Serial.println("  SURAKSHA KEY - Hardware Boot Sequence Starting  ");
  Serial.println("==================================================");

  // 1. Configure Hardware SOS Button
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);

  // 2. Load Persistently Stored Contacts from ESP32 Flash
  loadContactsFromFlash();

  // 3. Initialize NEO-6M GPS Serial
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] NEO-6M Serial initialized on GPIO 26(RX) & 27(TX)");

  // 4. Initialize SIMCom A7670C 4G Modem Serial
  modemSerial.begin(115200, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  Serial.println("[4G] SIMCom A7670C Serial initialized on GPIO 16(RX) & 17(TX)");
  initModemA7670C();

  // 5. Initialize Bluetooth Low Energy (BLE) GATT Server
  BLEDevice::init("SURAKSHA-KEY");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  // SOS Event (Notify)
  pCharSos = pService->createCharacteristic(
    CHAR_SOS_EVENT,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharSos->addDescriptor(new BLE2902());

  // Phone GPS (Write)
  BLECharacteristic* pCharPhoneGps = pService->createCharacteristic(
    CHAR_PHONE_GPS,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharPhoneGps->setCallbacks(new PhoneGpsCallbacks());

  // Contacts Synchronization (Write)
  BLECharacteristic* pCharSync = pService->createCharacteristic(
    CHAR_SYNC_CONTACTS,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharSync->setCallbacks(new SyncContactsCallbacks());

  // Modem Status Telemetry (Read & Notify)
  pCharModemStatus = pService->createCharacteristic(
    CHAR_MODEM_STATUS,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharModemStatus->addDescriptor(new BLE2902());

  // Command Test SMS (Write)
  BLECharacteristic* pCharCmdSms = pService->createCharacteristic(
    CHAR_CMD_SMS,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharCmdSms->setCallbacks(new CommandSmsCallbacks());

  // SMS Response (Notify)
  pCharSmsResponse = pService->createCharacteristic(
    CHAR_SMS_RESPONSE,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharSmsResponse->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started as 'SURAKSHA-KEY'");
  Serial.println("[STATUS] SURAKSHA KEY is armed and ready.");
}

// ---------- ARDUINO MAIN LOOP ----------
void loop() {
  // Feed incoming NEO-6M GPS NMEA stream
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Check Physical SOS Button (Active LOW with debounce and cooldown)
  if (digitalRead(PIN_SOS_BUTTON) == LOW) {
    if (millis() - lastButtonPressTime > SOS_COOLDOWN_MS) {
      lastButtonPressTime = millis();
      Serial.println("\\n>>> [EMERGENCY ALERT] PHYSICAL SOS BUTTON ACTIVATED! <<<");
      triggerAutonomousSosAlert();
    }
  }

  // Periodic Telemetry Update (every 10 seconds)
  static unsigned long lastTelemetryUpdate = 0;
  if (millis() - lastTelemetryUpdate > 10000) {
    lastTelemetryUpdate = millis();
    pollModemStatus();
  }

  delay(20);
}

// ---------- EMERGENCY DISPATCH ROUTINE ----------
void triggerAutonomousSosAlert() {
  // 1. Notify Companion App over BLE if connected
  if (pCharSos != nullptr && bleDeviceConnected) {
    pCharSos->setValue("SOS:PHYSICAL_BUTTON");
    pCharSos->notify();
    Serial.println("[BLE TX] Notified companion app of physical SOS button event.");
  }

  // 2. Select Location Source
  double alertLat = 0.0;
  double alertLng = 0.0;
  String locationSource = "NONE";

  // Check Phone GPS first (valid if updated within last 2 minutes)
  if (hasValidPhoneGps && (millis() - phoneGpsTimestamp < 120000)) {
    alertLat = phoneLat;
    alertLng = phoneLng;
    locationSource = "PHONE_GPS";
  } else if (gps.location.isValid()) {
    alertLat = gps.location.lat();
    alertLng = gps.location.lng();
    locationSource = "NEO6M_GPS";
  }

  // 3. Compose SMS Text
  String smsBody = "";
  if (locationSource != "NONE") {
    smsBody = "EMERGENCY SOS: I need help! My location: https://maps.google.com/?q=" +
              String(alertLat, 6) + "," + String(alertLng, 6) +
              " (Source: " + locationSource + "). Sent via SURAKSHA KEY.";
  } else {
    smsBody = "EMERGENCY SOS: I need help! Location is currently unavailable. Sent via SURAKSHA KEY.";
  }

  // 4. Send SMS to all Synchronized Contacts stored in NVS Flash
  if (savedContactCount == 0) {
    Serial.println("[ALERT ERROR] No emergency contacts stored in Flash memory!");
    return;
  }

  for (int i = 0; i < savedContactCount; i++) {
    String phone = savedContacts[i];
    Serial.printf("[ALERT] Transmitting SMS to contact %d: %s\\n", i + 1, phone.c_str());
    String ref = "";
    sendSmsViaA7670C(phone, smsBody, ref);
    delay(1000); // Wait between SMS dispatches
  }
}

// ---------- A7670C MODEM DRIVER ----------
void initModemA7670C() {
  Serial.println("[4G] Configuring SIMCom A7670C modem...");
  queryAtCommand("AT", 1000);
  queryAtCommand("ATE0", 1000);        // Echo OFF
  queryAtCommand("AT+CPIN?", 2000);    // SIM status
  queryAtCommand("AT+CMGF=1", 1000);   // SMS Text Mode
  queryAtCommand("AT+CSCS=\\"GSM\\"", 1000); // Standard GSM character set
  pollModemStatus();
}

void pollModemStatus() {
  // Query Signal Strength
  String csqResp = queryAtCommand("AT+CSQ", 1000);
  int csqIdx = csqResp.indexOf("+CSQ: ");
  if (csqIdx >= 0) {
    modemCsq = csqResp.substring(csqIdx + 6, csqResp.indexOf(',', csqIdx)).toInt();
  }

  // Query Network Registration
  String cregResp = queryAtCommand("AT+CREG?", 1000);
  if (cregResp.indexOf(",1") >= 0) modemRegStatus = "REGISTERED_HOME";
  else if (cregResp.indexOf(",5") >= 0) modemRegStatus = "ROAMING";
  else modemRegStatus = "SEARCHING";

  // Query Operator
  String copsResp = queryAtCommand("AT+COPS?", 1500);
  int quote1 = copsResp.indexOf('\\"');
  if (quote1 >= 0) {
    int quote2 = copsResp.indexOf('\\"', quote1 + 1);
    if (quote2 > quote1) {
      modemOperator = copsResp.substring(quote1 + 1, quote2);
    }
  }

  // Broadcast Telemetry over BLE
  if (pCharModemStatus != nullptr && bleDeviceConnected) {
    String statusPayload = "CSQ:" + String(modemCsq) +
                           ";REG:" + modemRegStatus +
                           ";OP:" + modemOperator +
                           ";GPS_FIX:" + (gps.location.isValid() ? "YES" : "NO") +
                           ";CONTACTS:" + String(savedContactCount);
    pCharModemStatus->setValue(statusPayload.c_str());
    pCharModemStatus->notify();
  }
}

bool sendSmsViaA7670C(const String& phoneNumber, const String& messageText, String& outRef) {
  Serial.println("[A7670C] Starting SMS Transmission to: " + phoneNumber);

  // Clean phone number (remove spaces)
  String cleanPhone = phoneNumber;
  cleanPhone.replace(" ", "");

  // Clear serial buffer
  while (modemSerial.available()) modemSerial.read();

  // 1. Send AT+CMGS command
  modemSerial.print("AT+CMGS=\\"");
  modemSerial.print(cleanPhone);
  modemSerial.println("\\"");

  // Wait for '>' prompt from A7670C
  unsigned long startWait = millis();
  bool gotPrompt = false;
  while (millis() - startWait < 5000) {
    if (modemSerial.available()) {
      char c = modemSerial.read();
      if (c == '>') {
        gotPrompt = true;
        break;
      }
    }
    delay(5);
  }

  if (!gotPrompt) {
    Serial.println("[A7670C ERROR] Did not receive '>' prompt from modem.");
    return false;
  }

  // 2. Send SMS Body followed by CTRL+Z (ASCII 26)
  modemSerial.print(messageText);
  modemSerial.write(26);

  // 3. Wait for +CMGS confirmation response
  startWait = millis();
  String resp = "";
  bool success = false;
  while (millis() - startWait < 15000) {
    if (modemSerial.available()) {
      char c = modemSerial.read();
      resp += c;
      if (resp.indexOf("OK") >= 0) {
        success = true;
        break;
      }
      if (resp.indexOf("ERROR") >= 0) {
        success = false;
        break;
      }
    }
    delay(10);
  }

  Serial.println("[A7670C RESP] " + resp);

  int cmgsIdx = resp.indexOf("+CMGS: ");
  if (cmgsIdx >= 0) {
    outRef = resp.substring(cmgsIdx + 7, resp.indexOf('\\r', cmgsIdx));
    outRef.trim();
  } else {
    outRef = "SENT";
  }

  return success;
}

String queryAtCommand(const String& command, unsigned long timeoutMs) {
  while (modemSerial.available()) modemSerial.read();
  modemSerial.println(command);

  unsigned long start = millis();
  String response = "";
  while (millis() - start < timeoutMs) {
    if (modemSerial.available()) {
      char c = modemSerial.read();
      response += c;
    }
    delay(2);
  }
  return response;
}

// ---------- FLASH STORAGE (PREFERENCES.H) ----------
void loadContactsFromFlash() {
  prefs.begin("suraksha", true); // Read-only mode
  savedContactCount = prefs.getInt("count", 0);
  Serial.printf("[NVS] Loading %d contacts from ESP32 Flash memory:\\n", savedContactCount);

  for (int i = 0; i < savedContactCount; i++) {
    String key = "c" + String(i);
    savedContacts[i] = prefs.getString(key.c_str(), "");
    Serial.printf("  - Contact %d: %s\\n", i + 1, savedContacts[i].c_str());
  }
  prefs.end();
}

void saveContactsToFlash(const String& payload) {
  // Format: "COUNT:2;+919876543210;+919811122233"
  prefs.begin("suraksha", false); // Read-Write mode
  prefs.clear();

  int countStart = payload.indexOf("COUNT:");
  int semi1 = payload.indexOf(';', countStart);
  if (countStart >= 0 && semi1 > countStart) {
    int count = payload.substring(countStart + 6, semi1).toInt();
    if (count > MAX_SAVED_CONTACTS) count = MAX_SAVED_CONTACTS;

    savedContactCount = 0;
    int currentPos = semi1 + 1;
    for (int i = 0; i < count; i++) {
      int nextSemi = payload.indexOf(';', currentPos);
      String number = "";
      if (nextSemi > 0) {
        number = payload.substring(currentPos, nextSemi);
        currentPos = nextSemi + 1;
      } else {
        number = payload.substring(currentPos);
      }
      number.trim();
      if (number.length() > 0) {
        savedContacts[savedContactCount] = number;
        String key = "c" + String(savedContactCount);
        prefs.putString(key.c_str(), number);
        savedContactCount++;
      }
    }
    prefs.putInt("count", savedContactCount);
    Serial.printf("[NVS] Successfully stored %d contacts in ESP32 Flash memory.\\n", savedContactCount);
  }
  prefs.end();
}
`;
