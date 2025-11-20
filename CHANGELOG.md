# Changelog | BKFZ SubGHz

> [!WARNING]
> **This project is currently under heavy construction and updates are documented here. As of now, it's recommended that you download a stable release for usage. If you encounter any issues or have a suggestion, please report it <a href='https://github.com/BrianWalczak/BKFZ-SubGHz/issues'>here</a>.**

## Roadmap

- [x] Create an app using React Native
  - [x] Welcome Page
  - [x] Connect Device
  - [x] Home Page
  - [x] Record Page
  - [x] Play Page
  - [x] Settings Page
  - [x] Frequency Analyzer
- [x] Add Bluetooth transmission for app compatibility
- [x] Update presets to better match Flipper Zero
- [x] Fix configuration file structures
- [x] Add an option for no RSSI threshold
- [x] Remove JSON and create custom protocol
- [x] Fix page animation to use back motion properly
- [x] Test functionality on iOS devices, make changes
- [x] Create new revamped icons and assets
- [x] Minor code reconstruction to minimize memory usage
- [x] Make improvements for WiFi-based connection (`.html` pages)
- [ ] Make small UI improvements client-side
- [ ] Update `README.md` to improve instructions and clarity

---

## 📱 App Demo (Bluetooth)

https://github.com/user-attachments/assets/b6bdef06-8ae8-4c16-bf7c-1fd887ece572

## 🌐 Web Demo (WiFi / Access Point)

https://github.com/user-attachments/assets/2cbcb2d0-29df-4d65-81d4-cca5f9d6b237

---

## Timeline

### 11/19/2025
- Added support for **Press Start 2P** font on web platform
- Added command events for WebSocket data in `wifi_interface.cpp`
- Patched minor bugs for sending / receiving data with WebSockets
- Added web compatibility for `record.tsx` (update download logic)
- Removed unnecessary functions, phased out `ArduinoJson` from project
- Uploaded initial build of React web app w/ `gzip` compression
- Created connection timeout for WebSockets (`Promise`)
- Added an unexpected disconnect warning message
- Improved clarity across `Serial.println` messages
- Updated message popup logic, and included fade animation
- Quick commit to set Bluetooth as default connection mode
- Fixed critical bug with disabled RSSI threshold

### 11/18/2025
- Created `gzip` compression helper for web exports (brotli not supported on HTTP!)
- Started rebuilding `wifi_interface.cpp`, added static file serving
- Fixed back navigation logic for multi-platform support
- Removed connect page for web platform, created custom `index.tsx` w/ connectivity
- Created other minor improvements / fixes

### 11/17/2025
- Modified array declarations to minimize memory usage
- Fixed comments throughout code for clarity
- Migrated to `expo-document-picker` for web compatibility
- Updated file reading to handle both native and web platforms
- Created separate `GlobalContext.tsx` for native and web platforms
- Started WebSocket implementation in global context
- Created a connect page for web platform
- Updated imports for `@expo/vector-icons` to reduce storage size
- Replaced **Ionicons** and Bluetooth from **MaterialIcons** to **Feather** instead

### 11/14/2025
- Fix bugs and type safety for settings, add null checks
- Remove unused dependencies from `package.json`

### 11/13/2025
- Updated code to properly update settings values
- Fixed mobile app to update settings locally
- Remove unused imports, fix dependency arrays
- Fix Bluetooth scanning with new refactored API

### 11/12/2025
- Added builder methods to send data in mobile app
- Simplified data buffer storage in mobile app
- Removed JSON from code, updated to read binary packets

### 11/11/2025
- Removed status and settings options JSON injection
- Updated mobile app to use new data parser
- Fixed minor bug with settings data
- Fixed critical bug for samples and graphing data (remove `memcpy`)
- Moved `.sub` file creation to be handled client-side
- Made small adjustment to preset max length

### 11/10/2025
- Updated mobile app font to Roboto
- Created new protocol structure in `packets.h`
- Updated methods to send data w/ binary protocol
- Added parser methods for incoming data in mobile app

### 11/05/2025
- Created play page w/ file reading utility, fixed typos
- Added progress percentage display when playing files
- Added smooth button progress bar w/ animation
- Added Bluetooth compatibility for `react-native-permissions`
- Created global toast message and included in layout
- Updated to show welome page by default (fixed page direction)
- Created custom icon, favicon, and splash for mobile app
- Added loader for settings before the page is accessible
- Fixed package versions for compatibility

### 11/04/2025
- Removed unnecessary / deprecated permissions
- Added truncation of text to prevent new lines
- Update Bluetooth permission check for iOS
- Minor UI improvements for connection page
- Added stopped scanning listener to prevent interruptions
- Updated Bluetooth scanning to lower interval for precision
- Clear devices list on disconnect (clear stale results)
- Added global back arrow component for page navigation
- Tested all functionality on iOS devices

### 11/03/2025
- Created settings page with global update logic
- Fixed `detect_rssi` to update locally on changes
- Added async storage to check for new users
- Created welcome page, display for new users
- Added back arrow in connection page
- Created design in **Adobe Illustrator** for welcome page
- Removed faulty dependency for iOS (failed compilation)
- Added and fixed iOS permissions w/ descriptions

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
- Added Bluetooth interface logic and marker checking (Arduino)

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
