#include "headers/interface.h"
#include <headers/config.h> // used to configure basic variables (such as pinout, max samples, etc.)
static String receivedData = "";

#if CONNECTION_MODE == CONNECTION_MODE_BLE
  #include <BLEDevice.h>
  #include <BLEUtils.h>
  #include <BLEServer.h>
  #include <ArduinoJson.h>
  #include <BLE2902.h>

  #include <headers/user_settings.h> // default user settings and their options
  #include <headers/globals.h> // global variables used across multiple files

  #define SERVICE_UUID "b1513422-2e10-4528-b293-39409019252f" // random service UUID
  #define TX_CHAR_UUID "cffa88bb-f8ac-423b-9031-0266d4f3aec1" // ESP32 to da app
  #define RX_CHAR_UUID "d4f3aec1-423b-9031-0266-cffa88bb1234" // app to da ESP32

  static bool deviceConnected = false;
  static BLECharacteristic *pTxCharacteristic;
  static BLECharacteristic *pRxCharacteristic;
  
  class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    }

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      
      if (status.detect == "RUNNING") {
        status.detect = "IDLE";
        Serial.println(F("A websocket user has been disconnected from Frequency Analyzer."));
      }

      if (status.record == "RUNNING") {
        stopRecording();
        Serial.println(F("A websocket user has been disconnected from Recording."));
      }
      
      BLEDevice::startAdvertising();
    }
  };

  class RxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String data = pCharacteristic->getValue().c_str();
      receivedData += data;

      if (receivedData.endsWith("\n")) {
        receivedData.trim();
        data = receivedData;

        receivedData = "";
      } else {
        return; // wait for more data
      }
      
      if (data.length() > 0) {
        DynamicJsonDocument doc(MAX_SAMPLES + 1024);
        deserializeJson(doc, data);
        JsonObject dataObject = doc["data"]; // Extract the data provided

        if (doc["url"] == "/analyzer") {
            if (dataObject.containsKey("rssi")) {
              settings.detect_rssi = dataObject["rssi"].as<int>();
              Serial.println(F("Updated detect_rssi to "));
              Serial.print(String(settings.detect_rssi));
            }

            if (dataObject.containsKey("active")) {
                if (dataObject["active"] == true) {
                    status.detect = "QUEUED";
                } else if (dataObject["active"] == false) {
                     status.detect = "IDLE";
                }
            }
        }

        if (doc["url"] == "/record") {
            if (dataObject.containsKey("active")) {
              if (dataObject["active"] == true) {
                Serial.println(F("Recording has been successfully started with user settings."));
                startRecording();
              } else { 
                stopRecording();
                Serial.print(F("Found "));
                Serial.print(String(sampleIndex));
                Serial.print(F(" RAW samples, smoothing needed."));
                delay(100);
                smoothenSamples();
                Serial.println(F("Recording has been successfully finished and samples have been smoothened."));

                String prepend = "";
                String presetName = settings.preset;
                int freq_format = settings.frequency;
                presetName.replace("AM270", "FuriHalSubGhzPresetOok270Async");
                presetName.replace("AM650", "FuriHalSubGhzPresetOok650Async");
                presetName.replace("FM238", "FuriHalSubGhzPreset2FSKDev238Async");
                presetName.replace("FM476", "FuriHalSubGhzPreset2FSKDev238Async");

                String result = "Filetype: Flipper SubGhz RAW File\nVersion: 1\n# Created with BKFZ SubGHz\nFrequency: " + String(freq_format) + "\nPreset: " + presetName + "\nProtocol: RAW\nRAW_Data: ";

                if (samples[0] < 0) {
                  for (int i = 0; i < sampleIndex - 1; ++i) {
                    samples[i] = samples[i + 1];
                  }
                  sampleIndex--;
                }

                for (int i = 0; i < sampleIndex; ++i) {
                  String valueToAdd = prepend + String(samples[i]);
                  result += valueToAdd;
                  prepend = " ";
                  if ((i + 1) % 512 == 0) {
                    result += "\nRAW_Data: ";
                    prepend = "";
                  }
                }

                DynamicJsonDocument responseDoc(MAX_SAMPLES + 1024);
                responseDoc["url"] = "/record";
                responseDoc["data"]["success"] = true;
                responseDoc["data"]["samples"] = result;

                String jsonString;
                serializeJson(responseDoc, jsonString);
                sendData(jsonString);
                jsonString.clear(); // clean up json string
                flushSamples(); // flush the samples array once data was transmitted
              }
            }
        }
        
        if (doc["url"] == "/play") {
          if (dataObject.containsKey("samples") && dataObject.containsKey("frequency") && dataObject.containsKey("length") && dataObject.containsKey("preset")) {
            flushSamples(); // free up memory

            String samples = dataObject["samples"].as<String>();
            int reqLength = dataObject["length"].as<int>();
            std::vector<int> reqSamples(reqLength);

            // Reconstruct samples array from response
            DynamicJsonDocument doc(MAX_SAMPLES + 1024);
            deserializeJson(doc, samples);
            JsonArray array = doc.as<JsonArray>();

            for (int i = 0; i < reqLength && i < array.size(); i++) {
                reqSamples[i] = array[i].as<int>();
            }

            DynamicJsonDocument confirmDoc(128);
            confirmDoc["url"] = "/play";
            confirmDoc["data"]["success"] = true;

            String confirmString;
            serializeJson(confirmDoc, confirmString);
            sendData(confirmString);

            // Store old settings to revert when done
            String old_preset = settings.preset;
            int old_freq = settings.frequency;

            // Update settings to new data
            settings.preset = dataObject["preset"].as<String>();
            settings.frequency = dataObject["frequency"].as<int>();
            Serial.println(F("Now playing file requested by user, successfully updated to file settings."));

            playSignal(reqSamples.data(), reqLength);

            Serial.println(F("Successfully played file requested, reverting back to old settings."));
            // Revert settings back to original
            settings.preset = old_preset;
            settings.frequency = old_freq;
          }
        }

        if (doc["url"] == "/settings") {
            DynamicJsonDocument confirmDoc(128);
            confirmDoc["url"] = "/settings";
            
            if (dataObject.containsKey("update") && dataObject["update"] == true) {
                if (dataObject.containsKey("preset")) {
                    settings.preset = dataObject["preset"].as<String>();
                }

                if (dataObject.containsKey("frequency")) {
                    settings.frequency = dataObject["frequency"].as<int>();
                }

                if (dataObject.containsKey("rssi")) {
                    settings.rssi = dataObject["rssi"].as<int>();
                }

                saveSettings(); // Save settings in non-volatile storage
                confirmDoc["data"]["success"] = true;
            } else {
                String setJSON = settingsToJson();
                String setOptionsJSON = settingsOptionsToJson();
                String statusJSON = statusToJson();

                confirmDoc["data"]["settings"] = serialized(setJSON);
                confirmDoc["data"]["options"] = serialized(setOptionsJSON);
                confirmDoc["data"]["status"] = serialized(statusJSON);
            }

            confirmDoc["update"] = (dataObject.containsKey("update") && dataObject["update"] == true) ? true : false;
            String confirmString;
            serializeJson(confirmDoc, confirmString);
            sendData(confirmString);
        }
      }
    }
  };

  void sendData(const String &data) {
    String marked = (data + "\n"); // add \n to serve as the end marker

    if (deviceConnected) {
      const int MTU_SIZE = BLEDevice::getMTU() - 5; // get negotiated MTU size minus overhead (will be capped at the maximum of 145 on iOS devices, and negotiated to 145 on Android devices)
      int dataLen = marked.length();
      
      for (int i = 0; i < dataLen; i += MTU_SIZE) {
        int chunkSize = min(MTU_SIZE, dataLen - i);
        String chunk = marked.substring(i, i + chunkSize);

        pTxCharacteristic->setValue(chunk.c_str());
        pTxCharacteristic->notify();
        delay(10); // small delay to ensure data is sent properly
      }
    }
  }

  void setupDevice() {
    BLEDevice::init("BKFZ SubGHz");

    // Devices running iOS < 10 will request an MTU size of 158. Newer devices running iOS 10 will request an MTU size of 185.
    // https://stackoverflow.com/questions/41977767/negotiate-ble-mtu-on-ios/42336001
    BLEDevice::setMTU(145); // set maximum MTU size (on iOS devices it will be always throttled to 145 since minimum is 158, on Android we'll request this MTU on the app side to keep it as 145 as well)
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    
    BLEService *pService = pServer->createService(SERVICE_UUID);
    
    pTxCharacteristic = pService->createCharacteristic(TX_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
    pTxCharacteristic->addDescriptor(new BLE2902());
    pRxCharacteristic = pService->createCharacteristic(RX_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
    pRxCharacteristic->setCallbacks(new RxCallbacks());
    
    pService->start();
    
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
    
    Serial.println(F("The Bluetooth server is ready for connections."));
  }
#endif