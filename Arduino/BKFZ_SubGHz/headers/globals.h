#ifndef GLOBALS_H
#define GLOBALS_H

#include "config.h"

// ---- Sample Recording Data ---- //
extern int16_t samples[MAX_SAMPLES];
extern volatile int sampleIndex;
extern volatile unsigned long lastTime;

// ---- Graph Recording Data ---- //
extern int16_t itemsToGraph[1024];
extern bool graphUpdateNeeded;
extern volatile int graphSkipped;
extern volatile int graphIndex;
extern volatile int lastSend;

#endif