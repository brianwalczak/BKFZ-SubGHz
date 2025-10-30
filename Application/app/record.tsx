import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import { convertFile } from "../providers/utils";
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
    fontSize: 24,
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
  button: {
    borderRadius: 8,
    paddingVertical: 25,
    width: 300,
    marginVertical: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Press Start 2P",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  disconnectContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  disconnectText: {
    color: "#ff4d4d",
    fontFamily: "Open Sans",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  status: {
    color: "#fff",
    fontFamily: "Open Sans",
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
    fontFamily: "Open Sans",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  }
});

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [output, setOutput] = useState("");
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<number[]>([]);
  const { registerEvent, sendData } = useGlobal();

  function rssiToHeight(rssi: number) {
    const minRSSI = -90;
    const maxRSSI = -30;
    return ((rssi - minRSSI) / (maxRSSI - minRSSI)) * 130; // 130 is the height of the graph container
  }

  const triggerRecording = useCallback((start: boolean) => {
    setRecording(start);

    sendData({
      url: "/record",
      data: { "active": (start) }
    });
  }, [sendData]);

  const downloadFile = useCallback(async () => {
    if (!output) return false;

    try {
      const saveNow = !(await Sharing.isAvailableAsync());

      const file = new File(saveNow ? Paths.document : Paths.cache, 'BKFZ_Recording_' + Date.now() + '.sub');
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
    } catch (e: any) {
      alert('An error occurred while saving your recording. ' + e.message);
    }
  }, [output]);

  const triggerPlay = useCallback(() => {
    const data = convertFile(output);

    const playing = registerEvent("/play", (res: any) => {
      if (res.data?.success) {
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
      url: "/play",
      data: {
        samples: JSON.stringify(data.samples),
        frequency: data.frequency,
        length: data.samples.length,
        preset: data.preset
      }
    });

    setPlayStatus('waiting');
  }, [output, sendData]);

  useEffect(() => {
    const callback = registerEvent("/record", (res: any) => {
      if (res.data?.samples) {
        setOutput(res.data.samples);
        setShowAfter(true);
      }

      if (res.data?.length) {
        setSampleCount(res.data.length);
      }

      if (res.data?.graph) {
        setGraphData(prev => {
          const newGraph = [...prev, ...res.data.graph];

          while (newGraph.length > (5000 / 10)) {
            newGraph.shift();
          }

          return newGraph;
        });
      }
    });

    return () => {
      callback?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SubGHz Capture</Text>
      <Text style={styles.subtitle}>Capture and store SubGHz signal data.</Text>

      {!showAfter ? (
        <>
          <TouchableOpacity style={[styles.button, (recording ? { backgroundColor: "#dc3545" } : { backgroundColor: "#28a745" })]} activeOpacity={0.8} onPress={() => triggerRecording(!recording)}>
            <Text style={styles.buttonText}>{recording ? "Stop" : "Record"}</Text>
          </TouchableOpacity>
          <Text style={styles.status}>AM650 | 433.92 MHz | -65 RSSI</Text>

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