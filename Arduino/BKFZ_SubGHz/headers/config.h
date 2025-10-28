#ifndef CONFIG_H
#define CONFIG_H

#define CONNECTION_MODE_WIFI 1
#define CONNECTION_MODE_BLE  2

/* 
----- ESP32 to CC1101 -----
  GND connects to GND
  
  3.3V connects to VCC
  G5 connects to CSN/SS
  G13 connects to SI/MOSI 
  G19 connects to SO/MISO
  G14 connects to SCK
  G16 connects to GDO0
  G18 connects to GDO2
*/

/* CC1101 Pin Configuration */
constexpr int MISO_CPIN = 19;
constexpr int MOSI_CPIN = 13;
constexpr int SCK_CPIN  = 14;
constexpr int CSN_CPIN  = 5;
constexpr int GDO0_CPIN = 16;
constexpr int GDO2_CPIN = 18;

/* Recording Parameters */
constexpr int MAX_SAMPLES = 8000;
constexpr int ERROR_TOLERANCE = 200;

// Choose a connection mode ("WIFI" or "BLE")
#define CONNECTION_MODE CONNECTION_MODE_WIFI

/* WiFi Configuration */
constexpr const char* ssid = "BKFZ SubGHz"; // Set an SSID for the access point
constexpr const char* password = ""; // Set a password for the access point (optional)
constexpr int SERVER_PORT = 80; // Set the desired port for the web interface

/* Bluetooth Configuration */
constexpr const char* DEVICE_NAME = "BKFZ SubGHz"; // Set the bluetooth device name

#endif