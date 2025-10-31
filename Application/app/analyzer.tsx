import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import Slider from '@react-native-community/slider';
import React, { useEffect, useState, useCallback } from "react";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 100
  },
  title: {
    fontFamily: "Press Start 2P",
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Open Sans",
    color: "#d3d3d3",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  status: {
    color: "#fff",
    fontFamily: "Open Sans",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  slider: {
    width: 300,
    height: 40,
    marginTop: 10,
  },
  main: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    marginBottom: 20,
    minWidth: 330,
  },
  frequency: {
    color: "#28a745",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "Open Sans",
  },
  rssi: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Open Sans",
  },
  history: {
    width: 300,
    height: 120,
    marginTop: 30,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});

export default function Analyzer() {
  const { settings } = useGlobal();
  const [rssi, setRssi] = useState(-85);
  const [history, setHistory] = useState("");
  const { registerEvent, sendData } = useGlobal();

  const currentFreq = React.useRef<number | null>(null);
  const currentRssi = React.useRef<number | null>(null);

  const updateRSSI = useCallback((value: number) => {
    return sendData({
      url: "/analyzer",
      data: {
        rssi: value
      }
    });
  }, []);

  useEffect(() => {
    if (settings?.settings?.detect_rssi) {
      setRssi(settings.settings.detect_rssi);
    }
  }, [settings]);

  useEffect(() => {
    const callback = registerEvent("/analyzer", (res: any) => {
      if (res?.data?.freq && res?.data?.rssi) {
        if (currentFreq.current && currentRssi.current) {
          setHistory((prev) => `Frequency: ${(res.data.freq / 1000000).toFixed(2) + ' MHz'} | RSSI: ${res.data.rssi} dBm\n` + prev);
        }

        currentFreq.current = res.data.freq;
        currentRssi.current = res.data.rssi;
      }
    });

    sendData({
      url: "/analyzer",
      data: {
        active: true
      }
    });

    return () => {
      callback?.remove();
      sendData({
        url: "/analyzer",
        data: {
          active: false
        }
      });
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Frequency Analyzer</Text>
      <Text style={styles.subtitle}>Analyze nearby SubGHz frequencies w/ RSSI.</Text>

      <View style={styles.main}>
        <Text style={styles.frequency}>{currentFreq.current ? ((currentFreq.current / 1000000).toFixed(2) + ' MHz') : '000.00 MHz'}</Text>
        <Text style={styles.rssi}>{currentRssi.current ? (currentRssi.current + ' dBm (RSSI)') : '-0.00 dBm (RSSI)'}</Text>
      </View>

      <View>
        <Text style={styles.status}>Settings: {settings?.settings?.preset || 'Loading...'} | {rssi} RSSI Threshold</Text>
        <Slider style={styles.slider} minimumValue={-85} maximumValue={-40} step={5} value={rssi} minimumTrackTintColor="#28a745" maximumTrackTintColor="#888" thumbTintColor="#28a745" onValueChange={setRssi} onSlidingComplete={updateRSSI} />
      </View>

      <ScrollView style={styles.history} contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Open Sans", fontWeight: "bold", textAlign: "center", lineHeight: 24 }}>
          {history || "No frequency history."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}