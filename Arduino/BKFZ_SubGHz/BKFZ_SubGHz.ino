#include <ELECHOUSE_CC1101_SRC_DRV.h>
#include <esp_attr.h>
#include <Arduino.h>
#include <SPI.h>

#include <headers/config.h>
#include <headers/presets.h>
#include <headers/user_settings.h>
#include <headers/interface.h>
#include <headers/globals.h>
#include <headers/packets.h>

int16_t samples[MAX_SAMPLES];
volatile int sampleIndex = 0;
volatile unsigned long lastTime = 0;

int16_t itemsToGraph[1024];
bool graphUpdateNeeded = false;
volatile int graphSkipped = 0;
volatile int graphIndex = -1;
volatile int lastSend = 0;

// Updates the settings for the CC1101 (utilizes user settings)
void setupCC1101(bool transmit, int retry = false) {
  ELECHOUSE_cc1101.setSpiPin(SCK_CPIN, MISO_CPIN, MOSI_CPIN, CSN_CPIN);
  ELECHOUSE_cc1101.Init();
  ELECHOUSE_cc1101.setMHZ(settings.frequency / 1000000.0);

  if(transmit) {
    pinMode(GDO0_CPIN, OUTPUT);
    ELECHOUSE_cc1101.SetTx(); // Enables transmit mode (used for sending)
  } else {
    pinMode(GDO2_CPIN, INPUT);
    ELECHOUSE_cc1101.SetRx(); // Enables receive mode (used for listening)
  }

  const Preset* preset = findPreset(settings.preset);
  applyConfiguration(preset->data, preset->length);
  
  if(!ELECHOUSE_cc1101.getCC1101()) {
    if(!retry) {
      Serial.println(F("Connection error with CC1101, retrying..."));
      setupCC1101(transmit, true);
    } else {
      Serial.println(F("Failed CC1101 connection retry. Please check your pins."));
    }
  }
}

// Enables receiver mode and records RAW samples
void startRecording() {
  setupCC1101(false); // Initialize CC1101 with receiver mode
  status.record = "RUNNING";
  
  // Update all of the pins and setup interrupt
  flushSamples();
  attachInterrupt(digitalPinToInterrupt(GDO2_CPIN), onSignalChange, CHANGE);
}

// Stops recording and checks if successful
void stopRecording() {
  detachInterrupt(digitalPinToInterrupt(GDO2_CPIN));
  status.record = "IDLE";
}

// Captures and analyzes nearby frequencies w/ RSSI
void frequencyAnalyzer() {
  status.detect = "RUNNING";
  Serial.println(F("Frequency analyzer has been started by the user (watch for websockets)."));

  // Store old settings to revert when done and last seen frequency / RSSI
  int old_freq = settings.frequency;
  int lastFrequency = 0;
  int lastRSSI = 0;

  while(status.detect == "RUNNING") {
    int highestRssi = -INFINITY;
    int strongestFreq = 0;

    for(int frequency : hopperFrequenciesUSA) {
      settings.frequency = frequency; // Update to hopper frequency
      setupCC1101(false);

      int rssi = ELECHOUSE_cc1101.getRssi();

      // This signal is stronger than the one before and within threshold
      if(rssi >= highestRssi && rssi >= settings.detect_rssi) {
        highestRssi = rssi;
        strongestFreq = frequency;
      }
    }

    // If the signal is unique compared to last time, send through websocket
    if(strongestFreq != lastFrequency && highestRssi != lastRSSI && (strongestFreq != 0 && highestRssi != -INFINITY)) {
      // Set the frequency to last seen (used to prevent repetition of the same signal)
      lastFrequency = strongestFreq;
      lastRSSI = highestRssi;

      AnalyzerOut pkt;
      pkt.p_len = sizeof(AnalyzerOut);
      pkt.cmd = static_cast<uint8_t>(Command::ANALYZER);

      pkt.frequency = strongestFreq;
      pkt.rssi = highestRssi;
      sendData(reinterpret_cast<uint8_t*>(&pkt), sizeof(pkt));
    }
  }

  // Revert settings back to original before
  settings.frequency = old_freq;
  Serial.println(F("Frequency analyzer has been stopped by the user."));
}

// Play a signal from client-side file
void playSignal(const int16_t reqSamples[], uint16_t reqLength) {
  Serial.println(F("Now transmitting requested samples..."));
  setupCC1101(true);

  for (uint16_t i = 0; i < reqLength; i++) {
    if (reqSamples[i] > 0) {
      digitalWrite(GDO0_CPIN, HIGH);
    } else {
      digitalWrite(GDO0_CPIN, LOW);
    }

    delayMicroseconds(abs(reqSamples[i]));
  }
}

// Smoothens out the RAW samples to correct format (written with generative AI)
void smoothenSamples() {
  #define signalstorage 10
  
  // Initialize variables for signal storage, counts, and sums
  int signalanz = 0;
  int timingdelay[signalstorage];
  long signaltimings[signalstorage * 2];
  int signaltimingscount[signalstorage];
  long signaltimingssum[signalstorage];

  // Initialize signal timings with default values
  for (int i = 0; i < signalstorage; i++) {
    signaltimings[i * 2] = 100000;  // Minimum timing
    signaltimings[i * 2 + 1] = 0;   // Maximum timing
    signaltimingscount[i] = 0;      // Count of timings in this range
    signaltimingssum[i] = 0;        // Sum of timings in this range
  }

  // Group signals into timing ranges
  for (int p = 0; p < signalstorage; p++) {
    for (int i = 1; i < sampleIndex; i++) {
      // Find the minimum timing for the group
      if (p == 0) {
        if (samples[i] < signaltimings[p * 2]) {
          signaltimings[p * 2] = samples[i];
        }
      } else {
        if (samples[i] < signaltimings[p * 2] && samples[i] > signaltimings[p * 2 - 1]) {
          signaltimings[p * 2] = samples[i];
        }
      }
    }

    // Find the maximum timing for the group
    for (int i = 1; i < sampleIndex; i++) {
      if (samples[i] < signaltimings[p * 2] + ERROR_TOLERANCE && samples[i] > signaltimings[p * 2 + 1]) {
        signaltimings[p * 2 + 1] = samples[i];
      }
    }

    // Count how many samples fall into this timing range and sum their values
    for (int i = 1; i < sampleIndex; i++) {
      if (samples[i] >= signaltimings[p * 2] && samples[i] <= signaltimings[p * 2 + 1]) {
        signaltimingscount[p]++;
        signaltimingssum[p] += samples[i];
      }
    }
  }

  // Determine how many signal groups are active
  signalanz = signalstorage;
  for (int i = 0; i < signalstorage; i++) {
    if (signaltimingscount[i] == 0) {
      signalanz = i;
      break;
    }
  }

  // Sort signal groups by count (from most frequent to least frequent)
  for (int s = 1; s < signalanz; s++) {
    for (int i = 0; i < signalanz - s; i++) {
      if (signaltimingscount[i] < signaltimingscount[i + 1]) {
        // Swap the signal group data
        int temp1 = signaltimings[i * 2];
        int temp2 = signaltimings[i * 2 + 1];
        int temp3 = signaltimingssum[i];
        int temp4 = signaltimingscount[i];

        signaltimings[i * 2] = signaltimings[(i + 1) * 2];
        signaltimings[i * 2 + 1] = signaltimings[(i + 1) * 2 + 1];
        signaltimingssum[i] = signaltimingssum[i + 1];
        signaltimingscount[i] = signaltimingscount[i + 1];

        signaltimings[(i + 1) * 2] = temp1;
        signaltimings[(i + 1) * 2 + 1] = temp2;
        signaltimingssum[i + 1] = temp3;
        signaltimingscount[i + 1] = temp4;
      }
    }
  }

  // Calculate average timing for each group
  for (int i = 0; i < signalanz; i++) {
    timingdelay[i] = signaltimingssum[i] / signaltimingscount[i];
  }

  // Correct raw data based on timing groups and assign high/low values
  bool lastbin = false;  // Tracks whether the last bin was high (false = low, true = high)
  int smoothCount = 0;

  for (int i = 1; i < sampleIndex; i++) {
    float r = (float)samples[i] / timingdelay[0];
    int calculate = r;
    r = r - calculate;
    r *= 10;
    if (r >= 5) {
      calculate += 1;
    }

    if (calculate > 0) {
      // Toggle the bin state between high and low
      lastbin = !lastbin;

      // Assign positive for high and negative for low
      samples[smoothCount] = (lastbin ? 1 : -1) * (calculate * timingdelay[0]);
      smoothCount++;
    }
  }

  // update sample index to ignore stale data
  sampleIndex = smoothCount;
}

// Flushes all recorded samples and resets variables
void flushSamples() {
  int oldHeap = ESP.getFreeHeap();
  int oldStack = uxTaskGetStackHighWaterMark(NULL) * sizeof(StackType_t);

  memset(samples, 0, sizeof(samples)); // flush sample array
  sampleIndex = 0;
  lastTime = 0;
  
  // reset graph variables
  memset(itemsToGraph, 0, sizeof(itemsToGraph));
  graphUpdateNeeded = false;
  graphSkipped = 0;
  graphIndex = -1;
  lastSend = 0;

  int newHeap = ESP.getFreeHeap();
  int newStack = uxTaskGetStackHighWaterMark(NULL) * sizeof(StackType_t);
  Serial.println("[FLUSH]: sample flush success, " + String(newHeap - oldHeap) + " heap regained + " + String(newStack - oldStack) + " stack regained.");
}

// Checks if graph needs to be updated (and sends data)
void checkGraph() {
  if(micros() - lastSend > 100000 && graphIndex >= 1) { // last update >100ms ago
    lastSend = micros();

    // get packet size, allocate buffer
    const size_t packetSize = sizeof(GraphOut) + (graphIndex * sizeof(int16_t));
    uint8_t* buffer = (uint8_t*)malloc(packetSize);
    if (!buffer) return;

    GraphOut* pkt = reinterpret_cast<GraphOut*>(buffer);
    pkt -> p_len = packetSize;
    pkt -> cmd = static_cast<uint8_t>(Command::GRAPH);

    pkt -> length = sampleIndex;
    for(int i = 0; i < graphIndex; i++) pkt->values[i] = (int16_t)itemsToGraph[i];
    sendData(buffer, packetSize);

    free(buffer); // clean up buffer
    memset(itemsToGraph, 0, sizeof(itemsToGraph));
    graphIndex = 0;
  }
}

// Handle event changes of CC1101
void onSignalChange() {
  const unsigned long time = micros();
  const unsigned int duration = time - lastTime;
  int rssi = ELECHOUSE_cc1101.getRssi();

  if (sampleIndex < MAX_SAMPLES && (rssi >= settings.rssi || settings.rssi == -200)) {
    samples[sampleIndex++] = duration;

    graphSkipped++;

    if(graphSkipped >= 10) {
      itemsToGraph[graphIndex++] = rssi;
      graphSkipped = 0;
    }

    graphUpdateNeeded = true;
  }

  lastTime = time;
}

void setup() {
  Serial.begin(9600);
  delay(500);
  while (!Serial) { ; }

  loadSettings();
  setupDevice();
  setupCC1101(false);
}

void loop() {
  if(status.detect == "QUEUED") {
    frequencyAnalyzer();
  }

  if(graphUpdateNeeded == true) {
    graphUpdateNeeded = false;

    checkGraph();
  }
}