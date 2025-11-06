import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useGlobal } from "../providers/GlobalContext";
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
    fontFamily: "Press Start 2P",
    color: "#fff",
    fontSize: 28,
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
    marginVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Press Start 2P",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    width: 350,
    justifyContent: "space-between",
  },
  label: {
    color: "#fff",
    fontSize: 20,
    flex: 1,
  },
  value: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
  selected: {
    padding: 10,
    backgroundColor: "#2b2b2b",
    borderRadius: 10,
    width: 130,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default function Settings() {
  const { updateSettings, settings, setMessage } = useGlobal();
  const [position, setPosition] = useState<any>(null);

  useEffect(() => {
    if (settings) {
      setPosition({
        preset: (settings.options.preset.indexOf(settings.settings?.preset) || 0),
        frequency: (settings.options.frequency.indexOf(settings.settings?.frequency) || 0),
        rssi: (settings.options.rssi.indexOf(settings.settings?.rssi) || 0)
      });
    }
  }, [settings]);

  const handleMove = useCallback((key: string, dir: -1 | 1) => {
    setPosition((prev: any) => {
      const max = settings.options[key].length - 1;
      let next = prev[key] + dir;

      if (next < 0) next = 0;
      if (next > max) next = max;
      return { ...prev, [key]: next };
    });
  }, [settings]);

  const getDisplayValue = useCallback((key: string) => {
    const val = settings.options[key][position[key]];

    if (key === "frequency") return (val / 1000000).toFixed(2) + " MHz";
    if (key === "rssi") return val === -200 ? "- - - - -" : val + " dBm";
    return val;
  }, [position, settings]);

  const saveSettings = useCallback(async () => {
    const newSettings: any = {
      preset: settings.options.preset[position.preset],
      frequency: settings.options.frequency[position.frequency],
      rssi: settings.options.rssi[position.rssi],
    };

    const save = await updateSettings(newSettings, true);
    if (save) {
      setMessage(['Your settings have been saved successfully!', 'success']);
    } else {
      setMessage(['Failed to save settings. Please try again.', 'error']);
    }

    setTimeout(() => setMessage(null), 2000);
  }, [position, settings]);

  if (!settings || !position) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Back action="back" />
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage SubGHz settings and modulation.</Text>

      {Object.keys(settings.options).map((key) => (
        <View style={styles.optionRow} key={key}>
          <Text style={styles.label}>{key === "preset" ? "Preset" : key === "frequency" ? "Frequency" : key === 'rssi' ? "RSSI Threshold" : 'Unknown'}</Text>
          <TouchableOpacity style={[{ padding: 8 }, position[key] === 0 && { opacity: 0.3 }]} disabled={position[key] === 0} onPress={() => handleMove(key as any, -1)}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={[styles.value, styles.selected]}>{getDisplayValue(key as any)}</Text>

          <TouchableOpacity style={[{ padding: 8 }, position[key] === settings.options[key].length - 1 && { opacity: 0.3 }]} disabled={position[key] === settings.options[key].length - 1} onPress={() => handleMove(key as any, 1)}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={[styles.button, { backgroundColor: "#28a745" }]} activeOpacity={0.8} onPress={() => saveSettings()}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}