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
    // still working on it!
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