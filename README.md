<h1 align="center">BKFZ SubGHz</h1>
<p align="center">A robust program for your ESP32 to capture and replay SubGHz frequencies, inspired by the Flipper Zero and written in Arduino + React Native.</p>

> [!WARNING]
> **Heads up! Major changes have been made since the previous release. If you encounter any issues, please report them <a href='https://github.com/brianwalczak/BKFZ-SubGHz/issues'>here</a>.**

## Features
- (📻) **Record RAW** - Capture and save SubGHz radio frequencies with a configurable RSSI threshold (saved as `.sub`).
- (📡) **Replay/Emulate RAW** - Easily transmit SubGHz radio frequencies from file (no SD card required).
- (🔍) **Frequency Analyzer** - Scan and analyze nearby devices across multiple frequencies (300-928 MHz).
- (⚙️) **Custom Presets** - Support for various digital modulations and frequency bands with customizable presets.
- (🛜) **Wi-Fi/Bluetooth Connectivity** - Support for both Bluetooth and Wi-Fi based connectivity (web server).
    - (📱) **Mobile App** - Cross-platform mobile application for Bluetooth, powered by React Native (iOS + Android).
    - (🌐) **Web App** -  WebSocket-powered web app for Wi-Fi connectivity, works on any device with a browser.
- (🐬) **Flipper Zero Support** - Built with Flipper Zero native support, allowing you to record and play `.sub` files.
- (🔋) **Portable Design** - Custom PCB design for battery-powered operation with a compact design.
- (👤) **Open Source** Open-source under Apache 2.0 license - contribute or view it anytime.

## Requirements
To start, you'll need (by minimum) an [**ESP32**](https://s.click.aliexpress.com/e/_DCh9q31) [$2.97] of your choice and a [**CC1101 RF Transceiver**](https://s.click.aliexpress.com/e/_DlNeVmT) [$2.01]. You can purchase both of these parts in the links provided.

> [!CAUTION]
> **When choosing a CC1101 module, make sure to select the operating frequency that is most commonly used in your region. The** `433 MHz` **frequency band is generally most common, but this may vary based on the device you're attempting to emulate.<br><br>Your module can use either a [wire antenna](https://s.click.aliexpress.com/e/_DlNeVmT) or an [SMA antenna](https://s.click.aliexpress.com/e/_Dn4dKAr) — both options are compatible.**

If you're looking to build a fully-fledged BKFZ SubGHz device, you'll want to purchase these additional components (about **~$13.03**):
- [2000mAh Lithium Battery](https://s.click.aliexpress.com/e/_DnKGR3V): **$6.03** on AliExpress (**ensure your ESP32 includes a built-in voltage regulator, or attach one separately**)
- [TP4056 Module (5pk)](https://s.click.aliexpress.com/e/_Dd8V8J1): **$1.36** on AliExpress
- [Latching Buttons (10pk)](https://s.click.aliexpress.com/e/_DkSsHEL): **$1.13** on AliExpress 
- [JST 2mm Connectors (10pk)](https://s.click.aliexpress.com/e/_DCTEiy7): **$1.01** on AliExpress 
- [Custom PCB Print](https://github.com/brianwalczak/BKFZ-SubGHz/tree/main/KiCad_PCB#bkfz-subghz---kicad-pcb): **~$3.50** on JLCPCB (w/ shipping)
<br>
<img src="https://github.com/user-attachments/assets/beffe9a9-9035-4349-9055-57c599767048" alt="Assembly Parts" width="400"/>

The custom PCB design, as found [here](https://github.com/brianwalczak/BKFZ-SubGHz/tree/main/KiCad_PCB#bkfz-subghz---kicad-pcb), is specifically designed to work with the 433 MHz module(s) linked above.

## Getting Started
To flash the BKFZ SubGHz program on your ESP32, you'll need to connect the CC1101 module first. By default, the following pinout is used:
| ESP32 | CC1101 |
|----------|----------|
| GND | GND |
| 3.3V | VCC |
| G5 | CSN |
| G13 | MOSI |
| G19 | MISO |
| G14 | SCK |
| G16 | GDO0 |
| G18 | GDO2 |

If you'd like to use a different pinout, you can configure the pins in the `headers/config.h` configuration file.

Additionally, **you'll need to decide which connection mode you'd like to use**. By default, your BKFZ SubGHz device will use Bluetooth Low Energy for communication with the **mobile app**. If you'd like to use Wi-Fi connectivity (or your device does not support the mobile app), you should modify the `CONNECTION_MODE` definition to `CONNECTION_MODE_WIFI` in the configuration file.

**Note:** If possible, Bluetooth connectivity is highly recommended as it's more reliable on mobile devices.

To install the BKFZ SubGHz firmware, you'll need to open this repository in Arduino IDE in the `Arduino/` folder.

---

### Wi-Fi Connection

If you've selected Wi-Fi as the connection mode, you'll need to download and install the [LittleFS Upload](https://github.com/earlephilhower/arduino-littlefs-upload) plugin (you can find instructions on installation in the repository). This plugin is crucial to serve essential files through the web server (CSS, fonts, icons, etc).

Next, you should upload the `data/` files through LittleFS (`Ctrl` + `Shift` + `P`, then `Upload LittleFS to Pico/ESP8266/ESP32`). **Make sure your Serial Monitor is closed during the uploading process.**

---

Lastly, click the `Upload` icon in the Arduino IDE to flash the code on your ESP32. All done!

## Usage
Once you've completed the firmware installation, it's time to access the interface! There are multiple ways to do this, depending on the connection mode you've selected.

### Bluetooth Connection

> [!WARNING]
> Currently, the BKFZ SubGHz mobile app must be sideloaded on your device while I work to publish it on the Google Play Store. Due to App Store restrictions, iOS devices will **always** require manual sideloading through Xcode. Please follow the instructions below to continue.

To access the user interface on a Bluetooth connection, you'll need to download the official **BKFZ SubGHz** app for iPhone or Android.

To compile the application manually, start by installing the required dependencies in this repository:
```bash
git clone https://github.com/brianwalczak/BKFZ-SubGHz.git
cd BKFZ-SubGHz/Application
npm install
```

Next, follow the instructions below based on your device's operating system:

#### iOS Devices
In order to sideload the application to your iPhone, you'll need to install Xcode [here](https://apps.apple.com/us/app/xcode/id497799835) on a Mac and login to an Apple ID (free or paid).

Next, you'll need to download Xcode Command Line Tools for compatibility with Expo:
```bash
xcode-select --install
```

Follow the instructions on your Mac to finish installation, then plug in your iOS device. To begin building the application, run this command:
```bash
npx expo run:ios --device --configuration Release
```

This process may take a few minutes, and the application will be installed to your device once complete. You may need to trust the developer on your iPhone to launch the application (`Settings > General > VPN & Device Management`, under `Developer App`).

#### Android Devices
There are two different ways you can install the BKFZ SubGHz app on your Android device.

- Visit the releases page [here](https://github.com/brianwalczak/BKFZ-SubGHz/releases) to download and install the latest pre-compiled APK.
- Plug in your Android device, then run `npx expo run:android --variant release` (you will need to install [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools)).

### Wi-Fi Connection

1. Open the Wi-Fi settings on your mobile device and connect to the `BKFZ SubGHz` Wi-Fi network (remember, you can configure the SSID and password in the configuration file).
2. Open your browser and navigate to `192.168.4.1` to view the interface.
3. Click the Connect button to establish a connection with the BKFZ SubGHz device (via WebSockets).

If the page is not found, check the `Gateway` IP address of the Wi-Fi network and navigate to the IP address.

**Tip:** If you'd like to add the user interface as a web app to your home screen, you can click `Share > Add to Home Screen` in Safari for iOS, or the 3 dots in Chrome for Android.

## Credits/Authors
This project was made possible by utilizing the following dependencies:
- [`ELECHOUSE_CC1101_SRC_DRV`](https://www.arduino.cc/reference/en/libraries/smartrc-cc1101-driver-lib/) | A library for controlling the CC1101 module, which is commonly used for wireless communication in Arduino projects.
- [`ESPAsyncWebServer`](https://www.arduino.cc/reference/en/libraries/espasyncwebserver/) | A library that enables the creation of web servers on the ESP32 and ESP8266.
- [`React Native`](https://reactnative.dev/) | A popular open-source framework for building native mobile apps using React.
- [`Expo`](https://expo.dev/) | A full-stack React Native framework that makes development, testing, and deployment of apps much easier.
- [`ESP32 Core Libraries`](https://github.com/espressif/arduino-esp32/tree/master/libraries) | A collection of libraries pre-installed on the ESP32 (including Wi-Fi, SPI, LittleFS, Preferences, and much more).
- [`Flipper Zero`](https://github.com/flipperdevices/flipperzero-firmware) | This project couldn't be made possible without the extensive documentation and awesome team over at Flipper Zero ♥

These are just a couple honorable mentions; view the `package.json` and Arduino code for more details!

## FAQ

### Does this project allow me to emulate devices with iButton, NFC/RFID, or Infrared technology?
No, the BKFZ SubGHz can **not** emulate any of these types of devices, unlike the Flipper Zero. This project is specifically focused on replicating the SubGHz functionality of the Flipper Zero. However, it is theoretically possible to achieve this with an ESP32 and the appropriate module (though it's unlikely to happen).

### Do I need a paid Apple Developer account to install the app?
Nope! If you have access to Xcode, you can use a free Apple ID to sideload the app. However, you will need to re-install the application every **7 days** due to iOS restrictions, so it's recommended that you use Wi-Fi connectivity instead. Sorry!

### Do I need to have an internet connection?
You don't need internet access to use the BKFZ SubGHz, however you will need to connect to its Wi-Fi access point if you're using Wi-Fi Connection Mode (learn more [here](#wi-fi-connection-1)).

### Who is maintaining this project behind the scenes?
At the moment, this project is solely developed and maintained by me (thanks to the amazing resources [here](#creditsauthors)). That said, I highly encourage you to contribute to the project by submitting a pull request! It would be greatly appreciated.

### I found a bug or would like to submit feedback.
That's great to hear! You can submit any feedback, or any bugs that you find, on the <a href='https://github.com/brianwalczak/BKFZ-SubGHz/issues'>issues page</a>. I check these very frequently, and I highly encourage you to find bugs.

### I love this project! How can I support its maintenance?
I'm glad to hear that you find this project useful! If you'd like to support this project and its development, you can send me a tip <a href='https://ko-fi.com/brianwalczak'>here</a> 😁

<br>
  <p align="center">Made with ♡ by <a href="https://www.brianwalczak.com">Briann</a></p>
