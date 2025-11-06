import { StyleSheet, Text, TouchableOpacity, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import { convertFile, readFileContent } from "../providers/utils";
import { pick } from '@react-native-documents/picker';
import Back from "../components/back";
import { useCallback, useState } from "react";

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
    marginBottom: 35,
  },
  button: {
    backgroundColor: "#0632d1",
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
  changeContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  changeText: {
    color: "#3B82F6",
    fontFamily: "Press Start 2P",
    fontSize: 12,
    textAlign: "center",
  },
});

export default function Play() {
  const [files, setFiles] = useState<{ name: string | null; uri: string; isFlipper: boolean }[]>([]);
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const { registerEvent, sendData } = useGlobal();

  const playFile = useCallback(async (uri: string) => {
    const fileText = await readFileContent(uri);
    if (!fileText) return;

    const data = convertFile(fileText);

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
  }, [sendData]);
  
  const updateFiles = useCallback(async () => {
    try {
      const data = await pick({
        mode: 'open',
        allowMultiSelection: true
      });

      data.forEach(async file => {
        const fileExtension = file?.name?.toUpperCase()?.split('.')?.slice(1)?.join('.');
        let isFlipper = true;

        // .sub is a native file for the Flipper Zero, but is also used here
        if (fileExtension && (fileExtension === 'SUB' || fileExtension === 'SUB.TXT')) {
          let fileText = await readFileContent(file.uri);
          if (!fileText) return;

          const lines = fileText.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("# Created with BKFZ SubGHz")) {
              isFlipper = false;
              break;
            }
          }

          if (files.length > 0) setFiles([]);
          return setFiles(prev => [...prev, {
            name: file.name,
            uri: file.uri,
            isFlipper: isFlipper
          }]);
        }
      });
    } catch { };
  }, [files]);

  return (
    <SafeAreaView style={styles.container}>
      <Back action="back" />
      <Text style={styles.title}>SubGHz Transmit</Text>
      <Text style={styles.subtitle}>Transmit saved SubGHz signals with presets.</Text>

      {files.length === 0 ? (
        <>
          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={updateFiles}>
            <Text style={styles.buttonText}>Open Directory</Text>
          </TouchableOpacity>

          <Text style={[styles.subtitle, { marginBottom: 0, marginTop: 5 }]}>No files have been selected.</Text>
        </>
      ) : (
        <>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: "center" }}>
            {files.map((file: { name: string | null; uri: string; isFlipper: boolean }) => (
              <View key={file.uri} style={{ width: '100%', padding: 30, paddingBottom: 25, marginVertical: 15, borderRadius: 20, backgroundColor: "#2b2b2b" }}>
                <Text style={{ fontSize: 18, color: "#fff", fontFamily: 'Press Start 2P', marginBottom: 8, alignSelf: "center" }} numberOfLines={1}>{file.name?.split(".")[0]}</Text>
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: 'Press Start 2P', marginBottom: 8, alignSelf: "center" }} numberOfLines={1}>{file.isFlipper ? "Flipper" : "Native"} SubGhz RAW File</Text>

                <TouchableOpacity style={[styles.button, { backgroundColor: "#28a745", marginTop: 20, width: '100%', paddingVertical: 20, alignSelf: "center" }]} activeOpacity={0.8} onPress={() => playFile(file.uri)} disabled={playStatus !== null}>
                  <Text style={styles.buttonText}>Play</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.changeContainer}>
            <TouchableOpacity activeOpacity={0.7} onPress={updateFiles}>
              <Text style={styles.changeText}>Change Directory</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}