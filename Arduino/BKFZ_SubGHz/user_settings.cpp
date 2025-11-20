#include "headers/user_settings.h"
Preferences preferences;

/* Documentation & References /*
# We should have a minimum RSSI of -85 and maximum of -40 (w/ steps of 5).
  https://github.com/flipperdevices/flipperzero-firmware/blob/5272eb75500bca6927947f15f6d2aa828a6ab3b2/applications/main/subghz/scenes/subghz_scene_receiver_config.c#L15

# A great guide exists explaining the presets that Flipper Zero utilizes, as well as other SubGHz features.
  https://github.com/jamisonderek/flipper-zero-tutorials/wiki/Sub-GHz#read-raw---subghz

# You can also reference the Flipper Zero official firmware source code for CC1101 configurations.
  https://github.com/flipperdevices/flipperzero-firmware/blob/7c88a4a8f1062063b74277c03617fb9e083e538b/lib/subghz/devices/cc1101_configs.c#L76
*/

// Settings which contains default presets (can be updated through the website)
Settings settings = {
  "AM650", // Preset
  433920000, // Frequency
  -65, // Overall RSSI threshold
  -40 // RSSI threshold for Frequency Analyzer ONLY (added for ease-of-use, made it low to prevent noise)
};

// Array which contains the current status of the device
Status status = {
  "IDLE", // Detect (frequency analyzer)
  "IDLE" // Recording (record)
};

// Loads the saved settings/configurations from non-volatile storage
void loadSettings() {
  preferences.begin("settings", false);

  settings.preset = preferences.getString("preset", settings.preset);
  settings.frequency = preferences.getInt("frequency", settings.frequency);
  settings.rssi = preferences.getInt("rssi", settings.rssi);
  settings.detect_rssi = preferences.getInt("detect_rssi", settings.detect_rssi);
  
  preferences.end();
}

// Saves the current settings/configurations as non-volatile storage
void saveSettings() {
  preferences.begin("settings", false); // Open Preferences storage w/ settings

  // Update all values in stored settings to the current settings
  preferences.putString("preset", settings.preset);
  preferences.putInt("frequency", settings.frequency);
  preferences.putInt("rssi", settings.rssi);
  preferences.putInt("detect_rssi", settings.detect_rssi);

  preferences.end(); // Close Preferences when finished.
}