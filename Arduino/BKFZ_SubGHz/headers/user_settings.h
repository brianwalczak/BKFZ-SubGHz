#ifndef USERSETTINGS_H
#define USERSETTINGS_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <vector>

const int hopperFrequenciesUSA[] = {
    310000000,
    315000000,
    318000000,
    390000000,
    433920000,
    868350000,
};

struct Settings {
    String preset; // pointer (*) to reference Preset
    int frequency;
    int rssi;
    int detect_rssi;
};

struct SettingsOptions {
  std::vector<String> preset;
  int frequency[17];
  int rssi[11];
};

// Used to display the status of the device (detecting, running, etc.)
struct Status {
    String detect;
    String record;
};

extern Settings settings;
extern SettingsOptions settingsOptions;
extern Status status;
extern Preferences preferences;

String settingsToJson();
String settingsOptionsToJson();
String statusToJson();
void saveSettings();

#endif