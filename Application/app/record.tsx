import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import { convertFile, convertSamples } from "../providers/utils";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Back from "../components/back";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 100
  },
  title: {
    fontFamily: "Press_Start_2P",
    color: "#fff",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Roboto",
    color: "#d3d3d3",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 25,
    width: 300,
    marginVertical: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Press_Start_2P",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  status: {
    color: "#fff",
    fontFamily: "Roboto",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  graph: {
    width: 250,
    height: 130,
    borderWidth: 2,
    borderColor: "#2a2a2a",
    overflow: "hidden",
    backgroundColor: "#222",
    marginVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bar: {
    backgroundColor: "orange",
    width: (350 / (5000 / 10)), /* 5000 represents the max samples visible at once, we're diving by 10 since we are sending the rssi for each 10 pulses */
  },
  count: {
    color: "#fff",
    fontFamily: "Roboto",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  }
});

export default function Record() {
  const [recording, setRecording] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [output, setOutput] = useState("");
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<number[]>([]);
  const { registerEvent, sendData, settings } = useGlobal();

  function rssiToHeight(rssi: number) {
    const minRSSI = -90;
    const maxRSSI = -30;
    return ((rssi - minRSSI) / (maxRSSI - minRSSI)) * 130; // 130 is the height of the graph container
  }

  const triggerRecording = useCallback((start: boolean) => {
    setRecording(start);

    sendData({
      page: "/record",
      data: {
        active: start
      }
    });
  }, [sendData]);

  const downloadFile = useCallback(async () => {
    if (!output) return false;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
        const blob = new Blob([output], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);

        const a = window.document.createElement("a");
        a.href = url;
        a.download = "BKFZ_Recording_" + Date.now() + ".sub";
        window.document.body.appendChild(a);
        a.click();

        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const saveNow = !(await Sharing.isAvailableAsync());

        const file = new FileSystem.File(saveNow ? FileSystem.Paths.document : FileSystem.Paths.cache, 'BKFZ_Recording_' + Date.now() + '.sub');
        file.create();
        file.write(output);

        if (saveNow) {
          alert('Your recording has been saved to your documents folder as ' + file.name + '.');
        } else {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/plain',
            dialogTitle: 'Save your SubGHz recording to your device.'
          });
        }
      }
    } catch (e: any) {
      alert('An error occurred while saving your recording. ' + e.message);
    }
  }, [output]);

  const triggerPlay = useCallback(() => {
    const data = convertFile(output);

    const playing = registerEvent("/play", (res: any) => {
      if (res.success) {
        setPlayStatus('playing');

        let duration = 0;
        for (const sample of data.samples) {
          duration += Math.abs(sample) / 1000; // each unit represents 1 microsecond
        }

        setTimeout(() => {
          setPlayStatus(null);
        }, duration);
      }

      playing.remove();
    });

    sendData({
      page: "/play",
      data: {
        length: data.samples.length,
        frequency: data.frequency,
        preset: data.preset,
        samples: data.samples
      }
    });

    setPlayStatus('waiting');
  }, [output, sendData, registerEvent]);

  useEffect(() => {
    const callback = registerEvent("/record", (res: any) => {
      if (res.preset && res.frequency && res.samples) {
        const process = convertSamples(res.preset, res.frequency, res.samples);

        setOutput(process);
        setShowAfter(true);
      }
    });

    const graph = registerEvent("/graph", (res: any) => {
      if (res.length) {
        setSampleCount(res.length);
      }

      if (res.values) {
        setGraphData(prev => {
          const newGraph = [...prev, ...res.values];

          while (newGraph.length > (5000 / 10)) {
            newGraph.shift();
          }

          return newGraph;
        });
      }
    });

    return () => {
      callback?.remove();
      graph?.remove();
    };
  }, [registerEvent]);

  if (!settings) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Back action="back" />
      <Text style={styles.title}>SubGHz Capture</Text>
      <Text style={styles.subtitle}>Capture and store SubGHz signal data.</Text>

      {!showAfter ? (
        <>
          <TouchableOpacity style={[styles.button, (recording ? { backgroundColor: "#dc3545" } : { backgroundColor: "#28a745" })]} activeOpacity={0.8} onPress={() => triggerRecording(!recording)}>
            <Text style={styles.buttonText}>{recording ? "Stop" : "Record"}</Text>
          </TouchableOpacity>
          <Text style={styles.status}>{(!settings || !settings?.preset || !settings?.frequency || !settings?.rssi) ? 'Loading, please wait...' : `${settings.preset} | ${(settings.frequency / 1000000).toFixed(2)} MHz | ${settings.rssi.toString() === "-200" ? 'Any' : settings.rssi} RSSI`}</Text>

          <View style={styles.graph}>
            {graphData.map((val, idx) => (
              <View
                key={idx}
                style={[styles.bar, { height: rssiToHeight(val) }]}
              />
            ))}
          </View>
          <Text style={styles.count}>{sampleCount} spl.</Text>
        </>
      ) : (
        <>
          <TouchableOpacity style={[styles.button, { backgroundColor: "#0632d1" }]} activeOpacity={0.8} onPress={() => downloadFile()}>
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: "#0632d1" }]} activeOpacity={0.8} onPress={() => triggerPlay()} disabled={playStatus !== null}>
            <Text style={styles.buttonText}>{playStatus === 'waiting' ? "Sending Data..." : playStatus === 'playing' ? "Replaying..." : "Replay Test"}</Text>
          </TouchableOpacity>
          <Text style={styles.status}>Your recording has been successfully created.</Text>
        </>
      )}
    </SafeAreaView>
  );
}