import { StyleSheet, Text, TouchableOpacity, ScrollView, View, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import { convertFile, readFileContent } from "../providers/utils";
import * as DocumentPicker from 'expo-document-picker';
import Back from "../components/back";
import { useCallback, useEffect, useState, useRef } from "react";

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
    fontFamily: "Roboto",
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
  const [files, setFiles] = useState<{ name: string | null; uri: string; file?: File, isFlipper: boolean }[]>([]);
  const [playStatus, setPlayStatus] = useState<{ status: string; uri: string; } | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<any>(null);
  const { registerEvent, sendData } = useGlobal();

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false
    }).start();
  }, [animatedProgress, progress]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const playFile = useCallback(async (uri: string, file?: File) => {
    const fileText = await readFileContent(file ?? uri);
    if (!fileText) return;

    const data = convertFile(fileText);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const playing = registerEvent("/play", (res: any) => {
      if (res.success) {
        const duration = data.samples.reduce((acc, sample) => acc + Math.abs(sample) / 1000, 0); // each unit represents 1 microsecond
        const startTime = Date.now();

        setPlayStatus({
          status: 'playing',
          uri: uri
        });

        setProgress(0);
        animatedProgress.setValue(0);

        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const percent = Math.min(100, Math.floor((elapsed / duration) * 100));

          setProgress(percent);

          if (percent >= 100) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;

            setProgress(100);
            setTimeout(() => {
              setPlayStatus(null);
            }, 600);
          }
        }, 50);
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

    setPlayStatus({
      status: 'waiting',
      uri: uri
    });

    animatedProgress.setValue(0);
    setProgress(0);
  }, [animatedProgress, registerEvent, sendData]);

  const updateFiles = useCallback(async () => {
    try {
      const reader = await DocumentPicker.getDocumentAsync({
        multiple: true
      });

      (reader?.assets || []).forEach(async file => {
        const fileExtension = file?.name?.toUpperCase()?.split('.')?.slice(1)?.join('.');
        let isFlipper = true;

        // .sub is a native file for the Flipper Zero, but is also used here
        if (fileExtension && (fileExtension === 'SUB' || fileExtension === 'SUB.TXT')) {
          let fileText = await readFileContent(file.file ?? file.uri);
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
            file: file.file ?? undefined,
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
            {files.map((file: { name: string | null; uri: string; file?: File; isFlipper: boolean }) => (
              <View key={file.uri} style={{ width: '100%', padding: 30, paddingBottom: 25, marginVertical: 15, borderRadius: 20, backgroundColor: "#2b2b2b" }}>
                <Text style={{ fontSize: 18, color: "#fff", fontFamily: 'Press Start 2P', marginBottom: 8, alignSelf: "center" }} numberOfLines={1}>{file.name?.split(".")[0]}</Text>
                <Text style={{ fontSize: 12, color: "#fff", fontFamily: 'Press Start 2P', marginBottom: 8, alignSelf: "center" }} numberOfLines={1}>{file.isFlipper ? "Flipper" : "Native"} SubGhz RAW File</Text>

                <TouchableOpacity style={[styles.button, { backgroundColor: "#28a745", marginTop: 20, width: '100%', paddingVertical: 20, alignSelf: "center", overflow: 'hidden', position: 'relative' }]} activeOpacity={0.8} onPress={() => playFile(file.uri, file?.file)} disabled={playStatus !== null}>
                  {playStatus?.uri === file.uri && playStatus?.status === 'playing' && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: animatedProgress.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: '#278a3eff',
                        zIndex: 1,
                        borderRadius: 8,
                      }}
                    />
                  )}

                  <Text style={[styles.buttonText, { zIndex: 2, position: 'relative' }]}>
                    {playStatus?.uri === file.uri
                      ? playStatus?.status === 'waiting'
                        ? 'Sending Data...'
                        : playStatus?.status === 'playing'
                          ? `Replaying... ${progress}%`
                          : 'Play'
                      : 'Play'}
                  </Text>
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