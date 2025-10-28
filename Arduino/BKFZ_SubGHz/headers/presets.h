#ifndef PRESETS_H
#define PRESETS_H

#include <Arduino.h>
#include <ELECHOUSE_CC1101_SRC_DRV.h>

struct Preset {
    const char* name;
    const uint8_t* data;
    size_t length;
};

extern const uint8_t AM270[];
extern const uint8_t AM650[];
extern const uint8_t FM238[];
extern const uint8_t FM476[];

extern const Preset Presets[];

const Preset* findPreset(String name);
void applyConfiguration(const uint8_t* config, size_t length);

#endif