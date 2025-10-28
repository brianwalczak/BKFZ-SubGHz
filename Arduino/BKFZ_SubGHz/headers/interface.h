#ifndef INTERFACE_H
#define INTERFACE_H

#include <Arduino.h>
#include <functional>
#include <vector>

void registerPlayRequest(std::function<void(std::function<void(bool)>)> handler);
void registerPlay(std::function<void(const std::vector<int>&, int, const String&, const String&)> handler);
void registerAnalyzer(std::function<void()> handler);
void registerSettings(std::function<void(const String&, int, int)> handler);
void sendData(const String &data);
void setupDevice();

/* shared from main ino to interfaces */
void flushSamples();
void stopRecording();
void startRecording();
void smoothenSamples();
void playSignal(const int *samples, int length);

#endif