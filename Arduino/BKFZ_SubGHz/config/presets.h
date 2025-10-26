#ifndef CC1101PRESETS_H
#define CC1101PRESETS_H

#include <ELECHOUSE_CC1101_SRC_DRV.h>

/* Documentation & References /*
# We should have a minimum RSSI of -85 and maximum of -40 (w/ steps of 5).
  https://github.com/flipperdevices/flipperzero-firmware/blob/5272eb75500bca6927947f15f6d2aa828a6ab3b2/applications/main/subghz/scenes/subghz_scene_receiver_config.c#L15

# A great guide exists explaining the presets that Flipper Zero utilizes, as well as other SubGHz features.
  https://github.com/jamisonderek/flipper-zero-tutorials/wiki/Sub-GHz#read-raw---subghz

# You can also reference the Flipper Zero official firmware source code for CC1101 configurations.
  https://github.com/flipperdevices/flipperzero-firmware/blob/7c88a4a8f1062063b74277c03617fb9e083e538b/lib/subghz/devices/cc1101_configs.c#L76
*/

const uint8_t AM270[] = {
    CC1101_IOCFG0, 0x0D, // GD0 as async serial data output/input
    CC1101_FIFOTHR, 0x47, // RX FIFO and TX FIFO thresholds
    CC1101_PKTCTRL0, 0x32, // Async, continious, no whitening
    CC1101_FSCTRL1, 0x06, // Frequency synthesizer control (152343.75Hz)

    /* Modem Configuration */
    CC1101_MDMCFG0, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG1, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG2, 0x30, // Format ASK/OOK, no preamble/sync
    CC1101_MDMCFG3, 0x32, // Data rate is 3.79372 kBaud
    CC1101_MDMCFG4, 0x67, // Rx BW filter is 270.833333kHz

    CC1101_MCSM0, 0x18, // Calibrate when going from IDLE to RX or TX mode (Main Radio Control State Machine)
    CC1101_FOCCFG, 0x18, // no frequency offset compensation (Frequency Offset Compensation Configuration)

    /* Automatic Gain Control */
    CC1101_AGCCTRL0, 0x40,
    CC1101_AGCCTRL1, 0x00,
    CC1101_AGCCTRL2, 0x03,

    CC1101_WORCTRL, 0xFB, // Wake on radio control
    CC1101_FREND0, 0x11, // Front end TX configuration
    CC1101_FREND1, 0xB6, // Front end RX configuration
};

const uint8_t AM650[] = {
    CC1101_IOCFG0, 0x0D, // GD0 as async serial data output/input
    CC1101_FIFOTHR, 0x07, // RX FIFO and TX FIFO thresholds
    CC1101_PKTCTRL0, 0x32, // Async, continious, no whitening
    CC1101_FSCTRL1, 0x06, // Frequency synthesizer control (152343.75Hz)

    /* Modem Configuration */
    CC1101_MDMCFG0, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG1, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG2, 0x30, // Format ASK/OOK, no preamble/sync
    CC1101_MDMCFG3, 0x32, // Data rate is 3.79372 kBaud
    CC1101_MDMCFG4, 0x17, // Rx BW filter is 650.000kHz

    CC1101_MCSM0, 0x18, // Calibrate when going from IDLE to RX or TX mode (Main Radio Control State Machine)
    CC1101_FOCCFG, 0x18, // no frequency offset compensation (Frequency Offset Compensation Configuration)

    /* Automatic Gain Control */
    CC1101_AGCCTRL0, 0x91,
    CC1101_AGCCTRL1, 0x0,
    CC1101_AGCCTRL2, 0x07,

    CC1101_WORCTRL, 0xFB, // Wake on radio control
    CC1101_FREND0, 0x11, // Front end TX configuration
    CC1101_FREND1, 0xB6, // Front end RX configuration
};

const uint8_t FM238[] = {
    CC1101_IOCFG0, 0x0D, // GD0 as async serial data output/input
    CC1101_FSCTRL1, 0x06, // Frequency synthesizer control (152343.75Hz)
    CC1101_PKTCTRL0, 0x32, CC1101_PKTCTRL1, 0x04, // Async, continious, no whitening

    /* Modem Configuration */
    CC1101_MDMCFG0, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG1, 0x02, // Channel spacing is 100 kHz
    CC1101_MDMCFG2, 0x04, // Format 2-FSK/FM, no preamble/sync, disable
    CC1101_MDMCFG3, 0x83, // Data rate is 4.79794 kBaud
    CC1101_MDMCFG4, 0x67, // Rx BW filter is 270.833333 kHz
    CC1101_DEVIATN, 0x04, // Deviation is set to 2.380371 kHz

    CC1101_MCSM0, 0x18, // Calibrate when going from IDLE to RX or TX mode (Main Radio Control State Machine)
    CC1101_FOCCFG, 0x16, // no frequency offset compensation (Frequency Offset Compensation Configuration)

    /* Automatic Gain Control */
    CC1101_AGCCTRL0, 0x91,
    CC1101_AGCCTRL1, 0x00,
    CC1101_AGCCTRL2, 0x07,

    CC1101_WORCTRL, 0xFB, // Wake on radio control
    CC1101_FREND0, 0x10, // Front end TX configuration
    CC1101_FREND1, 0x56, // Front end RX configuration
};

const uint8_t FM476[] = {
    CC1101_IOCFG0, 0x0D, // GD0 as async serial data output/input
    CC1101_FSCTRL1, 0x06, // Frequency synthesizer control (152343.75Hz)
    CC1101_PKTCTRL0, 0x32, CC1101_PKTCTRL1, 0x04, // Async, continious, no whitening

    /* Modem Configuration */
    CC1101_MDMCFG0, 0x00, // Channel spacing is 25kHz
    CC1101_MDMCFG1, 0x02, // Channel spacing is 100 kHz
    CC1101_MDMCFG2, 0x04, // Format 2-FSK/FM, no preamble/sync, disable
    CC1101_MDMCFG3, 0x83, // Data rate is 4.79794 kBaud
    CC1101_MDMCFG4, 0x67, // Rx BW filter is 270.833333 kHz
    CC1101_DEVIATN, 0x47, // Deviation is set to 47.60742 kHz

    CC1101_MCSM0, 0x18, // Calibrate when going from IDLE to RX or TX mode (Main Radio Control State Machine)
    CC1101_FOCCFG, 0x16, // no frequency offset compensation (Frequency Offset Compensation Configuration)

    /* Automatic Gain Control */
    CC1101_AGCCTRL0, 0x91,
    CC1101_AGCCTRL1, 0x00,
    CC1101_AGCCTRL2, 0x07,

    CC1101_WORCTRL, 0xFB, // Wake on radio control
    CC1101_FREND0, 0x10, // Front end TX configuration
    CC1101_FREND1, 0x56, // Front end RX configuration
};


struct Preset {
    const char* name;
    const uint8_t* data;
    size_t length;
};

Preset Presets[] = {
    { "AM270", AM270, sizeof(AM270) / sizeof(AM270[0]) },
    { "AM650", AM650, sizeof(AM650) / sizeof(AM650[0]) },
    { "FM238", FM238, sizeof(FM238) / sizeof(FM238[0]) },
    { "FM476", FM476, sizeof(FM476) / sizeof(FM476[0]) }
};

constexpr size_t numPresets = sizeof(Presets) / sizeof(Presets[0]);

Preset* findPreset(String name) {
    for (size_t i = 0; i < numPresets; ++i) {
        if (strcmp(Presets[i].name, name.c_str()) == 0) {
            return &Presets[i];
        }
    }
    return nullptr;
}

// Applies the specified preset configuration to CC1101
void applyConfiguration(const uint8_t* config, size_t length) {
  for (size_t i = 0; i < length; i += 2) {
    uint8_t reg = config[i];
    uint8_t value = config[i + 1];
    ELECHOUSE_cc1101.SpiWriteReg(reg, value);
  }
}

#endif