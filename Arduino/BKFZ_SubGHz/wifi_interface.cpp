#include "headers/interface.h"

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

#include <headers/config.h> // used to configure basic variables (such as pinout, max samples, etc.)
#include <headers/user_settings.h> // default user settings and their options

#if CONNECTION_MODE == CONNECTION_MODE_WIFI
  std::function<void(std::function<void(bool)>)> playRequestHandler = nullptr;
  std::function<void(const std::vector<int>&, int, const String&, const String&)> playHandler = nullptr;
  std::function<void(const String&, int, int)> settingsHandler = nullptr;
  std::function<void()> analyzerHandler = nullptr;

  AsyncWebServer server(SERVER_PORT);
  AsyncWebSocket ws("/ws");

  void registerPlayRequest(std::function<void(std::function<void(bool)>)> handler) {
    playRequestHandler = handler;
  }

  void registerPlay(std::function<void(const std::vector<int>&, int, const String&, const String&)> handler) {
    playHandler = handler;
  }

  void registerAnalyzer(std::function<void()> handler) {
    analyzerHandler = handler;
  }

  void registerSettings(std::function<void(const String&, int, int)> handler) {
    settingsHandler = handler;
  }

  void sendData(const String &data) {
    if (ws.count() > 0) {
      ws.textAll(data);
    }
  }

  // Simple function to inject settings w/ options in window (used for web server)
  String injectSettings() {
    String setJSON = settingsToJson();
    String setOptionsJSON = settingsOptionsToJson();
    String statusJSON = statusToJson();

    String setScript = "<script>window.settings = " + setJSON + "</script>";
    String setOptionsScript = "<script>window.settings.options = " + setOptionsJSON + "</script>";
    String statusScript = "<script>window.settings.status = " + statusJSON + "</script>";

    return setScript + setOptionsScript + statusScript;
  }

  /*
  // Event handler for web sockets (mainly used for Frequency Analyzer as quick data transmission)
  void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type, void* arg, uint8_t* data, size_t len) {
    switch(type) {
      case WS_EVT_CONNECT:
        break;

      case WS_EVT_DISCONNECT:
        ws.cleanupClients();

        if (status.detect == "RUNNING") {
          status.detect = "IDLE";
          Serial.println(F("A websocket user has been disconnected from Frequency Analyzer."));
        }

        if (status.record == "RUNNING") {
          stopRecording();
          Serial.println(F("A websocket user has been disconnected from Recording."));
        }
        break;
      case WS_EVT_ERROR:
        Serial.printf("WebSocket error: %s\n", (char*)arg);
        break;
      case WS_EVT_DATA: {
        if (len > 0) {
          DynamicJsonDocument doc(MAX_SAMPLES + 1024);
          deserializeJson(doc, data, len);
          JsonObject dataObject = doc["data"]; // Extract the data provided

          if (doc["url"] == "/analyzer") {
            if (dataObject.containsKey("rssi")) {
              settings.detect_rssi = dataObject["rssi"].as<int>();
              Serial.println(F("Updated detect_rssi to "));
              Serial.print(String(settings.detect_rssi));
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
                ws.textAll(jsonString);
                jsonString.clear(); // clean up json string
                flushSamples(); // flush the samples array once data was transmitted
              }
            }
          }
        }
        break;
      }
      
      default:
        break;
    }
  }
  */

  void setupDevice() {
    WiFi.softAP(ssid, password);
    IPAddress IP = WiFi.softAPIP();

    if (!SPIFFS.begin(true)) {
      Serial.println(F("An error has occurred while mounting SPIFFS. Please check if SPIFFS is properly installed."));
      return;
    }

    server.serveStatic("/assets", SPIFFS, "/assets");

    server.on("/", HTTP_GET, [] (AsyncWebServerRequest *request) {
      File file = SPIFFS.open("/home.html", "r");
      String content = file.readString();

      file.close();
      request->send(200, "text/html", content);
    });

    server.on("/record", HTTP_GET, [] (AsyncWebServerRequest *request) {
      File file = SPIFFS.open("/record.html", "r");
      String content = file.readString();

      file.close();
      request->send(200, "text/html", injectSettings() + content);
    });

    server.on("/play", HTTP_GET, [] (AsyncWebServerRequest *request) {
      File file = SPIFFS.open("/play.html", "r");
      String content = file.readString();

      file.close();
      request->send(200, "text/html", content);
    });

    server.on("/analyzer", HTTP_GET, [] (AsyncWebServerRequest *request) {
      File file = SPIFFS.open("/frequency_analyzer.html", "r");
      String content = file.readString();

      if (analyzerHandler) {
        analyzerHandler();
      }

      file.close();
      request->send(200, "text/html", injectSettings() + content);
    });

    server.on("/settings", HTTP_GET, [] (AsyncWebServerRequest *request) {
      File file = SPIFFS.open("/settings.html", "r");
      String content = file.readString();

      file.close();
      request->send(200, "text/html", injectSettings() + content);
    });

    server.on("/api/play", HTTP_POST, [](AsyncWebServerRequest *request) {
      if (!playRequestHandler || !playHandler) {
        request->send(500, "text/plain", "It looks like your BKFZ SubGHz is still initializing, please try again shortly.");
        return;
      }

      if (!(request->hasParam("samples", true) && request->hasParam("frequency", true) && request->hasParam("length", true) && request->hasParam("preset", true))) {
        request->send(400, "text/plain", "The required parameters were not provided.");
        return;
      }

      playRequestHandler([request](bool approved) {
        if (!approved) {
          request->send(403, "text/plain", "Recording request rejected by controller");
          return;
        }

        String samplesParam = request->getParam("samples", true)->value();
        String frequencyParam = request->getParam("frequency", true)->value();
        String lengthParam = request->getParam("length", true)->value();
        String presetParam = request->getParam("preset", true)->value();
        int reqLength = lengthParam.toInt();
        std::vector<int> reqSamples(reqLength);

        // Reconstruct samples array from response
        DynamicJsonDocument doc(MAX_SAMPLES + 1024);
        deserializeJson(doc, samplesParam);
        JsonArray array = doc.as<JsonArray>();

        for (int i = 0; i < reqLength && i < array.size(); i++) {
          reqSamples[i] = array[i].as<int>();
        }

        // Send back the data once destructured
        playHandler(reqSamples, reqLength, frequencyParam, presetParam);
        request->send(200, "text/plain", "Recording has been placed in queue.");
      });
    });

    server.on("/api/settings", HTTP_POST, [](AsyncWebServerRequest *request) {
      if (request->hasParam("preset", true) && request->hasParam("frequency", true) && request->hasParam("rssi", true)) {
        String frequencyParam = request->getParam("frequency", true)->value();
        String rssiParam = request->getParam("rssi", true)->value();
        String preset = request->getParam("preset", true)->value();
        int frequency = frequencyParam.toInt();
        int rssi = rssiParam.toInt();

        if (settingsHandler) {
          settingsHandler(preset, frequency, rssi);
        }

        request->redirect("/settings?success=true");
      } else {
        request->redirect("/settings?success=false");
      }
    });

    // ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    server.begin();

    Serial.println(F("The web server is ready with an IP address of "));
    Serial.println(IP);
  }
#endif