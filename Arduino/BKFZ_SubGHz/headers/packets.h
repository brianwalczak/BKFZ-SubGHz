#pragma once
#include <Arduino.h>
#pragma pack(push, 1)

enum class Command : uint8_t {
  SETTINGS = 0x01,
  ANALYZER = 0x02,
  RECORD = 0x03,
  PLAY = 0x04,
  GRAPH = 0x05
};

enum class SettingsCmdIn : uint8_t {
  SETTING_PRESET = 0x01,
  SETTING_FREQUENCY = 0x02,
  SETTING_RSSI = 0x03,
  SETTING_DETECT_RSSI = 0x04
};

enum class SettingsMethodCmdIn : uint8_t {
  GET = 0x01,
  SET = 0x02
};

struct SettingsIn {
  uint16_t p_len;
  uint8_t cmd;

  uint8_t method;
  uint8_t data[];
};

struct AnalyzerIn {
  uint16_t p_len;
  uint8_t cmd;

  uint8_t active;
};

struct RecordIn {
  uint16_t p_len;
  uint8_t cmd;

  uint8_t active;
};

struct PlayIn {
  uint16_t p_len;
  uint8_t cmd;
  
  uint16_t count;
  uint32_t frequency;
  char preset[8];
  int16_t samples[];
};

struct GraphOut {
  uint16_t p_len;
  uint8_t cmd;

  uint16_t length;
  int16_t values[];
};

struct AnalyzerOut {
  uint16_t p_len;
  uint8_t cmd;

  uint32_t frequency;
  int8_t rssi;
};

struct RecordOut {
  uint16_t p_len;
  uint8_t cmd;

  char preset[8];
  uint32_t frequency;
  int16_t samples[];
};

struct PlayOut {
  uint16_t p_len;
  uint8_t cmd;

  uint8_t success;
};

struct SettingsOut {
  uint16_t p_len;
  uint8_t cmd;

  char preset[8];
  uint32_t frequency;
  int8_t rssi;
  int8_t detect_rssi;
};

#pragma pack(pop)
