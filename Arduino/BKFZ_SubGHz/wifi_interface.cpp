#include "headers/interface.h"
#include <headers/config.h>

#if CONNECTION_MODE == CONNECTION_MODE_WIFI
  #include <WiFi.h>
  #include <ESPAsyncWebServer.h>
  #include <AsyncTCP.h>
  #include <LittleFS.h>

  #include <headers/user_settings.h>
  #include <headers/globals.h>
  #include <headers/packets.h>

  AsyncWebServer server(SERVER_PORT);
  AsyncWebSocket ws("/ws");

  void sendData(const uint8_t* data, size_t length) {
    if (ws.count() > 0) {
      ws.binaryAll(data, length);
    }
  }

  void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type, void* arg, uint8_t* data, size_t len) {
    switch(type) {
      case WS_EVT_CONNECT:
        break;
      case WS_EVT_DISCONNECT:
        ws.cleanupClients();
        
        if (status.detect == "RUNNING") {
          status.detect = "IDLE";
        }

        if (status.record == "RUNNING") {
          stopRecording();
        }

        break;
      case WS_EVT_ERROR:
        Serial.printf("WebSocket error: %s\n", (char*)arg);
        break;
      case WS_EVT_DATA: {
        Serial.println(F("Received data via websocket."));
        std::vector<uint8_t> packet(data, data + len);
        
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

        break;
      }
      default:
        break;
    }
  }

  void setupDevice() {
    WiFi.softAP(ssid, password);
    IPAddress IP = WiFi.softAPIP();

    if (!LittleFS.begin(true)) {
      Serial.println(F("An error has occurred while mounting LittleFS. Please check if LittleFS is properly installed."));
      return;
    }

    server.serveStatic("/", LittleFS, "/");

    server.onNotFound([](AsyncWebServerRequest *request) {
      String path = request->url();

      if (path.endsWith("/")) {
        path += "index.html";
      }

      // annoyingly find the content type based on file extension :(
      String contentType = "text/plain";
      if (path.endsWith(".html")) contentType = "text/html";
      else if (path.endsWith(".js")) contentType = "application/javascript";
      else if (path.endsWith(".json")) contentType = "application/json";
      else if (path.endsWith(".png")) contentType = "image/png";
      else if (path.endsWith(".ttf")) contentType = "application/x-font-ttf";

      if (!LittleFS.exists(path + ".gz")) {
        path = "/index.html";
        contentType = "text/html";
      }

      AsyncWebServerResponse *response = request->beginResponse(LittleFS, path + ".gz", contentType);
      response->addHeader("Content-Encoding", "gzip");
      request->send(response);
    });

    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    server.begin();

    Serial.println(F("The web server is ready with an IP address of "));
    Serial.println(IP);
  }
#endif