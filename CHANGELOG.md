# Changelog | BKFZ SubGHz

> [!WARNING]
> **This project is currently under heavy construction and updates are documented here. As of now, it's recommended that you download a stable release for usage. If you encounter any issues or have a suggestion, please report it <a href='https://github.com/BrianWalczak/BKFZ-SubGHz/issues'>here</a>.**

## Roadmap

- [x] Create an app using React Native
  - [ ] Welcome Page
  - [x] Connect Device
  - [x] Home Page
  - [x] Record Page
  - [ ] Play Page
  - [ ] Settings Page
  - [x] Frequency Analyzer
- [x] Add Bluetooth transmission for app compatibility
- [x] Update presets to better match Flipper Zero
- [x] Fix configuration file structures
- [x] Add an option for no RSSI threshold
- [ ] Major code reconstruction to minimize memory usage
- [ ] Make small UI improvements client-side
- [ ] Improve storage system (maybe device storage?)
- [ ] Remove JSON and create custom protocol

---

## 📱 App Demo (Bluetooth)

https://github.com/user-attachments/assets/7e37f6ab-e881-4d77-856a-7cae88d8f64c

## 🌐 Web Demo (WiFi / Access Point)

_I'm still working on the demo :D_

---

## Timeline

### 10/30/2025
- Created record page w/ file saving implementation
- Created utils.ts for shared functions
- Cleaned up event registering logic for Bluetooth
- Checks for device settings upon connection
- Created frequency analyzer page
- Fix frequency analyzer to check for no values

### 10/29/2025
- Used larger MTU for faster data transmission
- Fixed MTU negotiation for iOS devices
- Minor bug fixes for record page (HTML)
- Added Bluetooth data events to register via pages

### 10/28/2025
- Migrated to LittleFS for better compatibility
- Added simple Bluetooth data logic (notifications)
- Created function to send data via Bluetooth
- Add end markers for writing data, parsed end marker for receiving data
- Added Bluetooth interface logic and marker checking. (Arduino)

### 10/27/2025
- Moved device connection logic to global context
- Added functions for use across pages (BLE)
- Listening for connect/disconnect events
- Add automatic page switching on connection
- Check for existing connections w/ name filtering
- Created home page upon connection
- Move header definitions, create Wi-Fi interface, re-structure (Arduino)
- Created functions to be used across files (Arduino)
- Defined globals.h (mainly used by interfaces)
- Added navigation logic for home page

### 10/26/2025
- Created initial commit for mobile app
- Created a simple warning/error screen
- Added simple Bluetooth logic w/ connection (global context)
- Check for permissions before connection attempts (polling)
- Created UI for displaying Bluetooth devices

### 10/25/2025
- Cleanup code structure
- Added SubGHz recording improvements
- Fixed frequency analyzer bug with listening for data
- Added option for no RSSI threshold
- Updated presets data to better match Flipper Zero
- Simple graphing logic updates client-side (web)