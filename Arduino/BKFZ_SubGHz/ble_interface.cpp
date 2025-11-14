#include "headers/interface.h"
#include <headers/config.h> // used to configure basic variables (such as pinout, max samples, etc.)
static uint16_t dataLength = 0;
static std::vector<uint8_t> dataBuffer;

#if CONNECTION_MODE == CONNECTION_MODE_BLE
  #include <BLEDevice.h>
  #include <BLEUtils.h>
  #include <BLEServer.h>
  #include <BLE2902.h>

  #include <headers/user_settings.h> // default user settings and their options
  #include <headers/globals.h> // global variables used across multiple files
  #include <headers/packets.h>

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
      const uint8_t* payload = pCharacteristic->getData();
      size_t payloadLen = pCharacteristic->getLength();

      // append new bytes together
      dataBuffer.insert(dataBuffer.end(), payload, payload + payloadLen);

      // if we're not expecting and have a header, save its length
      if (dataLength == 0 && dataBuffer.size() >= 2) {
        dataLength = (dataBuffer[0] | (dataBuffer[1] << 8));
      }

      // if we're expecting and have a full packet, process it
      while (dataLength != 0 && dataBuffer.size() >= dataLength) {
        std::vector<uint8_t> packet(dataBuffer.begin(), dataBuffer.begin() + dataLength);

        // do stuff with the packet here
        uint16_t p_len = packet[0] | (packet[1] << 8); // extract packet length (2 bytes)
        uint8_t cmd = packet[2]; // extract command (1 byte)

        switch (static_cast<Command>(cmd)) {
          case Command::ANALYZER: {
              const AnalyzerIn* data = reinterpret_cast<const AnalyzerIn*>(packet.data());
              
              status.detect = (data->active == 1) ? "QUEUED" : "IDLE";
              break;
          }
          case Command::RECORD: {
              const RecordIn* data = reinterpret_cast<const RecordIn*>(packet.data());

              if (data->active == 1) {
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

                // get packet size, allocate buffer
                const size_t packetSize = sizeof(RecordOut) + (sampleIndex * sizeof(int16_t));
                uint8_t* buffer = (uint8_t*)malloc(packetSize);
                if (!buffer) return;

                RecordOut* pkt = reinterpret_cast<RecordOut*>(buffer);
                pkt -> p_len = packetSize;
                pkt -> cmd = static_cast<uint8_t>(Command::RECORD);
                pkt -> frequency = settings.frequency;

                strncpy(pkt->preset, settings.preset.c_str(), sizeof(pkt->preset)); // copy safely
                pkt->preset[sizeof(pkt->preset) - 1] = '\0'; // ensure null-term

                for(int i = 0; i < sampleIndex; i++) pkt->samples[i] = (int16_t)samples[i];
                sendData(buffer, packetSize);

                free(buffer); // clean up buffer
                flushSamples(); // flush the samples array once data was transmitted
              }
              break;
          }
          case Command::PLAY: {
              const PlayIn* data = reinterpret_cast<const PlayIn*>(packet.data());
              flushSamples(); // free up memory

              PlayOut pkt;
              pkt.p_len = sizeof(PlayOut);
              pkt.cmd = static_cast<uint8_t>(Command::PLAY);
              pkt.success = true;

              sendData(reinterpret_cast<uint8_t*>(&pkt), sizeof(pkt));

              // Store old settings to revert when done
              String old_preset = settings.preset;
              int old_freq = settings.frequency;

              // Update settings to new data
              settings.preset = String(data->preset);
              settings.frequency = data->frequency;
              Serial.println(F("Now playing file requested by user, successfully updated to file settings."));

              playSignal(data->samples, data->length);

              Serial.println(F("Successfully played file requested, reverting back to old settings."));
              // Revert settings back to original
              settings.preset = old_preset;
              settings.frequency = old_freq;
              break;
          }
          case Command::SETTINGS: {
              const SettingsIn* data = reinterpret_cast<const SettingsIn*>(packet.data());
              const uint8_t* ptr = data->data;
              const uint8_t* end = packet.data() + data->p_len;

              // written mostly by Copilot and slightly modified, I had no idea how to do this lol..
              if (data->method == static_cast<uint8_t>(SettingsMethodCmdIn::SET)) {
                while (ptr < end) {
                  uint8_t key = *ptr++; // first byte = setting key type
                  
                  switch (static_cast<SettingsCmdIn>(key)) {
                    case SettingsCmdIn::SETTING_PRESET: {
                      char text[8]; // we're expecting max 8 bytes
                      uint8_t i = 0;

                      while (ptr < end && i < 7 && *ptr != 0) { // check null-term
                          text[i++] = *ptr++; // copy character, increment by 1 byte
                      }
                      text[i] = '\0'; // ensure null-term

                      if (ptr < end) ptr++; // skip null-term if present
                      settings.preset = String(text);
                      break;
                    }
                    case SettingsCmdIn::SETTING_FREQUENCY: {
                      if (ptr + 4 <= end) {
                          uint32_t freq;
                          memcpy(&freq, ptr, 4); // read uint32_t
                          
                          settings.frequency = freq;
                          ptr += 4; // uint32_t is 4 bytes
                      }

                      break;
                    }
                    case SettingsCmdIn::SETTING_RSSI: {
                      if (ptr < end) {
                          settings.rssi = (int8_t)*ptr++; // int8_t is 1 byte
                      }

                      break;
                    }
                    case SettingsCmdIn::SETTING_DETECT_RSSI: {
                      if (ptr < end) {
                          settings.detect_rssi = (int8_t)*ptr++; // int8_t is 1 byte
                      }

                      break;
                    }
                    default:
                      ptr = end;
                      break;
                  }
                }

                saveSettings(); // Save settings in non-volatile storage
              } else {
                  SettingsOut pkt;
                  pkt.p_len = sizeof(SettingsOut);
                  pkt.cmd = static_cast<uint8_t>(Command::SETTINGS);

                  strncpy(pkt.preset, settings.preset.c_str(), sizeof(pkt.preset)); // copy safely
                  pkt.preset[sizeof(pkt.preset) - 1] = '\0'; // ensure null-term

                  pkt.frequency = settings.frequency;
                  pkt.rssi = settings.rssi;
                  pkt.detect_rssi = settings.detect_rssi;
                  sendData(reinterpret_cast<uint8_t*>(&pkt), sizeof(pkt));
              }
              break;
          }
          default:
              Serial.println(F("Received unknown command via bluetooth, it may have experienced packet loss. :("));
              break;
        }

        // slice off the packet by expected length
        dataBuffer.erase(dataBuffer.begin(), dataBuffer.begin() + dataLength);
        dataLength = 0;

        // if we have leftover with a header, save its length
        if (dataBuffer.size() >= 2) {
          dataLength = (dataBuffer[0] | (dataBuffer[1] << 8));
        }
      }
    }
  };

  void sendData(const uint8_t* data, size_t length) {
    if (deviceConnected) {
      const int MTU_SIZE = BLEDevice::getMTU() - 5; // get negotiated MTU size minus overhead (will be capped at the maximum of 145 on iOS devices, and negotiated to 145 on Android devices)
      
      for (size_t i = 0; i < length; i += MTU_SIZE) {
        int chunkSize = min(MTU_SIZE, (int)(length - i));
        
        pTxCharacteristic->setValue(data + i, chunkSize);
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